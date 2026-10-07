from groq_api import generate_completion
import json

def generate_quiz(full_transcript: str, difficulty: str = "Medium") -> list[dict]:
    """
    Generates a 5-question multiple choice quiz based on the video transcript,
    customized by requested difficulty level (Easy, Medium, Hard).
    """
    max_len = 12000
    truncated_transcript = full_transcript[:max_len]
    
    diff_instructions = {
        "Easy": "Target Beginners: focus on direct definitions, clear foundational facts, and explicit points directly stated in the material.",
        "Medium": "Target Intermediate learners: test conceptual understanding, connections between ideas, and scenario applications.",
        "Hard": "Target Advanced learners: challenge with tricky edge cases, deep reasoning, nuanced distinctions, and multi-step deduction."
    }.get(difficulty.capitalize(), "test balanced conceptual understanding and core facts.")

    prompt = f"""
You are an expert AI teacher. Create a 5-question multiple-choice quiz based strictly on the key concepts taught in the following transcript.
Target Difficulty: {difficulty.upper()} ({diff_instructions})
Focus on understanding core concepts, facts, and ideas from the video.
DO NOT create programming or code questions unless the video is explicitly teaching programming syntax.
CRITICAL INSTRUCTION: Return ONLY a raw, perfectly valid JSON array of objects.
The "answer" field MUST be the EXACT STRING from the "options" list. Include "difficulty": "{difficulty.capitalize()}" for each item.

Example format:
[
  {{
    "question": "What is the primary concept discussed in this section?",
    "options": ["Concept A", "Concept B", "Concept C", "Concept D"],
    "answer": "Concept A",
    "explanation": "Concept A is highlighted as the primary mechanism.",
    "difficulty": "{difficulty.capitalize()}"
  }}
]

Transcript:
{truncated_transcript}
"""
    
    response = generate_completion(prompt)
    
    try:
        # Check if it's the mock response
        if "fallback mock response" in response:
            return [{
                "question": "This is a mock quiz since no API keys were provided.",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": "Option A",
                "explanation": "Mock explanation."
            }]

        # Aggressively strip markdown from Groq response
        cleaned_response = response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        
        cleaned_response = cleaned_response.strip()
        
        quiz_data = json.loads(cleaned_response)
        return quiz_data
    except Exception as e:
        print(f"Quiz generation failed: {e}\nResponse was:\n{response}")
        return [{
            "question": "Failed to generate quiz. Check API limits or prompt.",
            "options": ["Error", "Error", "Error", "Error"],
            "answer": "Error",
            "explanation": "There was an error."
        }]
