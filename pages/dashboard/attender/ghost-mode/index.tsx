import React, { useState } from 'react';
import { useRouter } from 'next/router';
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
    Star,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    const [selectedMode, setSelectedMode] = useState<any>(null);
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
            color: 'from-primary to-accent',
            route: '/dashboard/attender/ghost-mode/study-buddy',
            features: [
                'Real-time doubt clearing',
                'Concept explanations with examples',
                'Interactive Q&A sessions',
                'Learn by teaching AI back'
            ],
            comingSoon: false
        },
        {
            id: 'dream-exam',
            title: 'Dream Exam Builder',
            subtitle: 'Create custom exams with AI',
            description: 'Tell AI what you want to learn, and it generates perfect practice exams. Customize difficulty, topics, and question types.',
            icon: Sparkles,
            color: 'from-chart-1 to-chart-2',
            route: '/dashboard/attender/ghost-mode/dream-exam',
            features: [
                'AI-generated questions',
                'Custom difficulty levels',
                'Mixed question types (MCQ + Coding)',
                'Instant feedback & solutions'
            ],
            comingSoon: false
        },
        {
            id: 'sandbox-lab',
            title: 'Coding Sandbox',
            subtitle: 'Experiment without limits',
            description: 'A safe playground to experiment with code. Try wild ideas, break things, and learn from mistakes without any consequences.',
            icon: Code,
            color: 'from-chart-3 to-chart-4',
            route: '/dashboard/attender/ghost-mode/sandbox',
            features: [
                'Multi-language support',
                'AI debugging assistant',
                'Code review on demand',
                'No consequences, pure learning'
            ],
            comingSoon: true
        },
        {
            id: 'battle-arena',
            title: 'Battle Arena',
            subtitle: 'Compete with peers anonymously',
            description: 'Challenge friends or random opponents in timed coding battles. Win rounds, earn temporary badges, but nothing saves!',
            icon: Users,
            color: 'from-destructive/80 to-destructive',
            route: '/dashboard/attender/ghost-mode/battle',
            features: [
                'Real-time coding duels',
                'Anonymous matchmaking',
                'Live leaderboard (session only)',
                'Practice competition skills'
            ],
            comingSoon: true
        },
        {
            id: 'skill-tree',
            title: 'Skill Tree Explorer',
            subtitle: 'Visual learning progression',
            description: 'See your learning journey as an RPG-style skill tree. Complete challenges to unlock new topics and abilities.',
            icon: Target,
            color: 'from-chart-5 to-secondary',
            route: '/dashboard/attender/ghost-mode/skill-tree',
            features: [
                'Visual skill dependencies',
                'Unlock advanced topics',
                'Achievement milestones',
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
        router.push('/dashboard/attender');
    };

    return (
        <>
            <Head>
                <title>Ghost Mode - SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                    <Ghost className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">
                                        Ghost Mode
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        {ghostSession?.nickname} • Session: {ghostSession?.sessionId.slice(-6)}
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleExitGhostMode}
                                variant="outline"
                                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Exit Ghost Mode
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Warning Banner */}
                <Alert className="rounded-none border-x-0 border-t-0 bg-gradient-to-r from-primary to-accent">
                    <AlertCircle className="h-4 w-4 text-primary-foreground" />
                    <AlertDescription className="text-primary-foreground font-medium">
                        🔒 Private Mode Active: Nothing you do here will be saved to your account
                    </AlertDescription>
                </Alert>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-6 py-12">
                    {/* Hero Section */}
                    <div className="text-center mb-12">
                        <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                            <Sparkles className="w-4 h-4 mr-2" />
                            No Pressure • No Records • Pure Learning
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Choose Your Learning
                            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                Adventure
                            </span>
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Each mode offers a unique way to learn and practice. Everything is temporary -
                            experiment freely, make mistakes, and grow without fear!
                        </p>
                    </div>

                    {/* Modes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {ghostModes.map((mode) => {
                            const Icon = mode.icon;
                            return (
                                <Card
                                    key={mode.id}
                                    className={`group relative overflow-hidden transition-all duration-300 ${mode.comingSoon
                                            ? 'opacity-60 cursor-not-allowed'
                                            : 'hover:shadow-2xl hover:shadow-primary/20 cursor-pointer hover:border-primary/50'
                                        }`}
                                    onClick={() => handleModeSelect(mode)}
                                >
                                    {mode.comingSoon && (
                                        <Badge className="absolute top-4 right-4 z-10 bg-chart-1 text-primary-foreground">
                                            Coming Soon
                                        </Badge>
                                    )}

                                    <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 ${!mode.comingSoon && 'group-hover:opacity-10'} transition-opacity duration-300`} />

                                    <CardHeader className="relative">
                                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 ${!mode.comingSoon && 'group-hover:scale-110'} transition-transform duration-300`}>
                                            <Icon className="w-7 h-7 text-primary-foreground" />
                                        </div>

                                        <CardTitle className="text-xl">{mode.title}</CardTitle>
                                        <CardDescription>{mode.subtitle}</CardDescription>
                                    </CardHeader>

                                    <CardContent className="relative">
                                        <div className="space-y-2 mb-4">
                                            {mode.features.slice(0, 3).map((feature, idx) => (
                                                <div key={idx} className="flex items-center text-xs text-muted-foreground">
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${mode.color} mr-2`} />
                                                    {feature}
                                                </div>
                                            ))}
                                        </div>

                                        {!mode.comingSoon && (
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleModeSelect(mode);
                                                }}
                                                className={`w-full bg-gradient-to-r ${mode.color} text-primary-foreground hover:opacity-90`}
                                            >
                                                <Play className="w-4 h-4 mr-2" />
                                                Start Mode
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center mb-4">
                                    <Lightbulb className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <CardTitle className="text-lg">Learn Your Way</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Choose the learning style that fits your mood. Visual, narrative, competitive, or collaborative!
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center mb-4">
                                    <Trophy className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <CardTitle className="text-lg">Zero Pressure</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Bad score? Who cares! It disappears when you leave. Focus on learning, not performance anxiety.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                                    <Star className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <CardTitle className="text-lg">AI-Powered</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Every mode uses AI to personalize content, provide feedback, and adapt to your level in real-time.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Exit Warning Dialog */}
                <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <Ghost className="w-8 h-8 text-destructive" />
                            </div>
                            <DialogTitle className="text-center text-2xl">Leave Ghost Mode?</DialogTitle>
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
        </>
    );
};

export default GhostModeLanding;