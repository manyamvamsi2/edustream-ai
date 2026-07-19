import os
import asyncio
import logging
import time
from typing import Optional
from dotenv import load_dotenv

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    import requests

load_dotenv()
logger = logging.getLogger(__name__)

def generate_completion(prompt: str, max_retries: int = 3) -> str:
    """
    Generates completion using Groq API with built-in retries and error handling.
    Uses httpx if available for non-blocking I/O, falls back to requests.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY missing in environment variables")
        return "ERROR: GROQ_API_KEY_MISSING - Please set GROQ_API_KEY in .env file"

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful AI learning assistant. Provide clear, structured, and informative educational content."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 2000
    }

    for attempt in range(max_retries):
        try:
            logger.info(f"Groq API call attempt {attempt + 1}/{max_retries} | Model: {model}")
            
            if HAS_HTTPX:
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(url, headers=headers, json=data)
            else:
                response = requests.post(url, headers=headers, json=data, timeout=30)
            
            # Handle rate limiting
            if response.status_code == 429:
                wait_time = (attempt + 1) * 2
                logger.warning(f"Rate limit reached. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            
            # Raise for other HTTP errors
            response.raise_for_status()
            
            result = response.json()
            completion = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            if not completion:
                raise ValueError("Empty response from Groq API")
            
            logger.info("Groq API call successful")
            return completion
            
        except Exception as e:
            logger.error(f"Groq API error (attempt {attempt + 1}): {str(e)}", exc_info=True)
            
            if attempt == max_retries - 1:
                error_msg = f"Failed after {max_retries} attempts: {str(e)}"
                logger.error(error_msg)
                return f"ERROR: {error_msg}"
            
            time.sleep(2)

    return "ERROR: Completion failed after multiple retries"
