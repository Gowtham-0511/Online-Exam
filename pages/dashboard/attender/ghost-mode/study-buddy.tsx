import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
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
    MessageSquare,
    Loader2,
    RotateCcw,
    Copy,
    Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
            color: "from-chart-1 to-chart-2"
        },
        {
            icon: Code,
            label: "Debug My Code",
            prompt: "Help me debug this code: ",
            color: "from-chart-3 to-chart-4"
        },
        {
            icon: BookOpen,
            label: "Practice Problems",
            prompt: "Give me practice problems on ",
            color: "from-primary to-accent"
        },
        {
            icon: Brain,
            label: "Quiz Me",
            prompt: "Quiz me on ",
            color: "from-chart-5 to-secondary"
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
        router.push('/dashboard/attender/ghost-mode');
    };

    return (
        <>
            <Head>
                <title>AI Study Buddy - Ghost Mode</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background flex flex-col">
                {/* Header */}
                <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                    <Brain className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">
                                        AI Study Buddy
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        Your personal learning companion
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleReset}
                                    variant="outline"
                                    size="sm"
                                    disabled={messages.length === 0}
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset Chat
                                </Button>
                                <Button
                                    onClick={() => setShowExitWarning(true)}
                                    variant="outline"
                                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Exit
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning Banner */}
                <Alert className="rounded-none border-x-0 border-t-0 bg-primary/10">
                    <Ghost className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-primary font-medium">
                        🔒 Ghost Mode: This conversation won't be saved
                    </AlertDescription>
                </Alert>

                {/* Main Content */}
                <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col">
                    {/* Chat Area */}
                    <Card className="flex-1 flex flex-col">
                        <CardContent className="flex-1 flex flex-col p-0">
                            {/* Messages */}
                            <ScrollArea
                                ref={scrollRef}
                                className="flex-1 p-6"
                            >
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                            <Sparkles className="w-10 h-10 text-primary-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-foreground mb-2">
                                                Ready to Learn Together?
                                            </h3>
                                            <p className="text-muted-foreground max-w-md">
                                                Ask me anything! I can explain concepts, debug code, create practice problems,
                                                or quiz you on any topic.
                                            </p>
                                        </div>

                                        {/* Quick Prompts */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
                                            {quickPrompts.map((prompt, idx) => {
                                                const Icon = prompt.icon;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleQuickPrompt(prompt.prompt)}
                                                        className="group p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${prompt.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                                                            <Icon className="w-5 h-5 text-primary-foreground" />
                                                        </div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {prompt.label}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    {/* Avatar */}
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                                                            ? 'bg-secondary'
                                                            : 'bg-gradient-to-br from-primary to-accent'
                                                        }`}>
                                                        {message.role === 'user' ? (
                                                            <span className="text-xs font-bold text-secondary-foreground">
                                                                {session?.user?.name?.[0] || 'U'}
                                                            </span>
                                                        ) : (
                                                            <Brain className="w-4 h-4 text-primary-foreground" />
                                                        )}
                                                    </div>

                                                    {/* Message Content */}
                                                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                        <div className={`rounded-2xl px-4 py-3 ${message.role === 'user'
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted'
                                                            }`}>
                                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                                {message.content}
                                                            </p>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-muted-foreground">
                                                                {message.timestamp.toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                            {message.role === 'assistant' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2"
                                                                    onClick={() => handleCopy(message.content, message.id)}
                                                                >
                                                                    {copiedId === message.id ? (
                                                                        <Check className="w-3 h-3 text-primary" />
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
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                                        <Brain className="w-4 h-4 text-primary-foreground" />
                                                    </div>
                                                    <div className="bg-muted rounded-2xl px-4 py-3">
                                                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="border-t border-border p-4">
                                <div className="flex gap-2">
                                    <Textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ask me anything... (Shift+Enter for new line)"
                                        className="min-h-[60px] max-h-[200px] resize-none"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!input.trim() || isLoading}
                                        className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                                        size="icon"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Press Enter to send, Shift+Enter for new line
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Exit Warning Dialog */}
                <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <Ghost className="w-8 h-8 text-destructive" />
                            </div>
                            <DialogTitle className="text-center text-2xl">Exit Study Buddy?</DialogTitle>
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