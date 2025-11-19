import { useState, useEffect } from "react";
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
} from "lucide-react";
import Image from "next/image";

export default function LearningPage() {
    const router = useRouter();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

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
        if (savedTheme === "dark") {
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
                <title>Practice | SysRank - Coding Practice Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Header - HackerRank Style */}
                <header className="sticky top-0 z-50 border-b border-border bg-card">
                    <div className="container mx-auto px-4 sm:px-6">
                        <div className="flex h-16 items-center justify-between">
                            {/* Logo & Nav */}
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
                                    <div className="w-9 h-9 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                                        <Image src='/logo3.png' alt='logo' width={30} height={30} />
                                    </div>
                                    <span className="text-lg font-bold text-foreground hidden sm:block">SysRank</span>
                                </div>

                                {/* Main Nav */}
                                <nav className="hidden md:flex items-center gap-6">
                                    <Button variant="ghost" size="sm" className="font-semibold text-primary">
                                        Practice
                                    </Button>
                                    {/* <Button variant="ghost" size="sm" className="font-medium text-muted-foreground">
                                        Compete
                                    </Button>
                                    <Button variant="ghost" size="sm" className="font-medium text-muted-foreground">
                                        Learn
                                    </Button> */}
                                </nav>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                                    Sign In
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Hero Section - Compact HackerRank Style */}
                <section className="border-b border-border bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
                    <div className="container mx-auto px-4 sm:px-6 py-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="secondary" className="h-6">
                                        <Flame className="w-3 h-3 mr-1 text-orange-500" />
                                        Guest Mode
                                    </Badge>
                                    <Badge variant="outline" className="h-6">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        AI-Powered
                                    </Badge>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                                    Practice Coding Challenges
                                </h1>
                                <p className="text-muted-foreground">
                                    Solve problems, improve your skills, and prepare for interviews
                                </p>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-foreground">{stats.totalAttempts || 0}</div>
                                    <div className="text-xs text-muted-foreground">Attempts</div>
                                </div>
                                <Separator orientation="vertical" className="h-12" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">{stats.averageScore || 0}%</div>
                                    <div className="text-xs text-muted-foreground">Avg Score</div>
                                </div>
                                <Separator orientation="vertical" className="h-12" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-foreground">{stats.totalQuestions || 0}</div>
                                    <div className="text-xs text-muted-foreground">Solved</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content */}
                <div className="container mx-auto px-4 sm:px-6 py-8">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column - Practice Tracks */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Search & Filter */}
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search practice problems..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="icon">
                                    <Filter className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Practice Tracks */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-foreground">Practice by Topic</h2>
                                    <Button variant="ghost" size="sm">
                                        View All
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>

                                <div className="grid gap-4">
                                    {practiceTracks.map((track, index) => {
                                        const Icon = track.icon;
                                        return (
                                            <Card
                                                key={index}
                                                className="group hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg"
                                                onClick={() => {
                                                    setCustomExam({ ...customExam, topic: track.title });
                                                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                                }}
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`w-12 h-12 ${track.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                            <Icon className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                    {track.title}
                                                                </h3>
                                                                {track.badge && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {track.badge}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mb-3">
                                                                {track.description}
                                                            </p>
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                <div className="flex items-center gap-1">
                                                                    <Target className="w-3 h-3" />
                                                                    {track.problems} problems
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <BarChart3 className="w-3 h-3" />
                                                                    {track.difficulty}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" className="mt-2">
                                                            Start
                                                            <Play className="w-3 h-3 ml-1" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom Practice Section */}
                            <Card className="border-primary/20 bg-primary/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        Create Custom Practice
                                    </CardTitle>
                                    <CardDescription>
                                        Generate AI-powered questions tailored to your needs
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Topic */}
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
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select topic..." />
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

                                        {/* Difficulty */}
                                        <div className="space-y-2">
                                            <Label>Difficulty</Label>
                                            <Select
                                                value={customExam.difficulty}
                                                onValueChange={(value) => setCustomExam({ ...customExam, difficulty: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="easy">Easy</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="hard">Hard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Question Count */}
                                        <div className="space-y-2">
                                            <Label>Number of Questions</Label>
                                            <Select
                                                value={customExam.questionCount}
                                                onValueChange={(value) => setCustomExam({ ...customExam, questionCount: value })}
                                            >
                                                <SelectTrigger>
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

                                        {/* Duration */}
                                        <div className="space-y-2">
                                            <Label>Duration</Label>
                                            <Select
                                                value={customExam.duration}
                                                onValueChange={(value) => setCustomExam({ ...customExam, duration: value })}
                                            >
                                                <SelectTrigger>
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

                                    {/* Question Type */}
                                    {(customExam.topic === "SQL" || customExam.topic === "Python" || customExam.topic === "JavaScript" || customExam.topic === "Java" || customExam.topic === "PySpark" || customExam.topic === "PowerBI") && (
                                        <div className="space-y-2">
                                            <Label>Question Type</Label>
                                            <Select
                                                value={customExam.questionType}
                                                onValueChange={(value) => setCustomExam({ ...customExam, questionType: value })}
                                            >
                                                <SelectTrigger>
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
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Generating Questions...
                                            </>
                                        ) : (
                                            <>
                                                <Rocket className="w-4 h-4 mr-2" />
                                                Generate & Start Practice
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Sidebar - Stats & Progress */}
                        <div className="space-y-6">
                            {/* Your Progress */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Your Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Overall Score</span>
                                            <span className="font-bold text-primary">{stats.averageScore || 0}%</span>
                                        </div>
                                        <Progress value={parseFloat(stats.averageScore || "0")} className="h-2" />
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                Problems Solved
                                            </div>
                                            <span className="font-semibold text-foreground">{stats.totalQuestions || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Target className="w-4 h-4 text-blue-500" />
                                                Attempts
                                            </div>
                                            <span className="font-semibold text-foreground">{stats.totalAttempts || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="w-4 h-4 text-orange-500" />
                                                Time Spent
                                            </div>
                                            <span className="font-semibold text-foreground">
                                                {Math.floor((stats.totalTimeSpent || 0) / 60)}m
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Achievements */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        Achievements
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                                                <Star className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">First Steps</div>
                                                <div className="text-xs text-muted-foreground">Complete your first practice</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-50">
                                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                                <Zap className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">Speed Demon</div>
                                                <div className="text-xs text-muted-foreground">Complete 10 problems</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-50">
                                            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                                <Award className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">Master Coder</div>
                                                <div className="text-xs text-muted-foreground">Achieve 90% average</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Learning Tips */}
                            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Brain className="w-5 h-5 text-primary" />
                                        Pro Tip
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Practice consistently! Solving just 2-3 problems daily will significantly improve your coding skills.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}