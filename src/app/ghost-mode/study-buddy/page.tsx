"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial Animation
    useGSAP(() => {
        gsap.from(".chat-ui-element", {
            y: 20,
            opacity: 0,
            stagger: 0.1,
            duration: 0.6,
            ease: "power2.out"
        });
    }, { scope: containerRef });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    // Quick prompts for easy access
    const quickPrompts: QuickPrompt[] = [
        {
            icon: Lightbulb,
            label: "Explain Concept",
            prompt: "Can you explain the concept of ",
            color: "text-amber-500",
            bgColor: "bg-amber-500/10"
        },
        {
            icon: Code,
            label: "Debug Code",
            prompt: "Help me debug this code: ",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10"
        },
        {
            icon: BookOpen,
            label: "Practice Problems",
            prompt: "Give me practice problems on ",
            color: "text-violet-500",
            bgColor: "bg-violet-500/10"
        },
        {
            icon: Brain,
            label: "Quiz Me",
            prompt: "Quiz me on ",
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10"
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
                content: data.response || "I'm processing that information...",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, connection lost in the void. Please try again.',
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

    const confirmExit = () => {
        router.push('/ghost-mode');
    };

    return (
        <div ref={containerRef} className="h-screen bg-background flex flex-col font-sans overflow-hidden relative">

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-violet-500/5 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />
            </div>

            {/* Header */}
            <header className="flex-none h-16 border-b border-border/40 bg-background/80 backdrop-blur-md z-20 chat-ui-element">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                            <Brain className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-semibold tracking-tight text-foreground">AI Study Buddy</h1>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] text-muted-foreground font-mono uppercase">Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleReset} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Reset Chat</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button
                            onClick={() => setShowExitWarning(true)}
                            variant="destructive"
                            size="sm"
                            className="h-8 text-xs font-medium px-3 shadow-none bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                            Exit
                        </Button>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 flex flex-col relative z-10 max-w-4xl mx-auto w-full p-4 overflow-hidden min-h-0">
                <ScrollArea ref={scrollRef} className="flex-1 min-h-0 pr-4 -mr-4 chat-ui-element">
                    <div className="min-h-full flex flex-col justify-end space-y-6 pb-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-5">
                                <div className="space-y-4">
                                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shadow-lg shadow-violet-500/5 ring-1 ring-white/10">
                                        <Sparkles className="w-10 h-10 text-violet-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        How can I assist you?
                                    </h2>
                                    <p className="text-muted-foreground max-w-md mx-auto">
                                        I'm your ephemeral study companion. Ask me to explain concepts, debug code, or simulate an interview.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                    {quickPrompts.map((p, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleQuickPrompt(p.prompt)}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-accent hover:border-accent-foreground/20 transition-all text-left group"
                                        >
                                            <div className={`p-2 rounded-lg ${p.bgColor} ${p.color} ring-1 ring-black/5 dark:ring-white/5`}>
                                                <p.icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{p.label}</div>
                                                <div className="text-xs text-muted-foreground truncate opacity-70">"{p.prompt}..."</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((m) => (
                                <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <Avatar className="h-8 w-8 mt-1 border border-border">
                                        {m.role === 'user' ? (
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                                        ) : (
                                            <AvatarFallback className="bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                                <Brain className="w-4 h-4" />
                                            </AvatarFallback>
                                        )}
                                    </Avatar>

                                    <div className={`flex flex-col gap-1 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-foreground">
                                                {m.role === 'user' ? 'You' : 'Study Buddy'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className={`relative group px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                            : 'bg-card border border-border rounded-tl-sm'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{m.content}</p>
                                            {m.role === 'assistant' && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute -right-8 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
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
                                <Avatar className="h-8 w-8 border border-border bg-violet-500/10">
                                    <AvatarFallback><Brain className="w-4 h-4 text-violet-500" /></AvatarFallback>
                                </Avatar>
                                <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-3">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium animate-pulse">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Visual fading for scroll area */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
            </main>

            {/* Input Area */}
            <div className="p-4 border-t border-border/40 bg-background/80 backdrop-blur-md z-20 chat-ui-element">
                <div className="max-w-4xl mx-auto relative bg-muted/50 rounded-xl border border-border/50 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500/50 transition-all">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="min-h-[50px] max-h-[160px] resize-none bg-transparent border-none focus-visible:ring-0 px-4 py-3 pr-12 text-base"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white shadow-md disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 opacity-70">
                        <Terminal className="w-3 h-3" />
                        <span>Ghost Mode active. Chats are not persisted.</span>
                    </p>
                </div>
            </div>

            {/* Exit Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 items-center justify-center flex mb-3">
                            <Ghost className="w-6 h-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center text-xl">Terminate Session?</DialogTitle>
                        <DialogDescription className="text-center">
                            Closing this chat will permanently erase the conversation history using secure deletion.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmExit}>
                            Terminate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default AIStudyBuddy;