"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
    Zap,
    Terminal,
    EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Separator } from '@/components/ui/separator';

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

    const containerRef = useRef(null);

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
    }, [ghostSession, session?.user?.name]);

    // Animations
    useGSAP(() => {
        const tl = gsap.timeline();

        // Set initial states to ensure they are hidden before animation starts
        gsap.set(".animate-header", { autoAlpha: 0, y: -30 });
        gsap.set(".animate-mode-card", { autoAlpha: 0, y: 30 });
        gsap.set(".animate-info-card", { autoAlpha: 0, y: 20 });

        tl.to(".animate-header", {
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: "power3.out"
        })
            .to(".animate-mode-card", {
                y: 0,
                autoAlpha: 1,
                stagger: 0.1,
                duration: 0.8,
                ease: "back.out(1.2)"
            }, "-=0.4")
            .to(".animate-info-card", {
                y: 0,
                autoAlpha: 1,
                stagger: 0.1,
                duration: 0.6,
                ease: "power2.out"
            }, "-=0.4");

    }, { scope: containerRef });

    // Available Ghost Modes
    const ghostModes = [
        {
            id: 'ai-study-buddy',
            title: 'AI Companion',
            subtitle: 'Personalized Study Buddy',
            description: 'Interactive conversations to master complex topics. Ask questions, clarify doubts, and learn at your own pace.',
            icon: Brain,
            color: 'text-violet-500 dark:text-violet-400',
            bgColor: 'bg-violet-500/10 dark:bg-violet-500/20',
            borderColor: 'border-violet-500/20',
            route: '/ghost-mode/study-buddy',
            features: ['Instant Answers', 'Concept Deep Dives', 'Context Aware'],
            comingSoon: false,
            primary: true
        },
        {
            id: 'dream-exam',
            title: 'Dream Exam',
            subtitle: 'Custom Exam Generator',
            description: 'Define your syllabus, difficulty, and format. Our AI architects the perfect practice test just for you.',
            icon: Sparkles,
            color: 'text-amber-500 dark:text-amber-400',
            bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
            borderColor: 'border-amber-500/20',
            route: '/ghost-mode/dream-exam',
            features: ['Tailored Difficulty', 'Specific Topics', 'Instant Review'],
            comingSoon: false,
            primary: true
        },
        {
            id: 'sandbox-lab',
            title: 'Code Sandbox',
            subtitle: 'Safe Experimentation',
            description: 'A completely isolated environment to run unsafe code, test exploits, or try wild architectural ideas.',
            icon: Code,
            color: 'text-blue-500 dark:text-blue-400',
            bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
            borderColor: 'border-blue-500/20',
            route: '/ghost-mode/sandbox',
            features: ['Multi-language', 'Isolated Runtime', 'No Persistence'],
            comingSoon: true,
            primary: false
        },
        {
            id: 'battle-arena',
            title: 'Battle Arena',
            subtitle: 'Anonymous PVP',
            description: 'Enter the colosseum anonymously. Challenge random peers to algorithmic duels where reputation is not at stake.',
            icon: Users,
            color: 'text-rose-500 dark:text-rose-400',
            bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
            borderColor: 'border-rose-500/20',
            route: '/ghost-mode/battle',
            features: ['Live Styling', 'Ephemeral Stats', 'Quick Match'],
            comingSoon: true,
            primary: false
        },
        {
            id: 'skill-tree',
            title: 'Skill Tree',
            subtitle: 'RPG Progression',
            description: 'Visualize your knowledge gaps as an interactive skill tree. Unlock nodes by completing micro-challenges.',
            icon: Target,
            color: 'text-emerald-500 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            borderColor: 'border-emerald-500/20',
            route: '/ghost-mode/skill-tree',
            features: ['Visual Path', 'Dependencies', 'Gamified'],
            comingSoon: true,
            primary: false
        }
    ];

    const handleModeSelect = (mode: any) => {
        if (mode.comingSoon) return;
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
        <div ref={containerRef} className="min-h-screen bg-background relative overflow-hidden font-sans selection:bg-violet-500/30">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)]" />
            </div>

            {/* Header / Nav */}
            <div className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md animate-header">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-600/20">
                            <Ghost className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tracking-tight">Ghost Protocol</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Session Active</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_3s_infinite]"></span>
                                <span className="text-xs font-medium text-foreground">{ghostSession?.nickname}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {ghostSession?.sessionId.slice(-8)}</span>
                        </div>
                        <Button
                            onClick={handleExitGhostMode}
                            variant="destructive"
                            size="sm"
                            className="h-9 px-4 shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Exit Session
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">

                {/* Hero Block */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-6 animate-header">
                    <Badge variant="outline" className="px-4 py-1.5 border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-300 rounded-full text-xs uppercase tracking-wide">
                        <Terminal className="w-3 h-3 mr-2" />
                        Incognito Environment
                    </Badge>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
                        Choose Your <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 animate-gradient-x">Unknown Adventure</span>
                    </h1>

                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Step into a sandbox where rules don't apply. Experiment with wild ideas, generate custom exams, or battle anonymously.
                        <span className="block mt-2 font-medium text-foreground/80"> What happens in Ghost Mode, stays in Ghost Mode.</span>
                    </p>
                </div>

                {/* Primary Modes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                    {ghostModes.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <Card
                                key={mode.id}
                                onClick={() => handleModeSelect(mode)}
                                className={`group relative overflow-hidden border-border bg-card/50 backdrop-blur-sm transition-all duration-300 animate-mode-card hover:shadow-xl hover:-translate-y-1 ${mode.comingSoon ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-violet-500/30 dark:hover:border-violet-400/30"
                                    }`}
                            >
                                {/* Hover Gradient */}
                                {!mode.comingSoon && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                )}

                                <CardHeader className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3.5 rounded-2xl ${mode.bgColor} ${mode.color} ring-1 ring-inset ring-white/10`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        {mode.comingSoon && (
                                            <Badge variant="secondary" className="text-[10px] font-medium opacity-80">Dev Preview</Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl font-bold">{mode.title}</CardTitle>
                                    <CardDescription className="font-medium text-xs uppercase tracking-wider text-muted-foreground">{mode.subtitle}</CardDescription>
                                </CardHeader>

                                <CardContent className="relative z-10 space-y-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {mode.description}
                                    </p>

                                    <Separator className="bg-border/50" />

                                    <div className="space-y-2">
                                        {mode.features.map((feature, idx) => (
                                            <div key={idx} className="flex items-center text-xs font-medium text-muted-foreground/80">
                                                <div className={`w-1 h-1 rounded-full ${mode.color.split(' ')[0].replace('text-', 'bg-')} mr-2.5`} />
                                                {feature}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>

                                <CardFooter className="relative z-10 pt-0">
                                    {!mode.comingSoon && (
                                        <Button className="w-full justify-between group-hover:bg-violet-600 group-hover:text-white transition-all duration-300" variant="secondary">
                                            Initialize
                                            <Play className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>

                {/* Features / Philosophy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
                    <InfoCard
                        icon={EyeOff}
                        title="Zero Persistence"
                        desc="Sessions are ephemeral. Once you exit, all data, logs, and history are cryptographically shredded."
                        color="text-emerald-500"
                        bg="bg-emerald-500/10"
                    />
                    <InfoCard
                        icon={Zap}
                        title="Hyper-Fast Runtime"
                        desc="Optimized for experimentation. Pre-warmed containers ensure your code runs instantly."
                        color="text-amber-500"
                        bg="bg-amber-500/10"
                    />
                    <InfoCard
                        icon={Lightbulb}
                        title="Adaptive AI"
                        desc="The environment learns from your session context to provide relevant hints and resources."
                        color="text-blue-500"
                        bg="bg-blue-500/10"
                    />
                </div>

            </div>

            {/* Exit Warning Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-[400px] gap-6 border-destructive/20">
                    <DialogHeader className="space-y-4">
                        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto ring-4 ring-destructive/5">
                            <Ghost className="w-7 h-7 text-destructive" />
                        </div>
                        <div className="space-y-2 text-center">
                            <DialogTitle className="text-xl">Terminate Session?</DialogTitle>
                            <DialogDescription className="text-base">
                                All session data will be permanently wiped. This action cannot be undone.
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowExitWarning(false)}
                            className="w-full"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmExit}
                            className="w-full shadow-lg shadow-destructive/20"
                        >
                            Confirm Exit
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

const InfoCard = ({ icon: Icon, title, desc, color, bg }: any) => (
    <div className="animate-info-card flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors">
        <div className={`p-3 rounded-xl ${bg} ${color} mb-2`}>
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
);

export default GhostModeLanding;