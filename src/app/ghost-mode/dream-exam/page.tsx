"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Code2,
    Sparkles,
    Loader2,
    Rocket,
    CheckCircle2,
    ArrowLeft,
    Ghost,
    Shield,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function LearningPage() {
    const router = useRouter();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showExitWarning, setShowExitWarning] = useState(false);


    // GSAP Refs
    const containerRef = useRef(null);
    const heroRef = useRef(null);
    const tracksRef = useRef(null);
    const sidebarRef = useRef(null);
    const generatorRef = useRef(null);

    // Custom exam form state
    const [activeTab, setActiveTab] = useState("mcq");
    const [mcqTopic, setMcqTopic] = useState("");
    const [codingTopic, setCodingTopic] = useState("");

    const [customExam, setCustomExam] = useState({
        difficulty: "medium",
        duration: "30",
        questionCount: "10",
    });

    // Initialize theme
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    // Initialize session and fetch stats
    useEffect(() => {
        let guestSessionId = localStorage.getItem("guestSessionId");
        if (!guestSessionId) {
            guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("guestSessionId", guestSessionId);
        }
        setSessionId(guestSessionId);
    }, []);

    // GSAP Animations
    useGSAP(() => {
        const tl = gsap.timeline();

        // Hero Animations
        tl.from(heroRef.current, {
            y: -20,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        })
            .from(".hero-badge", {
                scale: 0.8,
                opacity: 0,
                duration: 0.5,
                ease: "back.out(1.7)"
            }, "-=0.6");

        // Tracks Animation
        tl.from(".track-card", {
            y: 30,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out"
        }, "-=0.4");

        // Generator Animation
        tl.from(generatorRef.current, {
            y: 20,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out"
        }, "-=0.4");

        // Sidebar Animation
        tl.from(sidebarRef.current, {
            x: 20,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        }, "-=0.6");

    }, { scope: containerRef });

    const handleGenerateQuestions = async () => {
        const topic = activeTab === "mcq" ? mcqTopic : codingTopic;
        const questionType = activeTab === "mcq" ? "mcq" : "coding";

        if (!topic) {
            setError("Please select or enter a topic first");
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
                    difficulty: customExam.difficulty,
                    questionCount: parseInt(customExam.questionCount),
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
                ...customExam,
                topic,
                questionType
            }));
            sessionStorage.setItem("practiceSessionId", sessionId);

            // Navigate to exam page
            router.push(`/ghost-mode/exam/practice?topic=${encodeURIComponent(topic)}&ai=true`);
        } catch (error: any) {
            console.error("Error generating questions:", error);
            setError(error.message || "Failed to generate questions. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const confirmExit = () => {
        router.push('/ghost-mode');
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20">
            {/* Header */}
            <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">
                                    Dream Exam Builder
                                </h1>
                            </div>
                        </div>

                        <Button
                            onClick={() => setShowExitWarning(true)}
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

            {/* Warning Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 px-4 py-2">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Ghost Mode Active:</span>
                    <span>Exams created here are temporary and won't be saved.</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 container mx-auto px-4 sm:px-6 py-12">
                <div className="grid lg:grid-cols-12 gap-8">

                    {/* Left Column - Tracks & Generator */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* Custom Practice Generator */}
                        <div id="custom-generator" ref={generatorRef} className="pt-4">
                            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Rocket className="w-5 h-5 text-primary" />
                                        Custom Practice Session
                                    </CardTitle>
                                    <CardDescription>
                                        Configure your own practice environment. Choose your mode, topic, and difficulty.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 relative">
                                    {error && (
                                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <Tabs defaultValue="mcq" value={activeTab} onValueChange={setActiveTab} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 mb-6">
                                            <TabsTrigger value="mcq" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                MCQ Practice
                                            </TabsTrigger>
                                            <TabsTrigger value="coding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                                <Code2 className="w-4 h-4 mr-2" />
                                                Coding Challenges
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="mcq" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="space-y-2">
                                                <Label>Topic</Label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter any topic (e.g., React Hooks, History of Rome, Quantum Physics)"
                                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={mcqTopic}
                                                    onChange={(e) => setMcqTopic(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Type anything! Our AI will generate relevant multiple-choice questions.
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="coding" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="space-y-2">
                                                <Label>Programming Language / Skill</Label>
                                                <Select
                                                    value={codingTopic}
                                                    onValueChange={setCodingTopic}
                                                >
                                                    <SelectTrigger className="bg-background h-11 font-mono">
                                                        <SelectValue placeholder="Select a language..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="SQL">SQL</SelectItem>
                                                        <SelectItem value="Python">Python</SelectItem>
                                                        <SelectItem value="JavaScript">JavaScript</SelectItem>
                                                        <SelectItem value="Java">Java</SelectItem>
                                                        <SelectItem value="PySpark">PySpark (Databricks)</SelectItem>
                                                        <SelectItem value="PowerBI">Power BI (DAX)</SelectItem>
                                                        <SelectItem value="DBT">DBT (Analytics Engineering)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    Select a supported language for hands-on coding challenges.
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <div className="grid md:grid-cols-3 gap-6 mt-6">
                                            <div className="space-y-2">
                                                <Label>Difficulty</Label>
                                                <Select
                                                    value={customExam.difficulty}
                                                    onValueChange={(value) => setCustomExam({ ...customExam, difficulty: value })}
                                                >
                                                    <SelectTrigger className="bg-background h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="easy">Easy</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="hard">Hard</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Questions</Label>
                                                <Select
                                                    value={customExam.questionCount}
                                                    onValueChange={(value) => setCustomExam({ ...customExam, questionCount: value })}
                                                >
                                                    <SelectTrigger className="bg-background h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="5">5 Questions</SelectItem>
                                                        <SelectItem value="10">10 Questions</SelectItem>
                                                        <SelectItem value="15">15 Questions</SelectItem>
                                                        <SelectItem value="20">20 Questions</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Duration</Label>
                                                <Select
                                                    value={customExam.duration}
                                                    onValueChange={(value) => setCustomExam({ ...customExam, duration: value })}
                                                >
                                                    <SelectTrigger className="bg-background h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="15">15 minutes</SelectItem>
                                                        <SelectItem value="30">30 minutes</SelectItem>
                                                        <SelectItem value="45">45 minutes</SelectItem>
                                                        <SelectItem value="60">60 minutes</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleGenerateQuestions}
                                            disabled={isGenerating || (activeTab === "mcq" ? !mcqTopic : !codingTopic)}
                                            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-primary/25 transition-all mt-8"
                                            size="lg"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Generating {activeTab === "mcq" ? "MCQ" : "Coding"} Session...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5 mr-2" />
                                                    Start {activeTab === "mcq" ? "MCQ" : "Coding"} Session
                                                </>
                                            )}
                                        </Button>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Exit Warning Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                            <Ghost className="w-6 h-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center">Exit Dream Exam?</DialogTitle>
                        <DialogDescription className="text-center">
                            Any unsaved configuration or progress will be lost.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowExitWarning(false)}
                            className="flex-1"
                        >
                            Stay Here
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
}