import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def transcribe_audio(audio_path: str) -> dict:
    """
    Transcribes the given audio file using Groq's Whisper API.
    This is extremely fast and saves ~200MB+ of RAM compared to local whisper.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY not found in environment variables.")

    client = Groq(api_key=api_key)

    try:
        print(f"Starting cloud transcription for {audio_path} via Groq...")
        
        with open(audio_path, "rb") as file:
            # Using whisper-large-v3 for high accuracy
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), file.read()),
                model="whisper-large-v3",
                response_format="verbose_json",
            )
            
            # Convert Groq response to the format expected by our app
            # (which is the same as OpenAI Whisper's output format)
            return transcription.model_dump()
            
    except Exception as e:
        print(f"Failed to transcribe audio via Groq: {str(e)}")
        raise Exception(f"Transcription failed: {str(e)}")
