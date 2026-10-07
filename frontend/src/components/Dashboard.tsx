"use client";
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { Send, Link as LinkIcon, FileText, BookOpen, MessageSquare, HelpCircle, CheckCircle, Trash2, Download, RefreshCw, RotateCcw, Zap, ChevronLeft, ChevronRight, Layout, ListChecks, Terminal, X, Info, Edit3, Clock, ThumbsUp, ThumbsDown, Lightbulb, Compass, Sparkles, ChevronDown, Copy, Check, Save, Settings, Maximize2, ChevronUp, Plus, Minus, ExternalLink, Eye, Music } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";

interface BranchTheme {
    border: string;
    badge: string;
    lineColor: string;
    dotColor: string;
    chevronBg: string;
    glow: string;
}

const BRANCH_THEMES: BranchTheme[] = [
    { border: 'border-emerald-200 hover:border-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', lineColor: '#10B981', dotColor: '#10B981', chevronBg: 'hover:bg-emerald-50 text-emerald-600', glow: 'shadow-emerald-500/10' },
    { border: 'border-indigo-200 hover:border-indigo-400', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60', lineColor: '#6366F1', dotColor: '#6366F1', chevronBg: 'hover:bg-indigo-50 text-indigo-600', glow: 'shadow-indigo-500/10' },
    { border: 'border-purple-200 hover:border-purple-400', badge: 'bg-purple-50 text-purple-700 border border-purple-200/60', lineColor: '#8B5CF6', dotColor: '#8B5CF6', chevronBg: 'hover:bg-purple-50 text-purple-600', glow: 'shadow-purple-500/10' },
    { border: 'border-amber-200 hover:border-amber-400', badge: 'bg-amber-50 text-amber-700 border border-amber-200/60', lineColor: '#F59E0B', dotColor: '#F59E0B', chevronBg: 'hover:bg-amber-50 text-amber-600', glow: 'shadow-amber-500/10' },
    { border: 'border-cyan-200 hover:border-cyan-400', badge: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60', lineColor: '#06B6D4', dotColor: '#06B6D4', chevronBg: 'hover:bg-cyan-50 text-cyan-600', glow: 'shadow-cyan-500/10' },
    { border: 'border-rose-200 hover:border-rose-400', badge: 'bg-rose-50 text-rose-700 border border-rose-200/60', lineColor: '#F43F5E', dotColor: '#F43F5E', chevronBg: 'hover:bg-rose-50 text-rose-600', glow: 'shadow-rose-500/10' },
];

function BranchRowItem({
    branch,
    bIdx,
    isExpanded,
    onToggle,
    masteredCards,
    onToggleMastered,
    copiedCardId,
    onCopyCard,
    onRegisterNodeRef,
}: {
    branch: any;
    bIdx: number;
    isExpanded: boolean;
    onToggle: () => void;
    masteredCards: { [key: string]: boolean };
    onToggleMastered: (key: string) => void;
    copiedCardId: string | null;
    onCopyCard: (text: string, key: string) => void;
    onRegisterNodeRef: (el: HTMLDivElement | null) => void;
}) {
    const theme = BRANCH_THEMES[bIdx % BRANCH_THEMES.length];
    const rowRef = useRef<HTMLDivElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const cardsColRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    const [connectorPoints, setConnectorPoints] = useState<{
        branchY: number;
        cardYs: number[];
        height: number;
    }>({ branchY: 0, cardYs: [], height: 60 });

    const updatePoints = useCallback(() => {
        if (!rowRef.current || !nodeRef.current) return;
        const rowRect = rowRef.current.getBoundingClientRect();
        const nodeRect = nodeRef.current.getBoundingClientRect();
        const branchY = (nodeRect.top + nodeRect.bottom) / 2 - rowRect.top;

        if (cardsColRef.current && isExpanded && branch.details?.length > 0) {
            const cardYs = cardRefs.current.map((cardEl) => {
                if (!cardEl) return branchY;
                const cr = cardEl.getBoundingClientRect();
                return (cr.top + cr.bottom) / 2 - rowRect.top;
            });
            setConnectorPoints({
                branchY,
                cardYs,
                height: rowRect.height,
            });
        } else {
            setConnectorPoints({
                branchY,
                cardYs: [],
                height: rowRect.height,
            });
        }
    }, [isExpanded, branch.details]);

    useLayoutEffect(() => {
        updatePoints();
        const ro = new ResizeObserver(() => updatePoints());
        if (rowRef.current) ro.observe(rowRef.current);
        if (cardsColRef.current) ro.observe(cardsColRef.current);
        return () => ro.disconnect();
    }, [updatePoints]);

    return (
        <div ref={rowRef} className="flex items-center relative my-3 group/row">
            {/* Branch Node Card */}
            <div
                ref={(el) => {
                    nodeRef.current = el;
                    onRegisterNodeRef(el);
                }}
                onClick={onToggle}
                className={`w-64 md:w-72 bg-white border ${theme.border} p-3 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer select-none relative z-10 hover:translate-x-1 shrink-0`}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${theme.badge} shrink-0`}>
                        0{bIdx + 1}
                    </span>
                    <span className="text-slate-800 font-bold text-xs uppercase tracking-wide truncate group-hover/row:text-primary transition-colors">
                        {branch.label}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                        {branch.details?.length || 0}
                    </span>
                    <div className={`p-1 rounded-lg ${theme.chevronBg} transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                </div>
            </div>

            {/* If expanded, render Connector SVG + Cards Column */}
            {isExpanded && branch.details && branch.details.length > 0 && (
                <div className="flex items-center shrink-0">
                    {/* SVG Connector Zone (w-14) */}
                    <div className="w-14 relative shrink-0" style={{ height: connectorPoints.height || 60 }}>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" overflow="visible">
                            <defs>
                                <linearGradient id={`grad-branch-${bIdx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={theme.lineColor} stopOpacity="0.8" />
                                    <stop offset="100%" stopColor={theme.lineColor} stopOpacity="0.4" />
                                </linearGradient>
                            </defs>
                            {connectorPoints.cardYs.map((cardY, j) => (
                                <g key={`path-${bIdx}-${j}`}>
                                    <path
                                        d={`M 0 ${connectorPoints.branchY} C 28 ${connectorPoints.branchY}, 28 ${cardY}, 56 ${cardY}`}
                                        stroke={`url(#grad-branch-${bIdx})`}
                                        strokeWidth="2"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                    <circle cx="56" cy={cardY} r="3" fill={theme.dotColor} />
                                </g>
                            ))}
                        </svg>
                    </div>

                    {/* Column of Detail Cards */}
                    <div ref={cardsColRef} className="flex flex-col gap-3 py-1 shrink-0">
                        {branch.details.map((detail: string, j: number) => {
                            const cardKey = `${branch.id || bIdx}-${j}`;
                            const isMastered = Boolean(masteredCards[cardKey]);
                            const isCopied = copiedCardId === cardKey;

                            return (
                                <div
                                    key={cardKey}
                                    ref={(el) => { cardRefs.current[j] = el; }}
                                    onClick={() => onToggleMastered(cardKey)}
                                    className={`bg-white border ${isMastered ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/90 hover:border-slate-300'} p-3.5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer max-w-[340px] md:max-w-[420px] flex items-start gap-3 group/card relative select-none`}
                                    title="Click to toggle reviewed"
                                >
                                    <div
                                        className={`mt-0.5 p-1 rounded-full transition-colors shrink-0 ${
                                            isMastered
                                                ? 'bg-emerald-500 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-400 group-hover/card:bg-slate-200'
                                        }`}
                                    >
                                        <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`text-[11.5px] leading-relaxed transition-all ${
                                                isMastered ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'
                                            }`}
                                        >
                                            {detail}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCopyCard(detail, cardKey);
                                        }}
                                        className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 shrink-0"
                                        title="Copy concept"
                                    >
                                        {isCopied ? (
                                            <Check className="h-3 w-3 text-emerald-600 stroke-[2.5]" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

interface DashboardProps {
    initialVideoId: string;
    initialData: any;
    userId: string;
    onReset: () => void;
}

export default function Dashboard({ initialVideoId, initialData, userId, onReset }: DashboardProps) {
    const [videoId, setVideoId] = useState<string>(initialVideoId);
    const [data, setData] = useState<any>(initialData);
    const isDocument = data?.content_type === "document";
    const isAudio = data?.content_type === "audio";
    const isVideo = data?.content_type === "video" || (!isDocument && !isAudio);
    const docTitle = data?.title || data?.filename || (isDocument ? "Uploaded Document" : isAudio ? "Uploaded Audio" : videoId);
    const mediaSrc = data?.url ? (data.url.startsWith('http') ? data.url : api(data.url)) : '';
    const hasMediaFile = Boolean(data?.url);

    const [activeTab, setActiveTab] = useState(isDocument ? "chat" : "summary");
    const isGuest = userId === "guest";
    const [chatHistory, setChatHistory] = useState<{role: string, content: string, timestamps?: any[]}[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<{[key: number]: string}>({});
    const [showResults, setShowResults] = useState(false);
    const [selectedLang, setSelectedLang] = useState("English");
    const [translating, setTranslating] = useState(false);
    const [snippets, setSnippets] = useState<any[]>([]);
    const [snippetsLoading, setSnippetsLoading] = useState(false);
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [flashcardsLoading, setFlashcardsLoading] = useState(false);
    const [currentFlashIdx, setCurrentFlashIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [chapters, setChapters] = useState<any[]>([]);
    const [chaptersLoading, setChaptersLoading] = useState(false);
    const [challenges, setChallenges] = useState<any[]>(data?.challenges || []);
    const [challengesLoading, setChallengesLoading] = useState(false);
    const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
    const [userCode, setUserCode] = useState("");
    const [evaluatingCode, setEvaluatingCode] = useState(false);
    const [codeFeedback, setCodeFeedback] = useState<any>(null);
    const [showCodeExplanation, setShowCodeExplanation] = useState(false);
    const [codeDescTab, setCodeDescTab] = useState('description');
    const [leftPanelWidth, setLeftPanelWidth] = useState(45);
    const [isResizing, setIsResizing] = useState(false);
    const [mainSplitWidth, setMainSplitWidth] = useState(60);
    const [isMainResizing, setIsMainResizing] = useState(false);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [customInput, setCustomInput] = useState("");
    const [isCustomInputActive, setIsCustomInputActive] = useState(false);
    const [mindmap, setMindmap] = useState<any>(null);
    const [mindmapLoading, setMindmapLoading] = useState(false);
    const [previousTab, setPreviousTab] = useState("summary");

    // New services and features
    const [quizDifficulty, setQuizDifficulty] = useState("Medium");
    const [similarProblems, setSimilarProblems] = useState<any[]>(data?.similar_problems || []);
    const [problemsLoading, setProblemsLoading] = useState(false);
    const [problemDifficulty, setProblemDifficulty] = useState("Medium");
    const [expandedHints, setExpandedHints] = useState<{[key: string]: boolean}>({});
    const [expandedSolutions, setExpandedSolutions] = useState<{[key: string]: boolean}>({});

    const [recommendations, setRecommendations] = useState<any>(data?.recommendations || null);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

    const [feedbackStatus, setFeedbackStatus] = useState<{[key: string]: 'positive' | 'negative'}>({});
    
    // Interactive Mindmap State
    const [expandedMindmapBranches, setExpandedMindmapBranches] = useState<{[key: string]: boolean}>({});
    const [masteredMindmapCards, setMasteredMindmapCards] = useState<{[key: string]: boolean}>({});
    const [copiedMindmapCard, setCopiedMindmapCard] = useState<string | null>(null);
    const [mindmapZoom, setMindmapZoom] = useState<number>(1);
    const treeContainerRef = useRef<HTMLDivElement>(null);
    const rootNodeRef = useRef<HTMLDivElement>(null);
    const branchItemRefs = useRef<{[key: number]: HTMLDivElement | null}>({});
    const [rootConnections, setRootConnections] = useState<{
        rootY: number;
        branchYs: number[];
        treeHeight: number;
    }>({ rootY: 0, branchYs: [], treeHeight: 300 });

    const updateTreeConnections = useCallback(() => {
        if (!treeContainerRef.current || !rootNodeRef.current) return;
        const treeRect = treeContainerRef.current.getBoundingClientRect();
        const rootRect = rootNodeRef.current.getBoundingClientRect();
        const rootY = (rootRect.top + rootRect.bottom) / 2 - treeRect.top;

        if (!mindmap?.branches) return;
        const branchYs = mindmap.branches.map((_: any, idx: number) => {
            const el = branchItemRefs.current[idx];
            if (!el) return rootY;
            const r = el.getBoundingClientRect();
            return (r.top + r.bottom) / 2 - treeRect.top;
        });

        setRootConnections({
            rootY,
            branchYs,
            treeHeight: treeRect.height,
        });
    }, [mindmap]);

    useLayoutEffect(() => {
        updateTreeConnections();
        const ro = new ResizeObserver(() => updateTreeConnections());
        if (treeContainerRef.current) ro.observe(treeContainerRef.current);
        return () => ro.disconnect();
    }, [mindmap, expandedMindmapBranches, updateTreeConnections]);

    const handleToggleBranch = (branchId: string | number) => {
        setExpandedMindmapBranches(prev => {
            const isCurrentExpanded = prev[branchId] !== false; // default to true
            return {
                ...prev,
                [branchId]: !isCurrentExpanded
            };
        });
    };

    const handleToggleMasteredCard = (cardKey: string) => {
        setMasteredMindmapCards(prev => ({
            ...prev,
            [cardKey]: !prev[cardKey]
        }));
    };

    const handleCopyMindmapCard = (text: string, cardKey: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMindmapCard(cardKey);
        setTimeout(() => {
            setCopiedMindmapCard(null);
        }, 1500);
    };

    const handleExpandAllBranches = () => {
        const next: {[key: string]: boolean} = {};
        mindmap?.branches?.forEach((b: any, idx: number) => {
            next[b.id || idx] = true;
        });
        setExpandedMindmapBranches(next);
    };

    const handleCollapseAllBranches = () => {
        const next: {[key: string]: boolean} = {};
        mindmap?.branches?.forEach((b: any, idx: number) => {
            next[b.id || idx] = false;
        });
        setExpandedMindmapBranches(next);
    };

    const totalMindmapConcepts = mindmap?.branches?.reduce((acc: number, b: any) => acc + (b.details?.length || 0), 0) || 0;
    const masteredMindmapCount = Object.values(masteredMindmapCards).filter(Boolean).length;
    const allBranchesExpanded = mindmap?.branches ? mindmap.branches.every((b: any, idx: number) => expandedMindmapBranches[b.id || idx] !== false) : true;

    // Visibility flags: Only show Similar Problems & Recommendations when needed for coding/problem content
    const hasCodingChallenges = Boolean(challenges && challenges.length > 0);
    const hasSimilarProblems = Boolean(similarProblems && similarProblems.length > 0);
    const hasCodeSnippets = Boolean(data?.summary?.code_snippets && data.summary.code_snippets.length > 0);
    const isCodingOrProblems = hasCodingChallenges || hasSimilarProblems || hasCodeSnippets || Boolean(data?.challenges && data.challenges.length > 0) || Boolean(data?.similar_problems && data.similar_problems.length > 0);
    const hasRecommendations = Boolean(
        recommendations && (
            (recommendations.recommended_topics && recommendations.recommended_topics.length > 0) ||
            (recommendations.action_plan && recommendations.action_plan.length > 0)
        )
    );

    // Fallback if current active tab is hidden for this content
    useEffect(() => {
        if (activeTab === 'code' && !hasCodingChallenges) {
            setActiveTab('summary');
        } else if (activeTab === 'problems' && !isCodingOrProblems) {
            setActiveTab('summary');
        } else if (activeTab === 'recommendations' && !isCodingOrProblems && !hasRecommendations) {
            setActiveTab('summary');
        }
    }, [activeTab, hasCodingChallenges, isCodingOrProblems, hasRecommendations]);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mainContainerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (activeTab === 'chat' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, chatLoading, activeTab]);

    useEffect(() => {
        if (videoId) {
            const fetchChatHistory = async () => {
                try {
                    const res = await fetch(api(`/api/chat_history/${videoId}?user_id=${userId}`));
                    if (res.ok) {
                        const result = await res.json();
                        setChatHistory(result.history || []);
                    }
                } catch (error) {
                    console.error("Error fetching chat history:", error);
                }
            };
            fetchChatHistory();
        }
    }, [videoId, userId]);

    useEffect(() => {
        if (activeTab === 'mindmap' && videoId && !mindmap && !mindmapLoading) {
            const fetchMindMap = async () => {
                setMindmapLoading(true);
                try {
                    const res = await fetch(api(`/api/mindmap/${videoId}`));
                    if (res.ok) {
                        const result = await res.json();
                        setMindmap(result);
                    }
                } catch (error) {
                    console.error("Error fetching mind map:", error);
                }
                setMindmapLoading(false);
            };
            fetchMindMap();
        }
    }, [activeTab, videoId, mindmap, mindmapLoading]);

    const handleRefreshMindmap = async () => {
        setMindmapLoading(true);
        try {
            const res = await fetch(api(`/api/mindmap/refresh/${videoId}`), { method: 'POST' });
            if (res.ok) {
                const result = await res.json();
                setMindmap(result);
            }
        } catch (e) {
            console.error("Error refreshing mindmap:", e);
        }
        setMindmapLoading(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeTab === 'flashcards' && flashcards.length > 0) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    setIsFlipped(prev => !prev);
                } else if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    setIsFlipped(false);
                    setCurrentFlashIdx(prev => (prev + 1) % flashcards.length);
                } else if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    setIsFlipped(false);
                    setCurrentFlashIdx(prev => (prev - 1 + flashcards.length) % flashcards.length);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, flashcards.length]);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (e: MouseEvent) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            if (newWidth >= 25 && newWidth <= 75) {
                setLeftPanelWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing]);

    const startMainResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsMainResizing(true);
    };

    useEffect(() => {
        const handleMainMouseMove = (e: MouseEvent) => {
            if (isMainResizing && mainContainerRef.current) {
                const containerRect = mainContainerRef.current.getBoundingClientRect();
                const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
                if (newWidth >= 30 && newWidth <= 70) {
                    setMainSplitWidth(newWidth);
                }
            }
        };

        const handleMainMouseUp = () => {
            setIsMainResizing(false);
        };

        if (isMainResizing) {
            window.addEventListener('mousemove', handleMainMouseMove);
            window.addEventListener('mouseup', handleMainMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMainMouseMove);
            window.removeEventListener('mouseup', handleMainMouseUp);
        };
    }, [isMainResizing]);

    const fetchSubmissions = async (challengeId: string) => {
        setSubmissionsLoading(true);
        try {
            const res = await fetch(api(`/api/submissions/${videoId}/${challengeId}?user_id=${userId}`));
            const data = await res.json();
            if (res.ok) setSubmissions(data.submissions || []);
        } catch (e) {
            console.error("Failed to fetch submissions:", e);
        }
        setSubmissionsLoading(false);
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr || "";
        }
    };

    const playerRef = useRef<any>(null);

    const seekToTime = (timestamp: number) => {
        const time = typeof timestamp === 'number' ? timestamp : parseFloat(String(timestamp));
        if (isNaN(time)) return;

        let el = playerRef.current;
        if (!el) {
            el = document.querySelector('iframe') || document.querySelector('video') || document.querySelector('audio');
        }
        if (!el) {
            console.warn("No video/audio player found to seek.");
            return;
        }

        if (el.tagName === 'IFRAME') {
            try {
                el.contentWindow?.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'seekTo',
                    args: [time, true]
                }), '*');
                el.contentWindow?.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'playVideo',
                    args: []
                }), '*');
            } catch (err) {
                console.error("Failed to postMessage to iframe:", err);
            }
        } else if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement || el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
            try {
                el.currentTime = time;
                el.play().catch(() => {});
            } catch (err) {
                console.error("Failed to seek video/audio element:", err);
            }
        }
    };

    const formatChatText = (text: string) => {
        if (!text || typeof text !== 'string' || isDocument) return text;

        // Comprehensive regex to match MM:SS, M:SS, seconds, ranges, (time ...), [▶ ...]
        const regex = /(?:\[|\()?(?:(?:time\s*|▶\s*)?(\d+):(\d{2})(?:\s*-\s*(?:▶\s*)?(\d+):(\d{2}))?|(?:time\s*)?(\d+(?:\.\d+)?)\s*s(?:\s*-\s*(\d+(?:\.\d+)?)\s*s)?)(?:\]|\))?/gi;
        const parts = [];
        let lastIdx = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIdx) {
                parts.push(<span key={`txt-${lastIdx}`}>{text.substring(lastIdx, match.index)}</span>);
            }

            let startSec = 0;
            let displayTime = "";

            if (match[1] && match[2]) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                startSec = min * 60 + sec;
                if (match[3] && match[4]) {
                    displayTime = `${min}:${sec.toString().padStart(2, '0')} - ${match[3]}:${match[4]}`;
                } else {
                    displayTime = `${min}:${sec.toString().padStart(2, '0')}`;
                }
            } else if (match[5]) {
                startSec = parseFloat(match[5]);
                const min = Math.floor(startSec / 60);
                const sec = Math.floor(startSec % 60).toString().padStart(2, '0');
                if (match[6]) {
                    const endSec = parseFloat(match[6]);
                    const endMin = Math.floor(endSec / 60);
                    const endSecStr = Math.floor(endSec % 60).toString().padStart(2, '0');
                    displayTime = `${min}:${sec} - ${endMin}:${endSecStr}`;
                } else {
                    displayTime = `${min}:${sec}`;
                }
            }

            parts.push(
                <button 
                    key={`time-${match.index}-${startSec}`}
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        seekToTime(startSec);
                    }}
                    className="inline-flex items-center justify-center px-3 py-0.5 mx-1.5 my-0.5 bg-indigo-50/90 hover:bg-indigo-100/90 text-indigo-600 hover:text-indigo-700 font-bold text-xs rounded-2xl border border-indigo-100/80 shadow-sm hover:shadow active:scale-95 cursor-pointer select-none align-baseline tracking-tight transition-all duration-150"
                    title={`Click to start video at ${displayTime}`}
                >
                    {displayTime}
                </button>
            );
            lastIdx = regex.lastIndex;
        }

        if (lastIdx < text.length) parts.push(<span key={`txt-end-${lastIdx}`}>{text.substring(lastIdx)}</span>);
        return parts.length > 0 ? parts : text;
    };

    const renderComponents = {
        p: ({children}: any) => {
            const childrenArray = React.Children.toArray(children);
            const isSingleDot = childrenArray.length === 1 && typeof childrenArray[0] === 'string' && childrenArray[0].trim() === '.';
            if (isSingleDot) return null;
            
            return (
                <div className="mb-2.5 last:mb-0 leading-[1.65] text-slate-700 text-[13.5px] font-normal">
                    {React.Children.map(children, (child, i) => 
                        typeof child === 'string' ? <React.Fragment key={i}>{formatChatText(child)}</React.Fragment> : child
                    )}
                </div>
            );
        },
        code: ({node, inline, className, children, ...props}: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeText = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match) || inline === false || (typeof children === 'string' && children.includes('\n'));
            const isShort = codeText.length < 50 && !codeText.includes('\n');
            
            if (isBlock) {
                return (
                    <div className={`not-prose block clear-both ${isShort ? 'my-2' : 'my-3'} w-full group overflow-hidden selection:bg-indigo-500/30`}>
                        <pre className={`grow block w-full bg-[#0a0f1d] text-indigo-100 ${isShort ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'} overflow-x-auto text-[11.5px] font-mono leading-relaxed border border-slate-800 shadow-sm relative`}>
                            <div className="absolute top-2.5 right-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity select-none">
                                {lang ? `${lang.toUpperCase()}` : 'CODE'}
                            </div>
                            <div className="relative z-10">
                                <code>{children}</code>
                            </div>
                        </pre>
                    </div>
                );
            }
            return (
                <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-[11.5px] font-semibold border border-indigo-100/80 mx-0.5" {...props}>
                    {children}
                </code>
            );
        },
        pre: ({children}: any) => <>{children}</>,
        table: ({children}: any) => (
            <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">{children}</table>
            </div>
        ),
        thead: ({children}: any) => (
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">{children}</thead>
        ),
        tbody: ({children}: any) => (
            <tbody className="divide-y divide-slate-100">{children}</tbody>
        ),
        tr: ({children}: any) => (
            <tr className="hover:bg-slate-50/60 transition-colors">{children}</tr>
        ),
        th: ({children}: any) => (
            <th className="px-3 py-2 font-bold text-slate-800 border-r border-slate-100 last:border-r-0">{children}</th>
        ),
        td: ({children}: any) => (
            <td className="px-3 py-2 text-slate-600 border-r border-slate-100 last:border-r-0 align-top">{children}</td>
        ),
        blockquote: ({children}: any) => (
            <blockquote className="my-2.5 border-l-2 border-primary pl-3 py-1.5 italic text-slate-600 bg-indigo-50/30 rounded-r-xl text-[13px]">{children}</blockquote>
        ),
        strong: ({children}: any) => (
            <strong className="font-bold text-slate-900">
                {React.Children.map(children, (child, i) => 
                    typeof child === 'string' ? <React.Fragment key={i}>{formatChatText(child)}</React.Fragment> : child
                )}
            </strong>
        ),
        ul: ({children}: any) => <ul className="my-2 space-y-1.5 list-none pl-0">{children}</ul>,
        ol: ({children}: any) => <ol className="my-2 space-y-1.5 list-none pl-0 counter-reset-[item]">{children}</ol>,
        li: ({children}: any) => (
            <li className="flex items-start gap-2.5 my-1 leading-relaxed text-slate-700 text-[13.5px]">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
                <div className="flex-1 min-w-0">
                    {React.Children.map(children, (child, i) => 
                        typeof child === 'string' ? <React.Fragment key={i}>{formatChatText(child)}</React.Fragment> : child
                    )}
                </div>
            </li>
        ),
        h1: ({children}: any) => <h1 className="text-[15px] font-bold text-slate-900 mb-2 mt-4 first:mt-0 tracking-tight flex items-center gap-2"><span className="w-1.5 h-4 bg-primary rounded-full inline-block shrink-0"></span><span>{children}</span></h1>,
        h2: ({children}: any) => <h2 className="text-[14px] font-bold text-slate-900 mb-1.5 mt-3 tracking-tight flex items-center gap-2"><span className="w-1.5 h-3.5 bg-indigo-500 rounded-full inline-block shrink-0"></span><span>{children}</span></h2>,
        h3: ({children}: any) => <h3 className="text-[13.5px] font-semibold text-slate-900 mb-1 mt-2.5 tracking-tight flex items-center gap-2"><span className="w-1 h-3 bg-indigo-400 rounded-full inline-block shrink-0"></span><span>{children}</span></h3>
    };

    // Original data backup for resetting to English
    const [originalData] = useState<any>(initialData);

    const extractVideoId = (url: string) => {
        let id = '';
        if (url.includes('v=')) {
            id = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            id = url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else {
            id = url.split('/').pop()?.split('?')[0] || '';
        }
        return id;
    };

    const handleDownloadPdf = async () => {
        const element = document.getElementById('notes-content');
        if (!element) {
            console.error('Notes content element not found');
            return;
        }

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            
            // Create a hidden iframe for total CSS isolation
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.top = '0';
            iframe.style.left = '0';
            iframe.style.width = '800px';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            iframe.style.visibility = 'hidden';
            iframe.style.pointerEvents = 'none';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('Could not create iframe document');

            // Clone the clean content (notes only, no buttons/icons)
            const cleanContent = element.cloneNode(true) as HTMLElement;
            
            // Critical Fix: Strip modern CSS colors (lab, oklch) that crash html2canvas
            cleanContent.querySelectorAll('*').forEach((el: any) => {
                const style = el.getAttribute('style') || '';
                if (style.includes('lab(') || style.includes('oklch(')) {
                    el.style.color = '';
                    el.style.backgroundColor = '';
                }
            });

            const actionButtons = cleanContent.querySelector('.absolute.top-8.right-8');
            if (actionButtons) actionButtons.remove();
            cleanContent.querySelectorAll('svg').forEach(svg => svg.remove());
            
            // Absolute Sanitization: Deep Flattening of styles to bypass modern CSS functions
            const shadowContainer = document.createElement('div');
            shadowContainer.style.position = 'absolute';
            shadowContainer.style.left = '-9999px';
            shadowContainer.style.top = '0';
            shadowContainer.appendChild(cleanContent);
            document.body.appendChild(shadowContainer);

            // Recursively flatten and scrub colors
            const flatten = (el: HTMLElement) => {
                const computed = window.getComputedStyle(el);
                const props = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke'];
                
                props.forEach(prop => {
                    const val = computed.getPropertyValue(prop);
                    if (val.includes('lab(') || val.includes('oklch(')) {
                        // Hard override to safe hex
                        const isBg = prop.toLowerCase().includes('background');
                        el.style.setProperty(prop, isBg ? 'transparent' : '#1e293b', 'important');
                    }
                });
                
                Array.from(el.children).forEach(child => flatten(child as HTMLElement));
            };
            
            flatten(cleanContent);
            
            // Map tags to safe PDF styles and REMOVE all existing Tailwind classes to ensure total isolation
            let rawInner = cleanContent.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawInner;
            tempDiv.querySelectorAll('*').forEach(el => {
                const tagName = el.tagName.toLowerCase();
                el.removeAttribute('class');
                el.classList.add(`pdf-${tagName}`);
            });
            const htmlString = tempDiv.innerHTML;
            
            // Cleanup shadow container
            document.body.removeChild(shadowContainer);

            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                    body { 
                        font-family: 'Inter', sans-serif; 
                        padding: 40px; 
                        color: #1e293b; 
                        background: white; 
                        line-height: 1.5;
                        margin: 0;
                    }
                    .export-container { max-width: 800px; margin: 0 auto; }
                    .pdf-h1 { 
                        font-size: 32pt; 
                        font-weight: 900; 
                        margin-bottom: 30px; 
                        color: #0f172a; 
                        display: block;
                        font-family: 'Inter', sans-serif;
                    }
                    .pdf-h2 { 
                        font-size: 22pt; 
                        font-weight: 700; 
                        margin-top: 40px; 
                        margin-bottom: 20px; 
                        color: #1e293b; 
                        display: block; 
                        padding-left: 15px;
                        border-left: 6px solid #6366f1;
                        line-height: 1.2;
                    }
                    .pdf-h3 { 
                        font-size: 18pt; 
                        font-weight: 700; 
                        margin-top: 30px; 
                        margin-bottom: 15px; 
                        color: #334155; 
                        display: block; 
                    }
                    .pdf-p { 
                        margin-bottom: 20px; 
                        font-size: 13pt; 
                        color: #475569; 
                        display: block; 
                        line-height: 1.7; 
                    }
                    .pdf-strong {
                        font-weight: 700;
                        color: #1e293b;
                    }
                    .pdf-ul { padding-left: 20px; list-style-type: none; margin-bottom: 25px; display: block; }
                    .pdf-li { 
                        margin-bottom: 12px; 
                        font-size: 13pt; 
                        color: #475569; 
                        display: block; 
                        line-height: 1.6; 
                        position: relative;
                        padding-left: 25px;
                    }
                    .pdf-li::before {
                        content: "•";
                        color: #6366f1;
                        font-size: 1.5em;
                        position: absolute;
                        left: 0;
                        top: -2px;
                    }
                    .pdf-code { 
                        background: #f1f5f9; 
                        padding: 3px 8px; 
                        border-radius: 6px; 
                        font-family: monospace; 
                        font-size: 11pt; 
                        color: #4f46e5; 
                    }
                    .pdf-pre { 
                        background: #0f172a; 
                        color: #f8fafc; 
                        padding: 30px; 
                        border-radius: 16px; 
                        margin: 25px 0; 
                        font-size: 11pt; 
                        line-height: 1.6; 
                        display: block; 
                        white-space: pre-wrap; 
                        position: relative;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
                        border: 1px solid #1e293b;
                    }
                    .pdf-pre::after {
                        content: "JAVA SOURCE";
                        position: absolute;
                        top: 15px;
                        right: 20px;
                        font-size: 8pt;
                        color: #475569;
                        letter-spacing: 0.1em;
                        font-weight: 700;
                    }
                    .pdf-div { display: block; margin-bottom: 12px; }
                </style>
                </head>
                <body>
                    <div class="export-container">${htmlString}</div>
                </body>
                </html>
            `);
            iframeDoc.close();

            const opt = {
                margin: [15, 15] as any,
                filename: `Study-Notes-${videoId}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    windowWidth: 800,
                    // Critical: Tell html2canvas to only look at the isolated iframe document
                    document: iframeDoc,
                    // Additional scrubbing during capture
                    onclone: (clonedDoc: Document) => {
                        clonedDoc.querySelectorAll('*').forEach((el: any) => {
                            const style = el.getAttribute('style') || '';
                            if (style.toLowerCase().includes('lab(') || style.toLowerCase().includes('oklch(')) {
                                el.style.color = '#000000';
                                el.style.backgroundColor = 'transparent';
                            }
                        });
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true }
            };

            await html2pdf().from(iframeDoc.body).set(opt).save();
            setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 2000);
        } catch (error) {
            console.error('Failed to download PDF:', error);
            alert('PDF generation failed. Please try again.');
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput || !videoId) return;
        const newHistory = [...chatHistory, { role: "user", content: chatInput }];
        setChatHistory(newHistory);
        setChatInput("");
        setChatLoading(true);
        try {
            const res = await fetch(api(`/api/chat/${videoId}?user_id=${userId}`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: chatInput })
            });
            const result = await res.json();
            if (res.ok) {
                setChatHistory(prev => [...prev, { role: "assistant", content: result.answer, timestamps: result.timestamps }]);
            }
        } catch (e) {
            setChatHistory([...newHistory, { role: "assistant", content: "Error connecting to AI assistant." }]);
        }
        setChatLoading(false);
    };

    const handleTranslate = async (lang: string) => {
        if (lang === "English") {
            setData((prev: any) => ({
                ...prev, 
                summary: {
                    ...prev.summary, 
                    short_summary: originalData.summary.short_summary,
                    structured_notes: originalData.summary.structured_notes
                }
            }));
            setTranslating(lang !== "English");
            setSelectedLang(lang);
            return;
        }
        try {
            const res = await fetch(api(`/api/translate/${videoId}?lang=${lang}`));
            const result = await res.json();
            if (res.ok) {
                setData((prev: any) => ({
                    ...prev, 
                    summary: {
                        ...prev.summary, 
                        short_summary: result.short_summary,
                        structured_notes: result.structured_notes
                    }
                }));
            }
        } catch (e) {
            console.error(e);
        }
        setTranslating(false);
    };

    const fetchSnippets = async () => {
        setSnippetsLoading(true);
        try {
            const res = await fetch(api(`/api/snippets/${videoId}`));
            const result = await res.json();
            if (res.ok) {
                setSnippets(result.snippets);
            }
        } catch (e) {
            console.error(e);
        }
        setSnippetsLoading(false);
    };

    const fetchFlashcards = async () => {
        setFlashcardsLoading(true);
        try {
            const res = await fetch(api(`/api/flashcards/${videoId}`));
            const result = await res.json();
            if (res.ok) setFlashcards(result.flashcards);
        } catch (e) { console.error(e); }
        setFlashcardsLoading(false);
    };


    const fetchChapters = async () => {
        setChaptersLoading(true);
        try {
            const res = await fetch(api(`/api/chapters/${videoId}`));
            const result = await res.json();
            if (res.ok) setChapters(result.chapters);
        } catch (e) { console.error(e); }
        setChaptersLoading(false);
    };

    const fetchChallenges = async () => {
        if (challenges.length > 0) return;
        setChallengesLoading(true);
        try {
            const res = await fetch(api(`/api/challenges/${videoId}`));
            const result = await res.json();
            if (res.ok && result.challenges) {
                setChallenges(result.challenges);
                if (result.challenges.length > 0 && !userCode) {
                    setUserCode(result.challenges[0].starting_code || "");
                }
            }
        } catch (e) { console.error(e); }
        setChallengesLoading(false);
    };

    const handleRefreshChallenges = async () => {
        setChallengesLoading(true);
        try {
            const res = await fetch(api(`/api/challenges/refresh/${videoId}`), { method: 'POST' });
            const result = await res.json();
            if (res.ok && result.challenges) {
                setChallenges(result.challenges);
                setCurrentChallengeIdx(0);
                setUserCode(result.challenges.length > 0 ? (result.challenges[0].starting_code || "") : "");
                setCodeFeedback(null);
            }
        } catch (e) {
            console.error("Error refreshing challenges", e);
        }
        setChallengesLoading(false);
    };

    const fetchChatHistoryInDashboard = async () => {
        try {
            const res = await fetch(api(`/api/chat_history/${videoId}?user_id=${userId}`));
            const result = await res.json();
            if (res.ok) {
                setChatHistory(result.history.map((m: any) => ({
                    role: m.role,
                    content: m.content,
                    timestamps: []
                })));
            }
        } catch (e) { console.error(e); }
    };

    const fetchSimilarProblems = async (diff?: string) => {
        const targetDiff = diff || problemDifficulty;
        setProblemsLoading(true);
        try {
            const res = await fetch(api(`/api/similar-problems/${videoId}?difficulty=${targetDiff}`));
            const result = await res.json();
            if (res.ok && result.problems) {
                setSimilarProblems(result.problems);
            }
        } catch (e) {
            console.error("Error fetching similar problems:", e);
        }
        setProblemsLoading(false);
    };

    const handleRefreshProblems = async (diff?: string) => {
        const targetDiff = diff || problemDifficulty;
        setProblemsLoading(true);
        try {
            const res = await fetch(api(`/api/similar-problems/refresh/${videoId}?difficulty=${targetDiff}`), { method: 'POST' });
            const result = await res.json();
            if (res.ok && result.problems) {
                setSimilarProblems(result.problems);
                setExpandedHints({});
                setExpandedSolutions({});
            }
        } catch (e) {
            console.error("Error refreshing similar problems:", e);
        }
        setProblemsLoading(false);
    };

    const fetchRecommendations = async () => {
        if (recommendations) return;
        setRecommendationsLoading(true);
        try {
            const res = await fetch(api(`/api/recommendations/${videoId}?user_id=${userId}`));
            const result = await res.json();
            if (res.ok) {
                setRecommendations(result);
            }
        } catch (e) {
            console.error("Error fetching recommendations:", e);
        }
        setRecommendationsLoading(false);
    };

    const handleRefreshRecommendations = async () => {
        setRecommendationsLoading(true);
        try {
            const res = await fetch(api(`/api/recommendations/refresh/${videoId}?user_id=${userId}`), { method: 'POST' });
            const result = await res.json();
            if (res.ok) {
                setRecommendations(result);
            }
        } catch (e) {
            console.error("Error refreshing recommendations:", e);
        }
        setRecommendationsLoading(false);
    };

    const handleFeedback = async (feedbackType: string, rating: 'positive' | 'negative', itemId: string) => {
        setFeedbackStatus(prev => ({ ...prev, [itemId]: rating }));
        try {
            await fetch(api('/api/feedback'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    video_id: videoId,
                    feedback_type: feedbackType,
                    rating: rating
                })
            });
        } catch (e) {
            console.error("Feedback error:", e);
        }
    };

    useEffect(() => {
        if (videoId) {
            fetchChatHistoryInDashboard();
            fetchChapters();
            fetchChallenges();
            if (activeTab === 'notes') fetchSnippets();
            if (activeTab === 'flashcards') fetchFlashcards();
            if (activeTab === 'problems' && similarProblems.length === 0) fetchSimilarProblems();
            if (activeTab === 'recommendations' && !recommendations) fetchRecommendations();
        }
    }, [videoId, activeTab]);

    const LoginPrompt = () => (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 p-10 text-center border border-slate-100">
                <div className="bg-primary/10 w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                    <Zap className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Login Required</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    Sign in to your EduStream AI account to unlock interactive chat, quizzes, and personalized study tools.
                </p>
                <button 
                    onClick={() => onReset()}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                >
                    Return to Login
                </button>
            </div>
        </div>
    );


    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
            {/* Header */}
            <header className="h-auto min-h-16 py-3 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between px-6 bg-white/80 backdrop-blur-md z-30 shrink-0 gap-4">
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <button 
                      onClick={onReset}
                      className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center space-x-2">
                        <img src="/logo.png" alt="EduStream Logo" className="h-10 w-10 object-contain scale-110" />
                        <span className="text-lg font-bold text-slate-900 shrink-0">EduStream AI</span>
                        <span className="hidden sm:inline text-slate-300 mx-2">|</span>
                        <span className="text-sm font-medium text-slate-500 truncate max-w-[200px] md:max-w-[300px]">Workspace: {docTitle}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {[
                            'chat',
                            'summary',
                            'quiz',
                            ...(isCodingOrProblems ? ['problems', 'recommendations'] : (hasRecommendations ? ['recommendations'] : [])),
                            'notes',
                            'flashcards',
                            'mindmap',
                            ...(hasCodingChallenges ? ['code'] : [])
                        ].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => {
                                    if (isGuest && tab !== 'summary') {
                                        // We'll allow summary, but show gate for others
                                        setActiveTab(tab);
                                    } else {
                                        if (tab === 'mindmap') setPreviousTab(activeTab);
                                        setActiveTab(tab);
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab === 'problems' ? 'SIMILAR PROBLEMS' : tab === 'recommendations' ? 'RECOMMENDATIONS' : tab.toUpperCase()}
                                {isGuest && tab !== 'summary' && (
                                    <Zap className="h-2 w-2 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main ref={mainContainerRef} className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {activeTab !== 'code' && (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                        {/* Left Panel - Video Player / Document Viewer & Chapters */}
                        <div 
                            className="flex flex-col bg-slate-50 overflow-y-auto border-b md:border-b-0 no-scrollbar relative"
                            style={{ width: `${mainSplitWidth}%` }}
                        >
                    <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
                        <div className="w-full max-w-4xl mx-auto">
                            {isDocument ? (
                                <div className="w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative mb-8 border border-slate-800">
                                    <div className="flex items-center justify-between px-6 py-3.5 bg-slate-800/90 border-b border-slate-700/60 backdrop-blur-md">
                                        <div className="flex items-center space-x-3 truncate">
                                            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="truncate text-left">
                                                <p className="text-white font-bold text-sm truncate">{docTitle}</p>
                                                <p className="text-slate-400 text-[11px]">Document Mode • Interactive Study</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 shrink-0">
                                            {hasMediaFile && (
                                                <>
                                                    <a 
                                                        href={mediaSrc} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                                        title="Open Document in New Tab"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Open File</span>
                                                    </a>
                                                    <a 
                                                        href={mediaSrc} 
                                                        download={docTitle}
                                                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-xl text-xs transition-all"
                                                        title="Download Document"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {hasMediaFile && (data.url.toLowerCase().includes('.pdf') || docTitle.toLowerCase().endsWith('.pdf')) ? (
                                        <div className="w-full h-[460px] bg-slate-950">
                                            <iframe 
                                                src={`${mediaSrc}#toolbar=1`}
                                                className="w-full h-full border-none"
                                                title={docTitle}
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-8 flex flex-col items-center justify-center space-y-4 text-center min-h-[220px]">
                                            <div className="bg-white/10 p-5 rounded-[2rem] border border-white/5 shadow-inner">
                                                <FileText className="h-14 w-14 text-indigo-400" />
                                            </div>
                                            <div className="space-y-1 max-w-md">
                                                <h3 className="text-white text-xl font-black">{docTitle}</h3>
                                                <p className="text-indigo-200/70 font-medium text-xs">
                                                    Document knowledge extracted and indexed. Use the chat, smart summary, and quiz tools to study.
                                                </p>
                                            </div>
                                            {hasMediaFile && (
                                                <div className="flex items-center gap-3 pt-2">
                                                    <a 
                                                        href={mediaSrc} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                        View Original File
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : isAudio ? (
                                <div className="w-full bg-slate-900 rounded-3xl p-8 shadow-2xl relative mb-8 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
                                    <div className="p-5 bg-gradient-to-tr from-indigo-500/20 to-primary/20 text-indigo-400 rounded-[2rem] border border-indigo-500/20">
                                        <Music className="h-12 w-12" />
                                    </div>
                                    <div>
                                        <h3 className="text-white text-lg font-black">{docTitle}</h3>
                                        <p className="text-indigo-200/70 font-medium text-xs mt-1">Audio Recording / Lecture</p>
                                    </div>
                                    {hasMediaFile && (
                                        <audio ref={playerRef} controls className="w-full max-w-md rounded-xl mt-2" src={mediaSrc}></audio>
                                    )}
                                </div>
                            ) : (
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative mb-8 group">
                                    {data.url && data.url.includes('api/media') ? (
                                        <video 
                                            ref={playerRef}
                                            className="w-full h-full"
                                            controls
                                            src={mediaSrc}
                                        ></video>
                                    ) : (
                                        <iframe 
                                            ref={playerRef}
                                            className="w-full h-full"
                                            src={`https://www.youtube-nocookie.com/embed/${extractVideoId(data.url)}?enablejsapi=1&autoplay=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    )}
                                    
                                    {/* Chapters Overlay Mobile - Only for videos */}
                                    <div className="absolute bottom-4 left-4 right-4 flex md:hidden overflow-x-auto gap-2 no-scrollbar pointer-events-auto">
                                        {chapters.map((c, i) => (
                                            <button 
                                                key={`chapter-mob-${i}-${c.timestamp}`}
                                                onClick={() => seekToTime(c.timestamp)}
                                                className="px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-lg whitespace-nowrap border border-white/10"
                                            >
                                                {c.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Workspace Overview</h2>
                                    <div className="text-slate-600 leading-relaxed font-medium">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderComponents as any}>
                                            {data.summary?.short_summary || ""}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {/* Chapters Grid (Realigned to rows) */}
                                {chapters.length > 0 && (
                                    <div className="space-y-4 pt-4">
                                        <h3 className="font-black text-slate-900 flex items-center text-sm uppercase tracking-widest px-2">
                                            <RotateCcw className="h-4 w-4 mr-2 text-primary" />
                                            Smart Timeline
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {chapters.map((c, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => seekToTime(c.timestamp)}
                                                    className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md flex items-center gap-4"
                                                >
                                                    <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-primary/5 transition-colors shrink-0">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-wider">{Math.floor(c.timestamp / 60)}:{(Math.floor(c.timestamp % 60)).toString().padStart(2, '0')}</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700 leading-tight group-hover:text-slate-900 truncate">{c.title}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vocabulary & Concepts are now properly inside the left panel container */}
                        <div className="mt-12 space-y-8">
                            {(data.summary.vocabulary || []).length > 0 && (
                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                                        <Terminal className="h-5 w-5 mr-3 text-primary" />
                                        Key Vocabulary
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {data.summary.vocabulary.map((v: any, i: number) => (
                                            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group">
                                                <p className="font-bold text-primary mb-1 underline decoration-primary/20 group-hover:decoration-primary/50">{v.term}</p>
                                                <p className="text-sm text-slate-600 leading-relaxed">{v.definition}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                                    <ListChecks className="h-5 w-5 mr-3 text-primary" />
                                    Core Concepts
                                </h3>
                                <ul className="space-y-4">
                                    {(data.summary.key_points || []).map((kp: string, i: number) => (
                                        <li key={i} className="flex items-start space-x-4">
                                            <div className="bg-indigo-50 text-primary h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            <span className="text-slate-700 leading-relaxed">{kp}</span>
                                        </li>
                                    ))}
                                </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Main Resize Handle */}
                <div 
                    className={`w-1 shrink-0 bg-slate-100 hover:bg-primary transition-colors cursor-col-resize relative z-30 ${isMainResizing ? 'bg-primary shadow-[0_0_15px_rgba(37,99,235,0.3)]' : ''}`}
                    onMouseDown={() => setIsMainResizing(true)}
                >
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-slate-200 group-hover:bg-primary/50"></div>
                </div>

                {/* Right Panel - Interactive Tooling */}
                <div 
                    className="flex flex-col border-l border-slate-100 bg-white overflow-hidden transition-all duration-300"
                    style={{ width: `${100 - mainSplitWidth}%` }}
                >
                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-full p-6 relative bg-slate-50/30">
                            {isGuest && <LoginPrompt />}
                            {/* Chat Header */}
                            <div className="flex items-center justify-between mb-4 z-10 px-2">
                                <h3 className="font-bold text-slate-900 flex items-center">
                                    <MessageSquare className="h-5 w-5 mr-3 text-primary" />
                                    AI Study Assistant
                                </h3>
                                <button 
                                    onClick={async () => {
                                        setChatHistory([]);
                                        try {
                                            await fetch(api(`/api/chat_history/${videoId}?user_id=${userId}`), { method: 'DELETE' });
                                        } catch (e) { console.error("Error clearing chat:", e); }
                                    }}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-rose-500 transition-all active:scale-95"
                                    title="Clear Conversation"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            
                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto space-y-6 px-2 pt-2 pb-28 custom-scrollbar relative">
                                {chatHistory.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="bg-primary/10 p-6 rounded-[2rem] mb-6 animate-pulse">
                                            <Zap className="h-10 w-10 text-primary" />
                                        </div>
                                        <h4 className="font-black text-slate-900 mb-2 uppercase tracking-widest text-xs">Ready to help</h4>
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed">Ask me any question about<br/>the concepts in this video.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {chatHistory.map((msg, idx) => (
                                            <div key={`msg-${idx}-${msg.role}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
                                                <div className={`flex ${msg.role === 'user' ? 'max-w-[85%] flex-row-reverse' : 'max-w-[96%] w-full flex-row'} items-start gap-2.5 min-w-0`}>
                                                    {msg.role !== 'user' && (
                                                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-50 to-primary/10 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                                        </div>
                                                    )}
                                                    <div className={`
                                                        relative overflow-hidden min-w-0 break-words
                                                        ${msg.role === 'user' 
                                                            ? 'px-4 py-2.5 rounded-2xl bg-indigo-600 text-white rounded-tr-xs shadow-sm text-[13.5px] leading-relaxed font-medium' 
                                                            : 'px-4.5 py-3.5 md:px-5 md:py-4 rounded-2xl bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-sm w-full'}
                                                    `}>
                                                        <div className="relative z-10 min-w-0">
                                                            {msg.role === 'user' ? (
                                                                <div className="text-[13.5px] font-normal leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                                            ) : (
                                                                <div className="text-[13.5px] leading-relaxed text-slate-700 not-prose">
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderComponents as any}>
                                                                        {msg.content}
                                                                    </ReactMarkdown>
                                                                    <div className="flex items-center space-x-2 mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-400">
                                                                        <span>Helpful?</span>
                                                                        <button 
                                                                            onClick={() => handleFeedback('chat', 'positive', `chat_${idx}`)} 
                                                                            className={`p-1 rounded hover:text-emerald-600 transition-colors ${feedbackStatus[`chat_${idx}`] === 'positive' ? 'text-emerald-600 font-bold bg-emerald-50' : 'hover:bg-slate-50'}`}
                                                                            title="Helpful response"
                                                                        >
                                                                            <ThumbsUp className="h-3 w-3" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleFeedback('chat', 'negative', `chat_${idx}`)} 
                                                                            className={`p-1 rounded hover:text-rose-600 transition-colors ${feedbackStatus[`chat_${idx}`] === 'negative' ? 'text-rose-600 font-bold bg-rose-50' : 'hover:bg-slate-50'}`}
                                                                            title="Needs improvement"
                                                                        >
                                                                            <ThumbsDown className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {chatLoading && (
                                    <div className="flex justify-start animate-in fade-in duration-200">
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                                <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            </div>
                                            <div className="bg-white border border-slate-200/90 px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex space-x-1.5 items-center">
                                                <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                                                <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} className="h-1" />
                            </div>

                            {/* Chat Input Floating */}
                            <div className="absolute bottom-6 left-6 right-6 z-20">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                                    <div className="relative flex items-center bg-white border border-slate-200 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] p-1.5 transition-all">
                                        <input 
                                            type="text" 
                                            placeholder="Type your question..." 
                                            className="flex-1 w-full pl-5 pr-2 py-3 bg-transparent focus:outline-none text-[15px] font-medium text-slate-700 placeholder-slate-400 disabled:opacity-50"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            disabled={chatLoading}
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={chatLoading || !chatInput.trim()}
                                            className="p-3 bg-primary text-white rounded-[1.5rem] hover:bg-primary-dark transition-all disabled:opacity-30 disabled:grayscale hover:shadow-lg hover:shadow-primary/25 active:scale-95 ml-2"
                                        >
                                            <Send className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-center text-slate-400 mt-3 font-bold uppercase tracking-widest pointer-events-none opacity-60">Press Enter to send</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'summary' && (
                        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
                            <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-bold text-slate-900 flex items-center text-xl">
                                        <FileText className="h-6 w-6 mr-3 text-primary" />
                                        Smart Summary
                                    </h3>
                                </div>
                                <div className="text-slate-600 leading-relaxed text-base font-medium mb-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                     <span className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></span>
                                     <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderComponents as any}>
                                         {data.summary?.short_summary || ""}
                                     </ReactMarkdown>
                                </div>
                                <h4 className="text-slate-900 font-bold mb-4">Key Objectives</h4>
                                <div className="space-y-4">
                                    {data.summary.key_points.map((p: string, i: number) => (
                                        <div key={`point-${i}`} className="flex items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-primary mr-4 shrink-0"></div>
                                            <span className="text-sm font-medium text-slate-700">{p}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 p-5 bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-indigo-50 text-primary rounded-xl">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">Was this summary clear and accurate?</p>
                                            <p className="text-[11px] text-slate-400">Your feedback improves our study material</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={() => handleFeedback('summary', 'positive', 'summary_main')}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${feedbackStatus['summary_main'] === 'positive' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                        >
                                            <ThumbsUp className="h-3.5 w-3.5" />
                                            <span>Helpful</span>
                                        </button>
                                        <button 
                                            onClick={() => handleFeedback('summary', 'negative', 'summary_main')}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${feedbackStatus['summary_main'] === 'negative' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                        >
                                            <ThumbsDown className="h-3.5 w-3.5" />
                                            <span>Needs Work</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'quiz' && (
                        <div className="flex flex-col h-full p-8 overflow-y-auto relative no-scrollbar">
                            {isGuest && <LoginPrompt />}
                            {quizLoading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4">
                                    <div className="h-10 w-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                                    <p className="font-bold text-slate-900">Updating Quiz...</p>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <h3 className="font-bold text-slate-900 flex items-center text-xl">
                                    <HelpCircle className="h-6 w-6 mr-3 text-primary" />
                                    Knowledge Check
                                </h3>
                                <div className="flex items-center space-x-3">
                                    {/* Difficulty Selector */}
                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                        {['Easy', 'Medium', 'Hard'].map((diff) => (
                                            <button
                                                key={diff}
                                                onClick={async () => {
                                                    setQuizDifficulty(diff);
                                                    setQuizLoading(true);
                                                    setQuizAnswers({});
                                                    setShowResults(false);
                                                    try {
                                                        const res = await fetch(api(`/api/quiz/refresh/${videoId}?difficulty=${diff}`), {
                                                            method: "POST"
                                                        });
                                                        const result = await res.json();
                                                        setData((prev: any) => ({...prev, quiz: result.quiz || []}));
                                                    } catch (e) { console.error(e); }
                                                    setQuizLoading(false);
                                                }}
                                                className={`px-3 py-1 rounded-lg transition-all ${quizDifficulty === diff ? 'bg-white text-primary shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                                            >
                                                {diff}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => { setQuizAnswers({}); setShowResults(false); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Reset Quiz">
                                            <RotateCcw className="h-4 w-4" />
                                        </button>
                                        <button onClick={async () => {
                                            setQuizLoading(true);
                                            setQuizAnswers({});
                                            setShowResults(false);
                                            try {
                                                const res = await fetch(api(`/api/quiz/refresh/${videoId}?difficulty=${quizDifficulty}`), {
                                                    method: "POST"
                                                });
                                                const result = await res.json();
                                                setData((prev: any) => ({...prev, quiz: result.quiz || []}));
                                            } catch (e) { console.error(e); }
                                            setQuizLoading(false);
                                        }} className="p-2 hover:bg-slate-100 rounded-lg text-primary transition-colors" title="New Questions">
                                            <RefreshCw className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-8 pb-12">
                                {showResults && (
                                    <div className="bg-gradient-to-r from-indigo-500 to-primary p-8 rounded-[2.5rem] text-white shadow-xl mb-12 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center gap-6 text-center sm:text-left">
                                            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-sm">
                                                <Zap className="h-10 w-10 text-yellow-300 fill-yellow-300" />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black">Quiz Completed!</h4>
                                                <p className="text-indigo-100 font-medium">Great job finishing the knowledge check.</p>
                                            </div>
                                        </div>
                                        <div className="bg-white text-slate-900 px-10 py-5 rounded-3xl text-center shadow-lg">
                                            <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Your Score</div>
                                            <div className="text-5xl font-black text-primary">
                                                {data.quiz.filter((q: any, i: number) => {
                                                    const userAnswer = quizAnswers[i];
                                                    if (!userAnswer) return false;
                                                    if (userAnswer === q.answer) return true;
                                                    const letterMap: {[key: string]: number} = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                                                    const index = letterMap[q.answer?.trim().toUpperCase()];
                                                    return index !== undefined && q.options[index] === userAnswer;
                                                }).length}
                                                <span className="text-slate-300 text-3xl font-bold mx-1">/</span>
                                                {data.quiz.length}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {data.quiz.map((q: any, i: number) => {
                                    const userAnswer = quizAnswers[i];
                                    const letterMap: {[key: string]: number} = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                                    const cIdx = letterMap[q.answer?.trim().toUpperCase()];
                                    const fullCorrect = cIdx !== undefined ? q.options[cIdx] : q.answer;
                                    const isCorrect = userAnswer === fullCorrect;
                                    
                                    return (
                                        <div key={i} className={`bg-slate-50 p-8 rounded-[2.5rem] border ${showResults ? (isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30') : 'border-slate-100'} transition-all duration-500`}>
                                            <div className="flex items-start justify-between mb-8">
                                                <p className="font-bold text-slate-900 text-lg flex items-start flex-1 pr-4">
                                                    <span className="bg-white text-slate-400 rounded-xl h-8 w-8 flex items-center justify-center mr-4 mt-0.5 shrink-0 text-xs font-bold border border-slate-200 shadow-sm">{i + 1}</span>
                                                    {q.question}
                                                </p>
                                                {showResults && (
                                                    isCorrect ? 
                                                    <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg shadow-emerald-200 animate-in zoom-in duration-300">
                                                        <CheckCircle className="h-6 w-6" />
                                                    </div> :
                                                    <div className="bg-rose-500 text-white p-1.5 rounded-full shadow-lg shadow-rose-200 animate-in zoom-in duration-300">
                                                        <X className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                {q.options.map((opt: string, j: number) => {
                                                    const isSelected = userAnswer === opt;
                                                    const isOptionCorrect = opt === fullCorrect;
                                                    let cardClass = "w-full text-left p-5 rounded-2xl border-2 transition-all relative overflow-hidden group ";
                                                    if (showResults) {
                                                        if (isOptionCorrect) cardClass += "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-md";
                                                        else if (isSelected) cardClass += "bg-rose-50 border-rose-300 text-rose-900 opacity-80";
                                                        else cardClass += "bg-white border-slate-100 text-slate-400 opacity-60";
                                                    } else {
                                                        if (isSelected) cardClass += "bg-white border-primary text-primary font-bold shadow-xl -translate-y-1";
                                                        else cardClass += "bg-white border-white text-slate-600 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5";
                                                    }
                                                    return (
                                                        <button key={j} disabled={showResults} onClick={() => setQuizAnswers({...quizAnswers, [i]: opt})} className={cardClass}>
                                                            <div className="flex items-center relative z-10">
                                                                <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 transition-all ${
                                                                    showResults && isOptionCorrect ? 'border-emerald-500 bg-emerald-500' :
                                                                    isSelected ? 'border-primary bg-primary' : 'border-slate-200 bg-white group-hover:border-slate-300'
                                                                }`}>
                                                                    {(isSelected || (showResults && isOptionCorrect)) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                </div>
                                                                <span className="text-sm md:text-base leading-tight">{opt}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {showResults && !isCorrect && (
                                                <div className="mt-6 p-4 bg-white/50 rounded-2xl border border-rose-100 flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-rose-400"></div>
                                                    <p className="text-sm text-slate-600">The correct answer is <span className="font-bold text-emerald-600">{fullCorrect}</span></p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {!showResults ? (
                                    <div className="mt-12 bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="text-center sm:text-left">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Your Progress</p>
                                            <p className="text-lg font-black text-slate-900">{Object.keys(quizAnswers).length} <span className="text-slate-300">/</span> {data.quiz.length} Questions Answered</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setShowResults(true);
                                                document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                                                // Record Learner Progress Loopback
                                                const correctCount = data.quiz.filter((q: any, i: number) => {
                                                    const userAnswer = quizAnswers[i];
                                                    if (!userAnswer) return false;
                                                    if (userAnswer === q.answer) return true;
                                                    const letterMap: {[key: string]: number} = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                                                    const index = letterMap[q.answer?.trim().toUpperCase()];
                                                    return index !== undefined && q.options[index] === userAnswer;
                                                }).length;
                                                const pct = Math.round((correctCount / (data.quiz.length || 1)) * 100);
                                                if (!isGuest && userId) {
                                                    fetch(api('/api/learner/progress'), {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            user_id: userId,
                                                            video_id: videoId,
                                                            topic: docTitle,
                                                            quiz_score: pct
                                                        })
                                                    }).catch(err => console.error("Progress save failed:", err));
                                                }
                                            }}
                                            disabled={Object.keys(quizAnswers).length !== data.quiz.length || quizLoading}
                                            className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-12 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                                        >
                                            <CheckCircle className="h-5 w-5" />
                                            SUBMIT QUIZ
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-12 flex justify-center pb-8">
                                        <button onClick={() => { setQuizAnswers({}); setShowResults(false); }} className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-primary transition-all hover:bg-white hover:shadow-xl group">
                                            <RotateCcw className="h-5 w-5 transition-transform group-hover:rotate-180" />
                                            RETRY QUIZ
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'problems' && (
                        <div className="flex flex-col h-full p-8 overflow-y-auto relative no-scrollbar bg-slate-50">
                            {isGuest && <LoginPrompt />}
                            {problemsLoading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4">
                                    <div className="h-10 w-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                                    <p className="font-bold text-slate-900">Generating Similar Problems...</p>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h3 className="font-bold text-slate-900 flex items-center text-xl">
                                        <Lightbulb className="h-6 w-6 mr-3 text-amber-500" />
                                        Similar Practice Problems
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-1">Concept reinforcement problems generated from this material</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold shadow-xs">
                                        {['Easy', 'Medium', 'Hard'].map((diff) => (
                                            <button
                                                key={diff}
                                                onClick={() => {
                                                    setProblemDifficulty(diff);
                                                    handleRefreshProblems(diff);
                                                }}
                                                className={`px-3 py-1 rounded-lg transition-all ${problemDifficulty === diff ? 'bg-primary text-white font-black shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                                            >
                                                {diff}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => handleRefreshProblems(problemDifficulty)}
                                        className="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-primary transition-colors shadow-xs"
                                        title="Regenerate Problems"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {similarProblems.length === 0 && !problemsLoading ? (
                                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-xs">
                                    <Lightbulb className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                                    <h4 className="font-bold text-slate-800 text-lg mb-2">No problems loaded yet</h4>
                                    <p className="text-slate-500 text-sm mb-6">Generate interactive practice problems tailored to this material.</p>
                                    <button
                                        onClick={() => handleRefreshProblems(problemDifficulty)}
                                        className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all"
                                    >
                                        Generate Practice Problems
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 pb-12">
                                    {similarProblems.map((prob: any, idx: number) => {
                                        const pId = prob.id || `prob_${idx}`;
                                        const isHintOpen = expandedHints[pId];
                                        const isSolutionOpen = expandedSolutions[pId];
                                        const diff = prob.difficulty || problemDifficulty;
                                        const diffColor = diff === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : diff === 'Hard' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200';

                                        return (
                                            <div key={pId} className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="h-7 w-7 rounded-lg bg-indigo-50 text-primary font-black text-xs flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <h4 className="font-bold text-slate-900 text-base">{prob.title || `Exercise ${idx + 1}`}</h4>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${diffColor}`}>
                                                            {diff}
                                                        </span>
                                                        {prob.type && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                                                                {prob.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-slate-700 text-sm leading-relaxed mb-6 font-medium">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderComponents as any}>
                                                        {prob.problem_statement || ""}
                                                    </ReactMarkdown>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                                    {prob.hints && prob.hints.length > 0 && (
                                                        <button
                                                            onClick={() => setExpandedHints(prev => ({ ...prev, [pId]: !prev[pId] }))}
                                                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                                        >
                                                            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                                                            <span>{isHintOpen ? "Hide Hints" : `Need a Hint (${prob.hints.length})`}</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => setExpandedSolutions(prev => ({ ...prev, [pId]: !prev[pId] }))}
                                                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-primary rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5 text-primary" />
                                                        <span>{isSolutionOpen ? "Hide Solution" : "Reveal Worked Solution"}</span>
                                                    </button>
                                                </div>

                                                {isHintOpen && prob.hints && (
                                                    <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl animate-in fade-in duration-200">
                                                        <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1">
                                                            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                                                            Hints:
                                                        </p>
                                                        <ul className="space-y-1.5 text-xs text-amber-800 list-disc list-inside">
                                                            {prob.hints.map((hint: string, hIdx: number) => (
                                                                <li key={hIdx} className="leading-relaxed">{hint}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {isSolutionOpen && (
                                                    <div className="mt-4 p-5 bg-white border border-slate-200/90 shadow-sm text-slate-800 rounded-2xl animate-in fade-in duration-200">
                                                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2.5 flex items-center gap-1.5">
                                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                            Step-by-Step Solution:
                                                        </p>
                                                        <div className="text-slate-700 text-xs leading-relaxed mb-3 space-y-2">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderComponents as any}>
                                                                {prob.solution || "No solution provided."}
                                                            </ReactMarkdown>
                                                        </div>
                                                        {prob.key_takeaway && (
                                                            <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900">
                                                                <span className="font-bold text-amber-950">Key Takeaway: </span>
                                                                {prob.key_takeaway}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'recommendations' && (
                        <div className="flex flex-col h-full p-8 overflow-y-auto relative no-scrollbar bg-slate-50">
                            {isGuest && <LoginPrompt />}
                            {recommendationsLoading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4">
                                    <div className="h-10 w-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                                    <p className="font-bold text-slate-900">Curating Learning Recommendations...</p>
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="font-bold text-slate-900 flex items-center text-xl">
                                        <Compass className="h-6 w-6 mr-3 text-indigo-600" />
                                        Personalized Recommendations
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-1">Curated next topics, prerequisites, and learning roadmap</p>
                                </div>
                                <button
                                    onClick={handleRefreshRecommendations}
                                    className="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-primary transition-colors shadow-xs"
                                    title="Regenerate Recommendations"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>

                            {recommendations ? (
                                <div className="space-y-8 pb-12">
                                    {/* Next Topics */}
                                    {recommendations.recommended_topics && recommendations.recommended_topics.length > 0 && (
                                        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs">
                                            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-primary" />
                                                Next Topics to Master
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {recommendations.recommended_topics.map((t: any, idx: number) => (
                                                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <h5 className="font-bold text-slate-800 text-xs">{t.title}</h5>
                                                            {t.difficulty && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-primary">
                                                                    {t.difficulty}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 leading-relaxed">{t.reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Prerequisites */}
                                    {recommendations.prerequisites && recommendations.prerequisites.length > 0 && (
                                        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs">
                                            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-amber-600" />
                                                Foundational Prerequisites & Refreshers
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {recommendations.prerequisites.map((p: any, idx: number) => (
                                                    <div key={idx} className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100">
                                                        <h5 className="font-bold text-amber-900 text-xs mb-1">{p.concept}</h5>
                                                        <p className="text-xs text-amber-800 leading-relaxed">{p.summary}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Curated Search Queries */}
                                    {recommendations.curated_search_queries && recommendations.curated_search_queries.length > 0 && (
                                        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs">
                                            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                                                <Compass className="h-4 w-4 text-emerald-600" />
                                                Curated Search Prompts (YouTube / Google Scholar)
                                            </h4>
                                            <div className="space-y-2.5">
                                                {recommendations.curated_search_queries.map((q: string, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 transition-colors">
                                                        <span className="text-xs font-medium text-slate-700 truncate pr-3">{q}</span>
                                                        <div className="flex items-center space-x-1.5 shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(q);
                                                                    setCopiedQuery(q);
                                                                    setTimeout(() => setCopiedQuery(null), 2000);
                                                                }}
                                                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:text-primary transition-colors flex items-center gap-1 shadow-2xs"
                                                            >
                                                                {copiedQuery === q ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                                                <span>{copiedQuery === q ? "Copied" : "Copy"}</span>
                                                            </button>
                                                            <a
                                                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1 shadow-2xs"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                                <span>YouTube</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hands-on Project & Action Plan */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {recommendations.hands_on_project && recommendations.hands_on_project.title && (
                                            <div className="bg-gradient-to-br from-indigo-500 to-primary p-7 rounded-3xl text-white shadow-md">
                                                <span className="px-2.5 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-wider text-white mb-3 inline-block">
                                                    Hands-On Practice
                                                </span>
                                                <h4 className="text-base font-bold mb-2">{recommendations.hands_on_project.title}</h4>
                                                <p className="text-xs text-indigo-100 leading-relaxed mb-4">{recommendations.hands_on_project.description}</p>
                                                {recommendations.hands_on_project.deliverable && (
                                                    <div className="p-3 bg-white/10 rounded-xl text-xs text-white">
                                                        <span className="font-bold">Deliverable: </span>
                                                        {recommendations.hands_on_project.deliverable}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {recommendations.action_plan && recommendations.action_plan.length > 0 && (
                                            <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                                                        <ListChecks className="h-4 w-4 text-primary" />
                                                        Action Plan Roadmap
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {recommendations.action_plan.map((step: string, sIdx: number) => (
                                                            <div key={sIdx} className="flex items-start gap-3">
                                                                <span className="h-6 w-6 rounded-lg bg-indigo-50 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                                                    {sIdx + 1}
                                                                </span>
                                                                <p className="text-xs text-slate-700 leading-relaxed">{step}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-xs">
                                    <Compass className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
                                    <h4 className="font-bold text-slate-800 text-lg mb-2">No recommendations generated</h4>
                                    <p className="text-slate-500 text-sm mb-6">Create a tailored study path and next steps based on this material.</p>
                                    <button
                                        onClick={handleRefreshRecommendations}
                                        className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all"
                                    >
                                        Curate Recommendations
                                    </button>
                                </div>
                            )}
                        </div>
                    )}


                    {activeTab === 'notes' && (
                        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
                            {isGuest && <LoginPrompt />}
                            <div className="flex items-center justify-between p-8 pb-4">
                                <h3 className="font-bold text-slate-900 flex items-center text-xl">
                                    <BookOpen className="h-6 w-6 mr-3 text-primary" />
                                    Workspace Notes
                                </h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 pt-4 no-scrollbar">
                                <div className="space-y-12">
                                        <div id="notes-content" className="prose prose-slate bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative">
                                            <div className="absolute top-8 right-8 flex items-center space-x-4">
                                                <button 
                                                    onClick={handleDownloadPdf}
                                                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                                                    title="Download Notes"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderComponents as any}>{data.summary.structured_notes}</ReactMarkdown>
                                        </div>

                                        {/* Code snippets section */}
                                        {snippets.length > 0 && (
                                            <div className="space-y-6">
                                                <h4 className="font-black text-slate-900 flex items-center text-lg px-2">
                                                    <Terminal className="h-5 w-5 mr-3 text-primary" />
                                                    Extracted Code Lab
                                                </h4>
                                                <div className="grid grid-cols-1 gap-6">
                                                    {snippets.map((s, idx) => (
                                                        <div key={idx} className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800 group">
                                                            <div className="bg-slate-800/50 px-8 py-3 flex items-center justify-between border-b border-slate-800">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.language || 'code'} snippet</span>
                                                                <button 
                                                                    onClick={() => {navigator.clipboard.writeText(s.code); alert('Code copied!')}}
                                                                    className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                                                                >
                                                                    <Send className="h-3 w-3" />
                                                                    COPY
                                                                </button>
                                                            </div>
                                                            <pre className="p-8 text-indigo-100 overflow-x-auto font-mono text-sm leading-relaxed">
                                                                <code>{s.code}</code>
                                                            </pre>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    {activeTab === 'flashcards' && (
                        <div className="flex flex-col h-full bg-slate-50 p-8 overflow-y-auto no-scrollbar relative">
                            {isGuest && <LoginPrompt />}
                            <style>{`
                                .perspective-1000 { perspective: 1000px; }
                                .preserve-3d { transform-style: preserve-3d; }
                                .backface-hidden { backface-visibility: hidden; }
                                .rotate-y-180 { transform: rotateY(180deg); }
                            `}</style>
                            <h3 className="font-bold text-slate-900 mb-8 flex items-center text-xl">
                                <Zap className="h-6 w-6 mr-3 text-primary" />
                                Spaced Repetition Flashcards
                            </h3>
                            
                            {flashcardsLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                    <div className="h-10 w-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                                    <p className="font-bold text-slate-400">Extracting key concepts...</p>
                                </div>
                            ) : flashcards.length > 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <div 
                                        onClick={() => setIsFlipped(!isFlipped)}
                                        className="w-full max-w-sm aspect-[3/4] cursor-pointer group perspective-1000"
                                    >
                                        <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                            {/* Front */}
                                            <div className="absolute inset-0 bg-white rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl border border-slate-100 backface-hidden">
                                                <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-8">Question</p>
                                                <p className="text-xl font-bold text-slate-900 leading-relaxed">
                                                    {flashcards[currentFlashIdx].question}
                                                </p>
                                                <p className="mt-12 text-slate-400 text-sm font-medium animate-pulse">Click to Reveal Answer</p>
                                            </div>
                                            {/* Back */}
                                            <div className="absolute inset-0 bg-white rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl border-2 border-emerald-300/80 rotate-y-180 backface-hidden">
                                                <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-8">Answer</p>
                                                <p className="text-lg font-bold text-slate-900 leading-relaxed">
                                                    {flashcards[currentFlashIdx].answer}
                                                </p>
                                                <p className="mt-12 text-slate-400 text-sm font-medium">Click to see Question</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-6 mt-12">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentFlashIdx((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
                                                setIsFlipped(false);
                                            }}
                                            className="p-4 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm"
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </button>
                                        <span className="font-black text-slate-900">
                                            {currentFlashIdx + 1} <span className="text-slate-200 mx-1">/</span> {flashcards.length}
                                        </span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentFlashIdx((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
                                                setIsFlipped(false);
                                            }}
                                            className="p-4 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm"
                                        >
                                            <ChevronRight className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                    <RotateCcw className="h-12 w-12 mb-4 text-slate-300" />
                                    <p className="text-sm font-medium">No flashcards found for this video.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'mindmap' && (
                        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
                            {isGuest && <LoginPrompt />}
                            {/* Mindmap Header */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm shrink-0">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/60 shadow-xs">
                                        <Layout className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-base">Concept Mind Map</h3>
                                        <p className="text-xs text-slate-500 font-medium">Visual hierarchical breakdown of core topics</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleRefreshMindmap}
                                    disabled={mindmapLoading}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-primary text-slate-600 hover:text-primary rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                                    title="Regenerate Mind Map"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${mindmapLoading ? 'animate-spin text-primary' : ''}`} />
                                    <span>{mindmapLoading ? 'Generating...' : 'Regenerate'}</span>
                                </button>
                            </div>

                            {/* Mindmap Canvas */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {mindmapLoading ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                                        <div className="h-10 w-10 border-3 border-indigo-100 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Building Concept Hierarchy...</p>
                                    </div>
                                ) : mindmap && mindmap.branches && mindmap.branches.length > 0 ? (
                                    <div className="space-y-6 max-w-4xl mx-auto">
                                        {/* Center Core Subject Card */}
                                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-indigo-50/70 via-white to-emerald-50/50 p-6 md:p-8 text-slate-900 shadow-sm border border-indigo-100 text-center">
                                            <div className="relative z-10 space-y-2">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-primary border border-indigo-200/60 rounded-full text-[11px] font-black uppercase tracking-widest">
                                                    🎯 Core Subject
                                                </span>
                                                <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                                                    {mindmap.center || docTitle}
                                                </h2>
                                                {mindmap.description && (
                                                    <p className="text-xs md:text-sm text-slate-600 max-w-xl mx-auto font-medium leading-relaxed">
                                                        {mindmap.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Connecting Indicator */}
                                        <div className="flex items-center justify-center my-2">
                                            <div className="h-6 w-[2px] bg-gradient-to-b from-indigo-500 to-indigo-200"></div>
                                        </div>

                                        {/* Branches Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
                                            {mindmap.branches.map((branch: any, bIdx: number) => {
                                                const colorSchemes: {[key: string]: { border: string, bg: string, badge: string, dot: string }} = {
                                                    indigo: { border: "border-indigo-100", bg: "bg-indigo-50/50", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
                                                    blue: { border: "border-blue-100", bg: "bg-blue-50/50", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
                                                    emerald: { border: "border-emerald-100", bg: "bg-emerald-50/50", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
                                                    amber: { border: "border-amber-100", bg: "bg-amber-50/50", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
                                                    purple: { border: "border-purple-100", bg: "bg-purple-50/50", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
                                                    rose: { border: "border-rose-100", bg: "bg-rose-50/50", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
                                                    cyan: { border: "border-cyan-100", bg: "bg-cyan-50/50", badge: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
                                                };
                                                const scheme = colorSchemes[branch.color?.toLowerCase()] || colorSchemes.indigo;

                                                return (
                                                    <div 
                                                        key={`branch-${branch.id || bIdx}`}
                                                        className={`bg-white rounded-2xl p-5 border ${scheme.border} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${scheme.badge}`}>
                                                                        0{bIdx + 1}
                                                                    </span>
                                                                    <h4 className="text-sm font-bold text-slate-900 truncate">
                                                                        {branch.label}
                                                                    </h4>
                                                                </div>
                                                            </div>

                                                            {/* Details / Takeaways */}
                                                            <div className="space-y-2 pt-1">
                                                                {Array.isArray(branch.details) && branch.details.map((detail: string, dIdx: number) => (
                                                                    <div 
                                                                        key={`det-${bIdx}-${dIdx}`}
                                                                        className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium"
                                                                    >
                                                                        <span className={`h-1.5 w-1.5 rounded-full ${scheme.dot} shrink-0 mt-1.5`} />
                                                                        <span className="flex-1 min-w-0">{detail}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                        <div className="p-4 bg-indigo-50 text-indigo-500 rounded-3xl mb-4">
                                            <Layout className="h-10 w-10" />
                                        </div>
                                        <h4 className="text-base font-bold text-slate-900 mb-1">No Mind Map Generated</h4>
                                        <p className="text-xs text-slate-500 max-w-sm mb-5">Click below to generate a visual concept mind map from this lecture.</p>
                                        <button 
                                            onClick={handleRefreshMindmap}
                                            disabled={mindmapLoading}
                                            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 transition-all active:scale-95"
                                        >
                                            Generate Mind Map
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#FBFCFE] relative">
                {isGuest && <LoginPrompt />}
                {/* Editor Top Bar - Logic selection etc */}
                <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                    <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
                        {challenges.map((_: any, i: number) => (
                            <button 
                                key={`chal-nav-${i}`}
                            onClick={() => {
                                setCurrentChallengeIdx(i);
                                setUserCode(challenges[i].starting_code || "");
                                setCodeFeedback(null);
                                setCodeDescTab('description');
                                setSubmissions([]);
                            }}
                            className={`px-4 py-1.5 text-[9px] font-black rounded-lg whitespace-nowrap transition-all uppercase tracking-widest border ${currentChallengeIdx === i ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'}`}
                        >
                            Challenge {i + 1}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefreshChallenges}
                        disabled={challengesLoading}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-600 border border-slate-100"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${challengesLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
                {/* Left Panel: Problem Description */}
                <div 
                    className="border-r border-slate-200 bg-white flex flex-col overflow-hidden shadow-sm"
                    style={{ width: `${leftPanelWidth}%` }}
                >
                    {/* Tabs */}
                    <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-6 shrink-0">
                        {[
                            { id: 'description', label: 'Description', icon: Info },
                            { id: 'submissions', label: 'Submissions', icon: CheckCircle },
                            { id: 'tutorial', label: 'Tutorial', icon: BookOpen }
                        ].map(t => (
                            <button 
                                key={t.id}
                                onClick={() => {
                                    setCodeDescTab(t.id);
                                    if (t.id === 'submissions') fetchSubmissions(challenges[currentChallengeIdx].id);
                                }}
                                className={`h-full flex items-center gap-2 px-1 text-[11px] font-bold transition-all relative ${codeDescTab === t.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <t.icon className="h-3.5 w-3.5" />
                                {t.label}
                                {codeDescTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-6 no-scrollbar">
                        {codeDescTab === 'description' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{challenges[currentChallengeIdx]?.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full border ${
                                            challenges[currentChallengeIdx]?.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            challenges[currentChallengeIdx]?.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>{challenges[currentChallengeIdx]?.difficulty || 'Easy'}</span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                            In Progress
                                        </span>
                                    </div>
                                </div>

                                <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-6">
                                    <p className="leading-relaxed whitespace-pre-wrap">{challenges[currentChallengeIdx]?.problem_statement}</p>
                                    
                                    <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 space-y-3">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reference Example</p>
                                        <pre className="text-slate-700 bg-white/50 p-4 rounded-xl border border-slate-100/50 text-xs font-mono leading-relaxed overflow-x-auto">
                                            <code>{challenges[currentChallengeIdx]?.solution?.split('\n').slice(0, 5).join('\n') || "No example provided."}</code>
                                        </pre>
                                    </div>

                                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                                        <div className="bg-indigo-500 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                                            <Edit3 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest mb-1">Editor Note</p>
                                            <p className="text-[12px] text-indigo-900/70 font-medium">Ensure your code follows common optimization patterns. AI will evaluate for logic, not just syntax.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2">Constraints</h5>
                                            <ul className="space-y-1.5">
                                                {(challenges[currentChallengeIdx]?.constraints || ["No specific constraints"]).map((c: string, idx: number) => (
                                                    <li key={idx} className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                                                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                                        {c}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {codeDescTab === 'submissions' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">History</h3>
                                <div className="space-y-3">
                                    {submissions.length > 0 ? (
                                        submissions.map((s, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] font-bold uppercase ${s.is_correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {s.is_correct ? 'Accepted' : 'Incorrect'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">{formatDate(s.timestamp)}</span>
                                                </div>
                                                <pre className="text-[10px] bg-slate-900 p-3 rounded-lg text-indigo-100 font-mono truncate"><code>{s.code}</code></pre>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 opacity-40">
                                            <Clock className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No records</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {codeDescTab === 'tutorial' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Explanation</h3>
                                <div className="prose prose-slate prose-sm max-w-none">
                                    <ReactMarkdown components={renderComponents as any}>{challenges[currentChallengeIdx]?.explanation || "No explanation available."}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resize Handle for Code Lab */}
                <div 
                    className={`w-1.5 shrink-0 hover:bg-emerald-500/30 transition-colors cursor-col-resize relative z-30 ${isResizing ? 'bg-emerald-500/40' : 'bg-transparent'}`}
                    onMouseDown={() => setIsResizing(true)}
                >
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-slate-200 group-hover:bg-emerald-500/50"></div>
                </div>

                {/* Right Panel: IDE */}
                <div className="flex-1 flex flex-col bg-[#0A0F1C] overflow-hidden">
                    <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-[#0F1629]">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{challenges[currentChallengeIdx]?.language || 'Python'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95" onClick={() => {}}>
                                Run
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative flex overflow-hidden">
                        <div className="w-12 bg-[#050810] border-r border-white/5 flex flex-col items-center pt-8 text-[11px] font-mono text-slate-700 select-none">
                            {Array.from({length: 40}).map((_, i) => <div key={i} className="leading-relaxed h-6">{i + 1}</div>)}
                        </div>
                        <textarea 
                            className="flex-1 bg-[#050810] text-emerald-400 font-mono text-[14px] p-8 pt-8 resize-none focus:outline-none leading-relaxed placeholder:text-slate-800 custom-scrollbar overflow-y-auto"
                            spellCheck={false}
                            value={userCode}
                            onChange={(e) => setUserCode(e.target.value)}
                            placeholder="// Start coding here..."
                        ></textarea>

                        <div className="absolute bottom-6 right-8 flex items-center gap-3">
                            <button 
                                onClick={async () => {
                                    setEvaluatingCode(true);
                                    try {
                                        const res = await fetch(api(`/api/evaluate-code?video_id=${videoId}&user_id=${userId}`), {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ problem: challenges[currentChallengeIdx], code: userCode })
                                        });
                                        const result = await res.json();
                                        if (res.ok) setCodeFeedback(result);
                                    } catch (e) { console.error(e); }
                                    setEvaluatingCode(false);
                                }}
                                disabled={!userCode.trim() || evaluatingCode}
                                className="px-8 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                            >
                                {evaluatingCode ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Submit
                            </button>
                        </div>
                    </div>

                    {/* Feedback Section */}
                    {codeFeedback && (
                        <div className="h-[25%] bg-[#0F1629] border-t border-white/10 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${codeFeedback.is_correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {codeFeedback.is_correct ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${codeFeedback.is_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {codeFeedback.is_correct ? 'Accepted' : 'Wrong Answer'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[12px] text-slate-400 leading-relaxed">{codeFeedback.overall_feedback}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )}
</main>

{/* Fullscreen MindMap Overlay */}
{activeTab === 'mindmap' && (
      <div className="fixed inset-0 z-[100] bg-[#FAFBFF] animate-in fade-in duration-300 flex flex-col overflow-hidden">
        <header className="px-6 md:px-8 py-3.5 flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-[110] shadow-xs shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-primary/10 p-2.5 rounded-2xl border border-primary/20 text-primary">
                    <Layout className="h-4 w-4" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Interactive Concept Tree</h2>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-emerald-200/80">
                            {masteredMindmapCount}/{totalMindmapConcepts} Reviewed
                        </span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-medium tracking-wide truncate max-w-[260px]">
                        {isDocument ? data?.title || docTitle : videoId}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                {/* Expand / Collapse All */}
                <button
                    onClick={allBranchesExpanded ? handleCollapseAllBranches : handleExpandAllBranches}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all active:scale-95 shadow-xs"
                    title={allBranchesExpanded ? "Collapse all branches" : "Expand all branches"}
                >
                    <span>{allBranchesExpanded ? "Collapse All" : "Expand All"}</span>
                </button>

                {/* Zoom controls */}
                <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setMindmapZoom(prev => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10))}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all active:scale-95"
                        title="Zoom Out"
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setMindmapZoom(1)}
                        className="px-2 text-[10px] font-bold text-slate-600 hover:text-slate-900"
                        title="Reset Zoom"
                    >
                        {Math.round(mindmapZoom * 100)}%
                    </button>
                    <button
                        onClick={() => setMindmapZoom(prev => Math.min(1.4, Math.round((prev + 0.1) * 10) / 10))}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all active:scale-95"
                        title="Zoom In"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Regenerate */}
                <button
                    onClick={handleRefreshMindmap}
                    disabled={mindmapLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-primary rounded-xl text-xs font-bold border border-slate-200 transition-all active:scale-95 shadow-xs disabled:opacity-50"
                    title="Regenerate Mind Map"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${mindmapLoading ? 'animate-spin text-primary' : ''}`} />
                    <span className="hidden md:inline">{mindmapLoading ? 'Building...' : 'Regenerate'}</span>
                </button>

                {/* Close */}
                <button 
                    onClick={() => setActiveTab(previousTab)}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl transition-all active:scale-95 text-xs font-bold border border-slate-200"
                    title="Close Mind Map"
                >
                    <span>Close</span>
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-12 custom-scrollbar relative">
            {mindmapLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 py-24">
                    <div className="h-12 w-12 border-3 border-indigo-100 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Assembling Concept Tree...</p>
                </div>
            ) : mindmap && mindmap.branches && mindmap.branches.length > 0 ? (
                <div 
                    className="min-h-full min-w-max flex items-center justify-center py-12 px-8"
                    style={{
                        transform: `scale(${mindmapZoom})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s ease-out'
                    }}
                >
                    <div ref={treeContainerRef} className="flex items-center relative my-auto animate-in zoom-in-95 duration-500">
                        {/* Root Center Node - Clean White & Indigo Ring */}
                        <div ref={rootNodeRef} className="shrink-0 z-20">
                            <div className="w-44 h-44 bg-white rounded-[2.5rem] p-1 shadow-xl relative group overflow-hidden border-2 border-indigo-200/90 flex items-center justify-center">
                                <div className="w-full h-full bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/50 rounded-[2.3rem] flex flex-col items-center justify-center p-5 text-center relative z-10 border border-slate-100">
                                    <span className="px-2.5 py-0.5 mb-2.5 bg-indigo-100/90 text-primary text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-200/50">
                                        Core Subject
                                    </span>
                                    <span className="text-slate-900 text-sm md:text-base font-extrabold leading-tight uppercase font-sans tracking-tight">
                                        {mindmap.center}
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-emerald-400/20 to-amber-400/20 animate-spin-slow opacity-60 z-0"></div>
                            </div>
                        </div>

                        {/* Root-to-Branches Connector SVG Space */}
                        <div className="w-24 md:w-28 relative shrink-0" style={{ height: rootConnections.treeHeight || 300 }}>
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" overflow="visible">
                                <defs>
                                    <linearGradient id="root-tree-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.7" />
                                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.7" />
                                    </linearGradient>
                                </defs>
                                {rootConnections.branchYs.map((targetY, i) => (
                                    <g key={`root-branch-${i}`}>
                                        <path
                                            d={`M 0 ${rootConnections.rootY} C 48 ${rootConnections.rootY}, 48 ${targetY}, 96 ${targetY}`}
                                            stroke="url(#root-tree-grad)"
                                            strokeWidth="2.5"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                        <circle cx="96" cy={targetY} r="3.5" fill="#10B981" />
                                    </g>
                                ))}
                            </svg>
                        </div>

                        {/* Column of Branch Rows (Natural vertical flex with gap-5: zero collision) */}
                        <div className="flex flex-col gap-4 md:gap-5 shrink-0 relative">
                            {mindmap.branches.map((branch: any, bIdx: number) => (
                                <BranchRowItem
                                    key={branch.id || bIdx}
                                    branch={branch}
                                    bIdx={bIdx}
                                    isExpanded={expandedMindmapBranches[branch.id || bIdx] !== false}
                                    onToggle={() => handleToggleBranch(branch.id || bIdx)}
                                    masteredCards={masteredMindmapCards}
                                    onToggleMastered={handleToggleMasteredCard}
                                    copiedCardId={copiedMindmapCard}
                                    onCopyCard={handleCopyMindmapCard}
                                    onRegisterNodeRef={(el) => {
                                        branchItemRefs.current[bIdx] = el;
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-24">
                    <RotateCcw className="h-10 w-10 text-slate-300 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Awaiting Mind Map Data</p>
                </div>
            )}
        </div>
    </div>
)}
        </div>
    );
}
