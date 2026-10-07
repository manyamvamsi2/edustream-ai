# EduStream AI - Intelligent Video and Document Learning Platform

EduStream AI is an end-to-end artificial intelligence educational assistant designed to transform video lectures, audio recordings, and academic documents into interactive, multimodal learning experiences.

The platform processes educational content through speech-to-text transcription, document parsing, and a hybrid Retrieval-Augmented Generation (RAG) architecture to generate grounded summaries, interactive concept mind maps, spaced repetition flashcards, adaptive quizzes, worked practice problems, and personalized recommendations.

---

## Key Features

### 1. Multimodal Content Ingestion
- YouTube Video Processing: Ingestion and transcription of YouTube lecture URLs.
- Local Media Uploads: Support for video and audio formats including MP4, MP3, WAV, and M4A.
- Document Extraction: Parsing and chunking of lecture slides and documents in PDF, DOCX, and PPTX formats.
- Timestamp-Aware Speech Recognition: High-accuracy speech-to-text using OpenAI Whisper with segment-level timestamps.

### 2. Hybrid Retrieval-Augmented Generation (RAG)
- Dense Semantic Retrieval: Dense vector embeddings generated via SentenceTransformers (all-MiniLM-L6-v2) stored in ChromaDB.
- Sparse Lexical Retrieval: BM25 Okapi/Plus keyword indexing across all transcribed content chunks.
- Reciprocal Rank Fusion (RRF): Ensemble reranking algorithm combining dense and sparse search rankings to minimize hallucinations and deliver precise citations.
- Grounded AI Tutor: Context-constrained question answering with exact timestamp links back to the source lecture.

### 3. Comprehensive Learning Tools
- Smart Summarization: Multi-section overviews, core concepts, and key takeaway bullets.
- Multi-Language Translation: Dynamic translation of summaries, notes, and explanations into multiple global languages.
- Interactive Concept Mind Map: Hierarchical visual roadmap with collapsible branch nodes, SVG connector curves, review status tracking, and zoom controls.
- Spaced Repetition Flashcards: Front-and-back study cards for active recall.
- Adaptive Knowledge Quizzes: Multiple-choice evaluations supporting selectable difficulty levels (Easy, Medium, Hard) with detailed answer rationales.
- Similar Practice Problems: Algorithmic and conceptual problem sets featuring progressive hints, worked step-by-step solutions, and key takeaways.
- Personalized Recommendations: Adaptive next-step learning topics, prerequisite refreshers, curated search queries, and hands-on mini projects.
- In-Browser Coding Challenges: Interactive programming environment with starter code, test case verification, and AI code review for technical lectures.
- Exportable Study Notes: One-click formatted PDF generation of lecture notes and key formulas.

### 4. Learner Profile and Feedback Loop
- Continuous User Feedback: Thumbs up and thumbs down ratings on AI responses and summaries.
- Knowledge Mastery Tracking: Weighted moving average scoring based on quiz and challenge completion.
- Dynamic Skill Leveling: Adaptive categorization (Beginner, Intermediate, Advanced) adjusting the complexity of future recommendations and problems.

---

## System Architecture

### Frontend
- Framework: Next.js 16 (App Router, Turbopack)
- Library: React 19, TypeScript
- Styling: Tailwind CSS
- Icons: Lucide React
- Markdown Rendering: ReactMarkdown, Remark GFM
- Document Export: html2pdf.js

### Backend
- Web Framework: FastAPI (Python 3.10+)
- Server: Uvicorn ASGI
- Database: MongoDB (Motor async driver)
- Vector Store: ChromaDB
- Embeddings: SentenceTransformers (all-MiniLM-L6-v2)
- Information Retrieval: Rank-BM25 (sparse retrieval) + RRF Reranking
- Audio Extraction: yt-dlp, FFmpeg, PyAV
- Speech-to-Text: OpenAI Whisper
- Document Parsing: PyPDF2, python-docx, python-pptx
- Large Language Models: Groq API (Llama 3.3 70B Versatile), Google Gemini API

---

## Installation and Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- FFmpeg installed and accessible in the system PATH
- MongoDB running locally or a MongoDB Atlas connection URI

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/manyamvamsi2/edustream-ai.git
cd edustream-ai
```

---

### Step 2: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - On Windows:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - On Linux/macOS:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create an environment configuration file:
   Create a `.env` file inside the `backend/` directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGO_URI=mongodb://localhost:27017
   DB_NAME=edustream_ai
   ```

5. Launch the FastAPI backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will be available at `http://localhost:8000`. API documentation is accessible at `http://localhost:8000/docs`.

---

### Step 3: Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file inside the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The web application will be accessible at `http://localhost:3000`.

---

## API Endpoints Reference

### Video and Document Processing
- `POST /api/process_video`: Ingests YouTube URLs or uploaded media files and triggers the generation pipeline.
- `POST /api/upload_file`: Extracts and indexes PDF, DOCX, and PPTX documents.
- `GET /api/video/{video_id}`: Retrieves complete metadata, transcript, summaries, and generated assets.

### Interactive Services
- `POST /api/chat/{video_id}`: Performs Hybrid RAG retrieval and answers user questions grounded in the lecture.
- `GET /api/quiz/{video_id}?difficulty={diff}`: Fetches or dynamically regenerates multiple-choice quizzes by difficulty.
- `GET /api/flashcards/{video_id}`: Retrieves spaced repetition concept cards.
- `GET /api/mindmap/{video_id}`: Generates or retrieves the visual concept hierarchy.
- `GET /api/similar-problems/{video_id}?difficulty={diff}`: Generates worked practice exercises tailored to the topic.
- `GET /api/recommendations/{video_id}`: Generates personalized next-step learning pathways.
- `POST /api/translate`: Translates generated summaries or notes into a requested target language.

### Learner Profile and Feedback
- `POST /api/feedback`: Records student ratings and feedback on AI responses.
- `POST /api/learner/progress`: Updates mastery score, completed quizzes, and topic competencies.
- `GET /api/learner/progress/{user_id}`: Retrieves adaptive learner profile analytics.

---

## License

This project is licensed under the MIT License.
