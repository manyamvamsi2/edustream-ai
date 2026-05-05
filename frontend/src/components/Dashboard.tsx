"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Link as LinkIcon, FileText, BookOpen, MessageSquare, HelpCircle, CheckCircle, Trash2, Download, RefreshCw, RotateCcw, Zap, ChevronLeft, ChevronRight, Layout, ListChecks, Terminal, X, Info, Edit3, Clock, ThumbsUp, Save, Settings, Maximize2, ChevronUp, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";

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
    const chatEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mainContainerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (activeTab === 'chat' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, chatLoading, activeTab]);

    // Sync chat history with backend when videoId changes
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
    }, [videoId]);

    useEffect(() => {
        if (activeTab === 'mindmap' && videoId && !mindmap) {
            const fetchMindMap = async () => {
                setMindmapLoading(true);
                try {
                    const res = await fetch(api(`/api/mindmap/${videoId}`));
                    const result = await res.json();
                    setMindmap(result);
                } catch (error) {
                    console.error("Error fetching mind map:", error);
                }
                setMindmapLoading(false);
            };
            fetchMindMap();
        }
    }, [activeTab, videoId, mindmap]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setLeftPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        const handleMainMouseMove = (e: MouseEvent) => {
            if (!isMainResizing || !mainContainerRef.current) return;
            const containerRect = mainContainerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setMainSplitWidth(newWidth);
            }
        };

        const handleMainMouseUp = () => {
            setIsMainResizing(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        if (isMainResizing) {
            window.addEventListener('mousemove', handleMainMouseMove);
            window.addEventListener('mouseup', handleMainMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
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
        const d = new Date(dateStr);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderComponents = {
        p: ({children}: any) => {
            const childrenArray = React.Children.toArray(children);
            const isSingleDot = childrenArray.length === 1 && typeof childrenArray[0] === 'string' && childrenArray[0].trim() === '.';
            if (isSingleDot) return null;
            
            return (
                <div className="mb-2 last:mb-0 leading-[1.8] text-slate-700 font-medium selection:bg-indigo-100">
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
            const isShort = codeText.length < 50 && !codeText.includes('\n');
            
            if (!inline) {
                return (
                    <div className={`not-prose block clear-both ${isShort ? 'my-2' : 'my-4'} w-full group overflow-hidden selection:bg-indigo-500/30`}>
                        <pre className={`grow block w-full bg-[#0a0f1d] text-indigo-100 ${isShort ? 'p-4 rounded-2xl' : 'p-8 rounded-[2.5rem]'} overflow-x-auto text-[11px] font-mono leading-relaxed border-none shadow-2xl relative decoration-none no-underline`}>
                            <div className="absolute top-4 right-6 text-[9px] font-black text-slate-500/50 uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity select-none italic">
                                {lang ? `${lang.toUpperCase()} SOURCE` : 'SOURCE CODE'}
                            </div>
                            <div className="relative z-10 no-underline border-none decoration-transparent outline-none">
                                {children}
                            </div>
                        </pre>
                    </div>
                );
            }
            return (
                <code className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-mono text-[12px] font-bold border border-indigo-100/30 no-underline decoration-transparent before:content-none after:content-none mx-0.5" {...props}>
                    {children}
                </code>
            );
        },
        pre: ({children}: any) => <>{children}</>,
        ul: ({children}: any) => <ul className="mb-8 space-y-4 list-none">{children}</ul>,
        li: ({children}: any) => (
            <li className="flex gap-4 group mb-4 last:mb-0">
                <div className="mt-2.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0 group-hover:scale-125 transition-transform" />
                <div className="flex-1 text-slate-700 leading-relaxed font-medium selection:bg-indigo-50">
                    {React.Children.map(children, (child, i) => 
                        typeof child === 'string' ? <React.Fragment key={i}>{formatChatText(child)}</React.Fragment> : child
                    )}
                </div>
            </li>
        ),
        h1: ({children}: any) => <h1 className="text-3xl font-black text-slate-900 mb-8 mt-12 first:mt-0 tracking-tight">{children}</h1>,
        h2: ({children}: any) => <h2 className="text-2xl font-black text-slate-900 mb-6 mt-10 tracking-tight">{children}</h2>,
        h3: ({children}: any) => <h3 className="text-xl font-bold text-slate-900 mb-4 mt-8 tracking-tight">{children}</h3>
    };
    
    const seekToTime = (timestamp: number) => {
        if (!playerRef.current) return;

        // Check if it's an iframe (YouTube) or a video element (local)
        if (playerRef.current.tagName === 'IFRAME') {
            playerRef.current.contentWindow?.postMessage(JSON.stringify({
                event: 'command',
                func: 'seekTo',
                args: [timestamp, true]
            }), '*');
            playerRef.current.contentWindow?.postMessage(JSON.stringify({
                event: 'command',
                func: 'playVideo',
                args: []
            }), '*');
        } else if (playerRef.current instanceof HTMLVideoElement) {
            playerRef.current.currentTime = timestamp;
            playerRef.current.play().catch(() => {});
        }
    };

    // Original data backup for resetting to English
    const [originalData] = useState<any>(initialData);
    
    const playerRef = useRef<any>(null);

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

    const formatChatText = (text: string) => {
        // Updated regex to catch (369.28s - 435.36s), (time 12.3s), ▶ 1:01, 1:01 etc.
        const regex = /\((?:time\s+)?(\d+(?:\.\d+)?)s(?:\s*-\s*(\d+(?:\.\d+)?)s)?\)|(\d+(?:\.\d+)?)s(?:\s*-\s*(\d+(?:\.\d+)?)s)?|▶\s*(\d+):(\d+)|(\d+):(\d+)/g;
        const parts = [];
        let lastIdx = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIdx) {
                parts.push(<span key={`txt-${lastIdx}`}>{text.substring(lastIdx, match.index)}</span>);
            }
            
            let startSec = 0;
            // Map match groups to startSec
            if (match[1]) startSec = parseFloat(match[1]); // (time 12.3s) or (time 12.3s - 15s)
            else if (match[3]) startSec = parseFloat(match[3]); // 369.28s or 369.28s - 435.36s
            else if (match[5] && match[6]) startSec = parseInt(match[5]) * 60 + parseInt(match[6]); // ▶ MM:SS
            else if (match[7] && match[8]) startSec = parseInt(match[7]) * 60 + parseInt(match[8]); // MM:SS

            parts.push(
                <span 
                    key={`time-${match.index}-${startSec}`}
                    onClick={() => seekToTime(startSec)}
                    className="inline-flex items-center px-3 py-1 mx-1 bg-indigo-50 text-indigo-600 font-mono text-[11px] font-black rounded-lg cursor-pointer hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 align-middle active:scale-95 group/time"
                >
                    <span className="opacity-40 mr-1 group-hover/time:opacity-100 transition-opacity">▶</span>
                    {Math.floor(startSec / 60)}:{(Math.floor(startSec % 60)).toString().padStart(2, '0')}
                </span>
            );
            lastIdx = regex.lastIndex;
        }
        if (lastIdx < text.length) parts.push(<span key={`txt-end-${lastIdx}`}>{text.substring(lastIdx)}</span>);
        return parts.length > 0 ? parts : text;
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

    useEffect(() => {
        if (videoId) {
            fetchChatHistoryInDashboard();
            fetchChapters();
            fetchChallenges();
            if (activeTab === 'notes') fetchSnippets();
            if (activeTab === 'flashcards') fetchFlashcards();
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
                        <span className="text-sm font-medium text-slate-500 truncate max-w-[200px] md:max-w-[300px]">Workspace: {isDocument ? data.title : videoId}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {['chat', 'summary', 'quiz', 'notes', 'flashcards', 'mindmap', ...(challenges.length > 0 ? ['code'] : [])].map(tab => (
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
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all relative ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab.toUpperCase()}
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
                        {/* Left Panel - Video Player & Chapters */}
                        <div 
                            className="flex flex-col bg-slate-50 overflow-y-auto border-b md:border-b-0 no-scrollbar relative"
                            style={{ width: `${mainSplitWidth}%` }}
                        >
                    <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative mb-8 group">
                                {isDocument ? (
                                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center space-y-4 p-8 text-center">
                                        <div className="bg-white/10 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                            <FileText className="h-20 w-20 text-indigo-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-white text-2xl font-black">Document Mode</h2>
                                            <p className="text-indigo-200/60 font-medium max-w-[300px] text-sm">You are analyzing "{data.title}". Use the chat and tools to study the extracted knowledge.</p>
                                        </div>
                                    </div>
                                ) : data.url.includes('api/media') ? (
                                    <video 
                                        ref={playerRef}
                                        className="w-full h-full"
                                        controls
                                        src={data.url}
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
                                {!isDocument && (
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
                                )}
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Workspace Overview</h2>
                                    <p className="text-slate-600 leading-relaxed font-medium">{data.summary.short_summary}</p>
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
                                    <div className="space-y-6">
                                        {chatHistory.map((msg, idx) => (
                                            <div key={`msg-${idx}-${msg.role}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                <div className={`flex max-w-[90%] items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    {msg.role !== 'user' && (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-indigo-500/20 border border-primary/20 flex items-center justify-center shrink-0 mb-1 shadow-sm">
                                                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                                        </div>
                                                    )}
                                                    <div className={`
                                                        relative overflow-hidden
                                                        ${msg.role === 'user' 
                                                            ? 'p-5 rounded-[2rem] bg-gradient-to-tr from-primary via-indigo-600 to-indigo-500 text-white rounded-br-sm shadow-xl shadow-primary/20' 
                                                            : 'p-6 rounded-[2rem] bg-white border border-slate-100/80 text-slate-800 rounded-bl-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] leading-relaxed'}
                                                    `}>
                                                        <div className="relative z-10">
                                                            {msg.role === 'user' ? (
                                                                <div className="text-[15px] font-medium leading-[1.6] whitespace-pre-wrap">{msg.content}</div>
                                                            ) : (
                                                                <div className="text-[15px] prose prose-slate max-w-none prose-p:leading-[1.7] prose-p:mb-4 prose-p:last:mb-0 prose-headings:mb-3 prose-headings:mt-6 first:prose-headings:mt-0 prose-pre:bg-slate-900 prose-pre:text-indigo-100 prose-pre:p-4 prose-pre:rounded-2xl prose-li:my-1 prose-strong:text-slate-900">
                                                                    <ReactMarkdown components={renderComponents as any}>
                                                                        {msg.content}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {msg.role === 'user' && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -z-0"></div>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {chatLoading && (
                                    <div className="flex justify-start animate-in fade-in duration-300">
                                        <div className="flex items-end gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mb-1">
                                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            </div>
                                            <div className="bg-white border border-slate-100 p-5 rounded-[2rem] rounded-bl-sm shadow-sm flex space-x-1.5 items-center">
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
                                <p className="text-slate-600 leading-relaxed text-lg font-medium mb-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                     <span className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></span>
                                     {data.summary.short_summary}
                                </p>
                                <h4 className="text-slate-900 font-bold mb-4">Key Objectives</h4>
                                <div className="space-y-4">
                                    {data.summary.key_points.map((p: string, i: number) => (
                                        <div key={`point-${i}`} className="flex items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-primary mr-4 shrink-0"></div>
                                            <span className="text-sm font-medium text-slate-700">{p}</span>
                                        </div>
                                    ))}
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
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-slate-900 flex items-center text-xl">
                                    <HelpCircle className="h-6 w-6 mr-3 text-primary" />
                                    Knowledge Check
                                </h3>
                                <div className="flex space-x-2">
                                    <button onClick={() => { setQuizAnswers({}); setShowResults(false); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Reset Quiz">
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                    <button onClick={async () => {
                                        setQuizLoading(true);
                                        setQuizAnswers({});
                                        setShowResults(false);
                                        try {
                                            const res = await fetch(api(`/api/quiz/refresh/${videoId}`), {
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
                                            onClick={() => { setShowResults(true); document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
                                            <ReactMarkdown components={renderComponents as any}>{data.summary.structured_notes}</ReactMarkdown>
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
                                            <div className="absolute inset-0 bg-slate-900 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl border border-slate-800 rotate-y-180 backface-hidden">
                                                <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-8">Answer</p>
                                                <p className="text-lg font-medium text-white leading-relaxed">
                                                    {flashcards[currentFlashIdx].answer}
                                                </p>
                                                <p className="mt-12 text-slate-500 text-sm font-medium">Click to see Question</p>
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
      <div className="fixed inset-0 z-[100] bg-[#FAFBFF] animate-in fade-in duration-500 flex flex-col overflow-hidden">
        <header className="px-8 py-3.5 flex items-center justify-between border-b border-slate-200/40 bg-white/70 backdrop-blur-md sticky top-0 z-[110] shadow-sm">
            <div className="flex items-center gap-4">
                <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                    <Layout className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Roadmap</h2>
                        <span className="px-2 py-0.5 bg-emerald-500/5 text-emerald-600/80 text-[8px] font-black uppercase tracking-wider rounded-md border border-emerald-500/10">Fit</span>
                    </div>
                    <p className="text-slate-400 text-[9px] font-medium tracking-wider truncate max-w-[200px]">{isDocument ? data.title : videoId}</p>
                </div>
            </div>

            <button 
                onClick={() => setActiveTab(previousTab)}
                className="group flex items-center gap-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-2xl transition-all active:scale-95 duration-300 border border-slate-200/50"
            >
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Close</span>
                <div className="bg-slate-300/30 p-1 rounded-full group-hover:bg-slate-300/50 transition-colors">
                    <X className="h-3 w-3" />
                </div>
            </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar relative">
            {mindmapLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="h-12 w-12 border-3 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Processing...</p>
                </div>
            ) : mindmap ? (
                <div className="min-h-full w-full flex flex-col items-center py-16 px-8">
                    <div className="flex items-center relative animate-in zoom-in-95 duration-700 scale-[0.85] lg:scale-100 origin-top my-auto">
                        {/* Root Center Node */}
                        <div className="relative z-20 shrink-0">
                            <div className="w-40 h-40 bg-slate-900 rounded-[2.5rem] p-0.5 shadow-xl relative group overflow-hidden">
                                <div className="w-full h-full bg-slate-900 rounded-[2.4rem] flex items-center justify-center p-6 text-center relative z-10">
                                    <span className="text-white text-lg font-extrabold leading-tight uppercase font-sans tracking-tight">{mindmap.center}</span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/50 via-emerald-500/50 to-amber-500/50 animate-spin-slow opacity-60 z-0"></div>
                                <div className="absolute inset-[2px] bg-slate-900 rounded-[2.4rem] z-0"></div>
                            </div>
                            <div className="absolute -inset-8 bg-primary/10 blur-[50px] -z-10"></div>
                        </div>

                        {/* Connector SVG Space */}
                        <div className="w-32 relative flex flex-col justify-center" style={{ height: mindmap.branches.length * 140 }}>
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" overflow="visible">
                                <defs>
                                    <linearGradient id="roadmap-grad-light" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
                                    </linearGradient>
                                </defs>
                                {mindmap.branches.map((_: any, i: number) => {
                                    const total = mindmap.branches.length;
                                    const spacing = 140; // Even more compact
                                    const startY = (total * spacing) / 2;
                                    const targetY = i * spacing + (spacing / 2);
                                    
                                    return (
                                        <g key={`light-group-${i}`}>
                                            <path 
                                                d={`M 0 ${startY} C 60 ${startY}, 60 ${targetY}, 128 ${targetY}`}
                                                stroke="url(#roadmap-grad-light)"
                                                strokeWidth="3"
                                                fill="none"
                                                strokeLinecap="round"
                                            />
                                            <circle cx="128" cy={targetY} r="3" fill="#10B981" fillOpacity="0.5" />
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>

                        {/* Branch Columns */}
                        <div className="flex flex-col justify-center relative">
                            {mindmap.branches.map((branch: any) => (
                               <div key={branch.id} className="flex items-center group/node h-[140px]">
                                    <div className="w-64 bg-white border border-slate-100 p-1.5 rounded-[1.5rem] flex items-center shadow-md group-hover/node:translate-x-3 transition-all duration-500 relative z-10 hover:border-emerald-100 hover:shadow-lg">
                                        <div className="h-10 flex-1 px-5 flex items-center bg-slate-50/30 rounded-[1.2rem] border border-slate-50">
                                            <span className="text-slate-700 font-bold text-[11px] uppercase tracking-wide truncate">{branch.label}</span>
                                        </div>
                                    </div>

                                    <div className="ml-8 flex flex-col space-y-1.5">
                                        {branch.details.map((detail: string, j: number) => (
                                            <div 
                                                key={j}
                                                className="bg-white hover:bg-slate-50 border border-slate-100/50 px-5 py-2 rounded-xl text-[9px] font-bold text-slate-500 transition-all shadow-sm hover:translate-x-1 cursor-default duration-300 max-w-[280px] border-l-2 border-l-emerald-400"
                                            >
                                                {detail}
                                            </div>
                                        ))}
                                    </div>
                               </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                    <RotateCcw className="h-10 w-10 text-slate-300 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Awaiting Data</p>
                </div>
            )}
        </div>
    </div>
)}
        </div>
    );
}
