import whisper

# Load the whisper model globally so it isn't reloaded on every request
# 'base' is used for memory efficiency and speed
print("Loading Whisper model...")
model = whisper.load_model("base")

def transcribe_audio(audio_path: str) -> dict:
    """
    Transcribes the given audio file using OpenAI's Whisper model.
    Returns a dictionary containing the full text and segments with timestamps.
    """
    try:
        print(f"Starting transcription for {audio_path} (this might take a while)...")
        result = model.transcribe(audio_path)
        return result
    except Exception as e:
        raise Exception(f"Failed to transcribe audio: {str(e)}")
