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
    Brain,
    Calendar,
    Layers
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PracticePage = () => {
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const router = useRouter();
    const containerRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("mcq");
    const [mcqTopic, setMcqTopic] = useState("");
    const [codingTopic, setCodingTopic] = useState("");
    const [customExam, setCustomExam] = useState({
        difficulty: "medium",
        questionCount: "10",
    });

    // Fetch practice sets
    const { data: setsData, isLoading: setsLoading, mutate: refetchSets } = useSWR(
        session?.username ? `/api/attender/practice/get-sets?email=${encodeURIComponent(session.username)}` : null,
        fetcher
    );

    // Fetch progress (keep existing progress logic or update? existing likely fine)
    const { data: progressData, isLoading: progressLoading } = useSWR(
        session?.username ? `/api/attender/practice/progress?email=${encodeURIComponent(session.username)}` : null,
        fetcher
    );

    const sets = setsData?.sets || [];
    const progress = progressData?.progress || {};

    // Filter sets
    const filteredSets = useMemo(() => {
        return sets.filter((s: any) => {
            const title = s.title || '';
            const topic = s.topic || '';

            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                topic.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(s.difficulty);

            return matchesSearch && matchesDifficulty;
        });
    }, [sets, searchQuery, selectedDifficulties]);

    // Animations
    useGSAP(() => {
        if (!setsLoading && !progressLoading) {
            const tl = gsap.timeline();
            gsap.set(".animate-sidebar", { x: -20, autoAlpha: 0 });
            gsap.set(".animate-stats", { y: -20, autoAlpha: 0 });
            gsap.set(".animate-list", { y: 20, autoAlpha: 0 });
            gsap.set(".set-card", { y: 20, autoAlpha: 0 });

            tl.to(".animate-sidebar", { x: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" })
                .to(".animate-stats", { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.5, ease: "back.out(1.2)" }, "-=0.3")
                .to(".animate-list", { y: 0, autoAlpha: 1, duration: 0.6, ease: "power2.out" }, "-=0.3")
                .to(".set-card", { y: 0, autoAlpha: 1, stagger: 0.05, duration: 0.4, ease: "power1.out" }, "-=0.4");
        }
    }, [setsLoading, progressLoading]);

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
                const data = await response.json();
                setShowGeneratorDialog(false);
                setMcqTopic("");
                setCodingTopic("");

                // Navigate to the new set
                if (data.practiceSetId) {
                    router.push(`/attender/practice/set/${data.practiceSetId}`);
                } else {
                    refetchSets();
                }
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

    if (setsLoading || progressLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background p-6 lg:p-8 animate-in fade-in duration-500">
            <div className="max-w-[1800px] mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-sidebar">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <Layers className="w-8 h-8 text-primary" />
                            Practice Sessions
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage and take your AI-generated practice exams.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* Left Sidebar: Filters & Generator */}
                    <div className="xl:col-span-3 space-y-6 animate-sidebar xl:sticky xl:top-8">
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden shadow-lg relative group">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                    New Session
                                </CardTitle>
                                <CardDescription>
                                    Generate a new exam-like practice session tailored to you.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={() => setShowGeneratorDialog(true)}
                                    className="w-full h-11 gap-2 bg-primary hover:bg-primary/90 shadow-md font-semibold"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Generate Session
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
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Topic, Title..."
                                            className="pl-9 bg-background/50 border-input/60"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Separator className="bg-border/50" />
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</Label>
                                    <div className="space-y-2">
                                        {['easy', 'medium', 'hard'].map((diff) => (
                                            <div key={diff} className="flex items-center space-x-2.5 group cursor-pointer" onClick={() => toggleFilter(selectedDifficulties, setSelectedDifficulties, diff)}>
                                                <Checkbox
                                                    id={`diff-${diff}`}
                                                    checked={selectedDifficulties.includes(diff)}
                                                    className="border-muted-foreground/40 data-[state=checked]:bg-primary"
                                                />
                                                <label htmlFor={`diff-${diff}`} className="text-sm font-medium text-foreground/80 group-hover:text-foreground cursor-pointer capitalize">
                                                    {diff}
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
                                value={sets.length || 0}
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

                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Layers className="w-5 h-5 text-muted-foreground" />
                                Available Sessions
                            </h2>
                            <Badge variant="outline" className="px-3 py-1 bg-background">
                                {filteredSets.length} Sessions
                            </Badge>
                        </div>

                        <div className="min-h-[500px]">
                            {filteredSets.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5 p-8">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No sessions found</h3>
                                    <p className="text-muted-foreground mt-2 max-w-sm">
                                        Generate a new practice session to get started.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowGeneratorDialog(true)}
                                        className="mt-6 gap-2"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Create Session
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredSets.map((set: any) => (
                                        <Card key={set.id} className="set-card flex flex-col hover:shadow-lg transition-all border-l-4 border-l-primary/50 overflow-hidden cursor-pointer group"
                                            onClick={() => router.push(`/attender/practice/set/${set.id}`)}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline" className={cn("text-xs font-semibold capitalize border", getDifficultyColor(set.difficulty))}>
                                                        {set.difficulty}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(set.createdAt), 'MMM d')}
                                                    </span>
                                                </div>
                                                <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors text-lg">
                                                    {set.title}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2">
                                                    {set.topic} • {set.questionType === 'mcq' ? 'MCQ' : 'Coding'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="mt-auto pt-4 border-t border-border/50 bg-muted/20">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-muted-foreground">{set.totalQuestions} Questions</span>
                                                    <Button size="sm" variant="ghost" className="gap-1 group-hover:translate-x-1 transition-transform">
                                                        Start <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Generator Dialog (Same as before) */}
                <Dialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog}>
                    <DialogContent className="sm:max-w-lg gap-6">
                        <DialogHeader>
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <DialogTitle className="text-xl">Generate Practice Session</DialogTitle>
                            <DialogDescription>
                                Create a new set of questions to practice.
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

                                <TabsContent value="mcq" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Topic</Label>
                                        <Input
                                            placeholder="e.g. React Hooks..."
                                            value={mcqTopic}
                                            onChange={(e) => setMcqTopic(e.target.value)}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="coding" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Language</Label>
                                        <Select value={codingTopic} onValueChange={setCodingTopic}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select language..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Python">Python</SelectItem>
                                                <SelectItem value="PySpark">PySpark</SelectItem>
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

                                <div className="space-y-2">
                                    <Label>Count</Label>
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
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerateQuestions}
                                disabled={isGenerating || (activeTab === "mcq" ? !mcqTopic : !codingTopic)}
                                className="w-full"
                            >
                                {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Create Session"}
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
            </div>
            <div className="col-span-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
            </div>
        </div>
    </div>
);

export default PracticePage;