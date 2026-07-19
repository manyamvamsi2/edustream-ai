import json
import re
import logging
from typing import Dict, List, Any
from groq_api import generate_completion
from vectordb import search_chunks

logger = logging.getLogger(__name__)

async def answer_video_query(video_id: str, query: str) -> dict:
    """
    Retrieves context from the video's transcript in MongoDB and asks the LLM to answer the query.
    Returns the answer and the timestamp references used.
    """
    relevant_chunks = await search_chunks(video_id, query, top_k=5)
    
    context_parts = []
    timestamps = []
    for i, chunk in enumerate(relevant_chunks):
        start = round(chunk.get("start", 0) or 0, 2)
        end = round(chunk.get("end", 0) or 0, 2)
        text = chunk.get("text", "")
        
        context_parts.append(f"[Time {start}s - {end}s]: {text}")
        timestamps.append({"start": start, "end": end, "text": text[:50] + "..."})

    context_str = "\n".join(context_parts)

    prompt = f"""
Answer the question based on the video transcript. If the question is not related to the video, you may answer it based on your general knowledge.
If the user is just saying hello or greeting you, greet them back playfully as an AI Learning Assistant.

CRITICAL FORMATTING RULES:
1. Include timestamps (e.g., (time 12.5s - 15.0s) or (28.48s)) in your answer where relevant to support your points.
2. For EXPLICITLY Technical/Programming content:
   - ONLY include code if the video is about software development, coding, or technical tools. 
   - DO NOT provide coding examples for non-technical topics like biology, medicine, history, etc.
   - Use `inline code` (backticks) for method names, variables, keywords.
   - Use ```multi-line block code``` for complete examples.
   - For every code block, provide a clear explanation.
   - Do NOT start a bullet point with a block-level code block.
3. For Non-Technical Content (e.g., Biology, Science, Arts):
   - ABSOLUTELY NO code blocks or coding-style metaphors. 
   - Focus entirely on the subject matter using professional educational language.

Transcript:
{context_str}

Question:
{query}
"""

    answer = generate_completion(prompt)

    return {
        "answer": answer,
        "timestamps": timestamps
    }

def generate_smart_summary(video_id: str, full_transcript: str) -> dict:
    """
    Generates a smart summary, key points, and structured notes from the full transcript.
    """
    max_len = 12000  # Roughly fits in most average context windows
    truncated_transcript = full_transcript[:max_len]
    
    prompt = f"""
You are an EduStream AI Video Learning Assistant. Please analyze the following video transcript and provide a highly professional educational summary.

Your response must include:
1. SUMMARY: A concise short summary (2-3 sentences).
2. KEY_POINTS: 5 high-impact takeaways.
3. VOCABULARY: 5 Key Vocabulary terms with brief definitions (term: definition).
4. NOTES: Detailed, structured markdown notes. 

CRITICAL REQUIREMENTS FOR NOTES:
- Use **Bold for all Heading titles** (e.g., ## **Heading Name**).
- **Strict Content Conditioning**: 
    - IF and ONLY IF the video is EXPLICITLY a programming tutorial or technical software guide, include code snippets.
    - If the video is about ANY other topic (Biology, History, Math, Science, etc.), DO NOT include any code blocks, Python examples, or coding metaphors. Focus on conceptual depth.
- **Formatting Technical Content**: 
    - Use `inline code` (backticks) for technical keywords only if applicable.
    - Use triple-backtick (```language) blocks ONLY for actual multi-line code examples.
    - Every code block MUST have a "Context & Usage" explanation.
- Use clear H1, H2, and H3 headers for hierarchy.
- For Non-Coding Content: Focus on deep explanations, analogies, and key facts. NO coding metadata.
- Use bold text for important terms.
- Ensure perfect vertical alignment and professional spacing.
- **Multi-Language Support**: If the transcript is NOT in English, you MUST translate all your output (Summary, Key Points, Vocabulary, and Notes) into professional English.

Format your response exactly as follows:
---
SUMMARY:
<your summary>

KEY_POINTS:
- <point 1>
- <point 2>...

VOCABULARY:
- <term 1>: <definition 1>
- <term 2>: <definition 2>...

NOTES:
<detailed professional markdown notes>
---

Transcript:
{truncated_transcript}
"""
    
    full_response = generate_completion(prompt)
    
    summary = "Summary generation failed."
    key_points = []
    vocabulary = []
    notes = ""
    
    try:
        if "fallback mock response" in full_response:
            summary = "This is a mock summary fallback due to missing API keys."
            key_points = ["Mock point 1", "Mock point 2", "Mock point 3", "Mock point 4", "Mock point 5"]
            vocabulary = [
                {"term": "Mock Term 1", "definition": "This is a mock definition for term 1."},
                {"term": "Mock Term 2", "definition": "This is a mock definition for term 2."}
            ]
            notes = "### Mock Notes\n\nThese are mock structured notes."
        else:
            parts = full_response.split("SUMMARY:")
            if len(parts) > 1:
                rest = parts[1]
                
                # Safely extract summary
                summary_match = re.search(r'SUMMARY:(.*?)KEY_POINTS:', rest, re.DOTALL)
                if summary_match:
                    summary = summary_match.group(1).strip()
                
                # Safely extract key points
                kp_match = re.search(r'KEY_POINTS:(.*?)VOCABULARY:', rest, re.DOTALL)
                if kp_match:
                    kp_part = kp_match.group(1).strip()
                    key_points = [line.replace("- ", "").strip() for line in kp_part.split("\n") if line.strip()]
                
                # Safely extract vocabulary
                vocab_match = re.search(r'VOCABULARY:(.*?)NOTES:', rest, re.DOTALL)
                if vocab_match:
                    vocab_part = vocab_match.group(1).strip()
                    vocabulary = []
                    for line in vocab_part.split("\n"):
                        if ":" in line:
                            try:
                                term_def = line.replace("- ", "").strip().split(":", 1)
                                vocabulary.append({"term": term_def[0].strip(), "definition": term_def[1].strip()})
                            except (IndexError, ValueError) as e:
                                logger.warning(f"Failed to parse vocabulary line: {line}, error: {e}")
                
                # Safely extract notes
                notes_match = re.search(r'NOTES:(.*?)$', rest, re.DOTALL)
                if notes_match:
                    notes = notes_match.group(1).strip()
                    
    except Exception as e:
        logger.error(f"Error parsing summary: {e}", exc_info=True)
        summary = full_response[:500]
        
    return {
        "short_summary": summary,
        "key_points": key_points,
        "vocabulary": vocabulary,
        "structured_notes": notes,
        "code_snippets": extract_code_snippets(notes)
    }

