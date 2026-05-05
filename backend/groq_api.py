import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

def generate_completion(prompt: str) -> str:
    """
    Exclusively uses Groq API for LLM completions with built-in retries.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[!] ERROR: GROQ_API_KEY missing in .env")
        return "GROQ_API_KEY_MISSING"

    model = "llama-3.3-70b-versatile"
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful AI learning assistant. provide clear, structured, and informative educational content."},
            {"role": "user", "content": prompt}
        ]
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"--- [GROQ API] Attempt {attempt + 1} | Model: {model} ---")
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 429:
                # Rate limit hit
                wait_time = (attempt + 1) * 2 # Simple linear backoff
                print(f"--> [!] Rate limit reached. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
                
            response.raise_for_status()
            print(f"--- [GROQ API] Call successful ---")
            return response.json()['choices'][0]['message']['content']
            
        except Exception as e:
            print(f"--> [!] GROQ ERROR (Attempt {attempt + 1}): {str(e)}")
            if attempt == max_retries - 1:
                return f"All Groq attempts failed. Error: {str(e)}"
            time.sleep(2)

    return "Completion failed after multiple retries."
