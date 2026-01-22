"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import { useTheme } from "next-themes";
import {
    Brain,
    ArrowLeft,
    Send,
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
    Zap,
    Cpu,
    Network,
    Shield,
    SearchCode,
    Mic,
    Ghost,
    History,
    ChevronLeft,
    Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// --- Types ---
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface QuickPrompt {
    icon: any;
    label: string;
    description: string;
    prompt: string;
    color: string;
    gradient: string;
}

const AIStudyBuddy = () => {
    // --- Hooks & State ---
    const router = useRouter();
    const { accounts } = useMsal();
    const { theme } = useTheme();
    const session = accounts[0];

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sessionId] = useState(`SYN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

    const [stats, setStats] = useState({ latency: 45, tokens: 0 });
    const [systemLogs, setSystemLogs] = useState<string[]>(["Session initialized...", "Neural link established."]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Config ---
    const quickPrompts: QuickPrompt[] = [
        {
            icon: Lightbulb,
            label: "Explain Concept",
            description: "Deep dive into complex theory",
            prompt: "Can you explain the concept of ",
            color: "text-amber-500",
            gradient: "from-amber-500/10 to-orange-500/10"
        },
        {
            icon: Code,
            label: "Debug Code",
            description: "Analyze and fix logic errors",
            prompt: "Help me debug this code: ",
            color: "text-blue-500",
            gradient: "from-blue-500/10 to-cyan-500/10"
        },
        {
            icon: BookOpen,
            label: "Practice Problems",
            description: "Generate targeted exercises",
            prompt: "Give me practice problems on ",
            color: "text-violet-500",
            gradient: "from-violet-500/10 to-purple-500/10"
        },
        {
            icon: Brain,
            label: "Quiz Me",
            description: "Test knowledge retention",
            prompt: "Quiz me on ",
            color: "text-emerald-500",
            gradient: "from-emerald-500/10 to-green-500/10"
        }
    ];

    // --- Animations ---
    useGSAP(() => {
        const tl = gsap.timeline();

        tl.fromTo(".header-element",
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out" }
        );

        tl.fromTo(".panel-trigger",
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" },
            "-=0.3"
        );

        // Initial center content fade in
        gsap.fromTo(".main-stage",
            { opacity: 0, scale: 0.98 },
            { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }
        );

    }, { scope: containerRef });

    // Auto-scroll
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // --- Helpers ---
    const addLog = (log: string) => {
        setSystemLogs(prev => [log, ...prev].slice(0, 5));
    };

    const estimateTokens = (text: string) => Math.ceil(text.length / 4);

    // --- Handlers ---
    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const startTime = performance.now();
        const inputTokens = estimateTokens(input);

        setStats(prev => ({ ...prev, tokens: prev.tokens + inputTokens }));
        addLog(`Processing input (${inputTokens} tokens)...`);

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

            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            const responseTokens = estimateTokens(data.response || "");

            setStats(prev => ({
                latency,
                tokens: prev.tokens + responseTokens
            }));
            addLog(`Response received in ${latency}ms`);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || "Neural link established. Processing request...",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            addLog("ERR: Connection instability detected");
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'CONNECTION_ERROR: Synapse link unstable. Please retry.',
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
        <div ref={containerRef} className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden transition-colors duration-500 font-sans selection:bg-primary/20">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl h-14 shrink-0">
                <div className="container h-full mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 header-element">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowExitWarning(true)}>
                            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/20">
                                <Brain className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-tight">AI Research Assistant</span>
                                <span className="text-[10px] text-muted-foreground font-mono leading-none">PROJECT SYNAPSE</span>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-0.5 rounded-full bg-muted/50 border border-border/50 ml-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">
                                {sessionId}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 header-element">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMessages([])}
                            className="hidden sm:flex text-xs font-medium text-muted-foreground hover:text-foreground"
                            disabled={messages.length === 0}
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Reset
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 flex overflow-hidden relative z-10">

                {/* 1. Left Sidebar - Context & History (Hidden on mobile) */}
                <aside className="hidden lg:flex w-64 border-r border-border/40 flex-col bg-muted/20 backdrop-blur-sm shrink-0 panel-trigger">
                    <div className="p-4 border-b border-border/40 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session Intel</h2>
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-mono">V4.2</Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Connection Status */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-mono font-bold uppercase text-muted-foreground/70">Neural Link</h3>
                            <div className="p-3 rounded-xl bg-card border border-border/50 shadow-sm space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold">Encrypted</div>
                                        <div className="text-[10px] text-muted-foreground">End-to-end active</div>
                                    </div>
                                </div>
                                <div className="h-px bg-border/50 w-full" />
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="bg-muted/50 rounded-md p-1.5">
                                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Latency</div>
                                        <div className="text-xs font-mono font-bold text-primary">{stats.latency}ms</div>
                                    </div>
                                    <div className="bg-muted/50 rounded-md p-1.5">
                                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Tokens</div>
                                        <div className="text-xs font-mono font-bold text-primary">{stats.tokens.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Log */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-mono font-bold uppercase text-muted-foreground/70">Session Log</h3>
                            <div className="pl-2 border-l-2 border-border/60 space-y-2">
                                {systemLogs.map((log, i) => (
                                    <div key={i} className="text-[10px] text-muted-foreground/80 font-mono leading-tight">
                                        <span className="opacity-50 mr-2">{'>'}</span>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border/40 bg-muted/30">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            <span>SYSTEM OPTIMAL</span>
                        </div>
                    </div>
                </aside>

                {/* 2. Main Chat Stage */}
                <section className="flex-1 flex flex-col relative overflow-hidden main-stage">
                    {/* Chat Messages */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto scroll-smooth px-4 md:px-20 lg:px-32 py-8"
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-500">
                                <div className="text-center space-y-4 max-w-lg mx-auto">
                                    <div className="w-20 h-20 mx-auto rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center ring-1 ring-violet-500/20 shadow-2xl shadow-violet-500/10">
                                        <Sparkles className="w-10 h-10 text-violet-500" />
                                    </div>
                                    <h1 className="text-3xl font-bold tracking-tight">How can I assist you?</h1>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        I'm your neural research partner. Ask me to break down complex topics, debug code snippets, or generate practice scenarios.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                                    {quickPrompts.map((p, i) => {
                                        const Icon = p.icon;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleQuickPrompt(p.prompt)}
                                                className="group relative flex items-start gap-4 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all text-left overflow-hidden hover:shadow-lg hover:-translate-y-0.5"
                                            >
                                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${p.gradient}`} />
                                                <div className={`p-2.5 rounded-xl bg-background/80 ring-1 ring-border shadow-sm z-10 ${p.color}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="relative z-10 flex-1">
                                                    <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{p.label}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-4">
                                {messages.map((m) => {
                                    const isUser = m.role === 'user';
                                    return (
                                        <div key={m.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                            {!isUser && (
                                                <Avatar className="h-8 w-8 border border-border/50 bg-violet-500/10 text-violet-500">
                                                    <AvatarFallback className="bg-violet-500/10 text-violet-500 text-xs font-bold"><Brain className="w-4 h-4" /></AvatarFallback>
                                                </Avatar>
                                            )}

                                            <div className={`relative max-w-[85%] lg:max-w-[70%] space-y-1 ${isUser ? 'items-end flex flex-col' : 'items-start'}`}>
                                                <div className="flex items-center gap-2 px-1">
                                                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground/70">{isUser ? 'You' : 'Synapse AI'}</span>
                                                    <span className="text-[9px] text-muted-foreground/40">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>

                                                <div className={cn(
                                                    "group relative px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all",
                                                    isUser
                                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                        : "bg-card border border-border/50 text-foreground rounded-tl-sm hover:border-violet-500/20"
                                                )}>
                                                    <p className="whitespace-pre-wrap">{m.content}</p>

                                                    {!isUser && (
                                                        <div className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pt-2">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6 rounded-md hover:bg-muted"
                                                                onClick={() => handleCopy(m.content, m.id)}
                                                            >
                                                                {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isUser && (
                                                <Avatar className="h-8 w-8 border border-border/50 bg-muted text-muted-foreground">
                                                    <AvatarFallback className="text-xs font-bold">ME</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    );
                                })}

                                {isLoading && (
                                    <div className="flex gap-4">
                                        <Avatar className="h-8 w-8 border border-border/50 bg-violet-500/10 text-violet-500">
                                            <AvatarFallback className="bg-violet-500/10"><Brain className="w-4 h-4" /></AvatarFallback>
                                        </Avatar>
                                        <div className="bg-card border border-border/50 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-3 shadow-sm">
                                            <div className="flex space-x-1">
                                                <div className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce"></div>
                                            </div>
                                            <span className="text-xs font-medium text-muted-foreground animate-pulse">Processing...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 md:p-6 w-full max-w-4xl mx-auto z-20">
                        <div className="relative group rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/5 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Message Synapse..."
                                className="min-h-[50px] max-h-[160px] resize-none bg-transparent border-none focus-visible:ring-0 px-4 py-3.5 text-sm placeholder:text-muted-foreground/50 scrollbar-hide"
                            />

                            <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                                    <Mic className="w-4 h-4" />
                                </Button>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || isLoading}
                                    size="icon"
                                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="text-center mt-2">
                            <p className="text-[10px] text-muted-foreground/60">
                                AI responses are generated in real-time and may vary. System logs are encrypted.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Exit Warning Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Return to Module Selection?</DialogTitle>
                        <DialogDescription>
                            Your current conversation context will be cleared. Do you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => router.push('/ghost-mode')}>
                            Exit Session
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AIStudyBuddy;
