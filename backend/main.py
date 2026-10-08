import os
import uuid
import shutil
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

# Load environment variables
load_dotenv()

from video_downloader import (
    download_youtube_audio, 
    get_video_info as fetch_video_info, 
    extract_audio_from_video,
    extract_youtube_id,
    get_direct_youtube_transcript
)
from transcription import transcribe_audio
from chunking import chunk_transcript
from vectordb import store_chunks_in_db
from rag_pipeline import (
    answer_video_query, 
    generate_smart_summary, 
    translate_content,
    generate_flashcards,
    generate_chapters,
    generate_coding_challenges,
    evaluate_user_code,
    generate_similar_problems,
    generate_recommendations
)
from pypdf import PdfReader
import docx
from pptx import Presentation
from quiz_generator import generate_quiz
from fastapi.responses import FileResponse
from cloudinary_storage import upload_file_to_cloudinary, is_cloudinary_configured

app = FastAPI(
    title="AI Video Learning Assistant",
    description="Backend API for processing and understanding educational videos.",
    version="1.0.0"
)

# Configurable CORS origins
cors_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
if cors_origins_env.strip() == "*":
    allowed_origins = ["*"]
    allow_credentials = False
else:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure DOWNLOAD_DIR exists and mount it
from video_downloader import DOWNLOAD_DIR
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
app.mount("/api/media", StaticFiles(directory=DOWNLOAD_DIR), name="media")

from database import (
    videos_collection, 
    save_video_metadata, 
    get_video_by_id, 
    add_to_history, 
    history_collection,
    get_user_profile,
    update_user_profile,
    get_chat_history,
    add_chat_message,
    chat_history_collection,
    get_submissions,
    add_submission,
    add_feedback,
    update_learner_knowledge,
    get_learner_knowledge,
    ensure_indexes
)

@app.on_event("startup")
async def startup_event():
    """Initialize database indexes on server start."""
    try:
        await ensure_indexes()
        print("[SERVER] Database indexes ensured. EduStream AI Backend ready.")
    except Exception as e:
        print(f"[SERVER WARNING] Database index setup delayed: {e}")

