"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
    Code2,
    Sparkles,
    Loader2,
    Rocket,
    CheckCircle2,
    ArrowLeft,
    Ghost,
    Shield,
    Zap,
    Brain,
    Timer,
    AlertCircle,
    Hash,
    Cpu,
    Network,
    Activity,
    SearchCode,
    Settings2,
    History,
    Dna,
    Terminal,
    ChevronRight,
    RotateCcw
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function DreamExamPage() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [displayId] = useState(`GS-DA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

    // GSAP Refs
    const containerRef = useRef(null);

    // Custom exam form state
    const [activeTab, setActiveTab] = useState("mcq");
    const [mcqTopic, setMcqTopic] = useState("");
    const [codingTopic, setCodingTopic] = useState("");
    const [difficulty, setDifficulty] = useState("medium");
    const [questionCount, setQuestionCount] = useState([10]);
    const [duration, setDuration] = useState([30]);

    // Initialize session
    useEffect(() => {
        let guestSessionId = localStorage.getItem("guestSessionId");
        if (!guestSessionId) {
            guestSessionId = `guest_${Date.now()}`;
            localStorage.setItem("guestSessionId", guestSessionId);
        }
        setSessionId(guestSessionId);
    }, []);

    // Initial Dashboard Animations
    useGSAP(() => {
        const tl = gsap.timeline();
        tl.fromTo(".dash-panel",
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
        );
        gsap.fromTo(".animate-header", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
        gsap.fromTo(".animate-footer", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
    }, { scope: containerRef });

    const handleGenerateQuestions = async () => {
        const topic = activeTab === "mcq" ? mcqTopic : codingTopic;
        const questionType = activeTab === "mcq" ? "mcq" : "coding";

        if (!topic) {
            setError("ERR_TOPIC_REQUIRED: Target subject not defined.");
            return;
        }

        setIsGenerating(true);
        setError("");

        try {
            const response = await fetch("/api/ghost-mode/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: topic,
                    difficulty: difficulty,
                    questionCount: questionCount[0],
                    questionType: questionType,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Session initialization failed.");
            }

            const data = await response.json();

            // Store questions and session info
            sessionStorage.setItem("practiceQuestions", JSON.stringify(data.questions));
            sessionStorage.setItem("anonymousExam", JSON.stringify({
                difficulty,
                duration: duration[0],
                questionCount: questionCount[0],
                topic,
                questionType
            }));
            sessionStorage.setItem("practiceSessionId", sessionId);

            // Navigate to exam page
            router.push(`/ghost-mode/exam/practice?topic=${encodeURIComponent(topic)}&ai=true`);
        } catch (error: any) {
            console.error("Error generating questions:", error);
            setError(error.message || "Architectural failure during synthesis.");
        } finally {
            setIsGenerating(false);
        }
    };

    const confirmExit = () => {
        router.push('/ghost-mode');
    };

    return (
        <div ref={containerRef} className="h-screen w-full bg-[#030303] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/40 flex flex-col">
            {/* Immersive Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[120px] opacity-[0.4] pointer-events-none" />
            </div>

            {/* Tactical Header */}
            <header className="animate-header z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-md h-10 flex items-center shrink-0">
                <div className="w-full px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                <Sparkles className="w-3 h-3" />
                            </div>
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/90">PROTOCOL_DREAM_ARCHITECT</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                            <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[8px] text-white/40 font-mono uppercase">STATUS: READY_FOR_SYNTHESIS</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[8px] font-bold text-white/60 tracking-tight leading-none mb-0.5">OPERATOR</span>
                            <span className="text-[7px] text-white/20 font-mono tracking-tighter uppercase leading-none">{displayId}</span>
                        </div>
                        <Button
                            onClick={() => setShowExitWarning(true)}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[9px] font-bold bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/5 rounded transition-all"
                        >
                            <ArrowLeft className="w-2.5 h-2.5 mr-1" />
                            ABORT
                        </Button>
                    </div>
                </div>
            </header>

            {/* Dashboard Workspace */}
            <main className="flex-1 flex overflow-hidden relative z-10">
                {/* 1. Operation Parameters (Left Sidebar) */}
                <aside className="dash-panel w-64 lg:w-72 border-r border-white/5 flex flex-col bg-black/10 backdrop-blur-sm shrink-0">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between">
                        <h2 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">Operation Config</h2>
                        <Settings2 className="w-2.5 h-2.5 text-white/20" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
                        {/* Difficulty Section */}
                        <div className="space-y-4">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-1 flex items-center gap-2">
                                <Zap className="w-2.5 h-2.5" /> Complexity Level
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {['easy', 'medium', 'hard'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={cn(
                                            "group flex flex-col p-2.5 rounded-lg border text-left transition-all",
                                            difficulty === level
                                                ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20"
                                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-tighter",
                                                difficulty === level ? "text-indigo-400" : "text-white/40"
                                            )}>{level}</span>
                                            <div className="flex gap-0.5">
                                                <div className={cn("w-2 h-1 rounded-full", level === 'easy' ? "bg-emerald-500" : (level === 'medium' ? "bg-amber-500" : "bg-red-500"))} />
                                                <div className={cn("w-2 h-1 rounded-full", level === 'easy' ? "bg-white/5" : (level === 'medium' ? "bg-amber-500" : "bg-red-500"))} />
                                                <div className={cn("w-2 h-1 rounded-full", level === 'easy' ? "bg-white/5" : (level === 'medium' ? "bg-white/5" : "bg-red-500"))} />
                                            </div>
                                        </div>
                                        <p className="text-[8px] text-white/20 font-medium leading-none group-hover:text-white/40 transition-colors">
                                            {level === 'easy' ? 'Foundational principles.' : (level === 'medium' ? 'Standard technical deep-dive.' : 'Advanced structural stress-test.')}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resource Allocation */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pl-1">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
                                        <Hash className="w-2.5 h-2.5" /> Questions
                                    </p>
                                    <span className="text-[10px] font-mono text-indigo-400 font-black">{questionCount[0]}</span>
                                </div>
                                <div className="px-1">
                                    <Slider
                                        value={questionCount}
                                        onValueChange={setQuestionCount}
                                        max={30}
                                        min={5}
                                        step={5}
                                        className="py-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between pl-1">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
                                        <Timer className="w-2.5 h-2.5" /> Duration
                                    </p>
                                    <span className="text-[10px] font-mono text-indigo-400 font-black">{duration[0]}m</span>
                                </div>
                                <div className="px-1">
                                    <Slider
                                        value={duration}
                                        onValueChange={setDuration}
                                        max={120}
                                        min={10}
                                        step={5}
                                        className="py-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 border-t border-white/5 bg-black/20">
                        <div className="flex items-center gap-2 text-white/40 mb-3 px-1">
                            <History className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Protocol Stats</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-white/[0.02] border border-white/5 text-center">
                                <p className="text-[7px] text-white/20 font-bold mb-0.5 uppercase">Uptime</p>
                                <p className="text-[10px] text-indigo-400 font-black">99.9%</p>
                            </div>
                            <div className="p-2 rounded bg-white/[0.02] border border-white/5 text-center">
                                <p className="text-[7px] text-white/20 font-bold mb-0.5 uppercase">Sync</p>
                                <p className="text-[10px] text-emerald-400 font-black">ACTIVE</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* 2. Configuration Hub (Center) */}
                <section className="dash-panel flex-1 flex flex-col bg-black/20 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#030303] to-transparent z-10 pointer-events-none opacity-40" />

                    <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
                        <div className="w-full max-w-xl space-y-12 mb-12">
                            {/* Visual Identity */}
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="relative group">
                                    <div className="absolute -inset-12 bg-indigo-600/10 blur-3xl rounded-full animate-pulse" />
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center relative shadow-2xl shadow-indigo-500/20 transform hover:scale-105 transition-transform duration-500">
                                        <Dna className="w-10 h-10 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Blueprint Synthesis</h1>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] max-w-sm mx-auto">
                                        Define the target subject for architectural generation.
                                    </p>
                                </div>
                            </div>

                            {/* Center Input Form */}
                            <div className="space-y-8">
                                {error && (
                                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="text-[11px] font-bold text-red-400 uppercase tracking-tight">{error}</span>
                                    </div>
                                )}

                                <Tabs defaultValue="mcq" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                                    <TabsList className="grid w-full grid-cols-2 h-10 bg-white/[0.03] border border-white/5 p-1 rounded-lg">
                                        <TabsTrigger value="mcq" className="text-[11px] font-black uppercase tracking-widest rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all">
                                            <Brain className="w-3.5 h-3.5 mr-2" />
                                            Conceptual MCQ
                                        </TabsTrigger>
                                        <TabsTrigger value="coding" className="text-[11px] font-black uppercase tracking-widest rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all">
                                            <Code2 className="w-3.5 h-3.5 mr-2" />
                                            Logic Sequence
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="space-y-4 min-h-[80px]">
                                        <TabsContent value="mcq" className="space-y-2 focus-visible:outline-none animate-in fade-in slide-in-from-left-4">
                                            <Label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Architectural Target</Label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                    <SearchCode className="w-4 h-4 text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                                <Input
                                                    placeholder="Quantum Computing, React Hooks, History of Rome..."
                                                    className="h-14 bg-white/[0.03] border-white/10 focus-visible:ring-indigo-500/30 pl-12 text-sm font-medium tracking-tight rounded-xl"
                                                    value={mcqTopic}
                                                    onChange={(e) => setMcqTopic(e.target.value)}
                                                />
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="coding" className="space-y-2 focus-visible:outline-none animate-in fade-in slide-in-from-right-4">
                                            <Label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Environmental Logic</Label>
                                            <Select value={codingTopic} onValueChange={setCodingTopic}>
                                                <SelectTrigger className="h-14 bg-white/[0.03] border-white/10 focus-visible:ring-indigo-500/30 text-sm font-medium rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <Terminal className="w-4 h-4 text-white/20" />
                                                        <SelectValue placeholder="Select logic environment..." />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#0A0A0A] border-white/10">
                                                    <SelectItem value="Python" className="text-xs uppercase font-bold tracking-widest">Python 3.x</SelectItem>
                                                    <SelectItem value="PySpark" className="text-xs uppercase font-bold tracking-widest">PySpark (DataBricks)</SelectItem>
                                                    <SelectItem value="SQL" className="text-xs uppercase font-bold tracking-widest">SQL (Generic)</SelectItem>
                                                    <SelectItem value="Snowflake" className="text-xs uppercase font-bold tracking-widest">Snowflake SQL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TabsContent>
                                    </div>
                                </Tabs>

                                <Button
                                    size="lg"
                                    onClick={handleGenerateQuestions}
                                    disabled={isGenerating || (activeTab === 'mcq' ? !mcqTopic : !codingTopic)}
                                    className="w-full h-16 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 border-0 shadow-2xl shadow-indigo-600/20 text-xs font-black uppercase tracking-[0.3em] rounded-xl transition-all active:scale-[0.98] group"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                            Synthesizing Neural Path...
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="w-4 h-4 mr-3 transform group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                            Initialize Architect
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#030303] to-transparent z-10 pointer-events-none opacity-40" />
                </section>

                {/* 3. System Telemetry (Right Sidebar) */}
                <aside className="dash-panel w-64 lg:w-72 border-l border-white/5 flex flex-col bg-black/10 backdrop-blur-sm shrink-0 hidden lg:flex">
                    <div className="p-3 border-b border-white/5">
                        <h2 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">System Telemetry</h2>
                    </div>

                    <div className="p-4 space-y-6 overflow-y-auto scrollbar-hide">
                        <div className="space-y-3">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-1">Link Status</p>
                            <div className="grid grid-cols-2 gap-2">
                                <MicroTechModule icon={Shield} label="SECURITY" value="MAX" color="text-emerald-400" />
                                <MicroTechModule icon={Zap} label="LATENCY" value="24ms" color="text-amber-400" />
                                <MicroTechModule icon={Cpu} label="NEURAL" value="98%" color="text-indigo-400" />
                                <MicroTechModule icon={Network} label="NODES" value="active" color="text-blue-400" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-1">Generation Metrics</p>
                            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-500 uppercase font-black">Entropy Depth</span>
                                        <span className="text-white font-mono text-[8px]">100%</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 1, 1, 1, 1, 1, 1, 1].map((v, i) => (
                                            <div key={i} className={`h-0.5 flex-1 rounded-full ${v ? 'bg-indigo-500/50' : 'bg-white/5'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-500 uppercase font-black">Memory Buffer</span>
                                        <span className="text-white font-mono text-[8px]">SECURE</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 1, 1, 1, 0, 0, 0, 0].map((v, i) => (
                                            <div key={i} className={`h-0.5 flex-1 rounded-full ${v ? 'bg-indigo-500/50' : 'bg-white/5'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <div className="p-3 rounded-lg border border-white/5 bg-indigo-600/5 flex flex-col items-center gap-2">
                                <Network className="w-5 h-5 text-indigo-500/50 animate-pulse" />
                                <p className="text-[7px] font-mono text-white/20 uppercase text-center leading-relaxed">
                                    Encrypted architectural bridge active.<br />Routing via ghost-node clusters.
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Bottom System Ticker */}
            <footer className="shrink-0 h-5 bg-black border-t border-white/5 flex items-center z-50 overflow-hidden">
                <div className="flex items-center gap-8 animate-scroll whitespace-nowrap px-4 w-full">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-8">
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">ARCHITECT_ACTIVE // NO_HISTORY_PERSISTED</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">PROTOCOL: DREAM_EXAM_V2</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">MODE: GHOST_INCOGNITO</span>
                            <span className="text-[7px] font-mono text-indigo-500/30 uppercase tracking-[0.2em] leading-none">SESSION: {displayId}</span>
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
                            <DialogTitle className="text-base font-black tracking-tight text-white uppercase leading-none">ABORT_SYNTHESIS</DialogTitle>
                            <DialogDescription className="text-slate-400 text-[10px] leading-relaxed text-center">
                                Termination will discard all architectural configurations. Proceed?
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <div className="flex gap-3 pt-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowExitWarning(false)}
                            className="flex-1 h-9 border-white/10 bg-white/5 text-white text-[10px] font-bold"
                        >
                            STAY
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmExit}
                            className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-[10px] font-bold"
                        >
                            ABORT
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
}

const MicroTechModule = ({ icon: Icon, label, value, color }: any) => (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/[0.01] border border-white/5 items-center text-center">
        <div className={`p-1 rounded bg-white/5 ${color}`}>
            <Icon className="w-2.5 h-2.5" />
        </div>
        <div>
            <p className="text-[7px] font-bold text-white/20 uppercase leading-none mb-0.5">{label}</p>
            <p className={`text-[9px] font-black tracking-tighter uppercase ${color} leading-none`}>{value}</p>
        </div>
    </div>
);