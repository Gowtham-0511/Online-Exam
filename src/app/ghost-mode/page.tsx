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
    Play,
    Terminal,
    FileText,
    Shield,
    Activity,
    Cpu,
    Network,
    LayoutTemplate,
    SearchCode,
    Flame,
    Zap,
    Globe
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
import { cn } from '@/lib/utils'; // Assuming this utility exists, otherwise standard class strings work

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
            span: 'md:col-span-2', // Bento Full Width
            iconBg: 'bg-violet-500/10'
        },
        {
            id: 'dream-exam',
            title: 'Adaptive Exam Simulator',
            codename: 'Project Dream Forge',
            description: 'Construct advanced evaluation scenarios and edge-case simulations with dynamic complexity scaling.',
            icon: Sparkles,
            color: 'text-amber-500',
            gradient: 'from-amber-500/20 to-orange-500/20',
            border: 'hover:border-amber-500/50',
            route: '/ghost-mode/dream-exam',
            status: 'Operational',
            span: 'md:col-span-1',
            iconBg: 'bg-amber-500/10'
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
            span: 'md:col-span-1',
            iconBg: 'bg-blue-500/10'
        },
        {
            id: 'doc-alchemist',
            title: 'Document Converter',
            codename: 'Project Alchemist',
            description: 'Transmute static documentation into interactive logs, audio streams, and neural flashcards.',
            icon: FileText,
            color: 'text-pink-500',
            gradient: 'from-pink-500/20 to-rose-500/20',
            border: 'hover:border-pink-500/50',
            route: '/ghost-mode/document-alchemist',
            status: 'Active',
            span: 'md:col-span-1',
            iconBg: 'bg-pink-500/10'
        },
        {
            id: 'schema-architect',
            title: 'Schema Modeler',
            codename: 'Project Architect',
            description: 'High-performance schema modeling for Snowflake & Databricks with cost optimization analysis.',
            icon: LayoutTemplate,
            color: 'text-cyan-500',
            gradient: 'from-cyan-500/20 to-sky-500/20',
            border: 'hover:border-cyan-500/50',
            route: '/ghost-mode/schema-architect',
            status: 'Operational',
            span: 'md:col-span-2', // Bento Full Width
            iconBg: 'bg-cyan-500/10'
        },
        {
            id: 'pipeline-pathologist',
            title: 'Pipeline Debugger',
            codename: 'Project Pathologist',
            description: 'Trace data corruption and silent failures in ETL streams.',
            icon: SearchCode,
            color: 'text-orange-500',
            gradient: 'from-orange-500/20 to-red-500/20',
            border: 'hover:border-orange-500/50',
            route: '/ghost-mode/pipeline-pathologist',
            status: 'Operational',
            span: 'md:col-span-1',
            iconBg: 'bg-orange-500/10'
        },
        {
            id: 'battle-arena',
            title: 'Competitive Arena',
            codename: 'Project Shadow',
            description: 'Encrypted colosseum for anonymous algorithmic duels.',
            icon: Flame,
            color: 'text-rose-500',
            gradient: 'from-rose-500/20 to-red-600/20',
            border: 'hover:border-rose-500/50',
            route: '/ghost-mode/battle',
            status: 'Beta',
            span: 'md:col-span-1',
            iconBg: 'bg-rose-500/10'
        },
        {
            id: 'skill-tree',
            title: 'Skill Progression',
            codename: 'Project Node Map',
            description: 'Interactive topography mapping your cognitive expansion.',
            icon: Target,
            color: 'text-emerald-500',
            gradient: 'from-emerald-500/20 to-teal-500/20',
            border: 'hover:border-emerald-500/50',
            route: '/ghost-mode/skill-tree',
            status: 'Dev',
            span: 'md:col-span-1',
            iconBg: 'bg-emerald-500/10'
        }
    ];

    useGSAP(() => {
        const tl = gsap.timeline();

        tl.fromTo(".header-element",
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }
        );

        tl.fromTo(".bento-card",
            { opacity: 0, y: 30, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
            "-=0.4"
        );
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="min-h-screen w-full bg-background text-foreground flex flex-col transition-colors duration-500 selection:bg-primary/20">
            {/* Dynamic Background Pattern */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
            </div>

            {/* Modern Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 header-element">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                            <Ghost className="h-4 w-4" />
                        </div>
                        <span className="font-bold tracking-tight text-lg">Sysrank<span className="opacity-40 font-normal">.Ghost</span></span>
                    </div>

                    <div className="flex items-center gap-3 header-element">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                                {ghostSession?.sessionId}
                            </span>
                        </div>
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowExitWarning(true)}
                            className="text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            Exit
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-6 py-12 relative z-10">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center mb-16 space-y-6">
                    <div className="header-element inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold tracking-widest uppercase">
                        <Sparkles className="w-3 h-3" />
                        Ghost Protocol v4.0
                    </div>

                    <h1 className="header-element text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 leading-[1.1]">
                        Select Your Interface
                    </h1>

                    <p className="header-element text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Access advanced neural tools for deep learning, architectural modeling, and competitive diagnostics.
                    </p>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]">
                    {ghostModes.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <div
                                key={mode.id}
                                onClick={() => router.push(mode.route)}
                                className={cn(
                                    "group relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-md cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:border-zinc-300 dark:hover:border-zinc-700",
                                    mode.span
                                )}
                            >
                                {/* 1. Hover Gradient Background */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-gradient-to-br ${mode.gradient}`} />

                                {/* 2. Large Watermark Icon (Decorative) */}
                                <Icon className={`absolute -bottom-8 -right-8 w-48 h-48 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 -rotate-12 ${mode.color}`} />

                                <div className="relative z-10 h-full flex flex-col p-6">
                                    {/* Header: Icon + Status */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-3.5 rounded-2xl ${mode.iconBg} ${mode.color} ring-1 ring-inset ring-black/5 dark:ring-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                                            <Icon className="w-7 h-7" />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {mode.status === 'Beta' && (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                                                    Beta
                                                </span>
                                            )}
                                            <div className={`w-1.5 h-1.5 rounded-full ${mode.status === 'Operational' || mode.status === 'Active' || mode.status === 'Core' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <div className="flex-1">
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-zinc-900 group-hover:to-zinc-600 dark:group-hover:from-white dark:group-hover:to-zinc-400 transition-all">
                                            {mode.title}
                                        </h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-[90%]">
                                            {mode.description}
                                        </p>
                                    </div>

                                    {/* Footer: Tech Pattern + Arrow */}
                                    <div className="mt-8 flex items-end justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-widest">
                                                ID_Ref
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                                                {mode.codename.split(' ')[1] || 'MOD_01'}
                                            </span>
                                        </div>

                                        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${mode.color} opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300`}>
                                            Initialize
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Minimal Footer */}
            <footer className="py-8 border-t border-border/40 mt-12 bg-background/50 backdrop-blur-md">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            SYSTEM OPTIMAL
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3" />
                            US-EAST-1
                        </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-50">
                        <Shield className="w-3 h-3" />
                        <span>ENCRYPTED SESSION // {session?.name || 'GUEST'}</span>
                    </div>
                </div>
            </footer>

            {/* Exit Warning Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disconnect from Interface?</DialogTitle>
                        <DialogDescription>
                            Your active neural session will be terminated. All local logs will be purged.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => router.push('/attender')}>
                            Disconnect
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GhostModeLanding;
