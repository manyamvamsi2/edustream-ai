# AI Video Learning Assistant

An AI-powered platform that transforms educational videos into interactive learning experiences.

## Features
- **Video Transcription**: Automatically transcribe YouTube or uploaded videos using OpenAI Whisper.
- **Smart Summaries**: Get concise overviews and key takeaways.
- **Structured Notes**: AI-generated notes with PDF download support.
- **Interactive Chat**: Ask questions about the video context using RAG (Retrieval Augmented Generation).
- **Knowledge Quizzes**: Generate 5-question multiple choice quizzes with detailed explanations.

---

## 🚀 How to Run

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg** (Required for audio processing)
  - Windows: `choco install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Linux: `sudo apt install ffmpeg`

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Configure environment variables:
   Create a `.env` file in the `backend/` directory with:
   ```env
   GROQ_API_KEY=your_groq_key_here
   GEMINI_API_KEY=your_gemini_key_here
   ```
6. Start the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture
- **Frontend**: Next.js, React, Tailwind CSS, Lucide React.
- **Backend**: FastAPI, ChromaDB (Vector Store), SentenceTransformers (Embeddings).
- **AI Models**: Groq (Llama 3.3), OpenAI Whisper (Transcription).
