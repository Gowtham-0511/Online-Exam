import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';
import { PracticeStatsCards } from '@/components/attender/practice/PracticeStatsCards';
import { PracticeProgressChart } from '@/components/attender/practice/PracticeProgressChart';
import { PracticeQuestionList } from '@/components/attender/practice/PracticeQuestionList';
import { PracticeFilterBar } from '@/components/attender/practice/PracticeFilterBar';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PracticePage = () => {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
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

    // console.log(questionsData)
    // console.log(progressData)

    const questions = questionsData?.questions || [];
    const progress = progressData?.progress || {};
    const languageProgress = progressData?.progress?.languageProgress || {};
    const topicProgress = progressData?.progress?.topicProgress || {};

    // Filter questions
    const filteredQuestions = useMemo(() => {
        return questions.filter((q: any) => {
            if (selectedLanguage && q.language !== selectedLanguage) return false;
            if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
            if (selectedStatus === 'completed' && !q.hasPassed) return false;
            if (selectedStatus === 'attempted' && (q.userAttempts === 0 || q.hasPassed)) return false;
            if (selectedStatus === 'new' && q.userAttempts > 0) return false;
            return true;
        });
    }, [questions, selectedLanguage, selectedDifficulty, selectedStatus]);

    const handleGenerateQuestions = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/practice/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session?.user?.email, count: 5 })
            });

            const result = await response.json();

            if (response.ok) {
                refetchQuestions();
            }
        } catch (error) {
            console.error('Generate error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (status === 'loading' || questionsLoading || progressLoading) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </UnifiedDashboardLayout>
        );
    }

    if (!session?.user?.email) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="text-center py-16">
                    <p className="text-muted-foreground">Please sign in to access practice questions.</p>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    const stats = {
        totalQuestions: progress.totalPracticeQuestions || 0,
        completed: progress.questionsCompleted || 0,
        avgScore: parseFloat(progress.averageScore) || 0,
        currentStreak: progress.currentStreak || 0
    };

    // console.log(stats);

    return (
        <UnifiedDashboardLayout role="attender">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Icons.Code2 className="h-8 w-8 text-primary" />
                            Practice Arena
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Sharpen your coding skills with AI-generated challenges
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerateQuestions}
                        disabled={isGenerating}
                        size="lg"
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

                {/* Stats Cards */}
                <PracticeStatsCards stats={stats} />

                {/* Progress Charts */}
                <PracticeProgressChart
                    languageProgress={languageProgress}
                    topicProgress={topicProgress}
                />

                {/* Questions Section */}
                <Card className="border-2">
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Practice Questions</CardTitle>
                                <CardDescription className="mt-1">
                                    {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} available
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* Filter Bar */}
                        <PracticeFilterBar
                            selectedLanguage={selectedLanguage}
                            selectedDifficulty={selectedDifficulty}
                            selectedStatus={selectedStatus}
                            onLanguageChange={setSelectedLanguage}
                            onDifficultyChange={setSelectedDifficulty}
                            onStatusChange={setSelectedStatus}
                        />

                        {/* Question List */}
                        <PracticeQuestionList
                            questions={filteredQuestions}
                            isLoading={questionsLoading}
                        />
                    </CardContent>
                </Card>
            </div>
        </UnifiedDashboardLayout>
    );
};

export default PracticePage;