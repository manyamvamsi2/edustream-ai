import json
import re
import logging
from typing import Dict, List, Any
from groq_api import generate_completion
from vectordb import search_chunks

logger = logging.getLogger(__name__)

async def answer_video_query(video_id: str, query: str, content_type: str = "video") -> dict:
    """
    Retrieves context from MongoDB and asks the LLM to answer the query.
    Returns the answer and timestamp references (for video/audio only, omitted for documents).
    """
    relevant_chunks = await search_chunks(video_id, query, top_k=5)
    
    is_doc = content_type == "document" or (str(video_id).startswith("file_") and content_type != "audio" and content_type != "video")
    
    context_parts = []
    timestamps = []
    for i, chunk in enumerate(relevant_chunks):
        start = round(chunk.get("start", 0) or 0, 2)
        end = round(chunk.get("end", 0) or 0, 2)
        text = chunk.get("text", "")
        
        if is_doc:
            context_parts.append(f"[Document Excerpt]: {text}")
        else:
            # Format MM:SS
            start_min = int(start // 60)
            start_sec = int(start % 60)
            time_tag = f"{start_min}:{start_sec:02d}"
            context_parts.append(f"[Time {time_tag} ({start}s - {end}s)]: {text}")
            timestamps.append({"start": start, "end": end, "text": text[:50] + "..."})

    context_str = "\n".join(context_parts)

    if is_doc:
        timeline_rule = """2. STRICTLY NO TIMESTAMPS OR VIDEO TIMELINE REFERENCES:
   - This material is an uploaded DOCUMENT / PDF (NOT a video).
   - NEVER output timestamps, time codes (e.g. 1:12, 166:40), or phrases like "Click any timestamp to jump to the recording".
   - Answer purely in structured, conceptual narrative with bold terms, bullet points, and numbered steps."""
        assistant_role = "You are EduStream AI, an intelligent, helpful interactive document and study assistant.\nAnswer the user's question clearly, accurately, and educationally using the document context below."
        context_header = "Document Context:"
    else:
        timeline_rule = """2. CLICKABLE TIMELINE / TIMESTAMPS:
   - When explaining any step, concept, or event from the video, naturally include a clickable timeline tag in the format: `[M:SS]` or `[MM:SS]` (for example: `[1:12]`, `[5:51]`, `[7:48]`, `[0:45]`).
   - The frontend will automatically convert these into clean interactive timestamp buttons (e.g. 1:12) that let the user click to jump directly to that exact moment in the video and start playback.
   - Place these timeline tags at the end of the relevant sentence or heading (e.g. "**Step 1: Setup Vector Store** [1:12]")."""
        assistant_role = "You are EduStream AI, an intelligent, helpful interactive video learning assistant.\nAnswer the user's question clearly, accurately, and educationally using the video transcript context below."
        context_header = "Video Transcript Context:"

    prompt = f"""
{assistant_role}

STRICT FORMATTING & OUTPUT RULES:
1. STRICTLY NO TABLES OR COLUMNS:
   - NEVER output markdown tables (| col | col |), summary tables, or multi-column grids under any circumstances.
   - Always present comparisons, workflows, and recaps as clean bullet lists (-) or numbered items (1., 2.) that fit cleanly in a single-column chat bubble.

{timeline_rule}

3. NO UNNECESSARY CODE BLOCKS:
   - DO NOT include code snippets or code blocks unless the user's query explicitly asks for code or syntax implementation.
   - Explain processes and concepts conceptually in clear plain English.

4. CONCISE & HELPFUL:
   - If asked for a short summary, provide a concise, readable breakdown (e.g. Key Concepts, Main Steps, and Conclusion).
   - If the user greets you or asks general questions, be warm, encouraging, and helpful.

{context_header}
{context_str}

User Question:
{query}
"""

    answer = generate_completion(prompt)

    return {
        "answer": answer,
        "timestamps": timestamps if not is_doc else []
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
- **Code Usage Restriction**: 
  - DO NOT include code snippets or code blocks across notes by default. Focus on conceptual understanding, key ideas, principles, definitions, and structured explanations.
  - ONLY include a code snippet if the video is exclusively a coding tutorial AND a brief snippet is strictly essential to illustrate a core syntax point. Never add code blocks for general, theoretical, science, history, or non-programming content.
- Use **Bold for all Heading titles** (e.g., ## **Heading Name**).
- Use clear H1, H2, and H3 headers for hierarchy.
- Use bullet points, bold terms, and concise paragraphs for high readability.
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
    
    summary = ""
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
            cleaned_resp = full_response.strip()
            
            # Robust regex extraction for each section
            summary_match = re.search(r'(?:^|\n)(?:#+\s*|\*{0,2})(?:1\.\s*)?SUMMARY:?\*{0,2}\s*\n?(.*?)(?=(?:^|\n)(?:#+\s*|\*{0,2})(?:2\.\s*)?KEY[_\s]POINTS:?|\Z)', cleaned_resp, re.DOTALL | re.IGNORECASE)
            key_points_match = re.search(r'(?:^|\n)(?:#+\s*|\*{0,2})(?:2\.\s*)?KEY[_\s]POINTS:?\*{0,2}\s*\n?(.*?)(?=(?:^|\n)(?:#+\s*|\*{0,2})(?:3\.\s*)?VOCABULARY:?|\Z)', cleaned_resp, re.DOTALL | re.IGNORECASE)
            vocab_match = re.search(r'(?:^|\n)(?:#+\s*|\*{0,2})(?:3\.\s*)?VOCABULARY:?\*{0,2}\s*\n?(.*?)(?=(?:^|\n)(?:#+\s*|\*{0,2})(?:4\.\s*)?(?:STRUCTURED\s+)?NOTES:?|\Z)', cleaned_resp, re.DOTALL | re.IGNORECASE)
            notes_match = re.search(r'(?:^|\n)(?:#+\s*|\*{0,2})(?:4\.\s*)?(?:STRUCTURED\s+)?NOTES:?\*{0,2}\s*\n?(.*)$', cleaned_resp, re.DOTALL | re.IGNORECASE)

            if summary_match and summary_match.group(1).strip():
                summary = summary_match.group(1).strip()
            if key_points_match and key_points_match.group(1).strip():
                raw_kp = key_points_match.group(1).strip()
                key_points = [re.sub(r'^[*\-•\d\.\s]+', '', line).strip() for line in raw_kp.split('\n') if line.strip() and not line.strip().startswith('---')]
            if vocab_match and vocab_match.group(1).strip():
                raw_vocab = vocab_match.group(1).strip()
                for line in raw_vocab.split('\n'):
                    cleaned_line = re.sub(r'^[*\-•\s]+', '', line).strip()
                    if ':' in cleaned_line:
                        term_def = cleaned_line.split(':', 1)
                        term = term_def[0].replace('**', '').replace('*', '').strip()
                        defn = term_def[1].strip()
                        if term and defn:
                            vocabulary.append({"term": term, "definition": defn})
            if notes_match and notes_match.group(1).strip():
                notes = notes_match.group(1).strip()
                notes = re.sub(r'\n---+\s*$', '', notes).strip()

            # Clean summary from any lingering section header or dashes
            summary = re.sub(r'^[\s\-\*#]*(?:SUMMARY:?)?[\s\-\*#]*', '', summary, flags=re.IGNORECASE).strip()
            summary = re.sub(r'---+\s*$', '', summary).strip()

            # Fallbacks if regex missed specific markers
            if not summary:
                paragraphs = [p.strip() for p in cleaned_resp.split('\n\n') if p.strip() and not p.strip().startswith('#') and not p.strip().startswith('---')]
                summary = paragraphs[0] if paragraphs else "Summary generated."
            if not notes and not key_points:
                notes = cleaned_resp
    except Exception as e:
        logger.error(f"Error parsing summary: {e}", exc_info=True)
        # Even on exception, extract first paragraph instead of dumping raw string
        paragraphs = [p.strip() for p in full_response.split('\n\n') if p.strip() and not p.strip().startswith('#') and not p.strip().startswith('---')]
        summary = paragraphs[0] if paragraphs else full_response[:300]
        notes = full_response
        
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
You are an expert Educational Concept Mapper. Create a structured, hierarchical visual mind map JSON based on the learning transcript below.

Return ONLY a valid JSON object matching this schema:
{{
  "center": "Core Subject (2-4 words)",
  "description": "A concise summary sentence about the topic",
  "branches": [
    {{
      "id": "1",
      "label": "Topic or Stage Name",
      "color": "indigo",
      "details": [
        "Key takeaway or concept 1",
        "Key takeaway or concept 2",
        "Key takeaway or concept 3"
      ]
    }}
  ]
}}

Colors to choose from: "indigo", "blue", "emerald", "amber", "purple", "rose", "cyan". Provide between 4 and 6 comprehensive branches with 3-4 details each.

Transcript:
{transcript[:8000]}
"""
    response = generate_completion(prompt)
    try:
        import json
        import re
        
        # Clean markdown codeblocks
        clean_resp = re.sub(r'```json\s*', '', response)
        clean_resp = re.sub(r'```\s*', '', clean_resp).strip()
        
        match = re.search(r'\{.*\}', clean_resp, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            if "branches" in parsed and isinstance(parsed["branches"], list) and len(parsed["branches"]) > 0:
                return parsed
        
        json_start = clean_resp.find('{')
        json_end = clean_resp.rfind('}')
        if json_start != -1 and json_end != -1:
            parsed = json.loads(clean_resp[json_start:json_end+1])
            if "branches" in parsed and isinstance(parsed["branches"], list):
                return parsed
                
        return {"center": "Core Concepts", "description": "Key concepts breakdown", "branches": []}
    except Exception as e:
        print(f"[MINDMAP] Error parsing mindmap: {e}")
        return {"center": "Core Concepts", "description": "Key concepts breakdown", "branches": []}

def generate_similar_problems(video_id: str, transcript: str, difficulty: str = "Medium", topic: str = "") -> list:
    """
    Service: Similar Problems
    Generates 3-4 similar practice problems / exercises based on concepts taught in the video/document.
    Adapts according to requested difficulty level (Easy, Medium, Hard).
    """
    diff_instructions = {
        "Easy": "Beginner level: direct application of formulas or concepts with simple numbers/scenarios.",
        "Medium": "Intermediate level: requires combining two concepts, diagnosing a scenario, or multi-step reasoning.",
        "Hard": "Advanced level: tricky edge-cases, deep conceptual trade-offs, synthesis, or rigorous problem-solving."
    }.get(difficulty.capitalize(), "Intermediate application of concepts.")

    topic_prompt = f"Focus particularly on the topic: {topic}." if topic else ""

    prompt = f"""
You are an expert Professor and Curriculum Designer. Analyze the following educational transcript.
CONDITION:
- IF the transcript covers programming, coding, algorithms, mathematics, quantitative problem-solving, logic, system design, or technical exercises, generate 3 to 4 high-quality SIMILAR PRACTICE PROBLEMS for the learner to solve.
- IF the transcript is purely conversational, narrative, historical, biographical, artistic, or does NOT contain technical/quantitative problem-solving concepts, return an empty JSON array: [].

Target Difficulty: {difficulty.upper()} ({diff_instructions})
{topic_prompt}

For each problem, provide:
- "id": A unique string (e.g., "prob_1", "prob_2")
- "title": A clear descriptive title
- "difficulty": "{difficulty.capitalize()}"
- "type": One of "Conceptual", "Calculation", "Scenario Analysis", "Code/Algorithm"
- "problem_statement": Clear problem description in markdown with formatting.
- "hints": A list of 2-3 progressive hints that help the student without immediately giving away the answer.
- "solution": Detailed, step-by-step worked solution and final answer.
- "key_takeaway": The core rule or intuition being tested.

Respond ONLY with a valid JSON array:
[
  {{
    "id": "prob_1",
    "title": "...",
    "difficulty": "{difficulty.capitalize()}",
    "type": "...",
    "problem_statement": "...",
    "hints": ["Hint 1", "Hint 2"],
    "solution": "...",
    "key_takeaway": "..."
  }}
]

Transcript:
{transcript[:8000]}
"""
    response = generate_completion(prompt)
    try:
        import json
        import re
        clean_resp = re.sub(r'```json\s*', '', response)
        clean_resp = re.sub(r'```\s*', '', clean_resp).strip()
        match = re.search(r'\[.*\]', clean_resp, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []
    except Exception as e:
        print(f"[SIMILAR PROBLEMS] Error: {e}")
        return []

def generate_recommendations(video_id: str, transcript: str, user_profile: dict = None) -> dict:
    """
    Service: Recommendations
    Generates tailored next-step recommendations, prerequisites, search queries, and learning paths.
    """
    interests = user_profile.get("interests", []) if user_profile else []
    interests_str = f"User Interests: {', '.join(interests)}" if interests else ""

    prompt = f"""
You are an AI Academic Advisor and Learning Strategist. Analyze this educational transcript and generate personalized LEARNING RECOMMENDATIONS for the student.
{interests_str}

Return ONLY a valid JSON object matching this schema:
{{
  "recommended_topics": [
    {{
      "title": "Next Topic Name",
      "reason": "Why the student should study this next and how it builds on this material",
      "difficulty": "Intermediate or Advanced"
    }}
  ],
  "prerequisites": [
    {{
      "concept": "Foundational Concept",
      "summary": "Brief refresher summary in case the learner found this material challenging"
    }}
  ],
  "curated_search_queries": [
    "Exact query 1 for YouTube or Google Scholar",
    "Exact query 2 for YouTube or Google Scholar",
    "Exact query 3 for YouTube or Google Scholar"
  ],
  "hands_on_project": {{
    "title": "Mini Practice Project / Experiment",
    "description": "A practical project or thought experiment to apply what was learned",
    "deliverable": "What the user should produce"
  }},
  "action_plan": [
    "Step 1: Immediate recap action",
    "Step 2: Deepening exercise",
    "Step 3: Exploration step"
  ]
}}

Transcript:
{transcript[:8000]}
"""
    response = generate_completion(prompt)
    try:
        clean_resp = re.sub(r'```json\s*', '', response)
        clean_resp = re.sub(r'```\s*', '', clean_resp).strip()
        match = re.search(r'\{.*\}', clean_resp, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {
            "recommended_topics": [],
            "prerequisites": [],
            "curated_search_queries": [],
            "hands_on_project": {},
            "action_plan": []
        }
    except Exception as e:
        logger.error(f"[RECOMMENDATIONS] Error parsing recommendations: {e}", exc_info=True)
        return {
            "recommended_topics": [],
            "prerequisites": [],
            "curated_search_queries": [],
            "hands_on_project": {},
            "action_plan": []
        }

