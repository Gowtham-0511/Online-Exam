"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
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
    Shield
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Quick prompts for easy access
    const quickPrompts: QuickPrompt[] = [
        {
            icon: Lightbulb,
            label: "Explain a Concept",
            prompt: "Can you explain the concept of ",
            color: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-50 dark:bg-amber-900/20"
        },
        {
            icon: Code,
            label: "Debug My Code",
            prompt: "Help me debug this code: ",
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            icon: BookOpen,
            label: "Practice Problems",
            prompt: "Give me practice problems on ",
            color: "text-violet-600 dark:text-violet-400",
            bgColor: "bg-violet-50 dark:bg-violet-900/20"
        },
        {
            icon: Brain,
            label: "Quiz Me",
            prompt: "Quiz me on ",
            color: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20"
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
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const confirmExit = () => {
        router.push('/ghost-mode');
    };

    return (
        <>
            <Head>
                <title>AI Study Buddy - Ghost Mode</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-semibold text-foreground">
                                        AI Study Buddy
                                    </h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleReset}
                                    variant="ghost"
                                    size="sm"
                                    disabled={messages.length === 0}
                                    className="text-muted-foreground hover:text-primary"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset
                                </Button>
                                <Button
                                    onClick={() => setShowExitWarning(true)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Exit
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning Banner */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 px-4 py-2">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Ghost Mode Active:</span>
                        <span>This conversation will not be saved.</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col">
                    {/* Chat Area */}
                    <Card className="flex-1 flex flex-col border-border/50 shadow-sm overflow-hidden bg-card">
                        <CardContent className="flex-1 flex flex-col p-0">
                            {/* Messages */}
                            <ScrollArea
                                ref={scrollRef}
                                className="flex-1 p-6"
                            >
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-12">
                                        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div className="max-w-md space-y-2">
                                            <h3 className="text-xl font-semibold text-foreground">
                                                How can I help you learn today?
                                            </h3>
                                            <p className="text-muted-foreground">
                                                I can explain complex topics, debug your code, create practice problems,
                                                or quiz you on any subject.
                                            </p>
                                        </div>

                                        {/* Quick Prompts */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                                            {quickPrompts.map((prompt, idx) => {
                                                const Icon = prompt.icon;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleQuickPrompt(prompt.prompt)}
                                                        className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left group"
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg ${prompt.bgColor} ${prompt.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                                                {prompt.label}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                                "{prompt.prompt}..."
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    {/* Avatar */}
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${message.role === 'user'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                                                        }`}>
                                                        {message.role === 'user' ? (
                                                            <span className="text-xs font-bold">
                                                                {session?.user?.name?.[0] || 'U'}
                                                            </span>
                                                        ) : (
                                                            <Brain className="w-4 h-4" />
                                                        )}
                                                    </div>

                                                    {/* Message Content */}
                                                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                        <div className={`rounded-2xl px-5 py-3.5 shadow-sm ${message.role === 'user'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-muted/50 border border-border/50'
                                                            }`}>
                                                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                                                {message.content}
                                                            </p>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 mt-1 px-1">
                                                            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">
                                                                {message.timestamp.toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                            {message.role === 'assistant' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => handleCopy(message.content, message.id)}
                                                                >
                                                                    {copiedId === message.id ? (
                                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                                    ) : (
                                                                        <Copy className="w-3 h-3" />
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Loading indicator */}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center mt-1">
                                                        <Brain className="w-4 h-4" />
                                                    </div>
                                                    <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                        <span className="text-xs text-muted-foreground">Thinking...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="border-t border-border/50 p-4 bg-background/50 backdrop-blur-sm">
                                <div className="relative flex gap-2 max-w-4xl mx-auto">
                                    <Textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Ask anything... (Shift+Enter for new line)"
                                        className="min-h-[50px] max-h-[200px] resize-none pr-12 py-3 bg-background border-border/60 focus-visible:ring-primary/20"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!input.trim() || isLoading}
                                        className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-lg"
                                        size="sm"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-center text-muted-foreground mt-2">
                                    AI can make mistakes. Verify important information.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Exit Warning Dialog */}
                <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <Ghost className="w-6 h-6 text-destructive" />
                            </div>
                            <DialogTitle className="text-center">Exit Study Buddy?</DialogTitle>
                            <DialogDescription className="text-center">
                                Your entire conversation will be permanently deleted.
                                This cannot be undone!
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowExitWarning(false)}
                                className="flex-1"
                            >
                                Keep Chatting
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmExit}
                                className="flex-1"
                            >
                                Yes, Exit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
};

export default AIStudyBuddy;