def extract_code_snippets(notes: str) -> list:
    """
    Parses markdown notes to extract code blocks.
    """
    snippets = []
    # Match ```language\ncode\n``` blocks
    pattern = r"```(\w+)?\n(.*?)\n```"
    matches = re.findall(pattern, notes, re.DOTALL)
    
    for lang, code in matches:
        snippets.append({
            "language": lang if lang else "text",
            "code": code.strip()
        })
    return snippets

def translate_content(text: str, target_lang: str) -> str:
    """
    Translates text into the target language using AI.
    """
    if target_lang.lower() == "english":
        return text
        
    prompt = f"""
Translate the following educational content into {target_lang}. 
Maintain the markdown formatting, code blocks, and technical terms if they are commonly used in English (e.g., 'Python', 'Array', 'Loop').
The tone should be professional and encouraging for a student.

Content:
{text}
"""
    return generate_completion(prompt)

def generate_flashcards(video_id: str, full_transcript: str) -> list:
    """
    Generates educational flashcards from the transcript.
    """
    prompt = f"""
You are an AI Learning Assistant. Create a list of 5-8 high-quality educational flashcards based on the following transcript.
Each flashcard must have a 'question' (or term) and 'answer' (or definition).
Format your response as a valid JSON list of objects:
[
  {{"question": "...", "answer": "..."}},
  ...
]

**Multi-Language Support**: If the transcript is NOT in English, you MUST translate the questions and answers into English.

Transcript:
{full_transcript[:8000]}
"""
    response = generate_completion(prompt)
    try:
        # Clean potential markdown code blocks
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            return json.loads(json_str)
        return []
    except (json.JSONDecodeError, AttributeError) as e:
        logger.warning(f"Failed to parse flashcards JSON: {e}")
        return []


def generate_chapters(video_id: str, segments: list) -> list:
    """
    Identifies logical chapters with titles and timestamps from transcription segments.
    """
    if not segments:
        return [{"title": "Introduction", "timestamp": 0.0}]
    
    # Sample every 5th segment to fit in context
    context_segments = segments[::5]
    segments_str = "\n".join([f"[{s.get('start', 0)}s]: {s.get('text', '')}" for s in context_segments])
    
    prompt = f"""
Analyze the following transcript fragments and identify 4-6 major logical "Chapters".
Provide a concise title and the starting timestamp for each chapter.
Format your response as a valid JSON list of objects:
[
  {{"title": "...", "timestamp": 12.5}},
  ...
]

**Multi-Language Support**: If the transcript is NOT in English, you MUST translate the chapter titles into English.

Segments:
{segments_str[:8000]}
"""
    response = generate_completion(prompt)
    try:
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            return json.loads(json_str)
        return [{"title": "Introduction", "timestamp": 0.0}]
    except (json.JSONDecodeError, AttributeError) as e:
        logger.warning(f"Failed to parse chapters JSON: {e}")
        return [{"title": "Introduction", "timestamp": 0.0}]

