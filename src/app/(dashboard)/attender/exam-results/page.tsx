"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Calendar,
    Target,
    Code,
    FileText,
    ChevronLeft,
    Info,
    ThumbsUp,
    MessageSquare, Loader2, Sparkles, BookOpen, Send,
    Search,
    Zap
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Head from 'next/head';

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
    const [searchQuery, setSearchQuery] = useState("");

    const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [explanation, setExplanation] = useState<string>("");

    const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
    const [alternatives, setAlternatives] = useState<any>(null);
    const [loadingAlternatives, setLoadingAlternatives] = useState(false);

    const [showCodeReview, setShowCodeReview] = useState(false);
    const [codeReview, setCodeReview] = useState<any>(null);
    const [loadingCodeReview, setLoadingCodeReview] = useState(false);

    const [showTutorChat, setShowTutorChat] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [chatInput, setChatInput] = useState("");
    const [loadingChat, setLoadingChat] = useState(false);

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

    const filteredExams = completedExams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.language.toLowerCase().includes(searchQuery.toLowerCase())
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

    // Loading State
    if (isLoading) {
        return (
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
        );
    }

    // Error State
    if (error) {
        return (
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
        );
    }

    // Empty State
    if (completedExams.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="p-4 bg-muted/50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">No completed exams yet</h2>
                    <p className="text-muted-foreground mb-6">Start taking exams to see your results here</p>
                    {/* <Button onClick={() => router.push('/dashboard/attender/view-exams')}>
                        Browse Exams
                    </Button> */}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Performance Report</h1>
                        <p className="text-muted-foreground">Detailed analysis of your past assessments</p>
                    </div>
                    {/* <Button variant="outline" onClick={() => router.push('/dashboard/attender/view-exams')} className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Exams
                    </Button> */}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar: Exam List */}
                    <div className="lg:col-span-3 space-y-4">
                        <Card className="border-border h-[calc(100vh-200px)] flex flex-col">
                            <div className="p-4 border-b border-border space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search exams..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <ScrollArea className="h-[calc(85vh-220px)]">
                                <div className="p-2 space-y-1">
                                    {filteredExams.map((exam) => {
                                        const percentage = typeof exam.percentage === 'string'
                                            ? parseFloat(exam.percentage)
                                            : exam.percentage;
                                        const isSelected = selectedExam?.id === exam.id;

                                        return (
                                            <div
                                                key={exam.id}
                                                onClick={() => setSelectedExam(exam)}
                                                className={`group flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-all ${isSelected
                                                    ? 'bg-primary/10 hover:bg-primary/15'
                                                    : 'hover:bg-muted'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className={`font-medium text-sm line-clamp-2 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                        {exam.title}
                                                    </h3>
                                                    {exam.disqualified ? (
                                                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                                    ) : (
                                                        <span className={`text-xs font-bold ${getScoreColor(percentage)}`}>
                                                            {percentage.toFixed(0)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Code className="h-3 w-3" />
                                                        {exam.language}
                                                    </span>
                                                    <span>
                                                        {new Date(exam.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredExams.length === 0 && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            No exams found
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Main Content: Report */}
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
                            <div className="lg:col-span-9 space-y-6 animate-fade-in-up">
                                {/* Overview Card */}
                                <Card className="border-border overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500" />
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-2xl font-bold">{selectedExam.title}</CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-1">
                                                    <Calendar className="h-4 w-4" />
                                                    Submitted on {new Date(selectedExam.submittedAt).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </CardDescription>
                                            </div>
                                            {selectedExam.disqualified && (
                                                <Badge variant="destructive" className="text-sm px-3 py-1">
                                                    Disqualified
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center text-center">
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Score</div>
                                                <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
                                                    {percentage.toFixed(1)}%
                                                </div>
                                                <Progress value={percentage} className="h-1.5 w-24 mt-2" />
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center text-center">
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Marks</div>
                                                <div className="text-3xl font-bold text-foreground">
                                                    {totalMarksObtained}<span className="text-lg text-muted-foreground">/{totalPossibleMarks}</span>
                                                </div>
                                                <Target className="h-4 w-4 text-primary mt-2" />
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center text-center">
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Duration</div>
                                                <div className="text-3xl font-bold text-foreground">
                                                    {selectedExam.duration}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">minutes</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center text-center">
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Language</div>
                                                <div className="text-2xl font-bold text-foreground uppercase">
                                                    {selectedExam.language}
                                                </div>
                                                <Code className="h-4 w-4 text-primary mt-2" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Questions List */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <MessageSquare className="h-5 w-5 text-primary" />
                                            Question Analysis
                                        </h2>
                                        <Badge variant="outline">{answers.length} Questions</Badge>
                                    </div>

                                    {selectedExam.disqualified ? (
                                        <Card className="border-dashed border-2 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
                                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                                <XCircle className="h-12 w-12 text-rose-500 mb-4" />
                                                <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-400">Exam Disqualified</h3>
                                                <p className="text-muted-foreground max-w-md mt-2">
                                                    Detailed feedback is not available for disqualified exams due to violation of proctoring rules.
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ) : feedback.length === 0 || !selectedExam.ai_feedback ? (
                                        <Card className="border-dashed border-2">
                                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                                                <h3 className="text-lg font-semibold">Generating Feedback</h3>
                                                <p className="text-muted-foreground mt-2">
                                                    Our AI is currently analyzing your answers. This may take a moment.
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="space-y-4">
                                            {answers.map((answer, index) => {
                                                const questionFeedback = feedback.find(f => f.questionId === answer.questionId);
                                                const marksPercentage = questionFeedback
                                                    ? (questionFeedback.marks / answer.marks * 100)
                                                    : 0;

                                                return (
                                                    <Card key={answer.questionId} className="border-border overflow-hidden transition-all hover:shadow-md">
                                                        <div className={`h-1 w-full ${marksPercentage >= 80 ? 'bg-emerald-500' : marksPercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                        <CardHeader className="pb-2">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="space-y-1 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                                            Q{index + 1}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-xs font-normal capitalize">
                                                                            {answer.type || 'General'}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="text-base font-medium text-foreground prose prose-sm max-w-none dark:prose-invert line-clamp-2 hover:line-clamp-none transition-all">
                                                                        <div dangerouslySetInnerHTML={{ __html: answer.question }} />
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                                    <div className={`text-lg font-bold ${getMarksColor(questionFeedback?.marks || 0, answer.marks)}`}>
                                                                        {questionFeedback?.marks || 0}<span className="text-sm text-muted-foreground font-normal">/{answer.marks}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="pt-2 space-y-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Answer</span>
                                                                    <div className="p-3 bg-muted/30 rounded-lg border border-border text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                                        {answer.selectedOptionText || answer.answer || 'No answer provided'}
                                                                    </div>
                                                                </div>
                                                                {questionFeedback && (
                                                                    <div className="space-y-2">
                                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                                                            <Zap className="h-3 w-3 text-yellow-500" /> AI Feedback
                                                                        </span>
                                                                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 text-sm leading-relaxed">
                                                                            {questionFeedback.feedback}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </>
    );
};

export default ExamResultsPage;