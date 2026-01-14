"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
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
    Zap,
    Terminal,
    EyeOff,
    FileText,
    Shield,
    Activity,
    Lock,
    Cpu,
    Network,
    ChevronRight,
    Command,
    LayoutTemplate,
    SearchCode,
    Flame
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
    const session = accounts[0];
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [ghostSession, setGhostSession] = useState<GhostSession | null>(null);
    const [activeModeIndex, setActiveModeIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

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
            title: 'Synapse',
            subtitle: 'AI Research Partner',
            description: 'Adaptive neural entity for synthesizing complex information. Optimized for real-time context ingestion and architectural breakdown.',
            icon: Brain,
            color: 'from-violet-500 to-indigo-600',
            glow: 'rgba(139, 92, 246, 0.4)',
            route: '/ghost-mode/study-buddy',
            features: ['Neural Context', 'Real-time Synthesis', 'Cross-Domain Logic'],
            status: 'Operational'
        },
        {
            id: 'dream-exam',
            title: 'Dream Forge',
            subtitle: 'Challenge Architect',
            description: 'Construct advanced evaluation scenarios and edge-case simulations. Define complexity spikes and synthetic stress tests.',
            icon: Sparkles,
            color: 'from-amber-400 to-orange-600',
            glow: 'rgba(245, 158, 11, 0.4)',
            route: '/ghost-mode/dream-exam',
            features: ['Dynamic Scaling', 'Edge-Case Gen', 'Stress Simulation'],
            status: 'Operational'
        },
        {
            id: 'doc-alchemist',
            title: 'Alchemist',
            subtitle: 'Data Transmutation',
            description: 'Transmute static documentation into interactive logs. Convert PDFs into audio streams and smart neural flashcard decks.',
            icon: FileText,
            color: 'from-pink-500 to-rose-600',
            glow: 'rgba(236, 72, 153, 0.4)',
            route: '/ghost-mode/document-alchemist',
            features: ['Audio Synthesis', 'Logic Extraction', 'Smart Decks'],
            status: 'Active'
        },
        {
            id: 'schema-architect',
            title: 'Architect',
            subtitle: 'Schema Modeler',
            description: 'High-performance schema modeling for Snowflake & Databricks. Focused on cost optimization and star schema efficiency.',
            icon: LayoutTemplate,
            color: 'from-cyan-500 to-blue-600',
            glow: 'rgba(6, 182, 212, 0.4)',
            route: '/ghost-mode/schema-architect',
            features: ['Star Schema', 'Cost Optimization', 'Migration Paths'],
            status: 'Operational'
        },
        {
            id: 'pipeline-pathologist',
            title: 'Pathologist',
            subtitle: 'Pipeline Forensic',
            description: 'Trace data corruption and silent failures in ETL streams. Deep log analysis and root cause forensic identification.',
            icon: SearchCode,
            color: 'from-orange-500 to-red-600',
            glow: 'rgba(249, 115, 22, 0.4)',
            route: '/ghost-mode/pipeline-pathologist',
            features: ['Root Cause', 'Log Forensic', 'Stream Auditing'],
            status: 'Operational'
        },
        {
            id: 'sandbox-lab',
            title: 'Void Box',
            subtitle: 'Isolated Runtime',
            description: 'Safe execution environment for untrusted or radical code. Complete cryptographic isolation with zero-trace persistence.',
            icon: Code,
            color: 'from-blue-500 to-indigo-500',
            glow: 'rgba(59, 130, 246, 0.4)',
            route: '/ghost-mode/sandbox',
            features: ['Ephemeral', 'Zero Trace', 'Kernel Isolation'],
            status: 'Core'
        },
        {
            id: 'battle-arena',
            title: 'Shadow Hub',
            subtitle: 'Anonymous PvP',
            description: 'Encrypted colosseum for anonymous algorithmic duels. Test your logic against peer encryption levels in real-time.',
            icon: Flame,
            color: 'from-rose-500 to-orange-500',
            glow: 'rgba(244, 63, 94, 0.4)',
            route: '/ghost-mode/battle',
            features: ['Matchmaking', 'Live Duel', 'Elo Persistence'],
            status: 'Beta'
        },
        {
            id: 'skill-tree',
            title: 'Node Map',
            subtitle: 'Growth Visualizer',
            description: 'Interactive topography mapping your cognitive expansion. Visualize skill nodes and trajectory paths.',
            icon: Target,
            color: 'from-emerald-400 to-teal-600',
            glow: 'rgba(16, 185, 129, 0.4)',
            route: '/ghost-mode/skill-tree',
            features: ['Visual Path', 'Gaps Finder', 'Node Progress'],
            status: 'Dev'
        }
    ];

    const currentMode = ghostModes[activeModeIndex];

    const handleInitialize = () => {
        router.push(currentMode.route);
    };

    // Immersive GSAP Animations
    useGSAP(() => {
        const tl = gsap.timeline();

        // Initial Layout Fade In
        tl.fromTo(".dash-panel",
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
        );

        // Header and Footer
        gsap.fromTo(".animate-header", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 });
        gsap.fromTo(".animate-footer", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 });

    }, { scope: containerRef });

    // Transition effect when switching modes
    useEffect(() => {
        if (!stageRef.current) return;

        gsap.fromTo(".stage-content",
            { opacity: 0, scale: 0.98, y: 10 },
            { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power3.out" }
        );

        gsap.fromTo(".feature-tag",
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power2.out", delay: 0.1 }
        );

        gsap.fromTo(".stage-icon",
            { rotateY: 90, opacity: 0 },
            { rotateY: 0, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }
        );
    }, [activeModeIndex]);

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
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full blur-[150px] pointer-events-none opacity-[0.02] transition-colors duration-1000"
                    style={{ backgroundColor: currentMode.glow }}
                />
            </div>

            {/* Tactical Header */}
            <header className="animate-header z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-md h-10 flex items-center shrink-0">
                <div className="w-full px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                                <Ghost className="w-3 h-3" />
                            </div>
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/90">GHOST_PROTOCOL</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-white/40 font-mono">SYS_STATUS: OPTIMAL</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[8px] font-bold text-white/60 tracking-tight leading-none mb-0.5">{ghostSession?.nickname}</span>
                            <span className="text-[7px] text-white/20 font-mono tracking-tighter uppercase leading-none">{ghostSession?.sessionId}</span>
                        </div>
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
            </header>

            {/* Dashboard Workspace */}
            <main className="flex-1 flex overflow-hidden relative z-10">
                {/* 1. Protocol Sidebar */}
                <aside className="dash-panel w-64 lg:w-72 border-r border-white/5 flex flex-col bg-black/20 backdrop-blur-sm shrink-0">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between">
                        <h2 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">Protocol Index</h2>
                        <SearchCode className="w-2.5 h-2.5 text-white/20" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-hide">
                        {ghostModes.map((mode, idx) => {
                            const Icon = mode.icon;
                            const isActive = activeModeIndex === idx;
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => setActiveModeIndex(idx)}
                                    className={`w-full group text-left p-2 rounded-md border transition-all duration-200 ${isActive
                                        ? 'bg-white/5 border-white/10 ring-1 ring-white/5 shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-1.5 rounded transition-all duration-300 ${isActive
                                            ? `bg-gradient-to-br ${mode.color} shadow-lg shadow-black/40`
                                            : 'bg-white/5 text-slate-400 group-hover:text-white'
                                            }`}>
                                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className={`text-[10px] font-black tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                    {mode.title}
                                                </p>
                                                <Badge variant="outline" className="h-3 px-1 text-[6px] font-mono border-white/5 text-white/20">
                                                    {mode.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[8px] text-slate-500 font-medium truncate uppercase tracking-wider">{mode.subtitle}</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* 2. Visual Stage */}
                <section ref={stageRef} className="dash-panel flex-1 flex flex-col bg-black/40 relative overflow-hidden">
                    <div className="flex-1 p-4 lg:p-12 flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full stage-content">
                        {/* Protocol Schematic Head */}
                        <div className="mb-8 relative group">
                            <div
                                className="absolute -inset-10 opacity-20 blur-[60px] rounded-full transition-all duration-1000 group-hover:opacity-40"
                                style={{ backgroundColor: currentMode.glow }}
                            />
                            <div className={`stage-icon w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-gradient-to-br ${currentMode.color} shadow-2xl shadow-black/60 flex items-center justify-center relative z-10 border border-white/10 group-hover:scale-105 transition-transform duration-500`}>
                                <currentMode.icon className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
                                <div className="absolute top-3 right-3 animate-ping">
                                    <span className="flex h-2 w-2 rounded-full bg-white opacity-40"></span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-xl mb-8">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/5 bg-white/[0.03]">
                                <Activity className="w-3 h-3 text-violet-400" />
                                <span className="text-[9px] font-black text-violet-300 tracking-[0.2em] uppercase">{currentMode.subtitle}</span>
                            </div>

                            <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-white leading-none uppercase">
                                {currentMode.title}
                            </h1>

                            <p className="text-xs lg:text-sm text-slate-400 leading-relaxed font-medium">
                                {currentMode.description}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                            {currentMode.features.map((feature, idx) => (
                                <span
                                    key={idx}
                                    className="feature-tag inline-flex items-center text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md backdrop-blur-md"
                                >
                                    <ChevronRight className="w-2.5 h-2.5 mr-1.5 text-violet-500" />
                                    {feature}
                                </span>
                            ))}
                        </div>

                        <div className="pt-2 w-full max-w-[280px]">
                            <Button
                                onClick={handleInitialize}
                                className="w-full h-11 bg-white text-black hover:bg-slate-200 text-[11px] font-black tracking-widest transition-all duration-300 shadow-xl shadow-white/5 flex items-center justify-between px-6 group"
                            >
                                START PROTOCOL
                                <Play className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform fill-current" />
                            </Button>
                        </div>
                    </div>
                </section>

                {/* 3. Stats & Intel Sidebar */}
                <aside className="dash-panel w-64 lg:w-72 border-l border-white/5 flex flex-col bg-black/20 backdrop-blur-sm shrink-0 hidden lg:flex">
                    <div className="p-3 border-b border-white/5">
                        <h2 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">Intelligence Hub</h2>
                    </div>

                    <div className="p-4 space-y-6 overflow-y-auto scrollbar-hide">
                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.1em]">Session Telemetry</p>
                            <div className="grid grid-cols-2 gap-2">
                                <MicroTechModule icon={EyeOff} label="MASKING" value="100%" color="text-emerald-400" />
                                <MicroTechModule icon={Zap} label="LATENCY" value="8ms" color="text-amber-400" />
                                <MicroTechModule icon={Cpu} label="COMPUTE" value="active" color="text-blue-400" />
                                <MicroTechModule icon={Network} label="UPTIME" value="99.9%" color="text-violet-400" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.1em]">Protocol Analysis</p>
                            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-500 uppercase font-bold">Enc Width</span>
                                        <span className="text-white font-mono">1024_BIT</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 1, 1, 1, 1, 0, 0, 0].map((v, i) => (
                                            <div key={i} className={`h-0.5 flex-1 rounded-sm ${v ? 'bg-violet-500/50' : 'bg-white/5'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-500 uppercase font-bold">Sync Level</span>
                                        <span className="text-white font-mono">OPTIMAL</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 1, 1, 1, 1, 1, 1, 1].map((v, i) => (
                                            <div key={i} className={`h-0.5 flex-1 rounded-sm ${v ? 'bg-emerald-500/50' : 'bg-white/5'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 text-center">
                            <Network className="w-8 h-8 text-white/5 mx-auto mb-3 animate-pulse" />
                            <p className="text-[7px] font-mono text-white/10 uppercase leading-relaxed tracking-wider">
                                Encrypted node distribution active across 12 global regions.
                            </p>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Bottom System Ticker */}
            <footer className="shrink-0 h-5 bg-black border-t border-white/5 flex items-center z-50 overflow-hidden">
                <div className="flex items-center gap-8 animate-scroll whitespace-nowrap px-4 w-full">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-8">
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">STATUS_OK // NO_TRACE_ACTIVE</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">ENCRYPTION: AES_256_GCM</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">NODES: 12_DOMAINS_ACTIVE</span>
                            <span className="text-[7px] font-mono text-violet-500/30 uppercase tracking-[0.2em] leading-none">GHOST_MODE_V4.2.1-RELEASE</span>
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
                                Termination will purge session logs and credentials. This action is irreversible.
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
                            onClick={() => router.push('/attender')}
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
    <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/[0.02] border border-white/5 items-center text-center">
        <div className={`p-1.5 rounded bg-white/5 ${color}`}>
            <Icon className="w-2.5 h-2.5" />
        </div>
        <div>
            <p className="text-[7px] font-bold text-white/20 uppercase leading-none mb-0.5">{label}</p>
            <p className={`text-[9px] font-black tracking-tighter uppercase ${color} leading-none`}>{value}</p>
        </div>
    </div>
);

export default GhostModeLanding;
