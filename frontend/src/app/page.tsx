"use client";
import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import AuthPage from '@/components/AuthPage';
import History from '@/components/History';
import Profile from '@/components/Profile';
import { useAuth } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase_config';
import { api } from '@/lib/api';
import { signOut } from 'firebase/auth';
import { Link as LinkIcon, Upload, Zap, BookOpen, MessageSquare, ArrowRight, History as HistoryIcon, LogOut, User as UserIcon, CheckCircle, Download } from "lucide-react";
import PageLoader from '@/components/PageLoader';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [videoProcessed, setVideoProcessed] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // Progress states
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);

  // Persistence logic
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedVideoId = localStorage.getItem('last_video_id');
    const savedData = localStorage.getItem('last_video_data');
    if (savedVideoId && savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (!parsedData.url || parsedData.url === "") {
            fetch(api(`/api/video/${savedVideoId}`))
              .then(res => res.json())
              .then(videoData => {
                  parsedData.url = videoData.url;
                  localStorage.setItem('last_video_data', JSON.stringify(parsedData));
                  setVideoId(savedVideoId);
                  setInitialData(parsedData);
                  setVideoProcessed(true);
              })
              .catch(e => console.error("Failed to heal data", e));
        } else {
            setVideoId(savedVideoId);
            setInitialData(parsedData);
            setVideoProcessed(true);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, []);

  useEffect(() => {
    if (videoProcessed && videoId && initialData) {
      localStorage.setItem('last_video_id', videoId);
      localStorage.setItem('last_video_data', JSON.stringify(initialData));
    } else if (!videoProcessed) {
      localStorage.removeItem('last_video_id');
      localStorage.removeItem('last_video_data');
    }
  }, [videoProcessed, videoId, initialData]);

  const triggerTransition = (action: () => void) => {
    setIsSwitching(true);
    setTimeout(() => {
      action();
      setTimeout(() => setIsSwitching(false), 300); // Small buffer for smooth exit
    }, 600); // Loader duration
  };

  const handleProcessVideo = async (urlToProcess?: string, idToFetch?: string, contentType?: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const url = urlToProcess || videoUrl;
    if (!url && !idToFetch) return;

    setLoading(true);
    setProgressPercent(0);
    setProgressStep("starting");
    setProgressMessage("Starting...");
    setShowHistory(false);
    setShowProfile(false);

    try {
      let id = idToFetch;
      
      if (!id) {
        const response = await fetch(api(`/api/process-video?user_id=${user?.uid || 'guest'}`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });

        if (!response.ok) throw new Error("Processing failed");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No reader");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.step === 'error') throw new Error(data.message);
                
                if (data.percent) setProgressPercent(data.percent);
                if (data.step) setProgressStep(data.step);
                if (data.message) setProgressMessage(data.message);
                
                if (data.step === 'completed') {
                  id = data.video_id;
                }
              } catch (e: any) {
                if (e.message) throw e; // Re-throw to halt processing
                console.error("Error parsing progress chunk", e);
              }
            }
          }
        }
      }

      if (!id) throw new Error("Processing aborted: No video ID received");
      
      setVideoId(id!);
      
      // Fetch initial data
      setProgressMessage("Finalizing workspace...");
      const [videoRes, summaryRes, transRes, quizRes] = await Promise.all([
          fetch(api(`/api/video/${id}`)),
          fetch(api(`/api/summary/${id}`)),
          fetch(api(`/api/transcript/${id}`)),
          fetch(api(`/api/quiz/${id}`))
      ]);
      
      const videoData = await videoRes.json();
      const summaryData = await summaryRes.json();
      const transData = await transRes.json();
      const quizData = await quizRes.json();
      
      setInitialData({
          url: videoData.url || url || "",
          summary: summaryData,
          transcript: transData.transcript,
          quiz: quizData.quiz,
          content_type: videoData.content_type || contentType || (url ? "video" : "document")
      });
      setVideoProcessed(true);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Connection failed. Check if local server is running on port 8000.");
    } finally {
      setLoading(false);
      setProgressPercent(0);
      setProgressStep("");
      setProgressMessage("");
    }
  };

  const handleProcessFile = async (file: File) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    // File size limits (in bytes)
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for video/audio
    const MAX_PDF_SIZE = 10 * 1024 * 1024;   // 10MB for PDFs
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const maxSize = isPdf ? MAX_PDF_SIZE : MAX_VIDEO_SIZE;
    const maxLabel = isPdf ? '10MB' : '50MB';

    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`File too large (${fileSizeMB}MB). Maximum allowed: ${maxLabel} for ${isPdf ? 'PDFs' : 'video/audio'}.`);
      return;
    }

    setLoading(true);
    setProgressPercent(0);
    setProgressStep("info");
    setProgressMessage((isVideo || isAudio) ? "Uploading media..." : "Uploading document...");
    setShowHistory(false);
    setShowProfile(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(api(`/api/process-file?user_id=${user?.uid || 'guest'}`), {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("Document processing failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let id = null;

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.step === 'error') throw new Error(data.message);
              if (data.percent) setProgressPercent(data.percent);
              if (data.step) setProgressStep(data.step);
              if (data.message) setProgressMessage(data.message);
              if (data.step === 'completed') id = data.video_id;
            } catch (e: any) {
              if (e.message) throw e;
              console.error("Error parsing progress chunk", e);
            }
          }
        }
      }

      if (!id) throw new Error("Processing aborted: No ID received");
      
      setVideoId(id!);
      
      setProgressMessage("Finalizing workspace...");
      const [videoRes, summaryRes, transRes, quizRes] = await Promise.all([
          fetch(api(`/api/video/${id}`)),
          fetch(api(`/api/summary/${id}`)),
          fetch(api(`/api/transcript/${id}`)),
          fetch(api(`/api/quiz/${id}`))
      ]);
      
      const videoData = await videoRes.json();
      const summaryData = await summaryRes.json();
      const transData = await transRes.json();
      const quizData = await quizRes.json();
      
      setInitialData({
          url: videoData.url || "",
          summary: summaryData,
          transcript: transData.transcript,
          quiz: quizData.quiz,
          content_type: videoData.content_type || (isVideo ? "video" : "document")
      });
      setVideoProcessed(true);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Document analysis failed.");
    } finally {
      setLoading(false);
      setProgressPercent(0);
      setProgressStep("");
      setProgressMessage("");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setVideoProcessed(false);
    setShowHistory(false);
    setShowProfile(false);
  };

  if (authLoading || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showAuth && !user) {
    return <AuthPage onAuthSuccess={() => setShowAuth(false)} onClose={() => setShowAuth(false)} />;
  }

  if (videoProcessed && initialData && videoId) {
    return (
      <>
        {isSwitching && <PageLoader />}
        <Dashboard 
          initialVideoId={videoId} 
          initialData={initialData} 
          userId={user?.uid || "guest"}
          onReset={() => triggerTransition(() => setVideoProcessed(false))} 
        />
      </>
    );
  }

  const steps = [
    { id: 'info', name: 'Information Extraction', icon: <HistoryIcon className="h-5 w-5" /> },
    { id: 'download', name: 'Audio Processing', icon: <Download className="h-5 w-5" /> },
    { id: 'transcribe', name: 'AI Transcription', icon: <MessageSquare className="h-5 w-5" /> },
    { id: 'indexing', name: 'Semantic Indexing', icon: <Zap className="h-5 w-5" /> },
    { id: 'analyze', name: 'Knowledge Generation', icon: <BookOpen className="h-5 w-5" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === progressStep);

  return (
    <main className="min-h-screen bg-background">
      {isSwitching && <PageLoader />}
      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => triggerTransition(() => {setVideoProcessed(false); setShowHistory(false); setShowProfile(false);})}>
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
             <img src="/logo.png" alt="EduStream Logo" className="w-full h-full object-contain scale-125" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">EduStream AI</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-6 text-sm font-bold text-slate-600">
           {user ? (
             <>
               <button 
                 onClick={() => triggerTransition(() => {setShowHistory(!showHistory); setShowProfile(false);})}
                 className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${showHistory ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100'}`}
               >
                 <HistoryIcon className="h-4.5 w-4.5" />
                 <span>History</span>
               </button>
               <div className="h-6 w-px bg-slate-200 mr-2"></div>
               <div 
                 onClick={() => triggerTransition(() => {setShowProfile(!showProfile); setShowHistory(false);})}
                 className={`flex items-center space-x-3 bg-slate-50 pl-4 pr-2 py-1.5 rounded-2xl border transition-all cursor-pointer ${showProfile ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100'}`}
               >
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 leading-none mb-1">Signed in as</span>
                    <span className="text-slate-900 leading-none">{user.displayName || user.email?.split('@')[0]}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
                    className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all text-slate-400"
                    title="Sign Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
               </div>
             </>
           ) : (
             <>
               <a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a>
               <button 
                onClick={() => triggerTransition(() => setShowAuth(true))}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-black transition-all shadow-xl shadow-slate-200"
               >
                 Log In
               </button>
             </>
           )}
        </div>
      </nav>

      {showProfile && user ? (
        <Profile onClose={() => triggerTransition(() => setShowProfile(false))} />
      ) : showHistory && user ? (
        <History 
          onSelectVideo={(id, url, contentType) => triggerTransition(() => handleProcessVideo(url, id, contentType))} 
          onClose={() => triggerTransition(() => setShowHistory(false))}
        />
      ) : (
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full text-primary text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>Next-Gen Learning Assistant</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            Transform Educational <br /> 
            <span className="text-primary">Videos Into Knowledge</span>
          </h1>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Paste a URL or upload your lectures to generate instant summaries, interactive quizzes, and AI-powered study chats.
          </p>

          {/* Input Area */}
          <div className="max-w-2xl mx-auto mb-24">
             <div className="bg-white p-2.5 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-50 flex flex-col md:flex-row items-center gap-2 mb-8">
                <div className="flex-1 w-full relative">
                   <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300" />
                   <input 
                      type="text" 
                      placeholder="Paste YouTube lecture URL here..." 
                      className="w-full pl-16 pr-4 py-6 rounded-3xl focus:outline-none focus:ring-0 text-slate-800 font-bold placeholder:text-slate-300 text-lg"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleProcessVideo()}
                      disabled={loading}
                   />
                </div>
                <button 
                  onClick={() => handleProcessVideo()}
                  disabled={loading || !videoUrl}
                  className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white px-10 py-6 rounded-[1.75rem] font-black transition-all shadow-xl shadow-primary/30 disabled:opacity-50 flex items-center justify-center space-x-3 group shrink-0"
                >
                  {loading ? (
                    <span className="flex items-center space-x-3">
                       <span className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
                       <span>ANALYZING...</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-lg">GET STARTED</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
             </div>

             {/* Real-time Progress Section */}
             {loading && (
               <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-50 border border-slate-50 animate-in fade-in zoom-in duration-500 text-left">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 mb-1">Analyzing Video</h4>
                      <p className="text-slate-500 font-bold text-sm tracking-wide uppercase">{progressMessage}</p>
                    </div>
                    <div className="text-4xl font-black text-primary">{progressPercent}%</div>
                  </div>

                  {/* Progressive Bar */}
                  <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden mb-12 border border-slate-100 p-1">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-primary rounded-full transition-all duration-700 ease-out shadow-lg shadow-indigo-200"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>

                  {/* Step Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {steps.map((step, idx) => {
                      const isCompleted = idx < currentStepIndex || progressStep === 'completed';
                      const isActive = idx === currentStepIndex;
                      
                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-50 text-emerald-500 shadow-sm' : 
                            isActive ? 'bg-primary text-white shadow-xl scale-110' : 
                            'bg-slate-50 text-slate-300'
                          }`}>
                            {isCompleted ? <CheckCircle className="h-6 w-6" /> : step.icon}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest mt-4 text-center ${
                            isActive || isCompleted ? 'text-slate-900' : 'text-slate-300'
                          }`}>
                            {step.name.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
               </div>
             )}
             
              {!loading && (
                <div className="mt-10">
                  <div 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 hover:border-primary/50 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                  >
                    <input 
                      id="file-upload"
                      type="file" 
                      accept=".pdf,video/*,.mp3,.wav" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFile(file);
                      }}
                    />
                    <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm group-hover:shadow-md">
                       <Upload className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="font-black text-xl text-slate-800">Drop your study material or video here</p>
                    <p className="text-slate-400 font-medium mt-2">PDF, MP4, MP3, or WAV supported</p>
                  </div>
                </div>
             )}
          </div>

          <div id="how-it-works" className="mb-32">
             <h2 className="text-3xl font-black text-slate-900 mb-12">How it works</h2>
             <div className="grid md:grid-cols-3 gap-12 text-left">
                <div className="relative">
                   <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-primary mb-6">1</div>
                   <h4 className="text-xl font-bold text-slate-900 mb-2">Paste Video Link</h4>
                   <p className="text-slate-500 font-medium">Simply drop a YouTube URL or upload your local lecture files to the workspace.</p>
                   <div className="hidden md:block absolute top-6 left-20 w-full h-px border-t-2 border-dashed border-slate-100"></div>
                </div>
                <div className="relative">
                   <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-primary mb-6">2</div>
                   <h4 className="text-xl font-bold text-slate-900 mb-2">AI Extraction</h4>
                   <p className="text-slate-500 font-medium">Our AI engines transcribe the audio and index the content for semantic knowledge.</p>
                   <div className="hidden md:block absolute top-6 left-20 w-full h-px border-t-2 border-dashed border-slate-100"></div>
                </div>
                <div>
                   <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-primary mb-6">3</div>
                   <h4 className="text-xl font-bold text-slate-900 mb-2">Start Learning</h4>
                   <p className="text-slate-500 font-medium">Study with AI-generated notes, interactive quizzes, and a transcript-aware chat bot.</p>
                </div>
             </div>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-indigo-50 transition-all hover:-translate-y-2 text-left group">
                <div className="bg-orange-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                   <Zap className="h-8 w-8 text-orange-500 fill-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Instant Summaries</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Key takeaways from any lecture in under 2 minutes of reading time.</p>
             </div>
             <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-indigo-50 transition-all hover:-translate-y-2 text-left group">
                <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                   <BookOpen className="h-8 w-8 text-blue-500 fill-blue-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Smart Quizzes</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Practice questions to test your understanding and retain information longer.</p>
             </div>
             <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-indigo-50 transition-all hover:-translate-y-2 text-left group">
                <div className="bg-purple-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                   <MessageSquare className="h-8 w-8 text-purple-500 fill-purple-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Video Chat</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Ask specific questions and get cited answers directly from the transcript.</p>
             </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-50 bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
           <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="EduStream Logo" className="h-8 w-8 object-contain" />
              <span className="text-2xl font-black text-slate-900">EduStream AI</span>
           </div>
           <div className="flex space-x-12 text-sm font-bold text-slate-400">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
           </div>
           <p className="text-sm font-bold text-slate-300">© {new Date().getFullYear()} EduStream AI. Made for explorers.</p>
        </div>
      </footer>
    </main>
  );
}