def generate_coding_challenges(video_id: str, full_transcript: str) -> list:
    """
    Generates coding challenges from the transcript if the video contains technical/coding content.
    """
    prompt = f"""
You are an AI Coding Instructor. Analyze the following transcript.
IF the transcript is EXPLICITLY about programming, coding, or software development tutorials, generate 1 to 3 practical coding challenges.
If the transcript is about biology, medicine, science, history, or ANY other non-programming topic, return an empty array []. DO NOT try to create coding metaphors for non-technical subjects.

For each coding challenge, provide:
- "id": A unique string ID (e.g., "challenge_1")
- "title": A short descriptive title
- "difficulty": One of "Easy", "Medium", "Hard"
- "problem_statement": A clear explanation of what the user needs to build/code in markdown.
- "constraints": A list of strings describing limitations (e.g., ["1 <= N <= 100"]).
- "starting_code": Boilerplate or starting code snippet.
- "solution": A correct reference implementation.
- "explanation": A step-by-step breakdown of how the solution works in markdown.
- "test_cases": A list of objects containing:
    - "input": String representation of input
    - "expected": String representation of the expected output
    - "is_hidden": Boolean (true for evaluation, false for user reference)
- "language": The primary programming language.

Respond ONLY with a valid JSON list of objects:
[
  {{
    "id": "...",
    "title": "...",
    "difficulty": "...",
    "problem_statement": "...",
    "constraints": [...],
    "starting_code": "...",
    "solution": "...",
    "explanation": "...",
    "test_cases": [
      {{ "input": "...", "expected": "...", "is_hidden": false }},
      ...
    ],
    "language": "..."
  }}
]

Transcript:
{full_transcript[:8000]}
"""
    response = generate_completion(prompt)
    try:
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            return json.loads(json_str)
        return []
    except (json.JSONDecodeError, AttributeError) as e:
        logger.warning(f"Failed to parse coding challenges JSON: {e}")
        return []

def evaluate_user_code(problem_context: dict, user_code: str) -> dict:
    """
    Evaluates the user's code submission against the problem description and test cases.
    """
    test_cases = problem_context.get('test_cases', [])
    constraints = problem_context.get('constraints', [])
    
    prompt = f"""
You are an AI Code Sandbox and Evaluator. Evaluate the user's code submission for the following problem.

Problem: {problem_context.get('title', 'Unknown')}
Difficulty: {problem_context.get('difficulty', 'Unknown')}
Statement: {problem_context.get('problem_statement', 'Unknown')}
Constraints: {constraints}
Expected Language: {problem_context.get('language', 'Unknown')}

Test Cases (Evaluate against these):
{test_cases}

User's Code Submission:
```
{user_code}
```

CRITICAL EVALUATION RULES:
1. Run a mental trace of the code against EVERY test case provided above.
2. If the code fails even ONE test case, "is_correct" must be false.
3. If the code has a potential time complexity issue based on the constraints, point it out.
4. Provide a "results" array matching the test cases order.

Respond ONLY with a valid JSON object:
{{
  "is_correct": true or false,
  "overall_feedback": "Markdown text summarizing the performance.",
  "results": [
    {{ "input": "...", "expected": "...", "actual": "...", "passed": true/false }},
    ...
  ],
  "stats": {{
     "runtime": "12ms (estimated)",
     "memory": "14.2MB (estimated)"
  }}
}}
"""
    response = generate_completion(prompt)
    try:
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"is_correct": False, "overall_feedback": "Could not parse AI response.", "results": []}
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Error evaluating code: {e}", exc_info=True)
        return {"is_correct": False, "overall_feedback": f"Error: {str(e)}", "results": []}

def generate_mind_map(video_id: str, transcript: str) -> dict:
    """
    Generates a structured mind map JSON from the transcript.
    """
    prompt = f"""
You are an AI Mind Map Designer. Create a hierarchical mind map based on the following transcript.

Structure:
1. Center: The core topic of the video (short, 1-3 words).
2. Branches: Top-level sub-topics (3 to 6 branches).
3. Details: A list of 3-5 key bullet points for each branch.

Respond ONLY with a valid JSON object in this format:
{{
  "center": "Core Topic Name",
  "branches": [
    {{
      "id": "1",
      "label": "First Sub-topic",
      "details": ["Detail 1", "Detail 2", "Detail 3"]
    }}
  ]
}}

Transcript:
{transcript[:8000]}
"""
    response = generate_completion(prompt)
    try:
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            return json.loads(match.group())
        
        return {"center": "Topic Mapping", "branches": []}
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse mind map JSON: {e}")
        return {"center": "Visual Analysis", "branches": []}
