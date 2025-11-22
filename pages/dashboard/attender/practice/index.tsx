import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    Clock,
    Zap,
    ChevronRight,
    Play,
    MoreHorizontal,
    RefreshCw
} from 'lucide-react';
import { PracticeProgressChart } from '@/components/attender/practice/PracticeProgressChart';
import Head from 'next/head';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PracticePage = () => {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch practice questions
    const { data: questionsData, isLoading: questionsLoading, mutate: refetchQuestions } = useSWR(
        session?.user?.email ? `/api/practice/get-questions?email=${encodeURIComponent(session.user.email)}&limit=100` : null,
        fetcher
    );

    // Fetch progress
    const { data: progressData, isLoading: progressLoading } = useSWR(
        session?.user?.email ? `/api/practice/progress?email=${encodeURIComponent(session.user.email)}` : null,
        fetcher
    );

    const questions = questionsData?.questions || [];
    const progress = progressData?.progress || {};
    const languageProgress = progressData?.progress?.languageProgress || {};
    const topicProgress = progressData?.progress?.topicProgress || {};

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

    const handleGenerateQuestions = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/practice/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session?.user?.email, count: 5 })
            });

            if (response.ok) {
                refetchQuestions();
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
            case 'easy': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900';
            case 'medium': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900';
            case 'hard': return 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900';
            default: return 'text-muted-foreground';
        }
    };

    if (status === 'loading' || questionsLoading || progressLoading) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <Skeleton className="h-9 w-80 mb-2" />
                            <Skeleton className="h-5 w-64" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-3">
                            <Card className="border-border">
                                <CardHeader>
                                    <Skeleton className="h-6 w-32 mb-2" />
                                    <Skeleton className="h-4 w-24" />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 w-full" />
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-9 space-y-6">
                            <Card className="border-border">
                                <CardHeader>
                                    <Skeleton className="h-8 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/2" />
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-32 w-full" />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    return (
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>Practice Arena | SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="space-y-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Code2 className="h-6 w-6 text-primary" />
                            Practice Arena
                        </h1>
                        <p className="text-muted-foreground">Sharpen your coding skills with AI-generated challenges</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar: Filters & Generator */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Generator Card */}
                        <Card className="border-border bg-gradient-to-br from-primary/5 to-purple-500/5">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    AI Generator
                                </CardTitle>
                                <CardDescription>
                                    Generate new personalized questions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={handleGenerateQuestions}
                                    disabled={isGenerating}
                                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4" />
                                            Generate Questions
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Filters Card */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    Filters
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Search */}
                                <div className="space-y-2">
                                    <Label>Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search questions..."
                                            className="pl-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Status */}
                                <div className="space-y-3">
                                    <Label>Status</Label>
                                    <div className="space-y-2">
                                        {['All', 'New', 'Attempted', 'Completed'].map((status) => (
                                            <div key={status} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`status-${status}`}
                                                    checked={selectedStatus === (status === 'All' ? null : status.toLowerCase())}
                                                    onCheckedChange={() => setSelectedStatus(status === 'All' ? null : status.toLowerCase())}
                                                />
                                                <label
                                                    htmlFor={`status-${status}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {status}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Difficulty */}
                                <div className="space-y-3">
                                    <Label>Difficulty</Label>
                                    <div className="space-y-2">
                                        {['Easy', 'Medium', 'Hard'].map((diff) => (
                                            <div key={diff} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`diff-${diff}`}
                                                    checked={selectedDifficulties.includes(diff)}
                                                    onCheckedChange={() => toggleFilter(selectedDifficulties, setSelectedDifficulties, diff)}
                                                />
                                                <label
                                                    htmlFor={`diff-${diff}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {diff}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Language */}
                                <div className="space-y-3">
                                    <Label>Language</Label>
                                    <div className="space-y-2">
                                        {['Python', 'JavaScript', 'Java', 'C++'].map((lang) => (
                                            <div key={lang} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`lang-${lang}`}
                                                    checked={selectedLanguages.includes(lang)}
                                                    onCheckedChange={() => toggleFilter(selectedLanguages, setSelectedLanguages, lang)}
                                                />
                                                <label
                                                    htmlFor={`lang-${lang}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
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
                    <div className="lg:col-span-9 space-y-6">
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="border-border bg-card hover:shadow-md transition-all">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                                        <Target className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Total Questions</p>
                                        <h3 className="text-2xl font-bold">{progress.totalPracticeQuestions || 0}</h3>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-border bg-card hover:shadow-md transition-all">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Completed</p>
                                        <h3 className="text-2xl font-bold">{progress.questionsCompleted || 0}</h3>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-border bg-card hover:shadow-md transition-all">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                                        <Trophy className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Avg Score</p>
                                        <h3 className="text-2xl font-bold">{parseFloat(progress.averageScore || '0').toFixed(1)}%</h3>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-border bg-card hover:shadow-md transition-all">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
                                        <Flame className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Streak</p>
                                        <h3 className="text-2xl font-bold">{progress.currentStreak || 0} Days</h3>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Progress Chart */}
                        {/* <PracticeProgressChart
                            languageProgress={languageProgress}
                            topicProgress={topicProgress}
                        /> */}

                        {/* Questions List */}
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Available Challenges</h2>
                                <Badge variant="outline">{filteredQuestions.length} Questions</Badge>
                            </div>

                            {filteredQuestions.length === 0 ? (
                                <Card className="border-dashed border-2">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Search className="h-10 w-10 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold">No questions found</h3>
                                        <p className="text-muted-foreground mt-2">
                                            Try adjusting your filters or generate new questions.
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={handleGenerateQuestions}
                                            className="mt-4 gap-2"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Generate Questions
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {filteredQuestions.map((question: any) => (
                                        <Card key={question.id} className="border-border hover:shadow-md transition-all group">
                                            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`text-xs font-normal capitalize ${getDifficultyColor(question.difficulty)}`}>
                                                            {question.difficulty}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            {question.language}
                                                        </Badge>
                                                        {question.hasPassed && (
                                                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
                                                                Solved
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                                        {question.title}
                                                    </h3>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Zap className="h-3 w-3" />
                                                            {question.points || 10} Points
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            ~15 mins
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <Button
                                                        variant={question.hasPassed ? "outline" : "default"}
                                                        className={question.hasPassed ? "" : "bg-primary hover:bg-primary/90"}
                                                        onClick={() => router.push(`/dashboard/attender/practice/${question.id}`)}
                                                    >
                                                        {question.hasPassed ? 'Review' : 'Solve Challenge'}
                                                        <ChevronRight className="h-4 w-4 ml-2" />
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
            </div>
        </UnifiedDashboardLayout>
    );
};

export default PracticePage;