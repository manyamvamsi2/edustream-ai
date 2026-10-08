import os
import uuid
import re
import json
import urllib.request
from typing import Optional, Dict, Any
import yt_dlp

DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def extract_youtube_id(url: str) -> Optional[str]:
    """Extract YouTube 11-character video ID from any YouTube URL format."""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/|v\/|shorts\/)([0-9A-Za-z_-]{11})',
        r'youtu\.be\/([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_direct_youtube_transcript(url: str) -> Optional[Dict[str, Any]]:
    """
    Attempts to fetch subtitles/captions directly via youtube-transcript-api.
    This completely bypasses datacenter bot detection, takes <1s, and saves RAM/bandwidth.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        video_id = extract_youtube_id(url)
        if not video_id:
            return None
        
        # Try fetching English or automatically generated transcripts
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB'])
        if not transcript_list:
            # Fallback to any available language
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            
        if transcript_list:
            full_text = " ".join([item.get("text", "") for item in transcript_list])
            segments = []
            for item in transcript_list:
                segments.append({
                    "start": item.get("start", 0),
                    "end": item.get("start", 0) + item.get("duration", 0),
                    "text": item.get("text", "")
                })
            return {
                "text": full_text,
                "segments": segments
            }
    except Exception as e:
        print(f"[TRANSCRIPT-API] Direct transcript unavailable or blocked: {e}")
        return None

def download_youtube_audio(url: str) -> str:
    """
    Downloads audio from YouTube with Android/iOS player client spoofing
    to prevent cloud datacenter IP bot detection.
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
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'mweb'],
                'player_skip': ['configs', 'webpage']
            }
        },
        'http_headers': {
            'User-Agent': 'com.google.android.youtube/19.29.35 (Linux; U; Android 11) gzip',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }

    # Optional cookie support for restricted videos
    cookies_env = os.getenv("YOUTUBE_COOKIES")
    if cookies_env:
        cookies_file = os.path.join(DOWNLOAD_DIR, "yt_cookies.txt")
        try:
            with open(cookies_file, "w", encoding="utf-8") as f:
                f.write(cookies_env)
            ydl_opts['cookiefile'] = cookies_file
        except Exception:
            pass

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        expected_file = os.path.join(DOWNLOAD_DIR, f"{video_id}.mp3")
        if os.path.exists(expected_file):
            return expected_file
        else:
            raise FileNotFoundError("Audio file was not created successfully.")
    except Exception as e:
        raise Exception(f"Failed to download video from {url}: {str(e)}")

def get_video_info(url: str) -> dict:
    """
    Extracts video metadata using oEmbed first (100% immune to bot blocking)
    with yt-dlp as fallback.
    """
    # 1. Try public YouTube oEmbed API (Never blocked on cloud IPs)
    try:
        oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {
                "title": data.get("title", "YouTube Video"),
                "thumbnail": data.get("thumbnail_url", ""),
                "duration": "YouTube Lecture"
            }
    except Exception:
        pass

    # 2. Fallback to yt-dlp with mobile client
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios']
            }
        }
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
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
            "title": "YouTube Video",
            "thumbnail": "",
            "duration": "YouTube Lecture"
        }

def extract_audio_from_video(video_path: str) -> str:
    """Extracts audio from a local video file using ffmpeg."""
    import subprocess
    audio_path = video_path.rsplit('.', 1)[0] + ".mp3"
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
