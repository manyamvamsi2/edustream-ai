"use client";
import { useEffect, useState, useMemo } from "react";
import { 
  Clock, 
  Play, 
  Trash2, 
  Search, 
  Layout, 
  Calendar, 
  ArrowLeft, 
  Video, 
  FileText, 
  Music, 
  Sparkles, 
  X, 
  ArrowUpDown, 
  ExternalLink,
  BookOpen,
  Filter
} from "lucide-react";
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

export default function History({ 
  onSelectVideo, 
  onClose 
}: { 
  onSelectVideo: (videoId: string, url: string, contentType?: string) => void; 
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "az">("recent");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setDeletingId(videoId);
    try {
      await fetch(api(`/api/history/${user.uid}/${videoId}`), { method: 'DELETE' });
      setHistory(prev => prev.filter(item => item.video_id !== videoId));
    } catch (err) {
      console.error(err);
    }
    setDeletingId(null);
  };

  const handleClearAll = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to clear your entire history? This action cannot be undone.")) return;
    try {
      await fetch(api(`/api/history/${user.uid}`), { method: 'DELETE' });
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Counts for tabs
  const counts = useMemo(() => {
    const videoCount = history.filter(i => (!i.content_type || i.content_type === "video")).length;
    const docCount = history.filter(i => (i.content_type === "document" || i.url?.toLowerCase().includes('.pdf') || i.title?.toLowerCase().endsWith('.pdf'))).length;
    const audioCount = history.filter(i => (i.content_type === "audio")).length;
    return {
      all: history.length,
      video: videoCount,
      document: docCount,
      audio: audioCount
    };
  }, [history]);

  // Filtered and Sorted list
  const filteredHistory = useMemo(() => {
    let result = history.filter(item => {
      const matchesSearch = 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.video_id?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const isDoc = item.content_type === "document" || item.url?.toLowerCase().includes('.pdf') || item.title?.toLowerCase().endsWith('.pdf');
      const isAudio = item.content_type === "audio";
      const isVid = !isDoc && !isAudio;

      if (selectedType === "video") return isVid;
      if (selectedType === "document") return isDoc;
      if (selectedType === "audio") return isAudio;
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortBy === "az") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });
  }, [history, searchQuery, selectedType, sortBy]);

  const getItemType = (item: HistoryItem) => {
    if (item.content_type === "document" || item.url?.toLowerCase().includes('.pdf') || item.title?.toLowerCase().endsWith('.pdf')) {
      return { label: "PDF", bg: "bg-rose-500", text: "text-white", icon: FileText };
    }
    if (item.content_type === "audio") {
      return { label: "AUDIO", bg: "bg-emerald-500", text: "text-white", icon: Music };
    }
    return { label: "VIDEO", bg: "bg-indigo-600", text: "text-white", icon: Video };
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
        <div className="h-10 w-10 border-3 border-indigo-100 border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading History...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-y-auto custom-scrollbar">
      {/* Header Container */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors font-medium active:scale-95 shrink-0"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Learning History</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/60">
                    {history.length}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">Revisit your analyzed videos, PDFs, and notes</p>
              </div>
            </div>

            {history.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar pb-1 md:pb-0">
              {[
                { id: "all", label: "All Items", count: counts.all },
                { id: "video", label: "Videos", count: counts.video, icon: Video },
                { id: "document", label: "PDFs & Docs", count: counts.document, icon: FileText },
                { id: "audio", label: "Audio", count: counts.audio, icon: Music },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedType === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  {tab.icon && <tab.icon className="h-3 w-3" />}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedType === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input & Sort Dropdown */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shrink-0">
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-1"
                >
                  <option value="recent">Recent</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A - Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs max-w-lg mx-auto mt-8">
            <div className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl mb-4">
              <Layout className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {searchQuery ? "No matching sessions found" : "No history yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mb-5">
              {searchQuery 
                ? `No sessions found matching "${searchQuery}". Try a different search term.` 
                : "Analyze a YouTube video or upload a PDF document to start building your learning history."}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 transition-all active:scale-95"
              >
                Start Learning
              </button>
            )}
          </div>
        ) : (
          /* Sleek, Compact 4-Column Card Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredHistory.map((item) => {
              const typeInfo = getItemType(item);
              const TypeIcon = typeInfo.icon;
              const formattedDate = item.timestamp 
                ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : "Recent";

              return (
                <div 
                  key={item._id || item.video_id}
                  onClick={() => onSelectVideo(item.video_id, item.url, item.content_type)}
                  className="group flex flex-col bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden p-2.5 hover:-translate-y-0.5 relative"
                >
                  {/* Compact Thumbnail Container */}
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden mb-3 bg-slate-900">
                    {item.thumbnail ? (
                      <img 
                        src={item.thumbnail} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white p-3">
                        <TypeIcon className="h-8 w-8 text-indigo-400/80 mb-1" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{typeInfo.label}</span>
                      </div>
                    )}
                    
                    {/* Content Type Pill Badge (Top Left) */}
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${typeInfo.bg} ${typeInfo.text} shadow-xs`}>
                        <TypeIcon className="h-2.5 w-2.5" />
                        <span>{typeInfo.label}</span>
                      </span>
                    </div>

                    {/* Duration / Tag (Bottom Right) */}
                    {item.duration && item.duration !== "0:00" && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-tight backdrop-blur-xs font-mono">
                        {item.duration}
                      </div>
                    )}

                    {/* Quick Delete Button (Top Right on Hover) */}
                    <button 
                      onClick={(e) => handleDelete(e, item.video_id)}
                      disabled={deletingId === item.video_id}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md text-white hover:bg-rose-600 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-95 shadow-sm"
                      title="Delete from history"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    
                    {/* Play / Open Hover Overlay */}
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-white/95 p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform text-primary">
                        <Play className="h-4 w-4 fill-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Card Content & Metadata */}
                  <div className="flex flex-col justify-between flex-1 px-1 pb-1">
                    <h3 
                      className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors h-8 mb-2"
                      title={item.title}
                    >
                      {item.title || "Untitled Session"}
                    </h3>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1.5 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formattedDate}</span>
                      </span>
                      
                      <span className="text-primary font-bold group-hover:underline flex items-center gap-0.5">
                        <span>Open</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
