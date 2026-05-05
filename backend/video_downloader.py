import os
import uuid
import yt_dlp

DOWNLOAD_DIR = "downloads"

os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def download_youtube_audio(url: str) -> str:
    """
    Downloads the audio from a YouTube video using yt-dlp.
    Returns the file path of the downloaded audio.
    """
    video_id = str(uuid.uuid4())
    output_template = os.path.join(DOWNLOAD_DIR, f"{video_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': output_template,
        'quiet': False,
        'no_warnings': False,
        'noprogress': False,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        # After download, the file will be renamed to end with .mp3
        expected_file = os.path.join(DOWNLOAD_DIR, f"{video_id}.mp3")
        if os.path.exists(expected_file):
            return expected_file
        else:
            raise FileNotFoundError("Audio file was not created successfully.")
    except Exception as e:
        raise Exception(f"Failed to download video from {url}: {str(e)}")

def get_video_info(url: str) -> dict:
    """
    Extracts video metadata (title, thumbnail, duration) using yt-dlp.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Format duration as MM:SS
            duration_sec = info.get('duration', 0)
            minutes = duration_sec // 60
            seconds = duration_sec % 60
            duration_str = f"{minutes}:{seconds:02d}"
            
            return {
                "title": info.get('title', 'Video'),
                "thumbnail": info.get('thumbnail', ''),
                "duration": duration_str
            }
    except Exception as e:
        print(f"Error fetching video info: {e}")
        return {
            "title": "Video",
            "thumbnail": "",
            "duration": "0:00"
        }

def extract_audio_from_video(video_path: str) -> str:
    """
    Extracts audio from a local video file using ffmpeg.
    Returns the path to the generated mp3 file.
    """
    import subprocess
    audio_path = video_path.rsplit('.', 1)[0] + ".mp3"
    
    # ffmpeg -i input.mp4 -vn -acodec libmp3lame -q:a 2 output.mp3
    try:
        command = [
            "ffmpeg", "-i", video_path,
            "-vn", "-acodec", "libmp3lame",
            "-q:a", "2", "-y", audio_path
        ]
        subprocess.run(command, check=True, capture_output=True)
        return audio_path
    except Exception as e:
        raise Exception(f"Failed to extract audio from video: {str(e)}")
