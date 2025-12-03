"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import {
    Ghost,
    Brain,
    Sparkles,
    Code,
    Users,
    Target,
    ArrowLeft,
    Play,
    Lightbulb,
    Trophy,
    Shield,
    Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Ghost Mode Session Type
interface GhostSession {
    sessionId: string;
    startTime: Date;
    nickname: string;
    activeMode: string | null;
}

const GhostModeLanding = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [ghostSession, setGhostSession] = useState<GhostSession | null>(null);

    // Initialize ghost session on mount
    React.useEffect(() => {
        if (!ghostSession) {
            setGhostSession({
                sessionId: `ghost_${Date.now()}`,
                startTime: new Date(),
                nickname: session?.user?.name || 'Ghost User',
                activeMode: null
            });
        }
    }, []);

    // Available Ghost Modes
    const ghostModes = [
        {
            id: 'ai-study-buddy',
            title: 'AI Study Buddy',
            subtitle: 'Your personal learning companion',
            description: 'Chat with AI as you study. Ask questions, get instant explanations, and learn concepts through interactive conversations.',
            icon: Brain,
            color: 'text-violet-500',
            bgColor: 'bg-violet-500/10',
            route: '/ghost-mode/study-buddy',
            features: [
                'Real-time doubt clearing',
                'Concept explanations',
                'Interactive Q&A'
            ],
            comingSoon: false
        },
        {
            id: 'dream-exam',
            title: 'Dream Exam Builder',
            subtitle: 'Create custom exams with AI',
            description: 'Tell AI what you want to learn, and it generates perfect practice exams. Customize difficulty, topics, and question types.',
            icon: Sparkles,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            route: '/ghost-mode/dream-exam',
            features: [
                'AI-generated questions',
                'Custom difficulty',
                'Instant feedback'
            ],
            comingSoon: false
        },
        {
            id: 'sandbox-lab',
            title: 'Coding Sandbox',
            subtitle: 'Experiment without limits',
            description: 'A safe playground to experiment with code. Try wild ideas, break things, and learn from mistakes without any consequences.',
            icon: Code,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            route: '/ghost-mode/sandbox',
            features: [
                'Multi-language support',
                'AI debugging assistant',
                'No consequences'
            ],
            comingSoon: true
        },
        {
            id: 'battle-arena',
            title: 'Battle Arena',
            subtitle: 'Compete with peers anonymously',
            description: 'Challenge friends or random opponents in timed coding battles. Win rounds, earn temporary badges, but nothing saves!',
            icon: Users,
            color: 'text-rose-500',
            bgColor: 'bg-rose-500/10',
            route: '/ghost-mode/battle',
            features: [
                'Real-time coding duels',
                'Anonymous matchmaking',
                'Live leaderboard'
            ],
            comingSoon: true
        },
        {
            id: 'skill-tree',
            title: 'Skill Tree Explorer',
            subtitle: 'Visual learning progression',
            description: 'See your learning journey as an RPG-style skill tree. Complete challenges to unlock new topics and abilities.',
            icon: Target,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            route: '/ghost-mode/skill-tree',
            features: [
                'Visual skill dependencies',
                'Unlock advanced topics',
                'Gamified progression'
            ],
            comingSoon: true
        }
    ];

    const handleModeSelect = (mode: any) => {
        if (mode.comingSoon) {
            return;
        }
        router.push(mode.route);
    };

    const handleExitGhostMode = () => {
        setShowExitWarning(true);
    };

    const confirmExit = () => {
        setGhostSession(null);
        router.push('/attender');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900">
                                <Ghost className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">
                                    Ghost Mode
                                </h1>
                            </div>
                            <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Session Active
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-medium text-foreground">{ghostSession?.nickname}</p>
                                <p className="text-xs text-muted-foreground font-mono">ID: {ghostSession?.sessionId.slice(-6)}</p>
                            </div>
                            <Button
                                onClick={handleExitGhostMode}
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
                    <span className="font-medium">Incognito Session:</span>
                    <span>Activity in Ghost Mode is not saved to your permanent profile.</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section */}
                <div className="text-center mb-16 space-y-4">
                    <Badge variant="secondary" className="mb-2">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Experimental Features
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        Choose Your Learning Adventure
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Experiment freely, make mistakes, and grow without fear.
                        Select a mode to start your private session.
                    </p>
                </div>

                {/* Modes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {ghostModes.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <Card
                                key={mode.id}
                                className={`group relative transition-all duration-200 border-border/50 ${mode.comingSoon
                                    ? 'opacity-60'
                                    : 'hover:shadow-md hover:border-primary/20 cursor-pointer bg-card'
                                    }`}
                                onClick={() => handleModeSelect(mode)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className={`p-3 rounded-xl ${mode.bgColor} ${mode.color} ring-1 ring-inset ring-black/5`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        {mode.comingSoon && (
                                            <Badge variant="outline" className="text-xs font-normal">
                                                Coming Soon
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl">{mode.title}</CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {mode.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <div className="space-y-3 mb-6">
                                        {mode.features.slice(0, 3).map((feature, idx) => (
                                            <div key={idx} className="flex items-center text-xs text-muted-foreground">
                                                <div className={`w-1.5 h-1.5 rounded-full ${mode.bgColor.replace('/10', '')} mr-2`} />
                                                {feature}
                                            </div>
                                        ))}
                                    </div>

                                    {!mode.comingSoon && (
                                        <Button
                                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                            variant="secondary"
                                        >
                                            Enter Mode
                                            <Play className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-transparent border-none shadow-none">
                        <CardHeader className="px-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <CardTitle className="text-base">Learn Your Way</CardTitle>
                            <CardDescription>
                                Choose the learning style that fits your mood. Visual, narrative, competitive, or collaborative!
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="bg-transparent border-none shadow-none">
                        <CardHeader className="px-0">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3 text-amber-600 dark:text-amber-400">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <CardTitle className="text-base">Zero Pressure</CardTitle>
                            <CardDescription>
                                Bad score? Who cares! It disappears when you leave. Focus on learning, not performance anxiety.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="bg-transparent border-none shadow-none">
                        <CardHeader className="px-0">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3 text-purple-600 dark:text-purple-400">
                                <Zap className="w-5 h-5" />
                            </div>
                            <CardTitle className="text-base">AI-Powered</CardTitle>
                            <CardDescription>
                                Every mode uses AI to personalize content, provide feedback, and adapt to your level in real-time.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>

            {/* Exit Warning Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                            <Ghost className="w-6 h-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center">Leave Ghost Mode?</DialogTitle>
                        <DialogDescription className="text-center">
                            All your progress, custom exams, and learning data in Ghost Mode will be permanently deleted.
                            This cannot be undone!
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowExitWarning(false)}
                            className="flex-1"
                        >
                            Stay in Ghost Mode
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
    );
};

export default GhostModeLanding;