import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Plus, MessageSquare, BookOpen,
  Grid, Map as MapIcon, Bot, Settings,
  Mic, Paperclip, Image as ImageIcon, Code, PenTool, Briefcase,
  FileText, LayoutDashboard, Send, Loader2, Play, LayoutTemplate, Square, Circle, Type, MousePointer2, Video as YoutubeIcon, Calculator, Mail, Copy, Check, Download, QrCode, Globe, Box, HelpCircle, Trash2
} from 'lucide-react';
import { CohereClientV2 } from 'cohere-ai';
import { GoogleGenAI } from "@google/genai";

// API Keys
const COHERE_KEY = import.meta.env.VITE_COHERE_KEY;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const PEXELS_KEY = import.meta.env.VITE_PEXELS_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAkUNAF9usWIWFsEN0u5g16UQ3DfYWbPqs";

const cohere = new CohereClientV2({
  token: COHERE_KEY,
});

const geminiAi = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export default function App() {
  const [appLoaded, setAppLoaded] = useState(false);

  // App State
  const [view, setView] = useState<'chat' | 'maps' | 'general_knowledge' | 'ai_agent' | 'settings' | 'design' | 'coding' | 'qr_scanner'>('chat');
  const [theme, setTheme] = useState<'hack' | 'white' | 'dark'>('hack');
  const [bgMedia, setBgMedia] = useState<{ url: string, type: 'video' | 'image' } | null>(null);
  const [saveHistory, setSaveHistory] = useState(() => localStorage.getItem('etit_save_history') !== 'false');
  const [selectedModel, setSelectedModel] = useState<'command-a-plus-05-2026' | 'gemini-3.5-flash'>('command-a-plus-05-2026');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [settingsTab, setSettingsTab] = useState<'general' | 'history'>('general');
  const [chatSessions, setChatSessions] = useState<{id: string, title: string, messages: typeof messages}[]>(() => {
    try {
      const saved = localStorage.getItem('etit_chat_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'chat' | 'search' | 'image' | 'video'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // General Knowledge State
  const [gkSubjects, setGkSubjects] = useState<string[]>([]);
  
  // Upload and Code State
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, type: string, url?: string}[]>([]);
  const [generatedCode, setGeneratedCode] = useState('// Ask the AI to generate code...');

  // Removed Typing Effect
  
  // Design Studio State
  type DesignElement = { id: number, type: 'text' | 'rect' | 'circle', name: string, text: string, x: number, y: number, w: number | 'Auto', h: number | 'Auto', color: string, fontSize: number, isSelected: boolean, rx: number, stroke: string, strokeWidth: number, opacity: number, zIndex: number };
  
  const [designElements, setDesignElements] = useState<DesignElement[]>([
    { id: 1, type: 'text', name: 'Main Heading', text: 'Design Your Future', x: 230, y: 180, w: 'Auto', h: 'Auto', color: '#000000', fontSize: 36, isSelected: true, rx: 0, stroke: '#000000', strokeWidth: 0, opacity: 1, zIndex: 1 }
  ]);
  
  const [aiBuilderTab, setAiBuilderTab] = useState<'preview' | 'code'>('preview');
  const [isCopied, setIsCopied] = useState(false);
  const [dragState, setDragState] = useState<{id: number, startX: number, startY: number} | null>(null);
  const [resizeState, setResizeState] = useState<{id: number, handle: string, startX: number, startY: number, startW: number, startH: number, startPosX: number, startPosY: number} | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(1);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const addDesignElement = (type: 'text' | 'rect' | 'circle') => {
    const newId = Math.max(0, ...designElements.map(e => e.id)) + 1;
    const zIndex = Math.max(0, ...designElements.map(e => e.zIndex)) + 1;
    const el: DesignElement = {
      id: newId, type, name: `${type === 'rect' ? 'Rectangle' : type === 'circle' ? 'Ellipse' : 'Text'} ${newId}`,
      text: type === 'text' ? 'New Text' : '',
      x: 100 + Math.random() * 50, y: 100 + Math.random() * 50,
      w: type === 'text' ? 'Auto' : 100, h: type === 'text' ? 'Auto' : 100,
      color: type === 'text' ? '#000000' : '#0d99ff', fontSize: 24, isSelected: true,
      rx: type === 'circle' ? 9999 : 0, stroke: '#000000', strokeWidth: 0, opacity: 1, zIndex
    };
    setDesignElements(prev => [...prev.map(e => ({...e, isSelected: false})), el]);
    setSelectedId(newId);
  };

  const handlePointerDown = (e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    setSelectedId(id);
    setDragState({ id, startX: e.clientX, startY: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  
  const handleResizeDown = (e: React.PointerEvent, id: number, handle: string) => {
    e.stopPropagation();
    const el = designElements.find(e => e.id === id);
    if (!el) return;
    setResizeState({ id, handle, startX: e.clientX, startY: e.clientY, startW: el.w === 'Auto' ? 100 : el.w, startH: el.h === 'Auto' ? 50 : el.h, startPosX: el.x, startPosY: el.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragState) {
      const el = designElements.find(el => el.id === dragState.id);
      if (el) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        updateElement(el.id, { x: el.x + dx, y: el.y + dy });
        setDragState({ id: el.id, startX: e.clientX, startY: e.clientY });
      }
    } else if (resizeState) {
      const el = designElements.find(el => el.id === resizeState.id);
      if (el) {
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        let newW = resizeState.startW;
        let newH = resizeState.startH;
        let newX = resizeState.startPosX;
        let newY = resizeState.startPosY;

        if (resizeState.handle.includes('e')) newW = Math.max(10, resizeState.startW + dx);
        if (resizeState.handle.includes('s')) newH = Math.max(10, resizeState.startH + dy);
        if (resizeState.handle.includes('w')) {
          newW = Math.max(10, resizeState.startW - dx);
          if (newW > 10) newX = resizeState.startPosX + dx;
        }
        if (resizeState.handle.includes('n')) {
          newH = Math.max(10, resizeState.startH - dy);
          if (newH > 10) newY = resizeState.startPosY + dy;
        }
        
        updateElement(el.id, { w: newW, h: newH, x: newX, y: newY });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragState(null);
    }
    if (resizeState) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setResizeState(null);
    }
  };

  const updateElement = (id: number, updates: Partial<typeof designElements[0]>) => {
    setDesignElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };
  
  const deleteDesignElement = () => {
    if (selectedId) {
      setDesignElements(prev => prev.filter(e => e.id !== selectedId));
      setSelectedId(null);
    }
  };

  const exportDesignToCode = () => {
    let code = `export default function GeneratedDesign() {\n  return (\n    <div className="relative w-full h-[500px] bg-white overflow-hidden">\n`;
    
    const sortedEls = [...designElements].sort((a, b) => a.zIndex - b.zIndex);
    sortedEls.forEach(el => {
      const isCircle = el.type === 'circle' || el.rx > 0;
      const styleClass = `absolute flex items-center justify-center font-bold tracking-tight select-none`;
      
      const inlineStyle: any = {
        left: el.x, top: el.y, zIndex: el.zIndex, opacity: el.opacity,
        ...(el.w !== 'Auto' && { width: el.w }),
        ...(el.h !== 'Auto' && { height: el.h }),
        ...(el.rx > 0 && { borderRadius: el.type === 'circle' ? '50%' : el.rx }),
        ...(el.strokeWidth > 0 && { border: `${el.strokeWidth}px solid ${el.stroke}` }),
        ...(el.type === 'text' ? { color: el.color, fontSize: el.fontSize } : { backgroundColor: el.color })
      };
      
      const styleString = Object.entries(inlineStyle).map(([k, v]) => `${k}: ${typeof v === 'number' && k !== 'zIndex' && k !== 'opacity' ? `'${v}px'` : `'${v}'`}`).join(', ');

      code += `      <div className="${styleClass}" style={{ ${styleString} }}>\n`;
      if (el.type === 'text') code += `        ${el.text}\n`;
      code += `      </div>\n`;
    });

    code += `    </div>\n  );\n}`;
    
    setGeneratedCode(code);
    setView('ai_agent');
    setAiBuilderTab('code');
  };

  const activeElement = designElements.find(e => e.id === selectedId);

  // Theme Config
  const isWhite = theme === 'white';
  const isHack = theme === 'hack';
  
  const c = {
    bg: isWhite ? 'bg-zinc-50' : isHack ? 'bg-black/80' : 'bg-black/90',
    text: isWhite ? 'text-zinc-900' : isHack ? 'text-green-500' : 'text-zinc-100',
    textMuted: isWhite ? 'text-zinc-500' : isHack ? 'text-green-700' : 'text-zinc-400',
    border: isWhite ? 'border-zinc-200' : isHack ? 'border-green-900/50' : 'border-zinc-800',
    sidebar: isWhite ? 'bg-white' : isHack ? 'bg-black/90 border-green-900/50 shadow-[4px_0_24px_rgba(0,255,0,0.05)]' : 'bg-zinc-950 border-zinc-900',
    hover: isWhite ? 'hover:bg-zinc-100' : isHack ? 'hover:bg-green-900/30' : 'hover:bg-zinc-900',
    active: isWhite ? 'bg-zinc-200 font-bold' : isHack ? 'bg-green-900/40 text-green-400 font-bold border-l-2 border-green-500' : 'bg-zinc-800 text-white border-l-2 border-white',
    input: isWhite ? 'bg-white border-zinc-300 text-black placeholder-zinc-400' : isHack ? 'bg-black/60 border-green-900/80 text-green-400 placeholder-green-800 focus:shadow-[0_0_15px_rgba(0,255,0,0.15)]' : 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500',
    button: isWhite ? 'bg-zinc-900 text-white hover:bg-zinc-800' : isHack ? 'bg-green-900/30 text-green-500 hover:bg-green-800/40 border border-green-900/50' : 'bg-white text-black hover:bg-zinc-200',
    userMsg: isWhite ? 'bg-zinc-100 text-black' : isHack ? 'bg-green-950/40 text-green-400 border border-green-900/50' : 'bg-zinc-800 text-white',
    aiMsg: isWhite ? 'bg-white border border-zinc-200 text-zinc-800' : isHack ? 'bg-black/50 border border-green-900/50 text-green-500 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'bg-black border border-zinc-800 text-zinc-200',
  };

  // Sync Settings & Load History
  useEffect(() => {
    localStorage.setItem('etit_save_history', saveHistory.toString());
    if (saveHistory && messages.length > 0) {
      localStorage.setItem('etit_chat_history', JSON.stringify(messages));
    } else if (!saveHistory) {
      localStorage.removeItem('etit_chat_history');
    }
  }, [messages, saveHistory]);

  useEffect(() => {
    if (saveHistory) {
      const hist = localStorage.getItem('etit_chat_history');
      if (hist) {
        try {
          setMessages(JSON.parse(hist));
        } catch (e) {}
      }
    }
    const timer = setTimeout(() => setAppLoaded(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, view]);

  // Save chat sessions to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('etit_chat_sessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Auto-save current chat to sessions when messages change
  useEffect(() => {
    if (messages.length >= 2 && activeChatId) {
      setChatSessions(prev => prev.map(s => s.id === activeChatId ? { ...s, messages, title: messages[0]?.content?.substring(0, 30) || 'Chat' } : s));
    }
  }, [messages, activeChatId]);

  // Handlers
  const startNewChat = () => {
    // Save current chat before clearing if it has messages
    if (messages.length >= 2 && activeChatId) {
      setChatSessions(prev => prev.map(s => s.id === activeChatId ? { ...s, messages, title: messages[0]?.content?.substring(0, 30) || 'Chat' } : s));
    } else if (messages.length >= 2 && !activeChatId) {
      const newId = Date.now().toString();
      setChatSessions(prev => [...prev, { id: newId, title: messages[0]?.content?.substring(0, 30) || 'Chat', messages }]);
    }
    const freshId = Date.now().toString() + '_new';
    setActiveChatId(freshId);
    setMessages([]);
    setUploadedFiles([]);
    setView('chat');
    setChatMode('chat');
  };

  const loadChatSession = (sessionId: string) => {
    // Save current first
    if (messages.length >= 2 && activeChatId) {
      setChatSessions(prev => prev.map(s => s.id === activeChatId ? { ...s, messages, title: messages[0]?.content?.substring(0, 30) || 'Chat' } : s));
    } else if (messages.length >= 2 && !activeChatId) {
      const newId = Date.now().toString();
      setChatSessions(prev => [...prev, { id: newId, title: messages[0]?.content?.substring(0, 30) || 'Chat', messages }]);
    }
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
      setActiveChatId(session.id);
      setView('chat');
    }
  };

  const deleteChatSession = (sessionId: string) => {
    setChatSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('etit_chat_sessions', JSON.stringify(updated));
      return updated;
    });
    if (activeChatId === sessionId) {
      setMessages([]);
      setActiveChatId(null);
    }
  };

  const handleSend = async (forcedMessage?: string, forcedMode?: string) => {
    const msgToSend = forcedMessage || input.trim();
    const currentMode = forcedMode || chatMode;
    if ((!msgToSend && uploadedFiles.length === 0) || isLoading) return;
    
    setInput('');
    const currentUploads = [...uploadedFiles];
    setUploadedFiles([]);

    const fileNotes = currentUploads.map(f => `[System Note: User uploaded a file named "${f.name}". Accept it as visible context. If it's a PDF, act as if you have extracted its text perfectly. If it's an image, act as an AI vision model capable of seeing it.]`).join('\n');
    const identityNote = `[System Note: Your name is ENTITY AI. If asked for your name, explicitly say "My name is ENTITY AI". You are not Command, you are not Cohere.]`;
    const combinedMsg = fileNotes ? `${identityNote}\n\n${fileNotes}\n\n${msgToSend}`.trim() : `${identityNote}\n\n${msgToSend}`;

    setMessages(prev => [...prev, { role: 'user', content: msgToSend || (currentUploads.length > 0 ? `[Uploaded ${currentUploads.length} file(s)]` : '') }]);
    setIsLoading(true);

    if (!navigator.onLine) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: `[Offline Mode] You are currently offline. Basic Local Assistant: I received your message "${msgToSend}", but I cannot perform complex queries or load images without an internet connection.` }]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    // Hardcoded Identity overrides
    const lowerMsg = msgToSend.toLowerCase().replace(/[^a-z\s]/g, '');
    if (
      lowerMsg === 'what is your name' || 
      lowerMsg === 'what is you name' ||
      lowerMsg === 'whats your name' ||
      lowerMsg === 'whats you name'
    ) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: "My name is ENTITY AI." }]);
        setIsLoading(false);
      }, 500);
      return;
    }
    if (lowerMsg === 'who are you' || lowerMsg === 'who are you are') {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm ENTITY AI." }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      let finalContent = '';
      const formatInstructions = " Respond with clear, natural paragraphs. DO NOT use asterisks (*), markdown bolding (**), hashes (#), or bullet points. DO NOT format words with asterisks.";
      
      if (currentMode === 'video') {
        let videoFoundId = '';
        let ytContext = '';
        try {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(msgToSend)}&type=video&key=${GOOGLE_API_KEY}`);
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            videoFoundId = data.items[0].id.videoId;
            ytContext = `Title: ${data.items[0].snippet.title}\nDescription: ${data.items[0].snippet.description}`;
          }
        } catch (e) {
          console.error("YouTube Error:", e);
        }
        
        const response = await cohere.chat({
          model: 'command-a-plus-05-2026',
          messages: [...messages, { role: 'user', content: `Respond to: ${msgToSend}. Video context: ${ytContext}.${formatInstructions}` }],
        });
        const textContent = response.message?.content?.find((c: any) => c.type === 'text') as any;
        finalContent = (textContent?.text || 'No response').replace(/[*#_]/g, '');
        
        if (videoFoundId) {
          finalContent += `\n\n[YT-VIDEO]${videoFoundId}[/YT-VIDEO]`;
        }
      } else if (currentMode === 'image') {
        let pexelsImages: string[] = [];
        try {
          const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(msgToSend)}&per_page=6`, {
            headers: { Authorization: PEXELS_KEY }
          });
          const data = await res.json();
          if (data.photos && data.photos.length > 0) {
            pexelsImages = data.photos.map((p: any) => p.src.medium);
          }
        } catch (e) {
          console.error("Pexels Error:", e);
        }
        
        const response = await cohere.chat({
          model: 'command-a-plus-05-2026',
          messages: [...messages, { role: 'user', content: `The user searched for images of: ${msgToSend}. Acknowledge this playfully. ${formatInstructions}` }],
        });
        const textContent = response.message?.content?.find((c: any) => c.type === 'text') as any;
        finalContent = (textContent?.text || 'No response').replace(/[*#_]/g, '');
        
        if (pexelsImages.length > 0) {
          finalContent += `\n\n[PEXELS_IMAGES]${pexelsImages.join('|')}[/PEXELS_IMAGES]`;
        }
      } else if (currentMode === 'search') {
        let kgContext = '';
        try {
          const res = await fetch(`https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(msgToSend)}&key=${GOOGLE_API_KEY}&limit=3&indent=True`);
          const data = await res.json();
          if (data.itemListElement && data.itemListElement.length > 0) {
             data.itemListElement.forEach((item: any) => {
               const result = item.result;
               kgContext += `- ${result.name}: ${result.detailedDescription?.articleBody || result.description || ''}\n`;
             });
          }
        } catch (e) {
          console.error("Google KG Error:", e);
        }

        const promptContext = kgContext ? `Information from Google:\n${kgContext}\n\n` : ``;
        const userPrompt = `${promptContext}Respond to user: ${msgToSend}.${formatInstructions}`;

        const response = await cohere.chat({
          model: 'command-a-plus-05-2026',
          messages: [...messages, { role: 'user', content: userPrompt }],
        });
        const textContent = response.message?.content?.find((c: any) => c.type === 'text') as any;
        finalContent = (textContent?.text || 'No response').replace(/[*#_]/g, '');
      } else {
        const promptContext = `${combinedMsg}. FORMATTING RULES: Write in plain text ONLY. ABSOLUTELY NO markdown, NO asterisks (*), NO hashes (#), NO bold text, NO bullet points. If you generate code, you MUST wrap it in triple backticks. If your code needs images, you must use direct image URLs from Unsplash source or placeholder image links like \`https://source.unsplash.com/800x600/?topic\` or \`https://picsum.photos/800/600\`. DO NOT write fetch requests to APIs for images.`;
        
        // Ensure BOTH models know Kinyarwanda natively
        const kinyarwandaSysNote = `[System Note: You are highly proficient in Kinyarwanda. If the user speaks to you in Kinyarwanda, you must reply fluently in Kinyarwanda. Provide translations accurately if requested.]\n\n`;
        
        let aiResp = '';
        if (selectedModel === 'gemini-3.5-flash') {
           const historyText = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
           const fullPrompt = historyText ? `${kinyarwandaSysNote}${historyText}\n\nUser: ${promptContext}\nAssistant:` : `${kinyarwandaSysNote}${promptContext}`;
           let response;
           try {
             response = await geminiAi.models.generateContent({
               model: 'gemini-2.0-flash', 
               contents: fullPrompt,
             });
             aiResp = response.text || 'No response';
           } catch (geminiError: any) {
             const errorString = String(geminiError?.message || JSON.stringify(geminiError) || geminiError);
             if (errorString.includes('503') || errorString.includes('UNAVAILABLE') || errorString.includes('high demand') || errorString.includes('404') || errorString.includes('NOT_FOUND') || errorString.includes('not found') || errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('quota') || errorString.includes('exceeded')) {
                try {
                   const fallbackResponse = await cohere.chat({
                     model: 'command-a-plus-05-2026',
                     messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: `${kinyarwandaSysNote}${promptContext}` }],
                   });
                   const fallbackTextContent = fallbackResponse.message?.content?.find((c: any) => c.type === 'text') as any;
                   aiResp = fallbackTextContent?.text || 'No response';
                } catch (fallbackErr: any) {
                   throw new Error(`Gemini failed (${errorString.substring(0, 40)}...) and fallback also failed: ${fallbackErr.message}`);
                }
             } else {
                throw geminiError;
             }
           }
        } else {
           const response = await cohere.chat({
             model: 'command-a-plus-05-2026',
             messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: `${kinyarwandaSysNote}${promptContext}` }],
           });
           const textContent = response.message?.content?.find((c: any) => c.type === 'text') as any;
           aiResp = textContent?.text || 'No response';
        }
        
        if (view === 'coding' || view === 'ai_agent') {
          const codeMatch = aiResp.match(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/);
          if (codeMatch) {
            setGeneratedCode(codeMatch[1].trim());
            aiResp = aiResp.replace(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/g, '\n\n_[Code generated in editor]_\n\n');
          }
        }
        finalContent = aiResp.replace(/\*+/g, '').replace(/#+/g, '').trim();
      }
      setMessages(prev => [...prev, { role: 'assistant', content: finalContent }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `API Error: Ensure your API keys are active. (${error.message})` }]);
    } finally {
      setIsLoading(false);
      setChatMode('chat');
    }
  };

  const generateSubjects = async () => {
    setGkSubjects(['Mathematics', 'Physics', 'Chemistry', 'History', 'Coding']);
  };

  useEffect(() => {
    if (view === 'general_knowledge' && gkSubjects.length === 0) {
      generateSubjects();
    }
  }, [view, gkSubjects]);

  const handleSubjectClick = (subject: string) => {
    if (subject === 'Coding') {
      setView('coding');
    } else {
      setView('chat');
      setChatMode('video');
      handleSend(`Find a beginner lesson on ${subject} and generate a quick quiz about it.`, 'video');
    }
  };

  const handleVoice = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.onresult = (event: any) => setInput(prev => prev + ' ' + event.results[0][0].transcript);
      recognition.start();
    } else alert("Speech recognition not supported.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newUploads = files.map(file => ({
      name: file.name,
      type: file.type,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    setUploadedFiles(prev => [...prev, ...newUploads]);
    e.target.value = '';
  };

  // Subcomponents
  const NavItem = ({ icon, label, targetView, onClick }: { icon: React.ReactNode, label: string, targetView?: typeof view, onClick?: () => void }) => (
    <button 
      onClick={() => onClick ? onClick() : (targetView && setView(targetView))}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
        targetView && view === targetView ? c.active : `${c.textMuted} ${c.hover}`
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const QRScanner = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
      let stream: MediaStream | null = null;
      const startCamera = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           setErrorMsg("Camera API is not supported in your browser.");
           return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        } catch (err) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (fallbackErr: any) {
            console.error("Camera access denied or missing:", fallbackErr);
            setErrorMsg("Camera access denied or not available on this device.");
            return;
          }
        }
        
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
      };
      startCamera();
      return () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
      };
    }, []);

    return (
      <div className={`flex-1 p-8 flex flex-col items-center justify-center ${c.text}`}>
         <h2 className="text-3xl font-bold mb-8">Scan QR Code</h2>
         <div className="relative w-full max-w-md aspect-square bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-zinc-800 flex items-center justify-center">
           {errorMsg ? (
             <div className="text-red-400 p-4 text-center font-medium">{errorMsg}</div>
           ) : (
             <>
               <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted></video>
               <div className="absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-green-500 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  <div className="w-full h-1 bg-green-500 shadow-[0_0_15px_#22c55e] animate-[scan_2s_ease-in-out_infinite]"></div>
               </div>
             </>
           )}
         </div>
         <p className={`mt-8 ${c.textMuted} font-medium`}>{errorMsg ? 'Please check your device camera permissions.' : 'Point your camera at a QR code to scan'}</p>
         <style dangerouslySetInnerHTML={{__html: `
           @keyframes scan {
             0% { transform: translateY(0); }
             50% { transform: translateY(256px); }
             100% { transform: translateY(0); }
           }
         `}} />
      </div>
    );
  };

  const CodeBlock = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    
    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    const handleDownload = () => {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const isHtml = code.includes('<html') || code.includes('<div') || code.includes('<!DOCTYPE');

    return (
      <div className="relative mt-3 mb-3 border border-zinc-700/50 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-800 px-4 py-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex items-center gap-2">
            {isHtml && (
               <button onClick={() => setShowPreview(!showPreview)} className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs transition-colors bg-zinc-800 px-2 py-1 rounded">
                 {showPreview ? <Code size={12} /> : <LayoutTemplate size={12} />} {showPreview ? 'Code' : 'Preview'}
               </button>
            )}
            <button onClick={handleDownload} className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs transition-colors bg-zinc-800 px-2 py-1 rounded">
              <Download size={12} /> Download
            </button>
            <button onClick={handleCopy} className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs transition-colors bg-zinc-800 px-2 py-1 rounded">
              {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        {showPreview ? (
          <div className="bg-white h-64 overflow-hidden relative">
            <iframe className="w-full h-full border-0 bg-white" srcDoc={code} sandbox="allow-scripts" />
          </div>
        ) : (
          <pre className="bg-[#1e1e1e] text-zinc-300 p-4 overflow-x-auto text-sm font-mono m-0 max-h-96">
            <code>{code}</code>
          </pre>
        )}
      </div>
    );
  };

  const CubeLoader = () => (
    <div className="flex justify-start my-6 ml-6">
      <style dangerouslySetInnerHTML={{__html: `
        .boci-spinner {
          width: 50px;
          height: 50px;
          --clr: ${isHack ? '#22c55e' : 'rgb(247, 197, 159)'};
          --clr-alpha: ${isHack ? 'rgba(34,197,94,0.1)' : 'rgba(247, 197, 159,.1)'};
          animation: boci-spinner 1.6s infinite ease;
          transform-style: preserve-3d;
        }
        .boci-spinner > div {
          background-color: var(--clr-alpha);
          height: 100%;
          position: absolute;
          width: 100%;
          border: 3px solid var(--clr);
        }
        .boci-spinner div:nth-of-type(1) { transform: translateZ(-25px) rotateY(180deg); }
        .boci-spinner div:nth-of-type(2) { transform: rotateY(-270deg) translateX(50%); transform-origin: top right; }
        .boci-spinner div:nth-of-type(3) { transform: rotateY(270deg) translateX(-50%); transform-origin: center left; }
        .boci-spinner div:nth-of-type(4) { transform: rotateX(90deg) translateY(-50%); transform-origin: top center; }
        .boci-spinner div:nth-of-type(5) { transform: rotateX(-90deg) translateY(50%); transform-origin: bottom center; }
        .boci-spinner div:nth-of-type(6) { transform: translateZ(25px); }
        @keyframes boci-spinner {
          0% { transform: rotate(45deg) rotateX(-25deg) rotateY(25deg); }
          50% { transform: rotate(45deg) rotateX(-385deg) rotateY(25deg); }
          100% { transform: rotate(45deg) rotateX(-385deg) rotateY(385deg); }
        }
      `}} />
      <div className="boci-spinner">
        <div></div><div></div><div></div><div></div><div></div><div></div>
      </div>
    </div>
  );

  const ImageCard = ({ src, hClass = "h-24" }: { src: string, hClass?: string }) => {
    return (
      <div className={`relative group w-full ${hClass}`}>
        <img src={src} alt="Generated" className="w-full h-full object-cover rounded-lg shadow-md border border-zinc-800" />
        <a href={src} target="_blank" rel="noopener noreferrer" download className="absolute top-2 right-2 bg-black/70 hover:bg-black p-1.5 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
          <Download size={16} />
        </a>
      </div>
    );
  };

  const LinkPreview = ({ url }: { url: string }) => {
    const [showPreview, setShowPreview] = useState(false);
    let displayDomain = '';
    try { displayDomain = new URL(url).hostname; } catch { displayDomain = url; }
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    const ytId = isYoutube ? (url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/) || [])[1] : null;

    return (
      <div className="inline-flex flex-col my-2 w-full max-w-md">
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-t-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors no-underline">
          <Globe size={14} className="text-blue-400 shrink-0" />
          <span className="text-blue-400 text-sm truncate">{displayDomain}</span>
        </a>
        <div className="flex border border-t-0 border-zinc-800 rounded-b-xl overflow-hidden">
          <button onClick={() => setShowPreview(!showPreview)} className="flex-1 py-1.5 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1">
            {showPreview ? <Code size={12} /> : <LayoutTemplate size={12} />} {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 py-1.5 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 border-l border-zinc-800 no-underline">
            <Globe size={12} /> Open
          </a>
        </div>
        {showPreview && (
          <div className="border border-t-0 border-zinc-800 rounded-b-xl overflow-hidden bg-white">
            {isYoutube && ytId ? (
              <iframe width="100%" height="220" src={`https://www.youtube.com/embed/${ytId}`} frameBorder="0" allowFullScreen className="w-full"></iframe>
            ) : (
              <iframe src={url} className="w-full h-64 border-0" sandbox="allow-scripts allow-same-origin" />
            )}
          </div>
        )}
      </div>
    );
  };

  const MessageParser = ({ content }: { content: string }) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const codeContent = part.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
            return <CodeBlock key={index} code={codeContent} />;
          }
          
          return (
            <React.Fragment key={index}>
              {part.split('\n').map((line, i) => {
                const pexelsMatch = line.match(/\[PEXELS_IMAGES\](.*?)\[\/PEXELS_IMAGES\]/);
                if (pexelsMatch) {
                  const urls = pexelsMatch[1].split('|');
                  return (
                    <div key={i} className="grid grid-cols-3 gap-2 mt-3 mb-3">
                      {urls.map((u, idx) => (
                        <ImageCard key={idx} src={u} hClass="h-24" />
                      ))}
                    </div>
                  );
                }
                const imgMatch = line.match(/!\[.*?\]\((.*?)\)/);
                if (imgMatch) {
                  return <div key={i} className="mt-2 mb-2"><ImageCard src={imgMatch[1]} hClass="h-auto max-w-full" /></div>;
                }
                const ytMatch = line.match(/\[YT-VIDEO\](.*?)\[\/YT-VIDEO\]/);
                if (ytMatch) {
                  return <iframe key={i} width="100%" height="315" src={`https://www.youtube.com/embed/${ytMatch[1]}`} frameBorder="0" allowFullScreen className="rounded-lg mt-2 mb-2 w-full max-w-lg aspect-video"></iframe>;
                }
                
                // Detect URLs in text and render link previews
                const urlRegex = /(https?:\/\/[^\s<>]+)/g;
                const urlMatches = line.match(urlRegex);
                if (urlMatches && urlMatches.length > 0) {
                  const segments = line.split(urlRegex);
                  return (
                    <React.Fragment key={i}>
                      {segments.map((seg, si) => {
                        if (urlMatches.includes(seg)) {
                          return <LinkPreview key={si} url={seg} />;
                        }
                        return <React.Fragment key={si}>{seg}</React.Fragment>;
                      })}
                      <br />
                    </React.Fragment>
                  );
                }

                return <React.Fragment key={i}>{line}<br /></React.Fragment>;
              })}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  const MatrixRain = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const chars = '01';
      const fontSize = 16;
      const columns = canvas.width / fontSize;
      const drops: number[] = [];
      for (let x = 0; x < columns; x++) drops[x] = 1;
      const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#22c55e';
        ctx.font = fontSize + 'px monospace';
        for (let i = 0; i < drops.length; i++) {
          const text = chars.charAt(Math.floor(Math.random() * chars.length));
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      };
      const interval = setInterval(draw, 33);
      const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
      window.addEventListener('resize', handleResize);
      return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-20" />;
  };

  if (!appLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <style dangerouslySetInnerHTML={{__html: `
          .loader { width: 150px; height: 150px; position: relative; display: flex; align-items: center; justify-content: center; }
          .loader_cube { position: absolute; width: 100%; height: 100%; border-radius: 30px; }
          .loader_cube--glowing { z-index: 2; background-color: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); }
          .loader_cube--color { z-index: 1; filter: blur(2px); background: linear-gradient(135deg, #1afbf0, #da00ff); animation: loadtwo 2.5s ease-in-out infinite; }
          @keyframes loadtwo { 50% { transform: rotate(-80deg); } }
        `}} />
        <div className="loader">
          <div className="loader_cube loader_cube--color"></div>
          <div className="loader_cube loader_cube--glowing"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${isWhite ? 'bg-zinc-50' : 'bg-black'} font-sans selection:bg-green-900/50`}>
      {/* Background Media Wrapper */}
      {isHack && !bgMedia && <MatrixRain />}
      
      {bgMedia && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {bgMedia.type === 'video' ? (
            <video autoPlay loop muted className="w-full h-full object-cover opacity-40">
              <source src={bgMedia.url} />
            </video>
          ) : (
            <div className="w-full h-full bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${bgMedia.url})` }} />
          )}
          {/* Overlay to ensure readability */}
          <div className={`absolute inset-0 ${isHack ? 'bg-black/60' : 'bg-black/40'}`}></div>
        </div>
      )}

      {/* Main App UI */}
      <div className={`flex w-full h-full relative z-10 ${!bgMedia ? c.bg : 'bg-transparent'} backdrop-blur-sm`}>
        
        {/* Sidebar */}
        <div className={`w-64 flex-col hidden md:flex border-r ${c.sidebar} ${c.text} z-20`}>
          <div className={`p-4 flex items-center gap-3 border-b ${c.border}`}>
            <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ${isHack ? 'bg-green-500 text-black shadow-[0_0_10px_#22c55e]' : isWhite ? 'bg-black text-white' : 'bg-white text-black'}`}>
              E
            </div>
            <span className="font-bold tracking-widest text-lg">ENTITY AI</span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider mb-2 ${c.textMuted}`}>Main Menu</div>
            <NavItem icon={<Plus size={18} />} label="New Chat" onClick={startNewChat} />
            <NavItem icon={<MessageSquare size={18} />} label="Chat Interface" targetView="chat" />
            <NavItem icon={<Bot size={18} />} label="AI Agent" targetView="ai_agent" />
            <NavItem icon={<MapIcon size={18} />} label="Maps" targetView="maps" />
            <NavItem icon={<BookOpen size={18} />} label="General Knowledge" targetView="general_knowledge" />
            <NavItem icon={<Settings size={18} />} label="Settings" targetView="settings" />

            <div className={`px-3 py-2 mt-4 text-xs font-semibold uppercase tracking-wider mb-2 ${c.textMuted}`}>Recent Chats</div>
            {chatSessions.length === 0 ? (
              <div className={`px-4 py-2 text-xs ${c.textMuted} italic`}>No chats yet</div>
            ) : (
              <>
                {[...chatSessions].reverse().slice(0, 6).map(session => (
                  <div key={session.id} className="group relative">
                    <button 
                      onClick={() => loadChatSession(session.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all truncate ${activeChatId === session.id ? c.active : `${c.textMuted} ${c.hover}`}`}
                    >
                      <MessageSquare size={14} className="shrink-0" />
                      <span className="truncate">{session.title || 'Chat'}</span>
                    </button>
                    <button onClick={() => deleteChatSession(session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {chatSessions.length > 6 && (
                  <button onClick={() => { setView('settings'); setSettingsTab('history'); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${c.textMuted} ${c.hover}`}>
                    <BookOpen size={14} className="shrink-0" />
                    <span>View all {chatSessions.length} chats</span>
                  </button>
                )}
              </>
            )}

            <div className={`px-3 py-2 mt-4 text-xs font-semibold uppercase tracking-wider mb-2 ${c.textMuted}`}>More</div>
            <NavItem icon={<QrCode size={18} />} label="Scan QR Code" targetView="qr_scanner" />
            <NavItem icon={<Globe size={18} />} label="Bubble Stream" onClick={() => window.open('https://bubble-stream.vercel.app', '_blank')} />
            <NavItem icon={<Box size={18} />} label="Kellybox" onClick={() => window.open('https://kellybox.netlify.app', '_blank')} />
            <NavItem icon={<HelpCircle size={18} />} label="Help" onClick={() => window.open('https://kellyseekhelp.netlify.app', '_blank')} />
          </div>

          <div className={`p-4 border-t ${c.border} flex items-center gap-3`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isHack ? 'bg-green-900/50 text-green-400' : 'bg-zinc-800'}`}>N</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">User</div>
              <div className={`text-xs truncate ${c.textMuted}`}>Online</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={`flex-1 flex flex-col relative z-10 min-w-0 ${bgMedia ? 'bg-black/20' : ''}`}>
          
          {/* CHAT VIEW */}
          {view === 'chat' && (
            <>
              <header className={`h-16 border-b ${c.border} flex items-center justify-between px-6 bg-transparent z-10`}>
                <div className="flex items-center gap-4">
                  <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors border ${c.button}`}>
                    <Play size={14} /> Voice Chat
                  </button>
                </div>
                <div className={`flex items-center gap-4 text-sm ${c.textMuted}`}>
                  <div className="relative">
                    <button onClick={() => setShowModelDropdown(!showModelDropdown)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors border ${c.button}`}>
                      {selectedModel === 'command-a-plus-05-2026' ? 'Command A' : 'Gemini 3.5'} <span className="text-xs ml-1">▼</span>
                    </button>
                    {showModelDropdown && (
                      <div className={`absolute top-full right-0 mt-1 w-48 rounded-md border ${c.border} ${isHack ? 'bg-black' : 'bg-zinc-900'} shadow-xl overflow-hidden z-50`}>
                        <button onClick={() => { setSelectedModel('command-a-plus-05-2026'); setShowModelDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${selectedModel === 'command-a-plus-05-2026' ? (isHack ? 'text-green-500 font-bold' : 'text-white font-bold') : 'text-zinc-400'}`}>Command A</button>
                        <button onClick={() => { setSelectedModel('gemini-3.5-flash'); setShowModelDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${selectedModel === 'gemini-3.5-flash' ? (isHack ? 'text-green-500 font-bold' : 'text-white font-bold') : 'text-zinc-400'}`}>Gemini 3.5 Flash</button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className={`flex-1 overflow-y-auto p-6 scroll-smooth ${c.text} flex flex-col`}>
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full text-center">
                    <h1 className={`text-4xl md:text-5xl font-bold mb-3 tracking-tight ${isHack ? 'text-green-500 drop-shadow-[0_0_15px_rgba(0,255,0,0.5)]' : ''}`}>What's on your mind?</h1>
                    <p className={`mb-8 ${c.textMuted}`}>Ask ENTITY anything, upload files, search the web, or use voice chat</p>
                    
                    {/* Input Area (Centered Empty State) */}
                    <div className="w-full max-w-3xl mx-auto mb-10 z-20">
                      <div className={`backdrop-blur-xl border rounded-2xl p-2 shadow-2xl transition-colors ${c.input}`}>
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                          placeholder="Message AI chat..."
                          className="w-full bg-transparent resize-none outline-none max-h-32 min-h-[44px] px-3 py-2 text-left"
                          rows={1}
                          onInput={(e) => {
                            const t = e.target as HTMLTextAreaElement;
                            t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px';
                          }}
                        />
                        {uploadedFiles.length > 0 && (
                          <div className="flex gap-2 p-2 border-b border-zinc-800/50 mb-2 overflow-x-auto text-left">
                            {uploadedFiles.map((f, i) => (
                              <div key={i} className="relative w-14 h-14 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center shrink-0">
                                {f.url ? <img src={f.url} className="w-full h-full object-cover rounded" /> : <FileText size={20} className="text-zinc-500" />}
                                <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/50 hover:bg-black/80 text-white rounded-bl p-0.5"><span className="text-[10px]">✕</span></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 px-1">
                          <div className="flex items-center gap-2">
                            <label className={`p-2 rounded-lg cursor-pointer transition-colors ${c.hover} ${c.textMuted}`}>
                              <Paperclip size={18} />
                              <input type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.txt" onChange={handleFileUpload} />
                            </label>
                            <div className={`w-px h-4 mx-1 ${c.border}`}></div>
                            {(['chat', 'search', 'image', 'video', 'coding'] as const).map(mode => (
                              <button
                                key={mode}
                                onClick={() => {
                                  if (mode === 'coding') {
                                    setView('coding');
                                  } else {
                                    setChatMode(mode as any);
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${chatMode === mode ? c.active : `${c.textMuted} ${c.hover}`}`}
                              >
                                {mode === 'search' ? <Search size={14} /> : mode === 'image' ? <ImageIcon size={14} /> : mode === 'video' ? <YoutubeIcon size={14} /> : mode === 'coding' ? <Code size={14} /> : <MessageSquare size={14} />}
                                <span className="capitalize">{mode === 'coding' ? '</>' : mode}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={handleVoice} className={`p-2 rounded-full transition-colors ${c.hover} ${c.textMuted}`}>
                              <Mic size={18} />
                            </button>
                            <button onClick={() => handleSend()} disabled={!input.trim() && uploadedFiles.length === 0 || isLoading} className={`p-2 rounded-full transition-colors ${input.trim() || uploadedFiles.length > 0 ? (isHack ? 'bg-green-500 text-black' : 'bg-white text-black') : c.button} disabled:opacity-50`}>
                              <Send size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-3 text-[11px] text-zinc-500 font-medium">
                        ENTITY can make mistakes. Check important info.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
                      {[
                        { icon: <PenTool />, label: 'AI script writer' },
                        { icon: <Code />, label: 'Coding Assistant' },
                        { icon: <FileText />, label: 'Essay writer' },
                        { icon: <Briefcase />, label: 'Business' }
                      ].map((chip, idx) => (
                        <button key={idx} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors ${c.button}`}>
                          {React.cloneElement(chip.icon, { size: 16 })}
                          <span className="truncate">{chip.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-6 pb-40 w-full">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed backdrop-blur-md ${msg.role === 'user' ? `${c.userMsg} rounded-br-none` : `${c.aiMsg} rounded-bl-none`}`}>
                          <MessageParser content={msg.content} />
                        </div>
                      </div>
                    ))}
                    {isLoading && <CubeLoader />}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area (Bottom Active State) */}
              {messages.length > 0 && (
                <div className={`absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-20`}>
                  <div className={`w-full max-w-3xl mx-auto pointer-events-auto`}>
                    <div className={`backdrop-blur-xl border rounded-2xl p-2 shadow-2xl transition-colors ${c.input}`}>
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Message AI chat..."
                        className="w-full bg-transparent resize-none outline-none max-h-32 min-h-[44px] px-3 py-2"
                        rows={1}
                        onInput={(e) => {
                          const t = e.target as HTMLTextAreaElement;
                          t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px';
                        }}
                      />
                      {uploadedFiles.length > 0 && (
                        <div className="flex gap-2 p-2 border-b border-zinc-800/50 mb-2 overflow-x-auto">
                          {uploadedFiles.map((f, i) => (
                            <div key={i} className="relative w-14 h-14 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center shrink-0">
                              {f.url ? <img src={f.url} className="w-full h-full object-cover rounded" /> : <FileText size={20} className="text-zinc-500" />}
                              <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/50 hover:bg-black/80 text-white rounded-bl p-0.5"><span className="text-[10px]">✕</span></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 px-1">
                        <div className="flex items-center gap-2">
                          <label className={`p-2 rounded-lg cursor-pointer transition-colors ${c.hover} ${c.textMuted}`}>
                            <Paperclip size={18} />
                            <input type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.txt" onChange={handleFileUpload} />
                          </label>
                          <div className={`w-px h-4 mx-1 ${c.border}`}></div>
                          {(['chat', 'search', 'image', 'video', 'coding'] as const).map(mode => (
                            <button
                              key={mode}
                              onClick={() => {
                                if (mode === 'coding') {
                                  setView('coding');
                                } else {
                                  setChatMode(mode as any);
                                }
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${chatMode === mode ? c.active : `${c.textMuted} ${c.hover}`}`}
                            >
                              {mode === 'search' ? <Search size={14} /> : mode === 'image' ? <ImageIcon size={14} /> : mode === 'video' ? <YoutubeIcon size={14} /> : mode === 'coding' ? <Code size={14} /> : <MessageSquare size={14} />}
                              <span className="capitalize">{mode === 'coding' ? '</>' : mode}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={handleVoice} className={`p-2 rounded-full transition-colors ${c.hover} ${c.textMuted}`}>
                            <Mic size={18} />
                          </button>
                          <button onClick={() => handleSend()} disabled={!input.trim() && uploadedFiles.length === 0 || isLoading} className={`p-2 rounded-full transition-colors ${input.trim() || uploadedFiles.length > 0 ? (isHack ? 'bg-green-500 text-black' : 'bg-white text-black') : c.button} disabled:opacity-50`}>
                            <Send size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-3 text-[11px] text-zinc-500 font-medium">
                      ENTITY can make mistakes. Check important info.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* SETTINGS VIEW */}
          {view === 'settings' && (
            <div className={`flex-1 flex h-full ${c.text}`}>
              <div className={`w-64 border-r ${c.border} p-4 bg-black/20 backdrop-blur-md`}>
                <h2 className={`text-xl font-bold mb-6 ${isHack ? 'text-green-500 drop-shadow-[0_0_5px_#22c55e]' : ''}`}>Settings</h2>
                <div className="space-y-1">
                  <button 
                    onClick={() => setSettingsTab('general')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${settingsTab === 'general' ? c.active : `${c.textMuted} ${c.hover}`}`}
                  >
                    <Settings size={18} /> General
                  </button>
                  <button 
                    onClick={() => setSettingsTab('history')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${settingsTab === 'history' ? c.active : `${c.textMuted} ${c.hover}`}`}
                  >
                    <BookOpen size={18} /> History & Chats
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-2xl space-y-8">
                  {settingsTab === 'general' && (
                    <>
                      <div className={`p-6 rounded-xl border ${c.border} bg-black/40 backdrop-blur-md`}>
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Settings size={20} /> Interface Mode</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <button onClick={() => setTheme('hack')} className={`py-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'hack' ? c.active : c.button}`}>
                            <Code size={24} /> Hack Mode
                          </button>
                          <button onClick={() => setTheme('white')} className={`py-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'white' ? c.active : c.button}`}>
                            <LayoutDashboard size={24} /> White Mode
                          </button>
                          <button onClick={() => setTheme('dark')} className={`py-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? c.active : c.button}`}>
                            <LayoutDashboard size={24} /> Dark Mode
                          </button>
                        </div>
                      </div>

                      <div className={`p-6 rounded-xl border ${c.border} bg-black/40 backdrop-blur-md`}>
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><ImageIcon size={20} /> Immersive Background</h3>
                        <p className={`mb-6 text-sm ${c.textMuted}`}>Upload an image or video to use as your workspace background. Video files will loop automatically.</p>
                        <div className="flex items-center gap-4">
                          <label className={`cursor-pointer px-6 py-3 rounded-lg border transition-all ${c.button} flex items-center gap-2 font-medium`}>
                            <Plus size={18} /> Upload Media
                            <input 
                              type="file" accept="image/*,video/*" className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setBgMedia({ url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image' });
                              }}
                            />
                          </label>
                          {bgMedia && (
                            <button onClick={() => setBgMedia(null)} className="px-6 py-3 rounded-lg text-red-500 border border-red-500/50 hover:bg-red-500/10 transition-colors font-medium">
                              Remove Background
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {settingsTab === 'history' && (
                    <>
                      <div className={`p-6 rounded-xl border ${c.border} bg-black/40 backdrop-blur-md`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold flex items-center gap-2"><MessageSquare size={20} /> Session Management</h3>
                          <button onClick={startNewChat} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${isHack ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-white text-black hover:bg-zinc-200'}`}>
                            <Plus size={16} /> New Chat
                          </button>
                        </div>
                        <p className={`mb-6 text-sm ${c.textMuted}`}>Start a fresh conversation instantly by clicking "New Chat" above. Or configure your local storage options below.</p>
                      </div>

                      <div className={`p-6 rounded-xl border ${c.border} bg-black/40 backdrop-blur-md`}>
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><BookOpen size={20} /> All Chat History ({chatSessions.length})</h3>
                        {chatSessions.length === 0 ? (
                          <p className={`text-sm ${c.textMuted} italic`}>No saved chats yet. Start a conversation to see it here.</p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {[...chatSessions].reverse().map(session => (
                              <div key={session.id} className={`flex items-center justify-between p-3 rounded-lg border ${c.border} ${activeChatId === session.id ? 'bg-zinc-800' : 'bg-black/30'} hover:bg-zinc-800/50 transition-colors group`}>
                                <button onClick={() => { loadChatSession(session.id); setView('chat'); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                  <MessageSquare size={16} className={`shrink-0 ${isHack ? 'text-green-500' : 'text-zinc-400'}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium truncate">{session.title || 'Untitled Chat'}</div>
                                    <div className={`text-xs ${c.textMuted}`}>{session.messages.length} messages</div>
                                  </div>
                                </button>
                                <button onClick={() => deleteChatSession(session.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={`p-6 rounded-xl border ${c.border} bg-black/40 backdrop-blur-md`}>
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Settings size={20} /> Privacy & History</h3>
                        <p className={`mb-6 text-sm ${c.textMuted}`}>Store your conversation history locally in your browser so you never lose a session. Turn this off to completely erase your data when refreshing.</p>
                        <div className="flex flex-col gap-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${saveHistory ? 'bg-green-500' : 'bg-zinc-700'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${saveHistory ? 'translate-x-7' : 'translate-x-1'}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={saveHistory} onChange={() => setSaveHistory(!saveHistory)} />
                            <span className="font-medium">Save Chat History Locally</span>
                          </label>

                          {saveHistory && messages.length > 0 && (
                            <div className="mt-4 border-t border-zinc-800 pt-6">
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Search size={14}/> Search Active History</h4>
                              <div className="relative mb-4">
                                <input 
                                  type="text" 
                                  placeholder="Search past messages..." 
                                  value={historySearchQuery}
                                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                                  className={`w-full bg-black/50 border ${c.border} rounded-lg px-4 py-2 text-sm outline-none focus:border-[#0d99ff] transition-colors`}
                                />
                              </div>
                              {historySearchQuery && (
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                  {messages.filter(m => m.content.toLowerCase().includes(historySearchQuery.toLowerCase())).length === 0 ? (
                                     <p className="text-xs text-zinc-500 italic">No matching messages found.</p>
                                  ) : (
                                    messages.filter(m => m.content.toLowerCase().includes(historySearchQuery.toLowerCase())).map((msg, i) => (
                                      <div key={i} className="p-3 bg-black/60 rounded-md border border-zinc-800 text-xs text-zinc-300">
                                        <span className={`font-bold mb-1 block ${msg.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}>{msg.role === 'user' ? 'You' : 'ENTITY'}:</span>
                                        {msg.content.substring(0, 150)}{msg.content.length > 150 ? '...' : ''}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MAPS VIEW */}
          {view === 'maps' && (
            <div className={`flex-1 p-6 relative flex flex-col ${c.text}`}>
              <h2 className={`text-2xl font-bold mb-4 ${isHack ? 'drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]' : ''}`}>Global Intelligence Map</h2>
              <div className={`flex-1 w-full rounded-2xl overflow-hidden border-2 ${c.border} shadow-2xl relative`}>
                {/* Replaced Google Maps with OpenStreetMap to avoid API activation errors while maintaining functionality */}
                <iframe 
                  width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-124.4,32.8,-66.9,47.3&amp;layer=mapnik"
                  allowFullScreen
                ></iframe>
                {isHack && <div className="absolute inset-0 pointer-events-none mix-blend-color bg-green-900/30"></div>}
              </div>
            </div>
          )}

          {/* QR SCANNER VIEW */}
          {view === 'qr_scanner' && <QRScanner />}

          {/* GENERAL KNOWLEDGE VIEW */}
          {view === 'general_knowledge' && (
            <div className={`flex-1 p-8 overflow-y-auto ${c.text}`}>
              <div className="flex justify-between items-center mb-10">
                <h2 className={`text-3xl font-bold ${isHack ? 'drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]' : ''}`}>General Knowledge</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gkSubjects.length > 0 ? gkSubjects.map((subject, idx) => (
                  <div key={idx} onClick={() => handleSubjectClick(subject)} className={`p-6 rounded-2xl border ${c.border} bg-black/40 backdrop-blur-md hover:scale-[1.02] transition-transform cursor-pointer shadow-lg`}>
                    {subject === 'Coding' ? <Code className={`mb-4 ${isHack ? 'text-green-400' : c.textMuted}`} size={28} /> : subject === 'Mathematics' ? <Calculator className={`mb-4 ${isHack ? 'text-green-400' : c.textMuted}`} size={28} /> : <BookOpen className={`mb-4 ${isHack ? 'text-green-400' : c.textMuted}`} size={28} />}
                    <h3 className="text-xl font-bold mb-2">{subject}</h3>
                    <p className={`text-sm ${c.textMuted}`}>{subject === 'Coding' ? 'Enter interactive coding mode.' : 'Explore this subject with an AI tutor and video lesson.'}</p>
                  </div>
                )) : null}
              </div>
            </div>
          )}

          {/* CODING MODE VIEW */}
          {view === 'coding' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar - Chat */}
              <div className={`w-[400px] flex flex-col border-r ${c.border} ${isHack ? 'bg-black/90' : 'bg-zinc-950'} z-10`}>
                <header className={`h-14 border-b ${c.border} flex items-center px-4`}>
                  <Code size={18} className={`mr-2 ${isHack ? 'text-green-500' : 'text-white'}`} />
                  <span className={`font-bold ${isHack ? 'text-green-500' : 'text-white'}`}>AI Coding Assistant</span>
                </header>
                
                <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${c.text}`}>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[90%] rounded-xl px-4 py-2 text-left ${msg.role === 'user' ? c.userMsg : c.aiMsg}`}>
                        {msg.content.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isLoading && <CubeLoader />}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className={`p-4 border-t ${c.border}`}>
                  <div className={`flex items-center rounded-xl p-1 pr-2 ${c.input}`}>
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(undefined, 'chat'))}
                      placeholder="Ask for code..."
                      className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm"
                    />
                    <button onClick={() => handleSend(undefined, 'chat')} disabled={!input.trim() || isLoading} className={`p-1.5 rounded-lg ${input.trim() ? (isHack ? 'bg-green-500 text-black' : 'bg-white text-black') : 'bg-transparent'} disabled:opacity-50 transition-colors`}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Area - Code Preview */}
              <div className={`flex-1 flex flex-col bg-zinc-950`}>
                <header className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">Editor</div>
                  <button onClick={copyToClipboard} className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                    {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    <span className="text-xs font-mono">{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </header>
                <div className="flex-1 p-6 overflow-auto font-mono text-sm leading-relaxed text-zinc-300">
                  <pre>
                    <code>
                      {generatedCode}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* AI BUILDER VIEW */}
          {view === 'ai_agent' && (
            <div className="flex-1 flex overflow-hidden">
              <div className={`w-[400px] flex flex-col border-r ${c.border} ${isHack ? 'bg-black/90' : 'bg-zinc-950'} z-10`}>
                <header className={`h-14 border-b ${c.border} flex items-center px-4`}>
                  <Bot size={18} className={`mr-2 ${isHack ? 'text-green-500' : 'text-white'}`} />
                  <span className={`font-bold ${isHack ? 'text-green-500' : 'text-white'}`}>Digital AI Builder</span>
                </header>
                
                <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${c.text}`}>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[90%] rounded-xl px-4 py-2 text-left ${msg.role === 'user' ? c.userMsg : c.aiMsg}`}>
                        {msg.content.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isLoading && <CubeLoader />}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className={`p-4 border-t ${c.border}`}>
                  <div className={`flex items-center rounded-xl p-1 pr-2 ${c.input}`}>
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(undefined, 'chat'))}
                      placeholder="Describe the code to build..."
                      className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm"
                    />
                    <button onClick={() => handleSend(undefined, 'chat')} disabled={!input.trim() || isLoading} className={`p-1.5 rounded-lg ${input.trim() ? (isHack ? 'bg-green-500 text-black' : 'bg-white text-black') : 'bg-transparent'} disabled:opacity-50 transition-colors`}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Area - Code Preview */}
              <div className={`flex-1 flex flex-col bg-zinc-950`}>
                <header className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <button onClick={() => setAiBuilderTab('preview')} className={`flex items-center gap-1.5 ${aiBuilderTab === 'preview' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      <LayoutTemplate size={14} /> Preview
                    </button>
                    <button onClick={() => setAiBuilderTab('code')} className={`flex items-center gap-1.5 ${aiBuilderTab === 'code' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      <Code size={14} /> Code
                    </button>
                    {aiBuilderTab === 'preview' && (
                      <button onClick={() => {
                        const blob = new Blob([generatedCode], { type: 'text/html' });
                        window.open(URL.createObjectURL(blob), '_blank');
                      }} className="text-zinc-400 hover:text-white flex items-center gap-1 ml-4 border-l border-zinc-700 pl-4 transition-colors">
                        <Globe size={14} />
                        <span>Full Browser</span>
                      </button>
                    )}
                    {aiBuilderTab === 'code' && (
                      <button onClick={copyToClipboard} className="text-zinc-400 hover:text-white flex items-center gap-1 ml-4 border-l border-zinc-700 pl-4 transition-colors">
                        {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </header>
                <div className="flex-1 overflow-hidden bg-zinc-950 flex flex-col">
                  {aiBuilderTab === 'preview' ? (
                    <div className="flex-1 w-full bg-white h-full relative">
                      <iframe className="w-full h-full border-0 bg-white" sandbox="allow-scripts" srcDoc={(generatedCode && (generatedCode.includes('<html') || generatedCode.includes('<div') || generatedCode.includes('<body') || generatedCode.includes('<style'))) ? generatedCode : `<html><body style="font-family:system-ui,sans-serif;padding:2rem;color:#333;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#fefefe;"><div style="background:#fff;padding:3rem;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.05);border:1px solid #eaeaea;max-width:500px;"><h2 style="margin-top:0;color:#111;">Live Application Preview</h2><p style="color:#666;line-height:1.6;margin-bottom:0;">${generatedCode.includes('// Ask the') ? 'Your generated UI component will render here once the AI writes the code.' : 'Code generated successfully! Switch to the <b>Code</b> tab to view the raw output, or ask the AI to generate a complete HTML/CSS component to see it rendered here.'}</p></div></body></html>`} />
                    </div>
                  ) : (
                    <div className="flex-1 p-6 overflow-auto font-mono text-sm leading-relaxed text-zinc-300">
                      <pre className="whitespace-pre-wrap word-break">
                        <code>
                          {generatedCode}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DESIGN STUDIO VIEW (FIGMA-LIKE) */}
          {view === 'design' && (
            <div className={`flex-1 flex flex-col h-full bg-[#1e1e1e] text-[#e5e5e5]`}>
              <header className={`h-12 border-b border-[#383838] flex items-center px-4 bg-[#2c2c2c] z-10 justify-between select-none`}>
                <div className="flex items-center gap-6">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500"></div>
                    Design File
                  </div>
                  <div className="flex items-center gap-1 bg-[#1e1e1e] rounded p-1 border border-[#383838]">
                    <button className="p-1.5 rounded hover:bg-[#383838] text-white" title="Move"><MousePointer2 size={14} /></button>
                    <button onClick={() => addDesignElement('rect')} className="p-1.5 rounded hover:bg-[#383838] text-[#a3a3a3]" title="Rectangle"><Square size={14} /></button>
                    <button onClick={() => addDesignElement('circle')} className="p-1.5 rounded hover:bg-[#383838] text-[#a3a3a3]" title="Ellipse"><Circle size={14} /></button>
                    <button onClick={() => addDesignElement('text')} className="p-1.5 rounded hover:bg-[#383838] text-[#a3a3a3]" title="Text"><Type size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 border border-[#2c2c2c] flex items-center justify-center text-[10px] font-bold">You</div>
                  </div>
                  <button onClick={exportDesignToCode} className="px-3 py-1.5 rounded bg-[#0d99ff] text-white text-xs font-semibold hover:bg-[#0a84dc] transition-colors flex items-center gap-1.5">
                    <Code size={12} className="fill-current" /> Export Code
                  </button>
                  <button className="px-3 py-1.5 rounded bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-1.5">
                    <Play size={12} className="fill-current" /> Present
                  </button>
                </div>
              </header>

              <div className="flex-1 flex overflow-hidden">
                {/* Layers Panel */}
                <div className={`w-[240px] border-r border-[#383838] bg-[#2c2c2c] flex flex-col`}>
                  <div className="p-3 text-xs font-semibold flex items-center justify-between border-b border-[#383838]">
                    <span>Layers</span>
                    <Plus onClick={() => addDesignElement('rect')} size={14} className="text-[#a3a3a3] cursor-pointer hover:text-white" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-[1px]">
                    <div className="px-2 py-1.5 rounded-md text-xs flex items-center gap-2 hover:bg-[#383838] cursor-pointer text-[#e5e5e5] font-medium mb-1">
                      <LayoutTemplate size={12} className="text-[#a3a3a3]" /> App.tsx
                    </div>
                    {[...designElements].sort((a,b) => b.zIndex - a.zIndex).map(el => (
                      <div 
                        key={el.id} 
                        onClick={() => setSelectedId(el.id)}
                        className={`px-2 py-1.5 rounded-md text-xs flex items-center gap-2 cursor-pointer pl-6 transition-colors ${selectedId === el.id ? 'bg-[#0d99ff]/20 text-[#0d99ff] font-medium' : 'hover:bg-[#383838] text-[#e5e5e5]'}`}
                      >
                        {el.type === 'text' ? <Type size={12} className={selectedId === el.id ? '' : 'text-[#a3a3a3]'} /> : el.type === 'circle' ? <Circle size={12} className={selectedId === el.id ? '' : 'text-[#a3a3a3]'} /> : <Square size={12} className={selectedId === el.id ? '' : 'text-[#a3a3a3]'} />}
                        <span className="truncate flex-1">{el.name}</span>
                        {selectedId === el.id && <Trash2 size={12} className="opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteDesignElement(); }} />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative overflow-auto bg-[#1e1e1e] flex items-center justify-center p-8">
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`, backgroundSize: '100px 100px' }}></div>
                  
                  {/* Artboard */}
                  <div className="w-[800px] h-[500px] bg-white relative shadow-sm ring-1 ring-black/5 flex flex-col overflow-hidden"
                       onPointerMove={handlePointerMove}
                       onPointerUp={handlePointerUp}
                       onPointerLeave={handlePointerUp}
                  >
                    <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-zinc-50 pointer-events-none">
                      <div className="w-8 h-8 rounded bg-zinc-300"></div>
                      <div className="flex gap-4">
                        <div className="w-16 h-2 rounded bg-zinc-300"></div>
                        <div className="w-16 h-2 rounded bg-zinc-300"></div>
                        <div className="w-16 h-2 rounded bg-zinc-300"></div>
                      </div>
                    </header>
                    <div className="flex-1 relative bg-white">
                      {[...designElements].sort((a,b) => a.zIndex - b.zIndex).map(el => (
                        <div 
                          key={el.id}
                          onPointerDown={(e) => handlePointerDown(e, el.id)}
                          style={{ 
                            left: el.x, top: el.y, zIndex: el.zIndex, opacity: el.opacity,
                            color: el.type === 'text' ? el.color : undefined,
                            backgroundColor: el.type !== 'text' ? el.color : undefined,
                            fontSize: el.type === 'text' ? el.fontSize : undefined,
                            width: el.w === 'Auto' ? undefined : `${el.w}px`,
                            height: el.h === 'Auto' ? undefined : `${el.h}px`,
                            borderRadius: el.type === 'circle' ? '50%' : `${el.rx}px`,
                            border: el.strokeWidth > 0 ? `${el.strokeWidth}px solid ${el.stroke}` : undefined
                          }}
                          className={`absolute flex items-center justify-center font-bold tracking-tight select-none cursor-move ${selectedId === el.id ? `ring-1 ring-[#0d99ff] z-50` : 'ring-1 ring-transparent hover:ring-zinc-300'}`}
                        >
                          {el.type === 'text' ? el.text : null}
                          
                          {/* Handles */}
                          {selectedId === el.id && (
                            <>
                              <div onPointerDown={(e) => handleResizeDown(e, el.id, 'nw')} className="absolute -top-1 -left-1 w-2 h-2 bg-white ring-1 ring-[#0d99ff] cursor-nwse-resize z-50"></div>
                              <div onPointerDown={(e) => handleResizeDown(e, el.id, 'ne')} className="absolute -top-1 -right-1 w-2 h-2 bg-white ring-1 ring-[#0d99ff] cursor-nesw-resize z-50"></div>
                              <div onPointerDown={(e) => handleResizeDown(e, el.id, 'sw')} className="absolute -bottom-1 -left-1 w-2 h-2 bg-white ring-1 ring-[#0d99ff] cursor-nesw-resize z-50"></div>
                              <div onPointerDown={(e) => handleResizeDown(e, el.id, 'se')} className="absolute -bottom-1 -right-1 w-2 h-2 bg-white ring-1 ring-[#0d99ff] cursor-nwse-resize z-50"></div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Properties Panel */}
                <div className={`w-[240px] border-l border-[#383838] bg-[#2c2c2c] flex flex-col overflow-y-auto z-10`}>
                  <div className="flex text-xs font-medium border-b border-[#383838] sticky top-0 bg-[#2c2c2c] z-10">
                    <div className="flex-1 py-3 text-center border-b-2 border-[#e5e5e5] cursor-pointer">Design</div>
                    <div className="flex-1 py-3 text-center text-[#a3a3a3] hover:text-[#e5e5e5] cursor-pointer">Prototype</div>
                  </div>
                  
                  {activeElement ? (
                    <div className="p-4 space-y-6">
                      <div className="flex items-center justify-between">
                        <input 
                          type="text" 
                          value={activeElement.name} 
                          onChange={(e) => updateElement(activeElement.id, { name: e.target.value })}
                          className="bg-transparent border-none outline-none font-semibold text-xs w-3/4 focus:bg-[#1e1e1e] px-1 -ml-1 rounded" 
                        />
                        <button onClick={deleteDesignElement} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors" aria-label="Delete Element">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div>
                        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                          <div className="flex items-center gap-2"><span className="text-[#a3a3a3]">X</span> 
                            <input type="number" value={Math.round(activeElement.x)} onChange={(e) => updateElement(activeElement.id, { x: Number(e.target.value) })} className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 outline-none focus:border-[#0d99ff] hover:border-[#555]" />
                          </div>
                          <div className="flex items-center gap-2"><span className="text-[#a3a3a3]">Y</span> 
                            <input type="number" value={Math.round(activeElement.y)} onChange={(e) => updateElement(activeElement.id, { y: Number(e.target.value) })} className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 outline-none focus:border-[#0d99ff] hover:border-[#555]" />
                          </div>
                          <div className="flex items-center gap-2"><span className="text-[#a3a3a3]">W</span> 
                            <input type="text" value={activeElement.w === 'Auto' ? 'Auto' : Math.round(Number(activeElement.w))} onChange={(e) => activeElement.type !== 'text' && updateElement(activeElement.id, { w: Number(e.target.value) })} className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 outline-none focus:border-[#0d99ff] hover:border-[#555]" readOnly={activeElement.type === 'text'} />
                          </div>
                          <div className="flex items-center gap-2"><span className="text-[#a3a3a3]">H</span> 
                            <input type="text" value={activeElement.h === 'Auto' ? 'Auto' : Math.round(Number(activeElement.h))} onChange={(e) => activeElement.type !== 'text' && updateElement(activeElement.id, { h: Number(e.target.value) })} className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 outline-none focus:border-[#0d99ff] hover:border-[#555]" readOnly={activeElement.type === 'text'} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2"><span className="text-[#a3a3a3]" title="Corner Radius">R</span> 
                            <input type="number" value={activeElement.rx} onChange={(e) => updateElement(activeElement.id, { rx: Number(e.target.value) })} className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 outline-none focus:border-[#0d99ff] hover:border-[#555]" disabled={activeElement.type === 'circle'} />
                          </div>
                          <div className="flex items-center gap-2"><span className="text-[#a3a3a3]" title="Opacity">Op</span> 
                            <input type="number" min="0" max="1" step="0.1" value={activeElement.opacity} onChange={(e) => updateElement(activeElement.id, { opacity: Number(e.target.value) })} className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 outline-none focus:border-[#0d99ff] hover:border-[#555]" />
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-px bg-[#383838]"></div>

                      {activeElement.type === 'text' && (
                        <>
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <div className="text-xs font-semibold">Text</div>
                            </div>
                            <input type="text" value={activeElement.text} onChange={(e) => updateElement(activeElement.id, { text: e.target.value })} className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 text-xs outline-none focus:border-[#0d99ff] hover:border-[#555] mb-2" />
                            <select className="w-full bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 text-xs outline-none focus:border-[#0d99ff] hover:border-[#555] mb-2">
                              <option>Inter</option>
                              <option>Roboto</option>
                            </select>
                            <div className="flex gap-2">
                              <select className="flex-1 bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 text-xs outline-none focus:border-[#0d99ff] hover:border-[#555]">
                                <option>Bold</option>
                                <option>Regular</option>
                              </select>
                              <input type="number" value={activeElement.fontSize} onChange={(e) => updateElement(activeElement.id, { fontSize: Number(e.target.value) })} className="w-16 bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 text-xs outline-none focus:border-[#0d99ff] hover:border-[#555] text-center" />
                            </div>
                          </div>
                          <div className="w-full h-px bg-[#383838]"></div>
                        </>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-xs font-semibold">Fill</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-sm border border-[#383838] overflow-hidden">
                            <input type="color" value={activeElement.color} onChange={(e) => updateElement(activeElement.id, { color: e.target.value })} className="w-8 h-8 -ml-2 -mt-2 cursor-pointer" />
                          </div>
                          <input type="text" value={activeElement.color} onChange={(e) => updateElement(activeElement.id, { color: e.target.value })} className="flex-1 bg-transparent border-none text-xs outline-none uppercase font-mono" />
                          <span className="text-xs text-[#a3a3a3]">100%</span>
                        </div>
                      </div>

                      <div className="w-full h-px bg-[#383838]"></div>

                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-xs font-semibold">Stroke</div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 rounded-sm border border-[#383838] overflow-hidden">
                            <input type="color" value={activeElement.stroke} onChange={(e) => updateElement(activeElement.id, { stroke: e.target.value })} className="w-8 h-8 -ml-2 -mt-2 cursor-pointer" />
                          </div>
                          <input type="text" value={activeElement.stroke} onChange={(e) => updateElement(activeElement.id, { stroke: e.target.value })} className="flex-1 bg-transparent border-none text-xs outline-none uppercase font-mono" />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#a3a3a3] w-4">W</span>
                          <input type="number" min="0" value={activeElement.strokeWidth} onChange={(e) => updateElement(activeElement.id, { strokeWidth: Number(e.target.value) })} className="w-16 bg-[#1e1e1e] border border-[#383838] rounded px-2 py-1 text-xs outline-none focus:border-[#0d99ff] hover:border-[#555] text-center" />
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="p-4 text-xs text-center text-[#a3a3a3] mt-10">Select a layer to view properties</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
