import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Code2,
    Sparkles,
    Trophy,
    Target,
    Zap,
    Moon,
    Sun,
    Loader2,
    Brain,
    Rocket,
    CheckCircle2,
    Clock,
    BarChart3,
    Star,
    Award,
    Flame,
    Play,
    ChevronRight,
    Search,
    Filter,
    Code,
    Database,
    FileCode,
    Terminal,
    LayoutDashboard,
    LogOut
} from "lucide-react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function LearningPage() {
    const router = useRouter();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // GSAP Refs
    const containerRef = useRef(null);
    const heroRef = useRef(null);
    const tracksRef = useRef(null);
    const sidebarRef = useRef(null);

    // Stats from database
    const [stats, setStats] = useState({
        totalAttempts: 0,
        totalQuestions: 0,
        averageScore: "0",
        totalTimeSpent: 0,
        recentAttempts: [],
    });

    // Custom exam form state
    const [customExam, setCustomExam] = useState({
        topic: "",
        difficulty: "medium",
        duration: "30",
        questionCount: "10",
        questionType: "mcq",
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
        fetchStats(guestSessionId);
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
            .from(".hero-stat", {
                y: 20,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "back.out(1.7)"
            }, "-=0.4");

        // Tracks Animation
        tl.from(".track-card", {
            y: 30,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out"
        }, "-=0.2");

        // Sidebar Animation
        tl.from(sidebarRef.current, {
            x: 20,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        }, "-=0.6");

    }, { scope: containerRef });

    const fetchStats = async (sid: string) => {
        try {
            const response = await fetch(`/api/practice/stats?sessionId=${sid}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        if (!isDarkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const handleGenerateQuestions = async () => {
        if (!customExam.topic) {
            setError("Please select a topic first");
            return;
        }

        setIsGenerating(true);
        setError("");

        try {
            const response = await fetch("/api/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: customExam.topic,
                    difficulty: customExam.difficulty,
                    questionCount: parseInt(customExam.questionCount),
                    questionType: customExam.questionType,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to generate questions");
            }

            const data = await response.json();

            // Store questions and session info
            sessionStorage.setItem("practiceQuestions", JSON.stringify(data.questions));
            sessionStorage.setItem("anonymousExam", JSON.stringify(customExam));
            sessionStorage.setItem("practiceSessionId", sessionId);

            // Navigate to exam page
            router.push(`/exam/practice?topic=${encodeURIComponent(customExam.topic)}&ai=true`);
        } catch (error: any) {
            console.error("Error generating questions:", error);
            setError(error.message || "Failed to generate questions. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleQuickStart = (topic: string, difficulty: string) => {
        setCustomExam({
            ...customExam,
            topic,
            difficulty: difficulty.toLowerCase(),
        });
        setTimeout(() => handleGenerateQuestions(), 100);
    };

    // Practice tracks
    const practiceTracks = [
        {
            icon: Code,
            title: "JavaScript",
            description: "Master modern JavaScript",
            problems: 150,
            difficulty: "Easy - Hard",
            color: "bg-yellow-500",
            badge: "Popular"
        },
        {
            icon: FileCode,
            title: "Python",
            description: "Python fundamentals & advanced",
            problems: 200,
            difficulty: "Easy - Hard",
            color: "bg-blue-500",
            badge: "Trending"
        },
        {
            icon: Database,
            title: "SQL",
            description: "Database queries & optimization",
            problems: 160,
            difficulty: "Easy - Medium",
            color: "bg-green-500",
            badge: null
        },
        {
            icon: Code2,
            title: "Java",
            description: "Java programming essentials",
            problems: 180,
            difficulty: "Medium - Hard",
            color: "bg-red-500",
            badge: null
        },
        {
            icon: Zap,
            title: "PySpark",
            description: "Big data with PySpark",
            problems: 90,
            difficulty: "Medium - Hard",
            color: "bg-purple-500",
            badge: "Beta"
        },
        {
            icon: BarChart3,
            title: "PowerBI",
            description: "DAX formulas and calculations",
            problems: 75,
            difficulty: "Easy - Medium",
            color: "bg-orange-500",
            badge: "New"
        }
    ];

    return (
        <>
            <Head>
                <title>Practice | SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div ref={containerRef} className="min-h-screen bg-background flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
                    <div className="container mx-auto px-4 sm:px-6">
                        <div className="flex h-16 items-center justify-between">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                                        <Image src='/logo3.png' alt='logo' width={24} height={24} />
                                    </div>
                                    <span className="text-lg font-bold text-foreground hidden sm:block tracking-tight">SysRank</span>
                                </div>

                                <nav className="hidden md:flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="font-medium text-primary bg-primary/10">
                                        <Terminal className="w-4 h-4 mr-2" />
                                        Practice
                                    </Button>
                                    {/* <Button variant="ghost" size="sm" className="font-medium text-muted-foreground hover:text-foreground">
                                        <Trophy className="w-4 h-4 mr-2" />
                                        Compete
                                    </Button> */}
                                </nav>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full">
                                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </Button>
                                <Separator orientation="vertical" className="h-6" />
                                <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Exit Guest Mode
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <div ref={heroRef} className="relative border-b border-border bg-muted/30 overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-black/10" />
                    <div className="container mx-auto px-4 sm:px-6 py-12 relative">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                            <div className="space-y-4 max-w-2xl">
                                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                                    AI-Powered Practice Environment
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                                    Master your craft with <span className="text-primary">SysRank</span>
                                </h1>
                                <p className="text-lg text-muted-foreground max-w-xl">
                                    Join millions of developers solving challenges, preparing for interviews, and leveling up their skills.
                                </p>
                            </div>

                            {/* Stats Cards */}
                            <div className="flex gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                                <Card className="hero-stat min-w-[140px] bg-card/50 backdrop-blur-sm border-primary/10">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-3xl font-bold text-foreground">{stats.totalAttempts || 0}</div>
                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Attempts</div>
                                    </CardContent>
                                </Card>
                                <Card className="hero-stat min-w-[140px] bg-card/50 backdrop-blur-sm border-primary/10">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-3xl font-bold text-primary">{stats.averageScore || 0}%</div>
                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Avg Score</div>
                                    </CardContent>
                                </Card>
                                <Card className="hero-stat min-w-[140px] bg-card/50 backdrop-blur-sm border-primary/10">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-3xl font-bold text-foreground">{stats.totalQuestions || 0}</div>
                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Solved</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 container mx-auto px-4 sm:px-6 py-8">
                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* Left Column - Tracks & Custom Practice */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* <div className="flex gap-4 items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search topics, skills, or challenges..."
                                        className="pl-10 h-11 bg-card"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
                                    <Filter className="w-4 h-4" />
                                </Button>
                            </div> */}

                            {/* Practice Tracks */}
                            {/* <div ref={tracksRef} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold tracking-tight">Practice Tracks</h2>
                                    <Button variant="link" className="text-primary p-0 h-auto font-semibold">
                                        View All <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {practiceTracks.map((track, index) => {
                                        const Icon = track.icon;
                                        return (
                                            <div
                                                key={index}
                                                className="track-card group relative overflow-hidden rounded-xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                                onClick={() => {
                                                    setCustomExam({ ...customExam, topic: track.title });
                                                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                                }}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`w-12 h-12 ${track.color} rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                                        <Icon className="w-6 h-6 text-white" />
                                                    </div>
                                                    {track.badge && (
                                                        <Badge variant="secondary" className="font-medium">
                                                            {track.badge}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{track.title}</h3>
                                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{track.description}</p>

                                                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <Target className="w-3.5 h-3.5" />
                                                        {track.problems} Problems
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <BarChart3 className="w-3.5 h-3.5" />
                                                        {track.difficulty}
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div> */}

                            {/* Custom Practice Generator */}
                            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Rocket className="w-5 h-5 text-primary" />
                                        Custom Practice Generator
                                    </CardTitle>
                                    <CardDescription>
                                        Create a personalized practice session tailored to your specific needs using AI.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 relative">
                                    {error && (
                                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Topic</Label>
                                            <Select
                                                value={customExam.topic}
                                                onValueChange={(value) => {
                                                    const newQuestionType = (value === "SQL" || value === "Python" || value === "JavaScript" || value === "Java" || value === "PySpark" || value === "PowerBI")
                                                        ? customExam.questionType
                                                        : "mcq";
                                                    setCustomExam({ ...customExam, topic: value, questionType: newQuestionType });
                                                }}
                                            >
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue placeholder="Select a topic..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SQL">SQL</SelectItem>
                                                    <SelectItem value="Python">Python</SelectItem>
                                                    <SelectItem value="JavaScript">JavaScript</SelectItem>
                                                    <SelectItem value="Java">Java</SelectItem>
                                                    <SelectItem value="PySpark">PySpark (Databricks)</SelectItem>
                                                    <SelectItem value="PowerBI">Power BI (DAX)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Difficulty</Label>
                                            <Select
                                                value={customExam.difficulty}
                                                onValueChange={(value) => setCustomExam({ ...customExam, difficulty: value })}
                                            >
                                                <SelectTrigger className="bg-background">
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
                                                <SelectTrigger className="bg-background">
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
                                                <SelectTrigger className="bg-background">
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

                                    {(customExam.topic === "SQL" || customExam.topic === "Python" || customExam.topic === "JavaScript" || customExam.topic === "Java" || customExam.topic === "PySpark" || customExam.topic === "PowerBI") && (
                                        <div className="space-y-2">
                                            <Label>Question Type</Label>
                                            <Select
                                                value={customExam.questionType}
                                                onValueChange={(value) => setCustomExam({ ...customExam, questionType: value })}
                                            >
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                                                    <SelectItem value="coding">Coding Challenges</SelectItem>
                                                    <SelectItem value="mixed">Mixed (MCQ + Coding)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleGenerateQuestions}
                                        disabled={isGenerating || !customExam.topic}
                                        className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-primary/25 transition-all"
                                        size="lg"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Generating Your Practice Session...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5 mr-2" />
                                                Generate & Start Practice
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div ref={sidebarRef} className="lg:col-span-4 space-y-6">
                            {/* Progress Card */}
                            <Card className="border-border shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <LayoutDashboard className="w-5 h-5 text-primary" />
                                        Your Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm font-medium">
                                            <span className="text-muted-foreground">Overall Proficiency</span>
                                            <span className="text-primary">{stats.averageScore || 0}%</span>
                                        </div>
                                        <Progress value={parseFloat(stats.averageScore || "0")} className="h-2" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Solved
                                            </div>
                                            <div className="text-xl font-bold">{stats.totalQuestions || 0}</div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Time
                                            </div>
                                            <div className="text-xl font-bold">{Math.floor((stats.totalTimeSpent || 0) / 60)}m</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Achievements */}
                            <Card className="border-border shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        Achievements
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                                <Star className="w-5 h-5 text-yellow-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">First Steps</div>
                                                <div className="text-xs text-muted-foreground">Complete your first practice</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 opacity-50">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <Zap className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">Speed Demon</div>
                                                <div className="text-xs text-muted-foreground">Complete 10 problems</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 opacity-50">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                <Award className="w-5 h-5 text-purple-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">Master Coder</div>
                                                <div className="text-xs text-muted-foreground">Achieve 90% average</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pro Tip */}
                            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/10 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-semibold text-primary">Pro Tip</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Consistency is key! Solving just 2-3 problems daily will significantly improve your coding skills over time.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}