"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Calendar,
    Target,
    Code,
    FileText,
    ChevronLeft,
    Search,
    Zap,
    MessageSquare,
    Loader2,
    Trophy,
    TrendingUp,
    Clock,
    Share2,
    Download,
    BarChart3
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const [selectedExam, setSelectedExam] = useState<ExamResult | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const containerRef = useRef(null);

    const { data: completedExams = [], error, isLoading } = useSWR<ExamResult[]>(
        session?.username
            ? `/api/attender/completed-exams?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            onSuccess: (data) => {
                if (data.length > 0 && !selectedExam) {
                    setSelectedExam(data[0]);
                }
            }
        }
    );

    // Animations
    useGSAP(() => {
        if (!isLoading && completedExams.length > 0) {
            const tl = gsap.timeline();
            tl.from(".animate-sidebar", { x: -20, opacity: 0, duration: 0.5, ease: "power2.out" })
                .from(".animate-main", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.3")
                .from(".animate-stat-card", { scale: 0.9, opacity: 0, stagger: 0.1, duration: 0.4, ease: "back.out(1.5)" }, "-=0.4");
        }
    }, [isLoading, completedExams.length]);

    const filteredExams = completedExams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.language.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const parseAnswers = (answersData: string | Answer[]): Answer[] => {
        if (Array.isArray(answersData)) return answersData;
        try { return JSON.parse(answersData); } catch { return []; }
    };

    const parseFeedback = (feedbackData: string | Feedback[]): Feedback[] => {
        if (Array.isArray(feedbackData)) return feedbackData;
        try { return JSON.parse(feedbackData); } catch { return []; }
    };

    const handleDownloadPDF = async () => {
        if (!selectedExam) return;
        setIsDownloading(true);

        const doc = new jsPDF();
        const answers = parseAnswers(selectedExam.answersWithQuestionIds);
        const feedback = parseFeedback(selectedExam.ai_feedback);

        // Load Logo
        const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        };

        try {
            // Header with Logo
            try {
                const logo = await loadImage('/syslogo.png');
                doc.addImage(logo, 'PNG', 14, 10, 15, 15);
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text("SysRank", 35, 20);
            } catch (e) {
                console.error("Logo load failed", e);
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text("SysRank", 14, 20);
            }

            // Report Title
            doc.setFontSize(16);
            doc.setFont("helvetica", "normal");
            doc.text("Performance Report", 14, 35);
            doc.setLineWidth(0.5);
            doc.line(14, 38, 196, 38);

            // Details
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Exam: ${selectedExam.title}`, 14, 48);
            doc.text(`User: ${selectedExam.userName || session?.name || 'Candidate'}`, 14, 53);
            doc.text(`Date: ${new Date(selectedExam.submittedAt).toLocaleDateString()}`, 14, 58);

            // Score Box
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(140, 42, 56, 20, 3, 3, "F");
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text("Score Obtained", 145, 50);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            const percentage = Number(selectedExam.percentage);
            if (percentage >= 80) doc.setTextColor(16, 185, 129); // Emerald
            else if (percentage >= 60) doc.setTextColor(245, 158, 11); // Amber
            else doc.setTextColor(239, 68, 68); // Rose
            doc.text(`${Number(selectedExam.percentage).toFixed(1)}%`, 145, 58);

            // Watermark function
            const addWatermark = () => {
                const totalPages = (doc as any).internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.saveGraphicsState();
                    // Attempt to set transparency using GState if available
                    try {
                        if ((doc as any).GState) {
                            doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
                        }
                    } catch (e) {
                        // Fallback
                    }

                    doc.setTextColor(200, 200, 200);
                    doc.setFontSize(60);
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();

                    doc.text("SysRank", pageWidth / 2, pageHeight / 2, {
                        align: "center",
                        angle: 45,
                        renderingMode: 'fill',
                    } as any);
                    doc.restoreGraphicsState();
                }
            };

            // Content Table
            const tableData = answers.map((ans, idx) => {
                const fb = feedback.find(f => f.questionId === ans.questionId);
                const marks = fb?.marks || 0;

                // Strip HTML tags for PDF
                const questionText = ans.question.replace(/<[^>]+>/g, '');
                const answerText = ans.selectedOptionText || ans.answer || 'N/A';
                const feedbackText = fb?.feedback.replace(/<[^>]+>/g, '') || 'No specific feedback.';

                return [
                    `Q${idx + 1}`,
                    `Question: ${questionText}\n\nYour Answer: ${answerText}\n\nAnalysis: ${feedbackText}`,
                    `${marks}/${ans.marks}`
                ];
            });

            autoTable(doc, {
                startY: 70,
                head: [['#', 'Analysis', 'Marks']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [124, 58, 237] }, // Violet primary color
                columnStyles: {
                    0: { cellWidth: 15, fontStyle: 'bold' },
                    2: { cellWidth: 20, fontStyle: 'bold', halign: 'center' }
                },
                styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
                didDrawPage: function (data) {
                    // Footer
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text('Confirm authenticity at sysrank.systechusa.com', 14, doc.internal.pageSize.height - 10);
                }
            });

            addWatermark();
            doc.save(`SysRank_Report_${selectedExam.title.replace(/\s+/g, '_')}.pdf`);

        } catch (err) {
            console.error(err);
        } finally {
            setIsDownloading(false);
        }
    };


    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return <ErrorState retry={() => window.location.reload()} />;
    }

    if (completedExams.length === 0) {
        return <EmptyState />;
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background p-6 lg:p-8 animate-in fade-in duration-500">
            <div className="max-w-[1800px] mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-sidebar">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-primary" />
                            Performance Analytics
                        </h1>
                        <p className="text-muted-foreground mt-1">Deep dive into your assessment history and AI insights.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* Sidebar: History - Sticky */}
                    <div className="xl:col-span-3 xl:sticky xl:top-8 animate-sidebar">
                        <Card className="border-border flex flex-col max-h-[calc(100vh-100px)] bg-card/50 backdrop-blur-sm overflow-hidden">
                            <div className="p-4 border-b border-border space-y-4 bg-muted/20">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filter assessments..."
                                        className="pl-9 bg-background border-border/50 focus-visible:ring-primary/20"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <ScrollArea className="h-[calc(100vh-200px)]">
                                <div className="p-3 space-y-2">
                                    {filteredExams.map((exam) => {
                                        const percentage = Number(exam.percentage);
                                        const isSelected = selectedExam?.id === exam.id;

                                        return (
                                            <div
                                                key={exam.id}
                                                onClick={() => setSelectedExam(exam)}
                                                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border ${isSelected
                                                    ? 'bg-primary/10 border-primary/30 shadow-sm'
                                                    : 'bg-card border-transparent hover:bg-muted/50 hover:border-border/50'
                                                    }`}
                                            >
                                                {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />}

                                                <div className="flex justify-between items-start gap-3 mb-2">
                                                    <h3 className={`font-semibold text-sm line-clamp-2 leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                        {exam.title}
                                                    </h3>
                                                    {exam.disqualified ? (
                                                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                                    ) : (
                                                        <Badge variant={isSelected ? "default" : "secondary"} className={`text-xs font-bold px-1.5 h-5`}>
                                                            {percentage.toFixed(0)}%
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <Code className="h-3 w-3" />
                                                        <span className="font-medium">{exam.language}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{new Date(exam.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredExams.length === 0 && (
                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                            No exams match your filter.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Main Content: Detailed Report - Smooth Scroll */}
                    {selectedExam && (() => {
                        const answers = parseAnswers(selectedExam.answersWithQuestionIds);
                        const feedback = parseFeedback(selectedExam.ai_feedback);
                        const percentage = Number(selectedExam.percentage);
                        const totalMarks = Number(selectedExam.totalMarksObtained);
                        const maxMarks = Number(selectedExam.totalPossibleMarks);

                        return (
                            <div className="xl:col-span-9 flex flex-col gap-6 animate-main">

                                {/* Top Stats Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        icon={Trophy}
                                        label="Overall Score"
                                        value={`${percentage.toFixed(1)}%`}
                                        subValue={percentage >= 80 ? "Excellent" : percentage >= 60 ? "Good" : "Needs Improvement"}
                                        color={percentage >= 80 ? "text-emerald-500" : percentage >= 60 ? "text-amber-500" : "text-rose-500"}
                                        bg={percentage >= 80 ? "bg-emerald-500/10" : percentage >= 60 ? "bg-amber-500/10" : "bg-rose-500/10"}
                                    />
                                    <StatCard
                                        icon={Target}
                                        label="Marks Obtained"
                                        value={totalMarks}
                                        subValue={`Out of ${maxMarks}`}
                                        color="text-primary"
                                        bg="bg-primary/10"
                                    />
                                    <StatCard
                                        icon={Clock}
                                        label="Time Taken"
                                        value={`${selectedExam.duration}m`}
                                        subValue="Duration"
                                        color="text-blue-500"
                                        bg="bg-blue-500/10"
                                    />
                                    <StatCard
                                        icon={Code}
                                        label="Tech Stack"
                                        value={selectedExam.language}
                                        subValue="Focus Area"
                                        color="text-violet-500"
                                        bg="bg-violet-500/10"
                                    />
                                </div>

                                {/* Detailed Analysis Tabs */}
                                <Card className="border-border bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
                                    <Tabs defaultValue="questions" className="w-full">
                                        <div className="px-6 py-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
                                            <div>
                                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                                    {selectedExam.title}
                                                    {selectedExam.disqualified && <Badge variant="destructive" className="ml-2">DQ</Badge>}
                                                </CardTitle>
                                                <CardDescription className="mt-1">
                                                    Detailed report including AI feedback
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {!selectedExam.disqualified && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleDownloadPDF}
                                                        disabled={isDownloading}
                                                        className="gap-2"
                                                    >
                                                        {isDownloading ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Download className="w-4 h-4" />
                                                        )}
                                                        Download PDF
                                                    </Button>
                                                )}
                                                <TabsList className="bg-background border border-border/50">
                                                    <TabsTrigger value="questions">Analysis</TabsTrigger>
                                                    <TabsTrigger value="code" disabled={!selectedExam.code}>Code</TabsTrigger>
                                                </TabsList>
                                            </div>
                                        </div>

                                        <TabsContent value="questions" className="mt-0">
                                            <div className="p-6 space-y-6">
                                                {selectedExam.disqualified ? (
                                                    <DisqualifiedState />
                                                ) : feedback.length === 0 && !selectedExam.ai_feedback ? (
                                                    <FeedbackLoadingState />
                                                ) : (
                                                    answers.map((answer, index) => {
                                                        const fb = feedback.find(f => f.questionId === answer.questionId);
                                                        return (
                                                            <QuestionCard
                                                                key={answer.questionId}
                                                                answer={answer}
                                                                feedback={fb}
                                                                index={index}
                                                            />
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="code" className="mt-0">
                                            <div className="p-6">
                                                <div className="relative group">
                                                    <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(selectedExam.code || '')}>Copy</Button>
                                                    </div>
                                                    <pre className="p-6 rounded-xl bg-zinc-950 text-zinc-50 font-mono text-sm overflow-x-auto border border-zinc-800 shadow-inner">
                                                        <code>{selectedExam.code || '// No code submission available'}</code>
                                                    </pre>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </Card>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner render
const StatCard = ({ icon: Icon, label, value, subValue, color, bg }: any) => (
    <Card className="animate-stat-card border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${bg} ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">{label}</p>
                <h3 className="text-xl font-bold text-foreground truncate" title={String(value)}>{value}</h3>
                <p className="text-xs text-muted-foreground truncate font-medium" title={String(subValue)}>{subValue}</p>
            </div>
        </CardContent>
    </Card>
);

const QuestionCard = ({ answer, feedback, index }: any) => {
    const marksObtained = feedback?.marks || 0;
    const isFullMarks = marksObtained === answer.marks;
    const isZeroMarks = marksObtained === 0;

    return (
        <Card className={`overflow-hidden border group transition-all duration-200 ${isFullMarks ? 'border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/10' :
            isZeroMarks ? 'border-rose-500/20 bg-rose-50/5 dark:bg-rose-950/10' :
                'border-border bg-card'
            }`}>
            <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0 gap-4">
                <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">Q{index + 1}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{answer.type || 'General'}</Badge>
                    </div>
                    <div className="text-sm font-medium text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: answer.question }} />
                </div>
                <div className="text-right shrink-0">
                    <span className={`text-xl font-bold ${isFullMarks ? 'text-emerald-500' : isZeroMarks ? 'text-rose-500' : 'text-amber-500'
                        }`}>
                        {marksObtained}
                    </span>
                    <span className="text-xs text-muted-foreground ml-0.5">/{answer.marks}</span>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-4 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Your Answer
                    </span>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-sm font-mono text-muted-foreground min-h-[80px]">
                        {answer.selectedOptionText || answer.answer || 'No answer provided'}
                    </div>
                </div>

                {feedback && (
                    <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" /> AI Insights
                        </span>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm text-foreground/80 leading-relaxed min-h-[80px]">
                            {feedback.feedback}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const DisqualifiedState = () => (
    <Card className="border-dashed border-2 border-rose-500/30 bg-rose-500/5 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Assessment Disqualified</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
                This session was flagged for proctoring violations. Score and detailed feedback have been withheld.
            </p>
        </div>
    </Card>
);

const FeedbackLoadingState = () => (
    <Card className="border-dashed border-2 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground">Generating Analysis</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
                Our AI is currently grading your submission and generating detailed feedback...
            </p>
        </div>
    </Card>
);

const LoadingSkeleton = () => (
    <div className="p-8 space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-12 gap-8">
            <div className="col-span-3 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
            <div className="col-span-9 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        </div>
    </div>
);

const ErrorState = ({ retry }: { retry: () => void }) => (
    <div className="h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold">Failed to load results</h2>
            <Button onClick={retry}>Retry Connection</Button>
        </div>
    </div>
);

const EmptyState = () => (
    <div className="h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">No Records Found</h2>
            <p className="text-muted-foreground">You haven't completed any exams yet. Complete an assessment to see your analytics here.</p>
        </div>
    </div>
);

export default ExamResultsPage;