from groq_api import generate_completion
import json

def generate_quiz(full_transcript: str) -> list[dict]:
    """
    Generates a 3-question multiple choice quiz based on the video transcript.
    """
    max_len = 12000
    truncated_transcript = full_transcript[:max_len]
    
    prompt = f"""
You are an AI teacher. Create a 5-question multiple-choice quiz based on the following transcript.
CRITICAL INSTRUCTION: Return ONLY a raw, perfectly valid JSON array of objects.
The "answer" field MUST be the EXACT STRING from the "options" list.

Example format:
[
  {{
    "question": "What keyword is used to define a function in Python?",
    "options": ["func", "define", "def", "function"],
    "answer": "def",
    "explanation": "In Python, the 'def' keyword is used to start a function definition."
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