@app.get("/")
async def root():
    return {"status": "ok", "service": "EduStream AI Backend"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

class DocumentRequest(BaseModel):
    user_id: str

class VideoRequest(BaseModel):
    url: str

class ChatQuery(BaseModel):
    question: str

class HistoryEntry(BaseModel):
    user_id: str
    video_id: str
    title: str
    url: str

import json
from fastapi.responses import StreamingResponse

@app.post("/api/process-video")
async def process_video(request: VideoRequest, user_id: Optional[str] = "guest"):
    async def event_generator():
        try:
            # Step 1: Info & Cache Check
            yield f"data: {json.dumps({'step': 'info', 'message': 'Fetching video metadata...', 'percent': 10})}\n\n"
            video_info = fetch_video_info(request.url)
            
            yt_id = extract_youtube_id(request.url)
            video_id = yt_id if yt_id else str(uuid.uuid4())
            
            # Check if already processed
            existing = await get_video_by_id(video_id)
            if existing:
                if user_id != "guest":
                    await add_to_history(
                        user_id, 
                        video_id, 
                        video_info.get("title", "Video"), 
                        request.url,
                        video_info.get("thumbnail", ""),
                        video_info.get("duration", ""),
                        "video"
                    )
                yield f"data: {json.dumps({'step': 'completed', 'video_id': video_id, 'message': 'Video ready!', 'percent': 100})}\n\n"
                return

            # Step 2: Try direct transcript extraction (Fast & bypasses datacenter bot detection)
            transcript_res = None
            try:
                yield f"data: {json.dumps({'step': 'transcribe', 'message': 'Extracting lecture transcripts...', 'percent': 30})}\n\n"
                transcript_res = get_direct_youtube_transcript(request.url)
            except Exception:
                transcript_res = None

            # Fallback to audio download & Whisper if direct transcript was not available
            if not transcript_res or not transcript_res.get("text"):
                yield f"data: {json.dumps({'step': 'download', 'message': 'Downloading audio stream for AI transcription...', 'percent': 40})}\n\n"
                audio_path = download_youtube_audio(request.url)
                
                yield f"data: {json.dumps({'step': 'transcribe', 'message': 'Transcribing audio (Groq AI)...', 'percent': 55})}\n\n"
                transcript_res = transcribe_audio(audio_path)
            
            full_transcript = transcript_res.get("text", "")
            
            # Step 3: Chunking & Vector DB
            yield f"data: {json.dumps({'step': 'indexing', 'message': 'Optimizing for search & chat...', 'percent': 65})}\n\n"
            chunks = chunk_transcript(transcript_res)
            await store_chunks_in_db(video_id, chunks)
            
            # Step 4: Summary, Quiz, Flashcards, Mindmap, Chapters
            yield f"data: {json.dumps({'step': 'analyze', 'message': 'AI generating comprehensive learning materials...', 'percent': 85})}\n\n"
            summary_data = generate_smart_summary(video_id, full_transcript)
            quiz_data = generate_quiz(full_transcript)
            flashcard_data = generate_flashcards(video_id, full_transcript)
            chapter_data = generate_chapters(video_id, transcript_res.get("segments", []))
            challenges_data = generate_coding_challenges(video_id, full_transcript)
            similar_problems_data = generate_similar_problems(video_id, full_transcript)
            recommendations_data = generate_recommendations(video_id, full_transcript)
            
            # Step 5: Save & History
            metadata = {
                "video_id": video_id,
                "url": request.url,
                "title": video_info.get("title", ""),
                "thumbnail": video_info.get("thumbnail", ""),
                "duration": video_info.get("duration", ""),
                "transcript": full_transcript,
                "content_type": "video",
                "summary": summary_data,
                "quiz": quiz_data,
                "flashcards": flashcard_data,
                "chapters": chapter_data,
                "challenges": challenges_data,
                "similar_problems": similar_problems_data,
                "recommendations": recommendations_data
            }
            await save_video_metadata(video_id, metadata)
            
            if user_id != "guest":
                await add_to_history(
                    user_id, 
                    video_id, 
                    video_info.get("title", "Video"), 
                    request.url,
                    video_info.get("thumbnail", ""),
                    video_info.get("duration", ""),
                    "video"
                )
            
            yield f"data: {json.dumps({'step': 'completed', 'video_id': video_id, 'message': 'All done!', 'percent': 100})}\n\n"

        except Exception as e:
            print(f"Error in process_video: {str(e)}")
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/process-file")
async def process_file(file: UploadFile = File(...), user_id: Optional[str] = "guest"):
    async def event_generator():
        try:
            filename = file.filename
            is_pdf = filename.lower().endswith(".pdf")
            is_docx = any(filename.lower().endswith(ext) for ext in [".docx", ".doc"])
            is_pptx = any(filename.lower().endswith(ext) for ext in [".pptx", ".ppt"])
            is_video = any(filename.lower().endswith(ext) for ext in [".mp4", ".mov", ".webm", ".mkv"])
            is_audio = any(filename.lower().endswith(ext) for ext in [".mp3", ".wav"])
            
            if not is_pdf and not is_docx and not is_pptx and not is_video and not is_audio:
                yield f"data: {json.dumps({'step': 'error', 'message': 'Unsupported file type. Please upload PDF, Word (DOCX), PowerPoint (PPTX), Video, or Audio.'})}\n\n"
                return

            # File size limits
            MAX_DOC_SIZE = 15 * 1024 * 1024    # 15MB for docs/slides
            MAX_MEDIA_SIZE = 50 * 1024 * 1024  # 50MB for video/audio
            is_document_file = is_pdf or is_docx or is_pptx
            max_size = MAX_DOC_SIZE if is_document_file else MAX_MEDIA_SIZE
            file_content = await file.read()
            file_size = len(file_content)
            if file_size > max_size:
                max_label = "15MB" if is_document_file else "50MB"
                yield f"data: {json.dumps({'step': 'error', 'message': f'File too large ({file_size / (1024*1024):.1f}MB). Maximum: {max_label}.'})}\n\n"
                return
            # Reset file position for saving
            await file.seek(0)

            yield f"data: {json.dumps({'step': 'info', 'message': f'Processing {filename}...', 'percent': 10})}\n\n"
            
            # Save file
            file_id = f"file_{uuid.uuid4().hex[:8]}"
            ext = filename.rsplit('.', 1)[-1]
            temp_path = os.path.join(DOWNLOAD_DIR, f"{file_id}.{ext}")
            
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            full_text = ""
            content_type = "document"
            thumbnail = "https://cdn-icons-png.flaticon.com/512/337/337946.png" # Default PDF Icon
            duration = "Document"
            media_url = f"/api/media/{file_id}.{ext}"

            if is_pdf:
                # PDF Extraction
                yield f"data: {json.dumps({'step': 'extract', 'message': 'Extracting text from PDF...', 'percent': 30})}\n\n"
                reader = PdfReader(temp_path)
                for page in reader.pages:
                    extracted = page.extract_text() or ""
                    full_text += extracted + "\n"
                full_text = full_text.strip()
                if not full_text:
                    full_text = f"Uploaded PDF Document: {filename}. (Contains {len(reader.pages)} pages)."
                duration = f"PDF ({len(reader.pages)} pages)"
            elif is_docx:
                # Word Document Extraction (DOCX)
                yield f"data: {json.dumps({'step': 'extract', 'message': 'Extracting text & tables from Word DOCX...', 'percent': 30})}\n\n"
                thumbnail = "https://cdn-icons-png.flaticon.com/512/337/337932.png" # Word icon
                doc = docx.Document(temp_path)
                extracted_lines = []
                for p in doc.paragraphs:
                    if p.text.strip():
                        extracted_lines.append(p.text.strip())
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                        if row_text:
                            extracted_lines.append(row_text)
                full_text = "\n\n".join(extracted_lines).strip()
                if not full_text:
                    full_text = f"Uploaded Word Document: {filename}."
                duration = "Word DOCX"
            elif is_pptx:
                # PowerPoint Slide Extraction (PPTX)
                yield f"data: {json.dumps({'step': 'extract', 'message': 'Extracting slides from PowerPoint PPTX...', 'percent': 30})}\n\n"
                thumbnail = "https://cdn-icons-png.flaticon.com/512/337/337949.png" # PPTX icon
                prs = Presentation(temp_path)
                slide_sections = []
                for s_idx, slide in enumerate(prs.slides, 1):
                    s_items = []
                    for shape in slide.shapes:
                        if shape.has_text_frame:
                            for p in shape.text_frame.paragraphs:
                                if p.text.strip():
                                    s_items.append(p.text.strip())
                    if s_items:
                        slide_sections.append(f"### [Slide {s_idx}]\n" + "\n".join(f"- {item}" for item in s_items))
                full_text = "\n\n".join(slide_sections).strip()
                if not full_text:
                    full_text = f"Uploaded PowerPoint Presentation: {filename}. (Contains {len(prs.slides)} slides)."
                duration = f"PPTX ({len(prs.slides)} slides)"
            elif is_audio:
                # Audio Processing (Podcasts/Lectures)
                content_type = "audio"
                thumbnail = "https://cdn-icons-png.flaticon.com/512/860/860155.png" # Audio logo
                media_url = f"/api/media/{file_id}.{ext}"
                
                yield f"data: {json.dumps({'step': 'transcribe', 'message': 'Transcribing audio (AI)...', 'percent': 40})}\n\n"
                transcript_res = transcribe_audio(temp_path)
                full_text = transcript_res.get("text", "")
                duration = "Local Audio"
            else:
                # Video Extraction
                content_type = "video"
                thumbnail = "" # Will be default logo in frontend for now
                media_url = f"/api/media/{file_id}.{ext}"
                
                yield f"data: {json.dumps({'step': 'download', 'message': 'Extracting audio from video...', 'percent': 25})}\n\n"
                audio_path = extract_audio_from_video(temp_path)
                
                yield f"data: {json.dumps({'step': 'transcribe', 'message': 'Transcribing video audio (AI)...', 'percent': 45})}\n\n"
                transcript_res = transcribe_audio(audio_path)
                full_text = transcript_res.get("text", "")
                duration = "Local Video"

            # Step 2: Indexing
            yield f"data: {json.dumps({'step': 'indexing', 'message': 'Optimizing for study chat & hybrid RAG...', 'percent': 65})}\n\n"
            chunks = []
            if is_document_file:
                for i in range(0, len(full_text), 1000):
                    c = full_text[i:i+1000].strip()
                    if c:
                        chunks.append({"text": c, "start": i, "end": i + len(c)})
                if not chunks and full_text:
                    chunks.append({"text": full_text, "start": 0, "end": len(full_text)})
            else:
                chunks = chunk_transcript(transcript_res)
            await store_chunks_in_db(file_id, chunks)
            
            # Step 3: AI Analysis
            yield f"data: {json.dumps({'step': 'analyze', 'message': 'AI generating comprehensive study materials...', 'percent': 85})}\n\n"
            summary_data = generate_smart_summary(file_id, full_text)
            quiz_data = generate_quiz(full_text)
            flashcard_data = generate_flashcards(file_id, full_text)
            challenges_data = generate_coding_challenges(file_id, full_text)
            similar_problems_data = generate_similar_problems(file_id, full_text)
            # Step 4: Permanent Cloud Storage (Cloudinary if configured)
            try:
                res_type = "video" if (is_video or is_audio) else "auto"
                cloud_url = upload_file_to_cloudinary(temp_path, public_id=file_id, resource_type=res_type)
                if cloud_url:
                    media_url = cloud_url
            except Exception as up_err:
                print(f"[CLOUDINARY] Upload notice: {up_err}")

            # Step 5: Save & History
            metadata = {
                "video_id": file_id,
                "url": media_url,
                "title": filename,
                "thumbnail": thumbnail,
                "duration": duration,
                "content_type": content_type,
                "transcript": full_text,
                "summary": summary_data,
                "quiz": quiz_data,
                "flashcards": flashcard_data,
                "chapters": [],
                "challenges": challenges_data,
                "similar_problems": similar_problems_data,
                "recommendations": recommendations_data
            }
            await save_video_metadata(file_id, metadata)
            
            if user_id != "guest":
                await add_to_history(
                    user_id, 
                    file_id, 
                    filename, 
                    media_url, 
                    thumbnail,
                    duration,
                    content_type
                )
            
            yield f"data: {json.dumps({'step': 'completed', 'video_id': file_id, 'message': 'All done!', 'percent': 100})}\n\n"

        except Exception as e:
            print(f"Error in process_file: {str(e)}")
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/video/{video_id}")
async def get_video_info(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return {
        "url": video.get("url", ""),
        "title": video.get("title", ""),
        "content_type": video.get("content_type", "video")
    }

@app.get("/api/summary/{video_id}")
async def get_summary(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video["summary"]

@app.get("/api/transcript/{video_id}")
async def get_transcript(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"transcript": video["transcript"]}

@app.get("/api/quiz/{video_id}")
async def get_quiz(video_id: str, difficulty: Optional[str] = None):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    quiz = video.get("quiz", [])
    if difficulty and video.get("transcript"):
        matching = [q for q in quiz if q.get("difficulty", "").lower() == difficulty.lower()]
        if not matching:
            new_quiz = generate_quiz(video["transcript"], difficulty=difficulty)
            await videos_collection.update_one(
                {"video_id": video_id},
                {"$set": {"quiz": new_quiz}}
            )
            return {"quiz": new_quiz}
        return {"quiz": matching}
    return {"quiz": quiz}

@app.get("/api/translate/{video_id}")
async def translate_video_content(video_id: str, lang: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if translation already exists in DB to save tokens
    translations = video.get("translations", {})
    if lang in translations:
        return translations[lang]
        
    # Translate Summary and Notes
    summary_data = video["summary"]
    translated_summary = translate_content(summary_data["short_summary"], lang)
    translated_notes = translate_content(summary_data["structured_notes"], lang)
    
    translation_result = {
        "short_summary": translated_summary,
        "structured_notes": translated_notes
    }
    
    # Save back to DB
    translations[lang] = translation_result
    await videos_collection.update_one(
        {"video_id": video_id},
        {"$set": {"translations": translations}}
    )
    
    return translation_result
@app.get("/api/snippets/{video_id}")
async def get_code_snippets(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # If snippets don't exist in old metadata, generate them once
    snippets = video["summary"].get("code_snippets")
    if snippets is None:
        from rag_pipeline import extract_code_snippets
        snippets = extract_code_snippets(video["summary"]["structured_notes"])
        await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": {"summary.code_snippets": snippets}}
        )
        
    return {"snippets": snippets}

@app.get("/api/flashcards/{video_id}")
async def get_flashcards(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    flashcards = video.get("flashcards")
    if flashcards is None:
        flashcards = generate_flashcards(video_id, video["transcript"])
        await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": {"flashcards": flashcards}}
        )
    return {"flashcards": flashcards}

@app.get("/api/mindmap/{video_id}")
async def get_mind_map(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    mindmap = video.get("mindmap")
    if not mindmap or not isinstance(mindmap, dict) or not mindmap.get("branches"):
        from rag_pipeline import generate_mind_map
        mindmap = generate_mind_map(video_id, video.get("transcript", ""))
        await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": {"mindmap": mindmap}}
        )
        
    return mindmap

@app.post("/api/mindmap/refresh/{video_id}")
async def refresh_mind_map(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    from rag_pipeline import generate_mind_map
    mindmap = generate_mind_map(video_id, video.get("transcript", ""))
    await videos_collection.update_one(
        {"video_id": video_id},
        {"$set": {"mindmap": mindmap}}
    )
    return mindmap


@app.get("/api/chapters/{video_id}")
async def get_chapters(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    chapters = video.get("chapters")
    if chapters is None:
        # Note: chapters need segments, which weren't saved in old videos
        # We can fallback to a generic introduction or try to recreate from transcript
        chapters = [{"title": "Introduction", "timestamp": 0.0}]
        await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": {"chapters": chapters}}
        )
    return {"chapters": chapters}

@app.post("/api/quiz/refresh/{video_id}")
async def refresh_quiz(video_id: str, difficulty: Optional[str] = "Medium"):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    full_transcript = video.get("transcript", "")
    if not full_transcript:
        raise HTTPException(status_code=400, detail="Transcript not available for regeneration")
    
    print(f"--> [AI] Regenerating quiz ({difficulty}) for video {video_id}...")
    new_quiz = generate_quiz(full_transcript, difficulty=difficulty or "Medium")
    
    # Update database
    await videos_collection.update_one(
        {"video_id": video_id},
        {"$set": {"quiz": new_quiz}}
    )
    
    return {"quiz": new_quiz}

@app.get("/api/history/{user_id}")
async def get_history(user_id: str):
    history = await history_collection.find({"user_id": user_id}).sort("timestamp", -1).to_list(100)
    for item in history:
        item["_id"] = str(item["_id"])
    return {"history": history}

@app.delete("/api/history/{user_id}/{video_id}")
async def delete_history_item(user_id: str, video_id: str):
    await history_collection.delete_one({"user_id": user_id, "video_id": video_id})
    # Cascade delete: Remove the chat history associated with this video
    await chat_history_collection.delete_many({"user_id": user_id, "video_id": video_id})
    return {"status": "success"}

@app.delete("/api/history/{user_id}")
async def clear_all_history(user_id: str):
    await history_collection.delete_many({"user_id": user_id})
    await chat_history_collection.delete_many({"user_id": user_id})
    return {"status": "success", "message": "All history cleared"}
@app.get("/api/user/profile/{user_id}")
async def get_profile(user_id: str):
    profile = await get_user_profile(user_id)
    if not profile:
        return {"user_id": user_id, "display_name": "", "bio": "", "interests": []}
    # Handle ObjectId if it exists from find_one
    if "_id" in profile:
        profile["_id"] = str(profile["_id"])
    return profile

@app.post("/api/user/profile/{user_id}")
async def update_profile(user_id: str, profile_data: dict):
    await update_user_profile(user_id, profile_data)
    return {"status": "success", "message": "Profile updated successfully"}

@app.post("/api/chat/{video_id}")
async def chat_with_video(video_id: str, query: ChatQuery, user_id: str = "guest"):
    try:
        # Save user message
        await add_chat_message(user_id, video_id, "user", query.question)
        
        video = await get_video_by_id(video_id)
        content_type = video.get("content_type", "video") if video else "video"
        
        response = await answer_video_query(video_id, query.question, content_type=content_type)
        
        # Save assistant message
        await add_chat_message(user_id, video_id, "assistant", response["answer"])
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat_history/{video_id}")
async def get_video_chat_history(video_id: str, user_id: str = "guest"):
    history = await get_chat_history(user_id, video_id)
    for msg in history:
        msg["_id"] = str(msg["_id"])
    return {"history": history}

@app.delete("/api/chat_history/{video_id}")
async def clear_chat_history(video_id: str, user_id: str = "guest"):
    await chat_history_collection.delete_many({"user_id": user_id, "video_id": video_id})
    return {"status": "success", "message": "Chat history cleared"}

@app.get("/api/challenges/{video_id}")
async def get_challenges(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    challenges = video.get("challenges")
    if challenges is None:
        # Fallback if not processed
        challenges = generate_coding_challenges(video_id, video.get("transcript", ""))
        await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": {"challenges": challenges}}
        )
    return {"challenges": challenges}

@app.post("/api/challenges/refresh/{video_id}")
async def refresh_challenges(video_id: str):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    full_transcript = video.get("transcript", "")
    if not full_transcript:
        raise HTTPException(status_code=400, detail="Transcript not available for regeneration")
    
    print(f"--> [AI] Regenerating challenges for video {video_id}...")
    new_challenges = generate_coding_challenges(video_id, full_transcript)
    
    # Update database
    await videos_collection.update_one(
        {"video_id": video_id},
        {"$set": {"challenges": new_challenges}}
    )
    
    return {"challenges": new_challenges}

class CodeEvaluationRequest(BaseModel):
    problem: dict
    code: str

@app.post("/api/evaluate-code")
async def evaluate_code_endpoint(req: CodeEvaluationRequest, user_id: str = "guest", video_id: str = ""):
    try:
        feedback = evaluate_user_code(req.problem, req.code)
        
        # Save to submissions history
        submission_record = {
            "code": req.code,
            "language": req.problem.get("language", "python"),
            "is_correct": feedback.get("is_correct", False),
            "stats": feedback.get("stats", {}),
            "overall_feedback": feedback.get("overall_feedback", "")
        }
        await add_submission(user_id, video_id, req.problem.get("id", "default"), submission_record)
        
        return feedback
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/submissions/{video_id}/{challenge_id}")
async def get_challenge_submissions(video_id: str, challenge_id: str, user_id: str = "guest"):
    submissions = await get_submissions(user_id, video_id, challenge_id)
    for s in submissions:
        s["_id"] = str(s["_id"])
    return {"submissions": submissions}

@app.get("/api/similar-problems/{video_id}")
async def get_similar_problems_endpoint(video_id: str, difficulty: Optional[str] = "Medium"):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    problems = video.get("similar_problems")
    if not problems:
        problems = generate_similar_problems(video_id, video.get("transcript", ""), difficulty=difficulty or "Medium")
        await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": {"similar_problems": problems}}
        )
    return {"problems": problems}

@app.post("/api/similar-problems/refresh/{video_id}")
async def refresh_similar_problems_endpoint(video_id: str, difficulty: Optional[str] = "Medium", topic: Optional[str] = ""):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    new_problems = generate_similar_problems(video_id, video.get("transcript", ""), difficulty=difficulty or "Medium", topic=topic or "")
    await videos_collection.update_one(
        {"video_id": video_id},
        {"$set": {"similar_problems": new_problems}}
    )
    return {"problems": new_problems}

@app.get("/api/recommendations/{video_id}")
async def get_recommendations_endpoint(video_id: str, user_id: Optional[str] = "guest"):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    recommendations = video.get("recommendations")
    if not recommendations or not recommendations.get("recommended_topics"):
        user_profile = await get_user_profile(user_id) if user_id != "guest" else {}
        recommendations = generate_recommendations(video_id, video.get("transcript", ""), user_profile=user_profile)
        await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": {"recommendations": recommendations}}
        )
    return recommendations

@app.post("/api/recommendations/refresh/{video_id}")
async def refresh_recommendations_endpoint(video_id: str, user_id: Optional[str] = "guest"):
    video = await get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    user_profile = await get_user_profile(user_id) if user_id != "guest" else {}
    recommendations = generate_recommendations(video_id, video.get("transcript", ""), user_profile=user_profile)
    await videos_collection.update_one(
        {"video_id": video_id},
        {"$set": {"recommendations": recommendations}}
    )
    return recommendations

class FeedbackRequest(BaseModel):
    user_id: Optional[str] = "guest"
    video_id: str
    feedback_type: str  # "chat", "summary", "quiz", "problem"
    rating: str         # "positive" or "negative"
    comment: Optional[str] = ""

@app.post("/api/feedback")
async def submit_feedback_endpoint(req: FeedbackRequest):
    await add_feedback(req.user_id or "guest", req.video_id, req.feedback_type, req.rating, req.comment or "")
    return {"status": "success", "message": "Feedback submitted successfully"}

class LearnerProgressRequest(BaseModel):
    user_id: str
    video_id: Optional[str] = ""
    topic: Optional[str] = ""
    quiz_score: Optional[float] = None
    challenge_completed: Optional[bool] = False

@app.post("/api/learner/progress")
async def record_learner_progress_endpoint(req: LearnerProgressRequest):
    updated = await update_learner_knowledge(req.user_id, req.dict())
    return {"status": "success", "learner_profile": updated}

@app.get("/api/learner/progress/{user_id}")
async def get_user_learner_progress_endpoint(user_id: str):
    progress = await get_learner_knowledge(user_id)
    return progress

@app.get("/api/health")
async def health_check():
    """Health check endpoint for deployment monitoring."""
    return {
        "status": "healthy",
        "service": "EduStream AI Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)


