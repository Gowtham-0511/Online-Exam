import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
    Clock,
    CheckCircle2,
    Circle,
    ChevronLeft,
    ChevronRight,
    Flag,
    Ghost,
    Trophy,
    Target,
    ArrowLeft,
    Award,
    Zap,
    TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface Question {
    questionText: string;
    options: Array<{ id: number; text: string; isCorrect: boolean }>;
    marks: number;
    tags: string[];
}

interface Exam {
    examId: string;
    title: string;
    description: string;
    questions: Question[];
    duration: number;
}

const GhostModeExam = () => {
    const router = useRouter();
    const { examId } = router.query;

    const [exam, setExam] = useState<Exam | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [score, setScore] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [timerActive, setTimerActive] = useState(true);

    // Load exam from localStorage
    useEffect(() => {
        if (!examId) return;

        const stored = localStorage.getItem(`ghost_exam_${examId}`);
        if (stored) {
            const examData = JSON.parse(stored);
            setExam(examData);
        } else {
            router.push('/dashboard/attender/ghost-mode');
        }
    }, [examId, router]);

    // Enter fullscreen on mount
    useEffect(() => {
        const enterFullscreen = async () => {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (error) {
                console.log('Fullscreen request failed:', error);
            }
        };

        enterFullscreen();

        // Exit fullscreen on unmount
        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log('Exit fullscreen failed:', err));
            }
        };
    }, []);

    // Elapsed time tracker
    useEffect(() => {
        if (!timerActive) return;

        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timerActive]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerSelect = (optionIndex: number) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: optionIndex
        }));
    };

    const toggleFlag = () => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentQuestionIndex)) {
                newSet.delete(currentQuestionIndex);
            } else {
                newSet.add(currentQuestionIndex);
            }
            return newSet;
        });
    };

    const navigateToQuestion = (index: number) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentQuestionIndex(index);
            setIsTransitioning(false);
        }, 150);
    };

    const handleSubmit = () => {
        if (!exam) return;

        let totalScore = 0;
        exam.questions.forEach((question, index) => {
            const selectedOption = selectedAnswers[index];
            if (selectedOption !== undefined) {
                const isCorrect = question.options[selectedOption]?.isCorrect;
                if (isCorrect) {
                    totalScore += question.marks;
                }
            }
        });

        setScore(totalScore);
        setShowSubmitDialog(false);
        setTimerActive(false); // Stop the timer
        setShowResults(true);

        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log('Exit fullscreen failed:', err));
        }

        // Clear from localStorage
        localStorage.removeItem(`ghost_exam_${examId}`);
    };

    const handleExit = () => {
        if (examId) {
            localStorage.removeItem(`ghost_exam_${examId}`);
        }
        router.push('/dashboard/attender/ghost-mode');
    };

    if (!exam) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Ghost className="w-16 h-16 mx-auto text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground animate-pulse">Loading exam...</p>
                </div>
            </div>
        );
    }

    const currentQuestion = exam.questions[currentQuestionIndex];
    const answeredCount = Object.keys(selectedAnswers).length;
    const totalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);
    const progressPercentage = (answeredCount / exam.questions.length) * 100;

    if (showResults) {
        const percentage = (score / totalMarks) * 100;
        const isPassed = percentage >= 60;

        return (
            <>
                <Head>
                    <title>Exam Results - Ghost Mode</title>
                    <link rel="icon" href="/logo3.png" />
                </Head>

                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-50 dark:from-slate-950 dark:via-background dark:to-slate-950 flex items-center justify-center p-6">
                    <Card className="max-w-3xl w-full border-border/50 shadow-2xl animate-in fade-in zoom-in duration-500">
                        <CardContent className="p-0">
                            {/* Header Banner */}
                            <div className={`h-2 ${isPassed ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`} />

                            <div className="p-8 space-y-8">
                                {/* Success Icon */}
                                <div className="text-center space-y-4 animate-in slide-in-from-bottom-4 duration-700">
                                    <div className={`w-24 h-24 rounded-full ${isPassed ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'} flex items-center justify-center mx-auto animate-in zoom-in duration-500 delay-150`}>
                                        {isPassed ? (
                                            <Trophy className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <Target className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold mb-2">
                                            {isPassed ? 'Excellent Work!' : 'Good Effort!'}
                                        </h1>
                                        <p className="text-muted-foreground text-lg">
                                            {isPassed
                                                ? "You've demonstrated strong understanding of the concepts."
                                                : "Keep practicing to improve your performance."
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Score Display */}
                                <div className="relative animate-in slide-in-from-bottom-4 duration-700 delay-300">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl blur-xl" />
                                    <Card className="relative border-2 border-primary/20 bg-card/50 backdrop-blur">
                                        <CardContent className="p-6">
                                            <div className="text-center space-y-3">
                                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Score</p>
                                                <div className="flex items-baseline justify-center gap-2">
                                                    <span className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                                        {percentage.toFixed(1)}
                                                    </span>
                                                    <span className="text-3xl font-semibold text-muted-foreground">%</span>
                                                </div>
                                                <p className="text-lg text-muted-foreground">
                                                    {score} out of {totalMarks} marks
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-500">
                                    <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                                        <CardContent className="p-4 text-center space-y-2">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <p className="text-2xl font-bold">{answeredCount}/{exam.questions.length}</p>
                                            <p className="text-xs text-muted-foreground">Questions</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                                        <CardContent className="p-4 text-center space-y-2">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
                                            <p className="text-xs text-muted-foreground">Time Spent</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                                        <CardContent className="p-4 text-center space-y-2">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <p className="text-2xl font-bold">{score}</p>
                                            <p className="text-xs text-muted-foreground">Points Earned</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Performance Bar */}
                                <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-700 delay-700">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">Performance</span>
                                        <span className="font-semibold">{percentage.toFixed(0)}%</span>
                                    </div>
                                    <Progress value={percentage} className="h-3" />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                </div>

                                {/* Ghost Mode Notice */}
                                <div className="animate-in slide-in-from-bottom-4 duration-700 delay-1000">
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                                                <Ghost className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                                    Ghost Mode - Practice Session
                                                </p>
                                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                                    This was a practice exam. Your results won't be recorded in your profile.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <Button
                                    onClick={handleExit}
                                    className="w-full h-12 text-base font-medium group animate-in slide-in-from-bottom-4 duration-700 delay-1000"
                                    size="lg"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                    Back to Ghost Mode
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>{exam.title} - Ghost Mode</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                {exam.title}
                            </h1>
                            <Badge variant="outline" className="gap-1.5 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                                <Ghost className="w-3 h-3" />
                                Ghost Mode
                            </Badge>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                                <Clock className="w-4 h-4 text-primary" />
                                <span className="font-mono font-semibold text-sm">{formatTime(elapsedTime)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="font-medium">{answeredCount}</span>
                                </div>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-muted-foreground">{exam.questions.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-muted">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Question Navigation Sidebar */}
                    <div className="w-72 border-r bg-muted/30 overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold mb-1">Question Palette</h3>
                                <p className="text-xs text-muted-foreground">Click to navigate</p>
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                                {exam.questions.map((_, index) => {
                                    const isAnswered = selectedAnswers[index] !== undefined;
                                    const isFlagged = flaggedQuestions.has(index);
                                    const isCurrent = index === currentQuestionIndex;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => navigateToQuestion(index)}
                                            className={`
                                                relative h-11 rounded-lg font-medium text-sm transition-all duration-200
                                                ${isCurrent
                                                    ? 'bg-primary text-primary-foreground shadow-lg scale-105 ring-2 ring-primary/20'
                                                    : isAnswered
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                                        : 'bg-card border-2 border-border hover:border-primary/50 hover:bg-accent'
                                                }
                                            `}
                                        >
                                            {index + 1}
                                            {isFlagged && (
                                                <Flag className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <Separator />

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-primary" />
                                    <span className="text-muted-foreground">Current</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-900/50" />
                                    <span className="text-muted-foreground">Answered</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-card border-2 border-border" />
                                    <span className="text-muted-foreground">Not Answered</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-card border-2 border-border relative">
                                        <Flag className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                                    </div>
                                    <span className="text-muted-foreground">Flagged</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                            <div className={`max-w-5xl mx-auto p-8 transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                                <div className="space-y-6">
                                    {/* Question Header */}
                                    <div className="flex items-start justify-between animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Badge className="text-sm px-3 py-1">
                                                    Question {currentQuestionIndex + 1} of {exam.questions.length}
                                                </Badge>
                                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                                    {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                                                </Badge>
                                            </div>
                                            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {currentQuestion.tags.map((tag, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs font-normal">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant={flaggedQuestions.has(currentQuestionIndex) ? "default" : "ghost"}
                                            size="sm"
                                            onClick={toggleFlag}
                                            className={`gap-2 ${flaggedQuestions.has(currentQuestionIndex) ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50' : ''}`}
                                        >
                                            <Flag className={`w-4 h-4 ${flaggedQuestions.has(currentQuestionIndex) ? 'fill-current' : ''}`} />
                                            {flaggedQuestions.has(currentQuestionIndex) ? 'Flagged' : 'Flag'}
                                        </Button>
                                    </div>

                                    {/* Question Card */}
                                    <Card className="border-border/50 shadow-lg animate-in slide-in-from-bottom-4 duration-500">
                                        <CardContent className="p-8 space-y-8">
                                            {/* Question Text */}
                                            <div
                                                className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-p:text-foreground prose-p:leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }}
                                            />

                                            <Separator />

                                            {/* Options */}
                                            <div>
                                                <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                                                    Select your answer
                                                </h4>
                                                <RadioGroup
                                                    value={selectedAnswers[currentQuestionIndex]?.toString()}
                                                    onValueChange={(value) => handleAnswerSelect(parseInt(value))}
                                                >
                                                    <div className="space-y-3">
                                                        {currentQuestion.options.map((option, index) => {
                                                            const isSelected = selectedAnswers[currentQuestionIndex] === index;
                                                            return (
                                                                <div
                                                                    key={index}
                                                                    className={`
                                                                        group flex items-start gap-4 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                                                                        ${isSelected
                                                                            ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                                                            : 'border-border hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm'
                                                                        }
                                                                    `}
                                                                    onClick={() => handleAnswerSelect(index)}
                                                                >
                                                                    <RadioGroupItem
                                                                        value={index.toString()}
                                                                        id={`option-${index}`}
                                                                        className="mt-0.5 flex-shrink-0"
                                                                    />
                                                                    <Label
                                                                        htmlFor={`option-${index}`}
                                                                        className="flex-1 cursor-pointer"
                                                                    >
                                                                        <div className="flex items-start gap-3">
                                                                            <span className={`
                                                                                flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold
                                                                                ${isSelected
                                                                                    ? 'bg-primary text-primary-foreground'
                                                                                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10'
                                                                                }
                                                                            `}>
                                                                                {String.fromCharCode(65 + index)}
                                                                            </span>
                                                                            <span className="flex-1 leading-relaxed">
                                                                                {option.text}
                                                                            </span>
                                                                        </div>
                                                                    </Label>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Navigation */}
                        <div className="border-t bg-card/50 backdrop-blur">
                            <div className="max-w-5xl mx-auto px-8 py-4">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className="gap-2 group"
                                    >
                                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                        Previous
                                    </Button>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">{currentQuestionIndex + 1}</span>
                                        <span>/</span>
                                        <span>{exam.questions.length}</span>
                                    </div>

                                    {currentQuestionIndex === exam.questions.length - 1 ? (
                                        <Button
                                            onClick={() => setShowSubmitDialog(true)}
                                            size="lg"
                                            className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
                                        >
                                            <Zap className="w-4 h-4" />
                                            Submit Exam
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => navigateToQuestion(Math.min(exam.questions.length - 1, currentQuestionIndex + 1))}
                                            className="gap-2 group"
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Confirmation Dialog */}
                <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-6 h-6 text-primary" />
                            </div>
                            <DialogTitle className="text-center text-xl">Submit Exam?</DialogTitle>
                            <DialogDescription className="text-center space-y-2">
                                <p>You have answered <span className="font-semibold text-foreground">{answeredCount}</span> out of <span className="font-semibold text-foreground">{exam.questions.length}</span> questions.</p>
                                {answeredCount < exam.questions.length && (
                                    <p className="text-amber-600 dark:text-amber-400 font-medium">
                                        ⚠️ {exam.questions.length - answeredCount} question(s) remain unanswered.
                                    </p>
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} className="flex-1">
                                Review Answers
                            </Button>
                            <Button onClick={handleSubmit} className="flex-1">
                                Confirm Submit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
};

export default GhostModeExam;
