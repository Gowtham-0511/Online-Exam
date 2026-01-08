"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useMsal } from "@azure/msal-react";
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Code2,
    Loader2,
    Sparkles,
    Search,
    Filter,
    Trophy,
    Target,
    Flame,
    CheckCircle2,
    Zap,
    ChevronRight,
    RefreshCw,
    Terminal,
    Brain
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PracticePage = () => {
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const router = useRouter();
    const containerRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("mcq");
    const [mcqTopic, setMcqTopic] = useState("");
    const [codingTopic, setCodingTopic] = useState("");
    const [customExam, setCustomExam] = useState({
        difficulty: "medium",
        duration: "30",
        questionCount: "10",
    });

    // Fetch practice questions
    const { data: questionsData, isLoading: questionsLoading, mutate: refetchQuestions } = useSWR(
        session?.username ? `/api/attender/practice/get-questions?email=${encodeURIComponent(session.username)}&limit=100` : null,
        fetcher
    );

    // Fetch progress
    const { data: progressData, isLoading: progressLoading } = useSWR(
        session?.username ? `/api/attender/practice/progress?email=${encodeURIComponent(session.username)}` : null,
        fetcher
    );

    const questions = questionsData?.questions || [];
    const progress = progressData?.progress || {};

    // Filter questions
    const filteredQuestions = useMemo(() => {
        return questions.filter((q: any) => {
            const title = q.title || '';
            const language = q.language || '';

            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                language.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(q.language);
            const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(q.difficulty);

            let matchesStatus = true;
            if (selectedStatus === 'completed') matchesStatus = q.hasPassed;
            if (selectedStatus === 'attempted') matchesStatus = q.userAttempts > 0 && !q.hasPassed;
            if (selectedStatus === 'new') matchesStatus = q.userAttempts === 0;

            return matchesSearch && matchesLanguage && matchesDifficulty && matchesStatus;
        });
    }, [questions, searchQuery, selectedLanguages, selectedDifficulties, selectedStatus]);

    // Animations
    useGSAP(() => {
        if (!questionsLoading && !progressLoading) {
            const tl = gsap.timeline();

            // Set initial states
            gsap.set(".animate-sidebar", { x: -20, autoAlpha: 0 });
            gsap.set(".animate-stats", { y: -20, autoAlpha: 0 });
            gsap.set(".animate-list", { y: 20, autoAlpha: 0 });
            gsap.set(".question-card", { y: 20, autoAlpha: 0 });

            // Animate to visible
            tl.to(".animate-sidebar", { x: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" })
                .to(".animate-stats", { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.5, ease: "back.out(1.2)" }, "-=0.3")
                .to(".animate-list", { y: 0, autoAlpha: 1, duration: 0.6, ease: "power2.out" }, "-=0.3")
                .to(".question-card", { y: 0, autoAlpha: 1, stagger: 0.05, duration: 0.4, ease: "power1.out" }, "-=0.4");
        }
    }, [questionsLoading, progressLoading]);

    const handleGenerateQuestions = async () => {
        const topic = activeTab === "mcq" ? mcqTopic : codingTopic;
        const questionType = activeTab === "mcq" ? "mcq" : "coding";

        if (!topic) return;

        setIsGenerating(true);

        try {
            const response = await fetch('/api/attender/practice/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: session?.username,
                    topic: topic,
                    difficulty: customExam.difficulty,
                    count: parseInt(customExam.questionCount),
                    questionType: questionType
                })
            });

            if (response.ok) {
                refetchQuestions();
                setShowGeneratorDialog(false);
                setMcqTopic("");
                setCodingTopic("");
            }
        } catch (error) {
            console.error('Generate error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleFilter = (list: string[], setList: (l: string[]) => void, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff?.toLowerCase()) {
            case 'easy': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'hard': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            default: return 'text-muted-foreground';
        }
    };

    if (questionsLoading || progressLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background p-6 lg:p-8 animate-in fade-in duration-500">
            <div className="max-w-[1800px] mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-sidebar">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <Code2 className="w-8 h-8 text-primary" />
                            Practice Arena
                        </h1>
                        <p className="text-muted-foreground mt-1">Sharpen your coding skills with AI-generated challenges.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* Left Sidebar: Filters & Generator */}
                    <div className="xl:col-span-3 space-y-6 animate-sidebar xl:sticky xl:top-8">

                        {/* Generator Card */}
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden shadow-lg relative group">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                    AI Generator
                                </CardTitle>
                                <CardDescription>
                                    Create custom problem sets instantly tailored to your needs.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={() => setShowGeneratorDialog(true)}
                                    className="w-full h-11 gap-2 bg-primary hover:bg-primary/90 shadow-md font-semibold"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Generate New Set
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Filters Card */}
                        <Card className="border-border bg-card/60 backdrop-blur-sm">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-base flex items-center gap-2 text-foreground/80">
                                    <Filter className="h-4 w-4" />
                                    Refine Results
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {/* Search */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Keywords, languages..."
                                            className="pl-9 bg-background/50 border-input/60"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                {/* Status */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {['All', 'New', 'Attempted', 'Completed'].map((status) => {
                                            const isActive = selectedStatus === (status === 'All' ? null : status.toLowerCase());
                                            return (
                                                <Badge
                                                    key={status}
                                                    variant="outline"
                                                    onClick={() => setSelectedStatus(status === 'All' ? null : status.toLowerCase())}
                                                    className={cn(
                                                        "cursor-pointer transition-all hover:bg-accent",
                                                        isActive ? "bg-primary/10 text-primary border-primary/20" : "bg-transparent text-muted-foreground"
                                                    )}
                                                >
                                                    {status}
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                {/* Difficulty */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</Label>
                                    <div className="space-y-2">
                                        {['Easy', 'Medium', 'Hard'].map((diff) => (
                                            <div key={diff} className="flex items-center space-x-2.5 group cursor-pointer" onClick={() => toggleFilter(selectedDifficulties, setSelectedDifficulties, diff)}>
                                                <Checkbox
                                                    id={`diff-${diff}`}
                                                    checked={selectedDifficulties.includes(diff)}
                                                    className="border-muted-foreground/40 data-[state=checked]:bg-primary"
                                                />
                                                <label htmlFor={`diff-${diff}`} className="text-sm font-medium text-foreground/80 group-hover:text-foreground cursor-pointer">
                                                    {diff}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                {/* Language */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Python', 'JavaScript', 'Java', 'C++', 'SQL', 'Rust'].map((lang) => (
                                            <div key={lang} className="flex items-center space-x-2.5 group cursor-pointer" onClick={() => toggleFilter(selectedLanguages, setSelectedLanguages, lang)}>
                                                <Checkbox
                                                    id={`lang-${lang}`}
                                                    checked={selectedLanguages.includes(lang)}
                                                    className="border-muted-foreground/40 data-[state=checked]:bg-primary"
                                                />
                                                <label htmlFor={`lang-${lang}`} className="text-sm font-medium text-foreground/80 group-hover:text-foreground cursor-pointer truncate">
                                                    {lang}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="xl:col-span-9 space-y-8 animate-list">

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-stats">
                            <StatCard
                                icon={Target}
                                label="Total Available"
                                value={progress.totalPracticeQuestions || 0}
                                color="text-primary"
                                bg="bg-primary/10"
                            />
                            <StatCard
                                icon={CheckCircle2}
                                label="Challenges Solved"
                                value={progress.questionsCompleted || 0}
                                color="text-emerald-500"
                                bg="bg-emerald-500/10"
                            />
                            <StatCard
                                icon={Trophy}
                                label="Average Score"
                                value={`${parseFloat(progress.averageScore || '0').toFixed(1)}%`}
                                color="text-amber-500"
                                bg="bg-amber-500/10"
                            />
                            <StatCard
                                icon={Flame}
                                label="Day Streak"
                                value={progress.currentStreak || 0}
                                color="text-rose-500"
                                bg="bg-rose-500/10"
                            />
                        </div>

                        {/* Questions List Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-muted-foreground" />
                                Challenge List
                            </h2>
                            <Badge variant="outline" className="px-3 py-1 bg-background">
                                {filteredQuestions.length} Results
                            </Badge>
                        </div>

                        {/* List */}
                        <div className="min-h-[500px]">
                            {filteredQuestions.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5 p-8">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Search className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No questions found</h3>
                                    <p className="text-muted-foreground mt-2 max-w-sm">
                                        Try adjusting your filters or use the generator to create new custom challenges.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={handleGenerateQuestions}
                                        className="mt-6 gap-2"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Auto-Generate
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {filteredQuestions.map((question: any) => (
                                        <div
                                            key={question.id}
                                            className="question-card group relative flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                                        >
                                            <div className="flex-1 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline" className={cn("text-xs font-semibold capitalize border", getDifficultyColor(question.difficulty))}>
                                                        {question.difficulty}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs font-medium bg-muted text-foreground/80">
                                                        {question.language}
                                                    </Badge>
                                                    {question.hasPassed && (
                                                        <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 pl-1.5">
                                                            <CheckCircle2 className="w-3 h-3" /> Solved
                                                        </Badge>
                                                    )}
                                                </div>

                                                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                                                    {question.questionTitle}
                                                </h3>

                                                <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                                                        {question.points || 10} XP
                                                    </span>
                                                    {question.userAttempts > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            Attempted {question.userAttempts} times
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 mt-2 md:mt-0">
                                                <Button
                                                    size="default"
                                                    variant={question.hasPassed ? "outline" : "default"}
                                                    className={cn(
                                                        "min-w-[140px] transition-all font-semibold",
                                                        !question.hasPassed && "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-md hover:shadow-indigo-500/20"
                                                    )}
                                                    onClick={() => router.push(`/practice/${question.id}`)}
                                                >
                                                    {question.hasPassed ? 'Review Code' : 'Start Challenge'}
                                                    <ChevronRight className="h-4 w-4 ml-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Generator Dialog - Consistent with Dream Exam styling */}
                <Dialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog}>
                    <DialogContent className="sm:max-w-lg gap-6">
                        <DialogHeader>
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <DialogTitle className="text-xl">Generate Custom Practice</DialogTitle>
                            <DialogDescription>
                                Configure the AI to architect a unique problem set for you.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <Tabs defaultValue="mcq" value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="mcq" className="gap-2">
                                        <Brain className="w-4 h-4" /> MCQ
                                    </TabsTrigger>
                                    <TabsTrigger value="coding" className="gap-2">
                                        <Code2 className="w-4 h-4" /> Coding
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="mcq" className="space-y-4 data-[state=active]:animate-in slide-in-from-left-2 fade-in mt-4">
                                    <div className="space-y-2">
                                        <Label>Topic of Interest</Label>
                                        <Input
                                            placeholder="e.g. System Design, React Hooks..."
                                            value={mcqTopic}
                                            onChange={(e) => setMcqTopic(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="coding" className="space-y-4 data-[state=active]:animate-in slide-in-from-right-2 fade-in mt-4">
                                    <div className="space-y-2">
                                        <Label>Target Language</Label>
                                        <Select value={codingTopic} onValueChange={setCodingTopic}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Select language..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Python">Python</SelectItem>
                                                {/* <SelectItem value="JavaScript">JavaScript</SelectItem>
                                                <SelectItem value="Java">Java</SelectItem> */}
                                                <SelectItem value="PySpark">PySpark (Data Bricks)</SelectItem>
                                                <SelectItem value="SQL">SQL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Difficulty</Label>
                                    <Select
                                        value={customExam.difficulty}
                                        onValueChange={(value) => setCustomExam({ ...customExam, difficulty: value })}
                                    >
                                        <SelectTrigger className="h-10">
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
                                    <Label>Count</Label>
                                    <Select
                                        value={customExam.questionCount}
                                        onValueChange={(value) => setCustomExam({ ...customExam, questionCount: value })}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5 Questions</SelectItem>
                                            <SelectItem value="10">10 Questions</SelectItem>
                                            <SelectItem value="15">15 Questions</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerateQuestions}
                                disabled={isGenerating || (activeTab === "mcq" ? !mcqTopic : !codingTopic)}
                                className="w-full h-12 text-base font-medium shadow-lg hover:shadow-primary/20 transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2 fill-white/20" />
                                        Generate Session
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, color, bg }: any) => (
    <Card className="animate-stats border-border/50 bg-card hover:bg-card/80 transition-all hover:-translate-y-1 hover:shadow-md">
        <CardContent className="p-5 flex flex-col gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-foreground">{value}</h3>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
            </div>
        </CardContent>
    </Card>
);

const LoadingSkeleton = () => (
    <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-12 gap-8">
            <div className="col-span-3 space-y-4">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div className="col-span-9 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
        </div>
    </div>
);

export default PracticePage;