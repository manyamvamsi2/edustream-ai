"use client";
import { useEffect, useState } from "react";
import { Clock, Play, Trash2, MessageCircle, ChevronRight, Search, Layout, Filter, Calendar, Zap, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

interface HistoryItem {
  _id: string;
  video_id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  content_type?: string;
  timestamp: string;
}

export default function History({ onSelectVideo, onClose }: { onSelectVideo: (videoId: string, url: string, contentType?: string) => void, onClose: () => void }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(api(`/api/history/${user.uid}`));
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await fetch(api(`/api/history/${user.uid}/${videoId}`), { method: 'DELETE' });
      setHistory(history.filter(item => item.video_id !== videoId));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredHistory = history.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.video_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="h-12 w-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto custom-scrollbar pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-6 w-full">
        {/* Header Section */}
        <div className="mb-12">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold group mb-6"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Videos You've Explored</h2>
          <p className="text-xl text-slate-500 font-medium max-w-2xl">Review your past sessions, insights, and saved chats.</p>
        </div>


        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm mb-8">
              <Layout className="h-16 w-16 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No history found</h3>
            <p className="text-lg text-slate-500 max-w-sm">Start by processing a video URL to see your workspace history here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHistory.map((item) => (
              <div 
                key={item._id}
                onClick={() => onSelectVideo(item.video_id, item.url, item.content_type)}
                className="group flex flex-col bg-white rounded-[2.5rem] border border-slate-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-indigo-100 transition-all cursor-pointer overflow-hidden p-2"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-6">
                  {item.thumbnail ? (
                    <img 
                      src={item.thumbnail} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                       <img src="/logo.png" alt="EduStream Logo" className="h-12 w-12 object-contain opacity-20" />
                    </div>
                  )}
                  
                  {/* Duration Overlay */}
                  <div className="absolute bottom-4 right-4 bg-black/90 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-widest backdrop-blur-sm">
                    {item.duration || "0:00"}
                  </div>
                  
                  {/* Delete Button Overlay */}
                  <button 
                    onClick={(e) => handleDelete(e, item.video_id)}
                    className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-md text-white hover:bg-rose-500 hover:text-white rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  
                  {/* Play Intent Overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 p-4 rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="h-8 w-8 text-primary fill-primary" />
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="px-6 pb-6">
                  <h4 className="text-xl font-black text-slate-900 mb-4 line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[3.5rem]">
                    {item.title || "Video Analysis"}
                  </h4>
                  <div className="flex items-center text-slate-400 font-bold text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Analyzed {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
