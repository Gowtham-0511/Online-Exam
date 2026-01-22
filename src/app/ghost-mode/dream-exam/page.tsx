"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
    Code2,
    Sparkles,
    Loader2,
    Rocket,
    ArrowLeft,
    Shield,
    Zap,
    Brain,
    Timer,
    AlertCircle,
    Hash,
    Cpu,
    Network,
    SearchCode,
    Settings2,
    ChevronLeft,
    RotateCcw,
    Dna,
    Terminal
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

export default function DreamExamPage() {
    const router = useRouter();
    const { theme } = useTheme();
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

    // Animations
    useGSAP(() => {
        const tl = gsap.timeline();

        tl.fromTo(".header-element",
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out" }
        );

        tl.fromTo(".panel-trigger",
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" },
            "-=0.3"
        );

        gsap.fromTo(".main-stage",
            { opacity: 0, scale: 0.98 },
            { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }
        );
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

    const handleReset = () => {
        setMcqTopic("");
        setCodingTopic("");
        setDifficulty("medium");
        setQuestionCount([10]);
        setDuration([30]);
        setError("");
    };

    return (
        <div ref={containerRef} className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden transition-colors duration-500 font-sans selection:bg-primary/20">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl h-14 shrink-0">
                <div className="container h-full mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 header-element">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowExitWarning(true)}>
                            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-tight">Adaptive Exam Simulator</span>
                                <span className="text-[10px] text-muted-foreground font-mono leading-none">CUSTOM EXAM GENERATOR</span>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-0.5 rounded-full bg-muted/50 border border-border/50 ml-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-mono uppercase text-muted-foreground tracking-wider">
                                {displayId}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 header-element">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="hidden sm:flex text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Reset
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 flex overflow-hidden relative z-10">
                {/* 1. Configuration Sidebar */}
                <aside className="hidden lg:flex w-72 border-r border-border/40 flex-col bg-muted/20 backdrop-blur-sm shrink-0 panel-trigger">
                    <div className="p-4 border-b border-border/40 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exam Settings</h2>
                        <Settings2 className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8">
                        {/* Difficulty Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <Zap className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Difficulty</span>
                            </div>
                            <div className="space-y-2">
                                {['easy', 'medium', 'hard'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={cn(
                                            "w-full group flex flex-col p-3 rounded-lg border text-left transition-all",
                                            difficulty === level
                                                ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                                                : "bg-card border-border/50 hover:bg-muted/50 hover:border-border"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={cn(
                                                "text-xs font-bold uppercase",
                                                difficulty === level ? "text-primary" : "text-muted-foreground"
                                            )}>{level}</span>
                                            <div className="flex gap-0.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", level === 'easy' ? "bg-emerald-500" : (level === 'medium' ? "bg-amber-500" : "bg-red-500"))} />
                                                <div className={cn("w-1.5 h-1.5 rounded-full", level === 'easy' ? "bg-muted" : (level === 'medium' ? "bg-amber-500" : "bg-red-500"))} />
                                                <div className={cn("w-1.5 h-1.5 rounded-full", level === 'easy' ? "bg-muted" : (level === 'medium' ? "bg-muted" : "bg-red-500"))} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                        <Hash className="w-3 h-3" /> Question Count
                                    </span>
                                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{questionCount[0]}</span>
                                </div>
                                <Slider
                                    value={questionCount}
                                    onValueChange={setQuestionCount}
                                    max={30}
                                    min={5}
                                    step={5}
                                    className="py-1"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                        <Timer className="w-3 h-3" /> Time Limit
                                    </span>
                                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{duration[0]}m</span>
                                </div>
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
                </aside>

                {/* 2. Main Generation Stage */}
                <section className="flex-1 flex flex-col relative overflow-hidden main-stage">
                    <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 overflow-y-auto w-full">
                        <div className="w-full max-w-xl space-y-10">

                            {/* Hero Section */}
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-6 ring-1 ring-orange-500/20 shadow-xl shadow-orange-500/10">
                                    <Dna className="w-8 h-8 text-orange-500" />
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight">Create Custom Exam</h1>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    Choose your topic and settings to generate a personalized practice exam. The AI will create unique questions based on your inputs.
                                </p>
                            </div>

                            {/* Form Area */}
                            <div className="space-y-6">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="text-xs font-bold text-red-500">{error}</span>
                                    </div>
                                )}

                                <Tabs defaultValue="mcq" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                                    <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-xl">
                                        <TabsTrigger value="mcq" className="text-xs font-bold uppercase tracking-wide rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                            <Brain className="w-4 h-4 mr-2" />
                                            Theory (MCQ)
                                        </TabsTrigger>
                                        <TabsTrigger value="coding" className="text-xs font-bold uppercase tracking-wide rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                            <Code2 className="w-4 h-4 mr-2" />
                                            Coding Problem
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="min-h-[100px] bg-card/50 border border-border/50 rounded-2xl p-6 shadow-sm">
                                        <TabsContent value="mcq" className="mt-0 space-y-3 focus-visible:outline-none animate-in fade-in slide-in-from-left-2">
                                            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Topic / Subject</Label>
                                            <div className="relative group">
                                                <SearchCode className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    placeholder="e.g. Quantum Computing, React Hooks..."
                                                    className="pl-10 h-12 bg-background border-border/60 focus-visible:ring-primary/20 rounded-xl"
                                                    value={mcqTopic}
                                                    onChange={(e) => setMcqTopic(e.target.value)}
                                                />
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="coding" className="mt-0 space-y-3 focus-visible:outline-none animate-in fade-in slide-in-from-right-2">
                                            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Programming Language</Label>
                                            <Select value={codingTopic} onValueChange={setCodingTopic}>
                                                <SelectTrigger className="h-12 bg-background border-border/60 focus:ring-primary/20 rounded-xl">
                                                    <div className="flex items-center gap-2">
                                                        <Terminal className="w-4 h-4 text-muted-foreground" />
                                                        <SelectValue placeholder="Select language..." />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Python">Python 3.x</SelectItem>
                                                    <SelectItem value="PySpark">PySpark (DataBricks)</SelectItem>
                                                    <SelectItem value="SQL">SQL (Generic)</SelectItem>
                                                    <SelectItem value="Snowflake">Snowflake SQL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TabsContent>
                                    </div>
                                </Tabs>

                                <Button
                                    size="lg"
                                    onClick={handleGenerateQuestions}
                                    disabled={isGenerating || (activeTab === 'mcq' ? !mcqTopic : !codingTopic)}
                                    className="w-full h-14 text-sm font-bold uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="w-4 h-4 mr-2" />
                                            Start Exam
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Exit Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Exam Creation?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to leave? Your current configuration will be lost.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmExit}>
                            Abort
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}