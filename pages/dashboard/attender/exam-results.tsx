import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import AttenderLayout from './AttenderLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    Calendar,
    Award,
    Target,
    Code,
    FileText,
    ChevronLeft,
    Info,
    Lightbulb,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type Answer = {
    questionId: string;
    question: string;
    answer: string;
    marks: number;
    type?: string;
    selectedOption?: number;
    selectedOptionText?: string;
    originalIndex?: number;
};

type Feedback = {
    questionId: string;
    question: string;
    feedback: string;
    marks: number;
};

type ExamResult = {
    id: number;
    examId: string;
    title: string;
    language: string;
    submittedAt: string;
    disqualified: boolean;
    duration: number;
    totalMarksObtained: string | number;
    totalPossibleMarks: string | number;
    percentage: string | number;
    answers: string;
    answersWithQuestionIds: string | Answer[];
    ai_feedback: string | Feedback[];
    code?: string;
    userName: string;
};

const ExamResultsPage = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [selectedExam, setSelectedExam] = useState<ExamResult | null>(null);

    // Fetch completed exams using SWR
    const { data: completedExams = [], error, isLoading } = useSWR<ExamResult[]>(
        session?.user?.email
            ? `/api/attender/completed-exams?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            onSuccess: (data) => {
                // Set the first exam as selected if not already selected
                if (data.length > 0 && !selectedExam) {
                    setSelectedExam(data[0]);
                }
            }
        }
    );

    const parseAnswers = (answersData: string | Answer[]): Answer[] => {
        if (Array.isArray(answersData)) return answersData;
        try {
            return JSON.parse(answersData);
        } catch {
            return [];
        }
    };

    const parseFeedback = (feedbackData: string | Feedback[]): Feedback[] => {
        if (Array.isArray(feedbackData)) return feedbackData;
        try {
            return JSON.parse(feedbackData);
        } catch {
            return [];
        }
    };

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (percentage >= 60) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    const getScoreBgColor = (percentage: number) => {
        if (percentage >= 80) return 'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900';
        if (percentage >= 60) return 'bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900';
        return 'bg-rose-100 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900';
    };

    const getMarksColor = (obtained: number, total: number) => {
        const percentage = (obtained / total) * 100;
        if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (percentage >= 50) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    const stripHtmlTags = (html: string) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    // Loading State
    if (isLoading) {
        return (
            <AttenderLayout>
                <div className="space-y-6">
                    {/* Header Skeleton */}
                    <div className="flex items-center gap-4">
                        <div>
                            <Skeleton className="h-9 w-80 mb-2" />
                            <Skeleton className="h-5 w-64" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sidebar Skeleton */}
                        <div className="lg:col-span-1">
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

                        {/* Main Content Skeleton */}
                        <div className="lg:col-span-2 space-y-6">
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

                            <Card className="border-border">
                                <CardHeader>
                                    <Skeleton className="h-6 w-64 mb-2" />
                                    <Skeleton className="h-4 w-48" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[1, 2].map((i) => (
                                        <Skeleton key={i} className="h-64 w-full" />
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </AttenderLayout>
        );
    }

    // Error State
    if (error) {
        return (
            <AttenderLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Failed to load results</h2>
                        <p className="text-muted-foreground mb-6">There was an error fetching your exam results. Please try again.</p>
                        <Button onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </div>
                </div>
            </AttenderLayout>
        );
    }

    // Empty State
    if (completedExams.length === 0) {
        return (
            <AttenderLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="p-4 bg-muted/50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <FileText className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">No completed exams yet</h2>
                        <p className="text-muted-foreground mb-6">Start taking exams to see your results here</p>
                        <Button onClick={() => router.push('/dashboard/attender/view-exams')}>
                            Browse Exams
                        </Button>
                    </div>
                </div>
            </AttenderLayout>
        );
    }

    return (
        <AttenderLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Exam Results & Feedback</h1>
                        <p className="text-muted-foreground mt-1">Review your performance and AI feedback</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Exam List Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="border-border sticky top-6">
                            <CardHeader>
                                <CardTitle className="text-lg">Your Exams</CardTitle>
                                <CardDescription>{completedExams.length} completed</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {completedExams.map((exam) => {
                                    const percentage = typeof exam.percentage === 'string'
                                        ? parseFloat(exam.percentage)
                                        : exam.percentage;

                                    return (
                                        <Card
                                            key={exam.id}
                                            className={`p-4 cursor-pointer transition-all border ${selectedExam?.id === exam.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                            onClick={() => setSelectedExam(exam)}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                                                        {exam.title}
                                                    </h3>
                                                    {exam.disqualified ? (
                                                        <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        <Code className="h-3 w-3 mr-1" />
                                                        {exam.language}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${getScoreBgColor(percentage)}`}
                                                    >
                                                        {percentage.toFixed(0)}%
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(exam.submittedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    {selectedExam && (() => {
                        const answers = parseAnswers(selectedExam.answersWithQuestionIds);
                        const feedback = parseFeedback(selectedExam.ai_feedback);
                        const percentage = typeof selectedExam.percentage === 'string'
                            ? parseFloat(selectedExam.percentage)
                            : selectedExam.percentage;
                        const totalMarksObtained = typeof selectedExam.totalMarksObtained === 'string'
                            ? parseFloat(selectedExam.totalMarksObtained)
                            : selectedExam.totalMarksObtained;
                        const totalPossibleMarks = typeof selectedExam.totalPossibleMarks === 'string'
                            ? parseFloat(selectedExam.totalPossibleMarks)
                            : selectedExam.totalPossibleMarks;

                        return (
                            <div className="lg:col-span-2 space-y-6">
                                {/* Exam Overview Card */}
                                <Card className="border-border">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-2xl">{selectedExam.title}</CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-2">
                                                    <Calendar className="h-4 w-4" />
                                                    Submitted on {new Date(selectedExam.submittedAt).toLocaleDateString('en-US', {
                                                        month: 'long',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </CardDescription>
                                            </div>
                                            {selectedExam.disqualified && (
                                                <Badge variant="outline" className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200">
                                                    Disqualified
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Score Overview */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Card className="p-4 border-border bg-card">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground">Score</span>
                                                    <Award className={`h-5 w-5 ${getScoreColor(percentage)}`} />
                                                </div>
                                                <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
                                                    {percentage.toFixed(1)}%
                                                </div>
                                                <Progress value={percentage} className="mt-2 h-2" />
                                            </Card>

                                            <Card className="p-4 border-border bg-card">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground">Marks</span>
                                                    <Target className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="text-3xl font-bold text-foreground">
                                                    {totalMarksObtained}
                                                    <span className="text-lg text-muted-foreground">
                                                        /{totalPossibleMarks}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">Total marks obtained</p>
                                            </Card>

                                            <Card className="p-4 border-border bg-card">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground">Duration</span>
                                                    <Clock className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="text-3xl font-bold text-foreground">
                                                    {selectedExam.duration}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">minutes</p>
                                            </Card>
                                        </div>

                                        {/* Quick Info */}
                                        <div className="flex flex-wrap gap-3">
                                            <Badge variant="outline" className="text-sm py-1.5">
                                                <Code className="h-4 w-4 mr-2" />
                                                {selectedExam.language}
                                            </Badge>
                                            <Badge variant="outline" className="text-sm py-1.5">
                                                <FileText className="h-4 w-4 mr-2" />
                                                {answers.length} Questions
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Questions and Feedback */}
                                <Card className="border-border">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MessageSquare className="h-5 w-5" />
                                            Questions & AI Feedback
                                        </CardTitle>
                                        <CardDescription>
                                            Detailed feedback on your answers
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {selectedExam.disqualified ? (
                                            <div className="text-center py-12">
                                                <XCircle className="h-12 w-12 text-rose-600 dark:text-rose-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-foreground mb-2">Exam Disqualified</h3>
                                                <p className="text-muted-foreground">No feedback available for disqualified exams</p>
                                            </div>
                                        ) : feedback.length === 0 || !selectedExam.ai_feedback ? (
                                            <div className="text-center py-12">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                                <h3 className="text-lg font-medium text-foreground mb-2">AI is Evaluating Your Answers</h3>
                                                <p className="text-muted-foreground">Please wait while we generate feedback for your submission</p>
                                            </div>
                                        ) : (
                                            <>
                                                {answers.map((answer, index) => {
                                                    const questionFeedback = feedback.find(
                                                        f => f.questionId === answer.questionId
                                                    );
                                                    const marksPercentage = questionFeedback
                                                        ? (questionFeedback.marks / answer.marks * 100)
                                                        : 0;

                                                    return (
                                                        <Card key={answer.questionId} className="border-border bg-muted/30">
                                                            <CardHeader className="pb-4">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <Badge variant="outline" className="text-xs">
                                                                                Question {index + 1}
                                                                            </Badge>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-xs ${marksPercentage >= 80
                                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200'
                                                                                    : marksPercentage >= 50
                                                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200'
                                                                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200'
                                                                                    }`}
                                                                            >
                                                                                {questionFeedback?.marks || 0}/{answer.marks} marks
                                                                            </Badge>
                                                                            {answer.type && (
                                                                                <Badge variant="outline" className="text-xs capitalize">
                                                                                    {answer.type}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-base text-foreground prose prose-sm max-w-none dark:prose-invert">
                                                                            <div dangerouslySetInnerHTML={{ __html: answer.question }} />
                                                                        </div>
                                                                    </div>
                                                                    {marksPercentage >= 80 ? (
                                                                        <ThumbsUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                                    ) : marksPercentage >= 50 ? (
                                                                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                                    ) : (
                                                                        <ThumbsDown className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                                                                    )}
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="space-y-4">
                                                                {/* Your Answer */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-1 w-1 rounded-full bg-primary"></div>
                                                                        <h4 className="text-sm font-semibold text-foreground">Your Answer</h4>
                                                                    </div>
                                                                    <Card className="p-4 bg-card border-border">
                                                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                                                            {answer.selectedOptionText || answer.answer || 'No answer provided'}
                                                                        </p>
                                                                    </Card>
                                                                </div>

                                                                {/* AI Feedback */}
                                                                {questionFeedback && (
                                                                    <div className="space-y-3">
                                                                        <Separator />
                                                                        <div className="flex items-center gap-2">
                                                                            <Lightbulb className="h-4 w-4 text-primary" />
                                                                            <h4 className="text-sm font-semibold text-foreground">AI Feedback</h4>
                                                                        </div>
                                                                        <Card className="p-4 bg-primary/5 border-primary/20">
                                                                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                                                                {questionFeedback.feedback}
                                                                            </p>
                                                                        </Card>

                                                                        {/* Progress bar for marks */}
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="text-muted-foreground">Score</span>
                                                                                <span className={`font-medium ${getMarksColor(questionFeedback.marks, answer.marks)}`}>
                                                                                    {marksPercentage.toFixed(0)}%
                                                                                </span>
                                                                            </div>
                                                                            <Progress value={marksPercentage} className="h-2" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}

                                                {answers.length === 0 && (
                                                    <div className="text-center py-12">
                                                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                        <p className="text-muted-foreground">No questions found for this exam</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </AttenderLayout>
    );
};

export default ExamResultsPage;