"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import {
    Ghost,
    ArrowLeft,
    Send,
    Brain,
    Sparkles,
    Lightbulb,
    BookOpen,
    Code,
    Loader2,
    RotateCcw,
    Copy,
    Check,
    Terminal,
    MessageSquare,
    Activity,
    Zap,
    Cpu,
    Network,
    Shield,
    ChevronRight,
    SearchCode,
    Play,
    ZapOff,
    Mic,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface QuickPrompt {
    icon: any;
    label: string;
    prompt: string;
    color: string;
    bgColor: string;
}

const AIStudyBuddy = () => {
    const router = useRouter();
    const { accounts } = useMsal();
    const session = accounts[0];
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sessionId] = useState(`GS-SN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial Dashboard Animations
    useGSAP(() => {
        const tl = gsap.timeline();
        tl.fromTo(".dash-panel",
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
        );
        gsap.fromTo(".animate-header", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
        gsap.fromTo(".animate-footer", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
    }, { scope: containerRef });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const quickPrompts: QuickPrompt[] = [
        {
            icon: Lightbulb,
            label: "Explain Concept",
            prompt: "Can you explain the concept of ",
            color: "text-amber-400",
            bgColor: "bg-amber-400/10"
        },
        {
            icon: Code,
            label: "Debug Code",
            prompt: "Help me debug this code: ",
            color: "text-blue-400",
            bgColor: "bg-blue-400/10"
        },
        {
            icon: BookOpen,
            label: "Practice Problems",
            prompt: "Give me practice problems on ",
            color: "text-violet-400",
            bgColor: "bg-violet-400/10"
        },
        {
            icon: Brain,
            label: "Quiz Me",
            prompt: "Quiz me on ",
            color: "text-emerald-400",
            bgColor: "bg-emerald-400/10"
        }
    ];

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/attender/ghost-mode/study-buddy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            if (!response.ok) throw new Error('Failed to get response');
            const data = await response.json();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || "Neural link established. Processing request...",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'CRITICAL_ERROR: Communication link with Synapse severed. Re-establish connection.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        setInput(prompt);
        textareaRef.current?.focus();
    };

    const handleReset = () => {
        setMessages([]);
        setInput('');
    };

    const handleCopy = (content: string, id: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div ref={containerRef} className="h-screen w-full bg-[#030303] text-slate-200 overflow-hidden font-sans selection:bg-violet-500/40 flex flex-col">
            {/* Immersive Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/5 rounded-full blur-[120px] opacity-[0.4] pointer-events-none" />
            </div>

            {/* Tactical Header */}
            <header className="animate-header z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-md h-10 flex items-center shrink-0">
                <div className="w-full px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                                <Brain className="w-3 h-3" />
                            </div>
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/90">PROTOCOL_SYNAPSE</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-white/40 font-mono uppercase">AI_LINK: ACTIVE</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[8px] font-bold text-white/60 tracking-tight leading-none mb-0.5">{session?.name || 'OPERATOR'}</span>
                            <span className="text-[7px] text-white/20 font-mono tracking-tighter uppercase leading-none">{sessionId}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button onClick={handleReset} variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-white transition-colors">
                                <RotateCcw className="w-3 h-3" />
                            </Button>
                            <Button
                                onClick={() => setShowExitWarning(true)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[9px] font-bold bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/5 rounded transition-all"
                            >
                                <ArrowLeft className="w-2.5 h-2.5 mr-1" />
                                ESCAPE
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Dashboard Workspace */}
            <main className="flex-1 flex overflow-hidden relative z-10">
                {/* 1. Neural Index (Left Sidebar) */}
                <aside className="dash-panel w-64 lg:w-72 border-r border-white/5 flex flex-col bg-black/10 backdrop-blur-sm shrink-0">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between">
                        <h2 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">Context Index</h2>
                        <SearchCode className="w-2.5 h-2.5 text-white/20" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide text-center">
                        <div className="pt-8 space-y-4">
                            <div className="w-12 h-12 mx-auto rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                <Sparkles className="w-6 h-6 text-violet-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Neural Link</p>
                                <p className="text-[9px] text-white/20 font-bold leading-relaxed px-4">
                                    Direct encryption active. No persistent logs generated.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-3">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-1">Memory Cache</p>
                            <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5 py-4">
                                <ZapOff className="w-4 h-4 text-white/5 mx-auto mb-2" />
                                <p className="text-[8px] text-white/20 font-medium">Session is ephemeral.<br />Cache cleared on exit.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-white/40 mb-3">
                            <MessageSquare className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Protocol Stats</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-white/[0.02] border border-white/5 text-center">
                                <p className="text-[7px] text-white/20 font-bold mb-0.5 uppercase">TURNS</p>
                                <p className="text-[10px] text-violet-400 font-black">{messages.length}</p>
                            </div>
                            <div className="p-2 rounded bg-white/[0.02] border border-white/5 text-center">
                                <p className="text-[7px] text-white/20 font-bold mb-0.5 uppercase">SYNC</p>
                                <p className="text-[10px] text-emerald-400 font-black">100%</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* 2. Communication Stage (Center) */}
                <section className="dash-panel flex-1 flex flex-col bg-black/20 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-[#030303] to-transparent z-10 pointer-events-none opacity-40" />

                    {/* Scrollable Chat Area - Standard Div for Reliability */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth px-4 lg:px-8"
                    >
                        <div className="max-w-3xl mx-auto py-12 space-y-8">
                            {messages.length === 0 ? (
                                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                                    <div className="space-y-3">
                                        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shadow-lg shadow-violet-500/5 ring-1 ring-white/10">
                                            <Sparkles className="w-8 h-8 text-violet-500" />
                                        </div>
                                        <h2 className="text-xl font-bold tracking-tight text-white uppercase italic">
                                            How can I assist you?
                                        </h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] max-w-sm mx-auto">
                                            I'm your ephemeral study companion. Ask me to explain concepts, debug code, or simulate a quiz.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                        {quickPrompts.map((p, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleQuickPrompt(p.prompt)}
                                                className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/20 transition-all text-left group"
                                            >
                                                <div className={`p-2 rounded-lg ${p.bgColor} ${p.color} ring-1 ring-white/5`}>
                                                    <p.icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-xs text-slate-200 group-hover:text-white transition-colors">{p.label}</div>
                                                    <div className="text-[10px] text-slate-500 truncate opacity-70 italic font-mono">"{p.prompt}..."</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                messages.map((m) => (
                                    <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`mt-1 shrink-0 w-6 h-6 rounded flex items-center justify-center border ${m.role === 'user'
                                            ? 'bg-white/5 border-white/10'
                                            : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                                            }`}>
                                            {m.role === 'user' ? <Terminal className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                                        </div>
                                        <div className={`flex flex-col gap-1.5 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{m.role === 'user' ? 'Operator' : 'Synapse'}</span>
                                                <span className="text-[7px] font-mono text-white/10">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                            </div>
                                            <div className={`relative group px-4 py-3 rounded-xl text-xs leading-relaxed transition-all ${m.role === 'user'
                                                ? 'bg-white/5 border border-white/5 text-slate-200 shadow-sm'
                                                : 'bg-violet-500/[0.02] border border-violet-500/10 text-slate-300 shadow-sm'
                                                }`}>
                                                <p className="whitespace-pre-wrap">{m.content}</p>
                                                {m.role === 'assistant' && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="absolute -right-7 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white"
                                                        onClick={() => handleCopy(m.content, m.id)}
                                                    >
                                                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div className="flex gap-4">
                                    <div className="mt-1 shrink-0 w-6 h-6 rounded flex items-center justify-center bg-violet-500/10 border border-violet-500/20 text-violet-400">
                                        <Brain className="w-3 h-3" />
                                    </div>
                                    <div className="bg-violet-500/[0.02] border border-violet-500/10 px-4 py-3 rounded-xl flex items-center gap-3">
                                        <div className="flex space-x-1">
                                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></div>
                                        </div>
                                        <span className="text-[9px] text-violet-400 font-black uppercase tracking-widest leading-none">Synthesizing...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-[#030303] to-transparent z-10 pointer-events-none opacity-40" />

                    {/* Input Node */}
                    <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-md z-20 shrink-0">
                        <div className="max-w-3xl mx-auto relative group">
                            <div className="absolute -inset-1 bg-violet-500/5 blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                            <div className="relative flex items-end gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 transition-all focus-within:border-violet-500/30 focus-within:bg-white/[0.05]">
                                <Textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter communication..."
                                    className="min-h-[44px] max-h-[120px] resize-none bg-transparent border-none focus-visible:ring-0 px-1 py-2 text-[13px] text-slate-200 placeholder:text-white/10 scrollbar-hide"
                                />
                                <div className="flex items-center gap-1.5 pb-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/20 hover:text-white rounded-lg">
                                        <Mic className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!input.trim() || isLoading}
                                        size="icon"
                                        className="h-7 w-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-30 disabled:grayscale transition-all"
                                    >
                                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Logic Hub (Right Sidebar) */}
                <aside className="dash-panel w-64 lg:w-72 border-l border-white/5 flex flex-col bg-black/10 backdrop-blur-sm shrink-0 hidden lg:flex">
                    <div className="p-3 border-b border-white/5">
                        <h2 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">Cognitive Telemetry</h2>
                    </div>

                    <div className="p-4 space-y-6 overflow-y-auto scrollbar-hide">
                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-1">Link Status</p>
                            <div className="grid grid-cols-2 gap-2">
                                <MicroTechModule icon={Shield} label="SECURITY" value="MAX" color="text-emerald-400" />
                                <MicroTechModule icon={Zap} label="LATENCY" value="12ms" color="text-amber-400" />
                                <MicroTechModule icon={Cpu} label="NEURAL" value="98%" color="text-violet-400" />
                                <MicroTechModule icon={Network} label="NODES" value="active" color="text-blue-400" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-1">Logic Analysis</p>
                            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-500 uppercase font-black">Context Width</span>
                                        <span className="text-white font-mono text-[8px]">128K_TOKENS</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 1, 1, 1, 1, 1, 0, 0].map((v, i) => (
                                            <div key={i} className={`h-0.5 flex-1 rounded-full ${v ? 'bg-violet-500/50' : 'bg-white/5'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-500 uppercase font-black">Memory Load</span>
                                        <span className="text-white font-mono text-[8px]">OPTIMAL</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 1, 1, 1, 0, 0, 0, 0].map((v, i) => (
                                            <div key={i} className={`h-0.5 flex-1 rounded-full ${v ? 'bg-emerald-500/50' : 'bg-white/5'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <div className="p-3 rounded-lg border border-white/5 bg-violet-600/5 flex flex-col items-center gap-2">
                                <Network className="w-6 h-6 text-violet-500/50 animate-pulse" />
                                <p className="text-[7px] font-mono text-white/20 uppercase text-center leading-relaxed">
                                    Encrypted neural bridge active.<br />Routing via decentralized nodes.
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Bottom System Ticker */}
            <footer className="shrink-0 h-5 bg-black border-t border-white/5 flex items-center z-50 overflow-hidden">
                <div className="flex items-center gap-8 animate-scroll whitespace-nowrap px-4 w-full">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-8">
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">SESSION_ENCRYPTED // NO_TRACE_ACTIVE</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">PROTOCOL: SYNAPSE_V4</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">SECURITY_LEVEL: OMNI_GHOST</span>
                            <span className="text-[7px] font-mono text-violet-500/30 uppercase tracking-[0.2em] leading-none">OPERATIONAL_SYNAPSE_4.2.1-REL</span>
                        </div>
                    ))}
                </div>
            </footer>

            {/* Exit Warning */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-[320px] bg-[#0A0A0A] border-white/10 p-5 overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                    <DialogHeader className="space-y-2">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                            <Shield className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="space-y-1 text-center">
                            <DialogTitle className="text-base font-black tracking-tight text-white uppercase leading-none">ABORT_SEQUENCE</DialogTitle>
                            <DialogDescription className="text-slate-400 text-[10px] leading-relaxed">
                                Termination will purge ephemeral neural context and logs. This action is irreversible.
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <div className="flex gap-3 pt-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowExitWarning(false)}
                            className="flex-1 h-9 border-white/10 bg-white/5 text-white text-[10px] font-bold"
                        >
                            CANCEL
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => router.push('/ghost-mode')}
                            className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-[10px] font-bold"
                        >
                            TERMINATE
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @keyframes scroll {
                    from { transform: translateX(0); }
                    to { transform: translateX(-33.33%); }
                }
                .animate-scroll {
                    animation: scroll 30s linear infinite;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

const MicroTechModule = ({ icon: Icon, label, value, color }: any) => (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/[0.01] border border-white/5 items-center text-center">
        <div className={`p-1 rounded bg-white/5 ${color}`}>
            <Icon className="w-2.5 h-2.5" />
        </div>
        <div>
            <p className="text-[7px] font-bold text-white/20 uppercase leading-none mb-0.5">{label}</p>
            <p className={`text-[9px] font-black tracking-tighter uppercase ${color} leading-none`}>{value}</p>
        </div>
    </div>
);

export default AIStudyBuddy;