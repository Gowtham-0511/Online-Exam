import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PracticeDashboardProps {
    email: string;
}

export const PracticeDashboard: React.FC<PracticeDashboardProps> = ({ email }) => {
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch practice questions
    const { data: questionsData, isLoading: questionsLoading, mutate: refetchQuestions } = useSWR(
        email ? `/api/practice/get-questions?email=${email}${selectedLanguage ? `&language=${selectedLanguage}` : ''}${selectedDifficulty ? `&difficulty=${selectedDifficulty}` : ''}` : null,
        fetcher
    );

    // Fetch progress
    const { data: progressData, isLoading: progressLoading } = useSWR(
        email ? `/api/practice/progress?email=${email}` : null,
        fetcher
    );

    console.log(progressData);

    const questions = questionsData?.questions || [];
    const progress = progressData?.progress || {};
    const statistics = progressData?.statistics || {};

    const handleGenerateQuestions = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/practice/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, count: 5 })
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(result.message);
                refetchQuestions();
            } else {
                alert(result.error || 'Failed to generate questions');
            }
        } catch (error) {
            console.error('Generate error:', error);
            alert('Failed to generate questions');
        } finally {
            setIsGenerating(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400';
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
            case 'hard': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-400';
        }
    };

    const getLanguageIcon = (language: string) => {
        switch (language.toLowerCase()) {
            case 'python': return <Icons.Code2 className="h-4 w-4" />;
            case 'javascript':
            case 'js': return <Icons.FileCode className="h-4 w-4" />;
            case 'sql': return <Icons.Database className="h-4 w-4" />;
            default: return <Icons.FileText className="h-4 w-4" />;
        }
    };

    if (questionsLoading || progressLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Questions</p>
                                <h3 className="text-2xl font-bold">{progress.totalPracticeQuestions || 0}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/10">
                                <Icons.BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <h3 className="text-2xl font-bold">{progress.questionsCompleted || 0}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10">
                                <Icons.CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Score</p>
                                <h3 className="text-2xl font-bold">
                                    {progress.averageScore ? `${progress.averageScore.toFixed(0)}%` : '0%'}
                                </h3>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10">
                                <Icons.Target className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>                {/* <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Score</p>
                                <h3 className="text-2xl font-bold">
                                    {progress.averageScore ? `${progress.averageScore.toFixed(0)}%` : '0%'}
                                </h3>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10">
                                <Icons.Target className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Streak</p>
                                <h3 className="text-2xl font-bold">{progress.currentStreak || 0} days</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-orange-500/10">
                                <Icons.Flame className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Icons.Code2 className="h-6 w-6 text-primary" />
                                Practice Questions
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Personalized coding challenges based on your weak areas
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleGenerateQuestions}
                            disabled={isGenerating}
                            className="gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Icons.Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Icons.Sparkles className="h-4 w-4" />
                                    Generate New Questions
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {/* Filters */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        <Button
                            variant={selectedLanguage === null ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedLanguage(null)}
                        >
                            All Languages
                        </Button>
                        {['Python', 'JavaScript', 'SQL'].map(lang => (
                            <Button
                                key={lang}
                                variant={selectedLanguage === lang ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedLanguage(lang)}
                            >
                                {lang}
                            </Button>
                        ))}

                        <div className="w-px h-6 bg-border mx-2" />

                        <Button
                            variant={selectedDifficulty === null ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedDifficulty(null)}
                        >
                            All Levels
                        </Button>
                        {['Easy', 'Medium', 'Hard'].map(diff => (
                            <Button
                                key={diff}
                                variant={selectedDifficulty === diff ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedDifficulty(diff)}
                            >
                                {diff}
                            </Button>
                        ))}
                    </div>

                    {/* Questions List */}
                    {questions.length > 0 ? (
                        <div className="space-y-3">
                            {questions.map((question: any) => (
                                <PracticeQuestionCard
                                    key={question.id}
                                    question={question}
                                    email={email}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                                <Icons.Code2 className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No practice questions yet</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                Generate personalized questions based on your weak areas
                            </p>
                            <Button onClick={handleGenerateQuestions} disabled={isGenerating}>
                                <Icons.Sparkles className="mr-2 h-4 w-4" />
                                Generate Questions
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Individual Question Card Component
interface PracticeQuestionCardProps {
    question: any;
    email: string;
}

const PracticeQuestionCard: React.FC<PracticeQuestionCardProps> = ({ question, email }) => {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400';
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
            case 'hard': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleStartPractice = () => {
        window.location.href = `/attender/practice/${question.id}`;
    };

    return (
        <div className="group relative p-5 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card">
            <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={`p-3 rounded-xl shrink-0 ${question.hasPassed
                    ? 'bg-emerald-500/10'
                    : question.userAttempts > 0
                        ? 'bg-amber-500/10'
                        : 'bg-blue-500/10'
                    }`}>
                    {question.hasPassed ? (
                        <Icons.CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : question.userAttempts > 0 ? (
                        <Icons.Target className="h-6 w-6 text-amber-600" />
                    ) : (
                        <Icons.Code2 className="h-6 w-6 text-blue-600" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold text-base">
                            {question.questionTitle}
                        </h3>
                        {question.bestScore !== null && (
                            <div className="text-right shrink-0">
                                <div className="text-lg font-bold text-primary">
                                    {question.bestScore.toFixed(0)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Best Score
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {question.weakArea}
                    </p>

                    <div className="flex items-center gap-3 flex-wrap mb-3">
                        <Badge variant="outline" className="text-xs">
                            <Icons.Code2 className="h-3 w-3 mr-1" />
                            {question.language}
                        </Badge>
                        <Badge className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                        </Badge>
                        {question.topic && (
                            <Badge variant="outline" className="text-xs">
                                <Icons.Tag className="h-3 w-3 mr-1" />
                                {question.topic}
                            </Badge>
                        )}
                        {question.userAttempts > 0 && (
                            <Badge variant="outline" className="text-xs">
                                <Icons.RotateCw className="h-3 w-3 mr-1" />
                                {question.userAttempts} {question.userAttempts === 1 ? 'attempt' : 'attempts'}
                            </Badge>
                        )}
                    </div>

                    <Button
                        onClick={handleStartPractice}
                        size="sm"
                        className="gap-2"
                    >
                        {question.hasPassed ? (
                            <>
                                <Icons.RotateCw className="h-3.5 w-3.5" />
                                Practice Again
                            </>
                        ) : question.userAttempts > 0 ? (
                            <>
                                <Icons.Play className="h-3.5 w-3.5" />
                                Continue
                            </>
                        ) : (
                            <>
                                <Icons.Play className="h-3.5 w-3.5" />
                                Start Practice
                            </>
                        )}
                    </Button>
                </div>

                <Icons.ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
        </div>
    );
};