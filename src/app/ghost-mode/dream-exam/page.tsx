"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
    Hash
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

    // GSAP Refs
    const containerRef = useRef(null);
    const formRef = useRef(null);
    const configRef = useRef(null);

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

        gsap.set(".animate-enter", { y: 20, autoAlpha: 0 });

        tl.to(".animate-enter", {
            y: 0,
            autoAlpha: 1,
            stagger: 0.1,
            duration: 0.6,
            ease: "power2.out"
        });

    }, { scope: containerRef });

    const handleGenerateQuestions = async () => {
        const topic = activeTab === "mcq" ? mcqTopic : codingTopic;
        const questionType = activeTab === "mcq" ? "mcq" : "coding";

        if (!topic) {
            setError("Please define a topic for the AI.");
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
                throw new Error(errorData.message || "Failed to generate questions");
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
            setError(error.message || "Failed to generate session. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const confirmExit = () => {
        router.push('/ghost-mode');
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-background relative overflow-hidden font-sans flex flex-col">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md animate-enter">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors cursor-pointer group" onClick={() => setShowExitWarning(true)}>
                        <div className="p-1 rounded-md bg-muted group-hover:bg-muted/80">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">Ghost Protocol</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-lg tracking-tight">Dream Exam</span>
                    </div>

                    <div className="w-24"></div> {/* Spacer for centering */}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-2xl space-y-8">

                    {/* Intro */}
                    <div className="text-center space-y-2 animate-enter">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Design Your Challenge</h1>
                        <p className="text-muted-foreground">Configure the parameters for your AI-generated exam session.</p>
                    </div>

                    <div className="grid gap-6 animate-enter" ref={formRef}>
                        {error && (
                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Card className="border-border bg-card/60 backdrop-blur-sm shadow-xl">
                            <CardContent className="p-6 pt-6 space-y-8">

                                {/* Tabs */}
                                <Tabs defaultValue="mcq" value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-xl">
                                        <TabsTrigger value="mcq" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
                                            <Brain className="w-4 h-4 mr-2 text-violet-500" />
                                            Concept / MCQ
                                        </TabsTrigger>
                                        <TabsTrigger value="coding" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
                                            <Code2 className="w-4 h-4 mr-2 text-indigo-500" />
                                            Coding Problem
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="mt-8 space-y-4">
                                        <TabsContent value="mcq" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-left-2">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium ml-1">Topic or Concept</Label>
                                                <Input
                                                    placeholder="Quantum Computing, React Hooks, History of Rome..."
                                                    className="h-12 bg-background border-input focus-visible:ring-violet-500/30"
                                                    value={mcqTopic}
                                                    onChange={(e) => setMcqTopic(e.target.value)}
                                                />
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="coding" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-right-2">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium ml-1">Programming Language</Label>
                                                <Select value={codingTopic} onValueChange={setCodingTopic}>
                                                    <SelectTrigger className="h-12 bg-background border-input">
                                                        <SelectValue placeholder="Select language..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Python">Python</SelectItem>
                                                        {/* <SelectItem value="JavaScript">JavaScript</SelectItem>
                                                        <SelectItem value="Java">Java</SelectItem> */}
                                                        <SelectItem value="PySpark">PySpark (Data Bricks)</SelectItem>
                                                        <SelectItem value="SQL">SQL</SelectItem>
                                                        <SelectItem value="Snowflake">Snowflake</SelectItem>
                                                        {/* <SelectItem value="SQL">SQL</SelectItem> */}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </TabsContent>
                                    </div>
                                </Tabs>

                                <Separator className="bg-border/50" />

                                {/* Configuration Grid */}
                                <div className="grid md:grid-cols-2 gap-8" ref={configRef}>

                                    {/* Left Col: Sliders */}
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label className="flex items-center gap-2"><Hash className="w-4 h-4 text-muted-foreground" /> Questions</Label>
                                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{questionCount[0]}</span>
                                            </div>
                                            <Slider
                                                value={questionCount}
                                                onValueChange={setQuestionCount}
                                                max={30}
                                                min={5}
                                                step={5}
                                                className="py-2"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label className="flex items-center gap-2"><Timer className="w-4 h-4 text-muted-foreground" /> Duration</Label>
                                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{duration[0]} min</span>
                                            </div>
                                            <Slider
                                                value={duration}
                                                onValueChange={setDuration}
                                                max={120}
                                                min={10}
                                                step={5}
                                                className="py-2"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Col: Difficulty Select */}
                                    <div className="space-y-4">
                                        <Label className="flex items-center gap-2"><Zap className="w-4 h-4 text-muted-foreground" /> Difficulty</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['easy', 'medium', 'hard'].map((level) => (
                                                <div
                                                    key={level}
                                                    onClick={() => setDifficulty(level)}
                                                    className={cn(
                                                        "cursor-pointer rounded-lg border p-3 text-center transition-all hover:bg-muted/50",
                                                        difficulty === level
                                                            ? "bg-primary/5 border-primary text-primary shadow-sm ring-1 ring-primary/20"
                                                            : "border-border bg-background text-muted-foreground hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className="capitalize font-medium text-sm">{level}</div>
                                                    <div className="flex justify-center gap-0.5 mt-1.5 h-1">
                                                        <div className={cn("w-full rounded-full", level === 'easy' ? "bg-emerald-500" : (level === 'medium' ? "bg-yellow-500" : "bg-red-500"))} />
                                                        <div className={cn("w-full rounded-full", level === 'easy' ? "bg-emerald-500/20" : (level === 'medium' ? "bg-yellow-500" : "bg-red-500"))} />
                                                        <div className={cn("w-full rounded-full", level === 'easy' ? "bg-emerald-500/20" : (level === 'medium' ? "bg-yellow-500/20" : "bg-red-500"))} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                            AI attempts to calibrate questions to roughly a {difficulty} skill level based on standard interview benchmarks.
                                        </p>
                                    </div>

                                </div>

                                <Button
                                    size="lg"
                                    onClick={handleGenerateQuestions}
                                    disabled={isGenerating || (activeTab === 'mcq' ? !mcqTopic : !codingTopic)}
                                    className="w-full text-base font-semibold h-14 shadow-lg hover:shadow-primary/20 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 transition-all duration-300"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                            Architecting Exam...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 mr-3 fill-white/20" />
                                            Generate Dream Exam
                                        </>
                                    )}
                                </Button>

                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-center text-xs text-muted-foreground gap-4 animate-enter">
                        <div className="flex items-center gap-1.5">
                            <Ghost className="w-3.5 h-3.5" />
                            <span>Incognito Mode</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            <span>No Data Persisted</span>
                        </div>
                    </div>

                </div>
            </main>

            {/* Exit Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 items-center justify-center flex mb-3">
                            <ArrowLeft className="w-6 h-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center text-xl">Abandon Configuration?</DialogTitle>
                        <DialogDescription className="text-center">
                            Your configured exam settings will be discarded.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Stay
                        </Button>
                        <Button variant="destructive" onClick={confirmExit}>
                            Exit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}