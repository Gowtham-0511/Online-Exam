"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import { useTheme } from "next-themes";
import {
    Ghost,
    Brain,
    Sparkles,
    Code,
    Target,
    ArrowRight,
    FileText,
    Shield,
    LayoutTemplate,
    SearchCode,
    Flame,
    Globe,
    Zap,
    Cpu,
    Network,
    Activity,
    Lock,
    Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ThemeToggle from '@/components/ThemeToggle';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

// Ghost Mode Session Type
interface GhostSession {
    sessionId: string;
    startTime: Date;
    nickname: string;
    activeMode: string | null;
}

const GhostModeLanding = () => {
    const router = useRouter();
    const { accounts } = useMsal();
    const { theme } = useTheme();
    const session = accounts[0];
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [ghostSession, setGhostSession] = useState<GhostSession | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize ghost session
    useEffect(() => {
        if (!ghostSession) {
            setGhostSession({
                sessionId: `GS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                startTime: new Date(),
                nickname: session?.name || 'Operator',
                activeMode: null
            });
        }
    }, [ghostSession, session?.name]);

    const ghostModes = [
        {
            id: 'ai-study-buddy',
            title: 'AI Research Assistant',
            codename: 'Project Synapse',
            description: 'Adaptive neural entity for synthesizing complex information. Optimized for real-time context ingestion.',
            icon: Brain,
            color: 'text-violet-500',
            gradient: 'from-violet-500/20 to-indigo-500/20',
            border: 'hover:border-violet-500/50',
            route: '/ghost-mode/study-buddy',
            status: 'Operational',
            span: 'md:col-span-2 lg:col-span-2',
            iconBg: 'bg-violet-500/10',
            tag: 'Neural'
        },
        {
            id: 'dream-exam',
            title: 'Adaptive Exam Simulator',
            codename: 'Project Dream Forge',
            description: 'Construct advanced evaluation scenarios and edge-case simulations with dynamic complexity scaling.',
            icon: Sparkles,
            color: 'text-orange-500',
            gradient: 'from-orange-500/20 to-amber-500/20',
            border: 'hover:border-orange-500/50',
            route: '/ghost-mode/dream-exam',
            status: 'Operational',
            span: 'md:col-span-1 lg:col-span-1',
            iconBg: 'bg-orange-500/10',
            tag: 'Simulation'
        },
        {
            id: 'sandbox-lab',
            title: 'Secure Sandbox',
            codename: 'Project Void',
            description: 'Safe execution environment for untrusted code with complete cryptographic isolation.',
            icon: Code,
            color: 'text-blue-500',
            gradient: 'from-blue-500/20 to-cyan-500/20',
            border: 'hover:border-blue-500/50',
            route: '/ghost-mode/sandbox',
            status: 'Core',
            span: 'md:col-span-1 lg:col-span-1',
            iconBg: 'bg-blue-500/10',
            tag: 'Security'
        },
        {
            id: 'doc-alchemist',
            title: 'Document Alchemist',
            codename: 'Project Alchemist',
            description: 'Transmute static documentation into interactive logs, audio streams, and neural flashcards.',
            icon: FileText,
            color: 'text-pink-500',
            gradient: 'from-pink-500/20 to-rose-500/20',
            border: 'hover:border-pink-500/50',
            route: '/ghost-mode/document-alchemist',
            status: 'Active',
            span: 'md:col-span-1 lg:col-span-1',
            iconBg: 'bg-pink-500/10',
            tag: 'Synthesis'
        },
        {
            id: 'schema-architect',
            title: 'Schema Architect',
            codename: 'Project Architect',
            description: 'High-performance schema modeling for Snowflake & Databricks with cost optimization analysis.',
            icon: LayoutTemplate,
            color: 'text-cyan-500',
            gradient: 'from-cyan-500/20 to-sky-500/20',
            border: 'hover:border-cyan-500/50',
            route: '/ghost-mode/schema-architect',
            status: 'Operational',
            span: 'md:col-span-2 lg:col-span-2',
            iconBg: 'bg-cyan-500/10',
            tag: 'Architecture'
        },
        {
            id: 'pipeline-pathologist',
            title: 'Pipeline Pathologist',
            codename: 'Project Pathologist',
            description: 'Trace data corruption and silent failures in ETL streams with deep-packet inspection.',
            icon: SearchCode,
            color: 'text-amber-500',
            gradient: 'from-amber-500/20 to-yellow-500/20',
            border: 'hover:border-amber-500/50',
            route: '/ghost-mode/pipeline-pathologist',
            status: 'Operational',
            span: 'md:col-span-1 lg:col-span-1',
            iconBg: 'bg-amber-500/10',
            tag: 'Diagnostics'
        },
        {
            id: 'battle-arena',
            title: 'Competitive Arena',
            codename: 'Project Shadow',
            description: 'Encrypted colosseum for anonymous algorithmic duels and high-stakes coding battles.',
            icon: Flame,
            color: 'text-rose-500',
            gradient: 'from-rose-500/20 to-red-600/20',
            border: 'hover:border-rose-500/50',
            route: '/ghost-mode/battle',
            status: 'Beta',
            span: 'md:col-span-1 lg:col-span-1',
            iconBg: 'bg-rose-500/10',
            tag: 'Combat'
        },
        {
            id: 'skill-tree',
            title: 'Skill Progression',
            codename: 'Project Node Map',
            description: 'Interactive topography mapping your cognitive expansion and technical mastery.',
            icon: Target,
            color: 'text-emerald-500',
            gradient: 'from-emerald-500/20 to-teal-500/20',
            border: 'hover:border-emerald-500/50',
            route: '/ghost-mode/skill-tree',
            status: 'Dev',
            span: 'md:col-span-1 lg:col-span-1',
            iconBg: 'bg-emerald-500/10',
            tag: 'Evolution'
        }
    ];

    useGSAP(() => {
        const tl = gsap.timeline();

        tl.fromTo(".header-element",
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );

        tl.fromTo(".hero-element",
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" },
            "-=0.4"
        );

        tl.fromTo(".bento-card",
            { opacity: 0, scale: 0.95, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" },
            "-=0.6"
        );

        // Floating animation for background elements
        gsap.to(".float-element", {
            y: "random(-20, 20)",
            x: "random(-20, 20)",
            duration: "random(3, 5)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: 0.2
        });
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="min-h-screen w-full bg-background text-foreground flex flex-col transition-colors duration-500 selection:bg-primary/20 overflow-x-hidden">
            {/* Advanced Background System */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.05),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                {/* Decorative Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] float-element opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] float-element opacity-50" />
            </div>

            {/* Premium Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3 header-element">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <Ghost className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-tight text-sm leading-none">Sysrank<span className="text-primary">.Ghost</span></span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Neural Interface</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 header-element">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                                {ghostSession?.sessionId}
                            </span>
                        </div>
                        <ThemeToggle />
                        <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowExitWarning(true)}
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                            Disconnect
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-12 relative z-10">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center mb-20 space-y-6">
                    <div className="hero-element inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black tracking-[0.2em] uppercase shadow-sm">
                        <Activity className="w-3 h-3 animate-pulse" />
                        Ghost Protocol v4.0 // System Active
                    </div>

                    <h1 className="hero-element text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] pb-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                            Select Your
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-violet-500 to-primary bg-[size:200%_auto] animate-gradient">
                            Interface
                        </span>
                    </h1>

                    <p className="hero-element text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                        Access advanced neural tools for deep learning, architectural modeling, and competitive diagnostics. Your session is encrypted and isolated.
                    </p>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[minmax(200px,auto)]">
                    {ghostModes.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <div
                                key={mode.id}
                                onClick={() => router.push(mode.route)}
                                className={cn(
                                    "bento-card group relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/30 backdrop-blur-md cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/30",
                                    mode.span
                                )}
                            >
                                {/* Hover Gradient Background */}
                                <div className={cn(
                                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br",
                                    mode.gradient
                                )} />

                                {/* Large Watermark Icon */}
                                <Icon className={cn(
                                    "absolute -bottom-10 -right-10 w-48 h-48 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-700 -rotate-12 group-hover:rotate-0 group-hover:scale-110",
                                    mode.color
                                )} />

                                <div className="relative z-10 h-full flex flex-col p-8">
                                    {/* Header: Icon + Status */}
                                    <div className="flex justify-between items-start mb-8">
                                        <div className={cn(
                                            "p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                                            mode.iconBg,
                                            mode.color,
                                            "ring-1 ring-inset ring-black/5 dark:ring-white/10"
                                        )}>
                                            <Icon className="w-6 h-6" />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest py-0.5 border-border/50">
                                                {mode.tag}
                                            </Badge>
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                mode.status === 'Operational' || mode.status === 'Active' || mode.status === 'Core'
                                                    ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                                    : 'bg-zinc-500'
                                            )} />
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <div className="flex-1 space-y-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">
                                                {mode.codename}
                                            </span>
                                            <h3 className="text-2xl font-bold tracking-tight text-foreground transition-all group-hover:text-primary">
                                                {mode.title}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[90%] group-hover:text-foreground/80 transition-colors">
                                            {mode.description}
                                        </p>
                                    </div>

                                    {/* Footer: Tech Pattern + Arrow */}
                                    <div className="mt-8 flex items-end justify-between border-t border-border/40 pt-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className="w-3 h-[2px] bg-border rounded-full group-hover:bg-primary/30 transition-colors" />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-mono font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                Secure_Link_Established
                                            </span>
                                        </div>

                                        <div className={cn(
                                            "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500",
                                            mode.color
                                        )}>
                                            Initialize
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Minimal Footer */}
            <footer className="py-10 border-t border-border/40 mt-20 bg-background/30 backdrop-blur-xl">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-muted-foreground font-mono font-bold tracking-widest uppercase">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            SYSTEM_OPTIMAL
                        </div>
                        <div className="flex items-center gap-3">
                            <Globe className="w-3.5 h-3.5" />
                            US-EAST-1_NODE
                        </div>
                        <div className="flex items-center gap-3">
                            <Lock className="w-3.5 h-3.5" />
                            AES-256_ENCRYPTED
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-muted/30 border border-border/50">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        <span>OPERATOR: {session?.name?.split(' ')[0] || 'GUEST'} // AUTH_LEVEL_4</span>
                    </div>
                </div>
            </footer>

            {/* Exit Warning Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-border/40 bg-background/80 backdrop-blur-2xl">
                    <DialogHeader className="space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
                            <Shield className="w-6 h-6 text-destructive" />
                        </div>
                        <div className="text-center space-y-2">
                            <DialogTitle className="text-2xl font-bold tracking-tight">Disconnect Session?</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-muted-foreground">
                                Your active neural session will be terminated. All local logs will be purged and the secure link will be severed.
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setShowExitWarning(false)}
                            className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 px-8"
                        >
                            Stay Connected
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => router.push('/attender')}
                            className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-destructive/20"
                        >
                            Sever Link
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 4s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default GhostModeLanding;
