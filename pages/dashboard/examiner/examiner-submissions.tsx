import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from 'swr';
import {
    Search,
    Download,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    FileText,
    Trophy,
    X,
    Mail,
    Calendar,
    Target,
    BarChart3,
    Loader2,
    Filter,
    MoreVertical,
    ChevronRight,
    AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import Head from "next/head";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Submission {
    ai_feedback: any;
    userName: string;
    examId: string;
    email: string;
    submittedAt: string;
    disqualified: boolean;
    answersWithQuestionIds?: any[];
    answers?: any[];
    answer?: any;
}

export default function ExaminerSubmissions() {
    const { data: session } = useSession();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "qualified" | "disqualified">("all");
    const [selectedExam, setSelectedExam] = useState("all");
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const { data: submissions = [], error: submissionsError, isLoading: loading } = useSWR(
        session?.user?.email
            ? `/api/submissions/by-examiner?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
        }
    );

    const downloadAsPDF = async (submission: Submission) => {
        try {
            setDownloadingId(submission.examId + submission.email);

            const doc = new jsPDF();
            let y = 20;
            const lineHeight = 6;
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            const sanitizeText = (text: string) => {
                return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
            };

            const addText = (text: string, fontSize = 11, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = 20;
                }
                doc.setFontSize(fontSize);
                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                doc.setTextColor(color[0], color[1], color[2]);

                const sanitizedText = sanitizeText(text);
                const lines = doc.splitTextToSize(sanitizedText, contentWidth);
                lines.forEach((line: string) => {
                    if (y > pageHeight - 30) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(line, margin, y);
                    y += lineHeight;
                });
                doc.setTextColor(0, 0, 0);
            };

            const addSpace = (space = 3) => {
                y += space;
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = 20;
                }
            };

            const stripHtml = (html: string) => {
                const tmp = document.createElement('DIV');
                tmp.innerHTML = html;
                const text = tmp.textContent || tmp.innerText || '';
                return text.replace(/\s+/g, ' ').trim();
            };

            // Header
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, pageWidth, 45, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.text('SysRank', pageWidth / 2, 18, { align: 'center' });

            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            doc.text('EXAM SUBMISSION REPORT', pageWidth / 2, 28, { align: 'center' });

            doc.setFontSize(10);
            doc.text('AI-Powered Assessment Review', pageWidth / 2, 36, { align: 'center' });

            doc.setTextColor(0, 0, 0);
            y = 55;

            // Candidate Info
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, contentWidth, 32, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.rect(margin, y, contentWidth, 32, 'S');

            y += 7;
            addText('Candidate Information', 13, true);
            addText(`Name: ${submission.userName || 'N/A'}`, 10, false);
            addText(`Email: ${submission.email || 'N/A'}`, 10, false);
            addText(`Exam ID: ${submission.examId || 'N/A'}`, 10, false);
            addText(`Submitted: ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}`, 10, false);
            addText(`Status: ${submission.disqualified ? 'DISQUALIFIED [X]' : 'QUALIFIED [OK]'}`, 10, true,
                submission.disqualified ? [220, 38, 38] : [34, 197, 94]);

            addSpace(5);

            let answersData: any[] = [];
            let feedbackData: any[] = [];

            try {
                if (typeof submission.answersWithQuestionIds === 'string') {
                    answersData = JSON.parse(submission.answersWithQuestionIds);
                } else if (Array.isArray(submission.answersWithQuestionIds)) {
                    answersData = submission.answersWithQuestionIds;
                }
            } catch (e) {
                console.error('Error parsing answers:', e);
            }

            try {
                if (submission.ai_feedback) {
                    if (typeof submission.ai_feedback === 'string') {
                        feedbackData = JSON.parse(submission.ai_feedback);
                    } else if (Array.isArray(submission.ai_feedback)) {
                        feedbackData = submission.ai_feedback;
                    }
                }
            } catch (e) {
                console.error('Error parsing feedback:', e);
            }

            // Overall Score
            if (feedbackData.length > 0) {
                const totalScore = feedbackData.reduce((sum, item) => sum + (item.marks || 0), 0);
                const totalPossible = answersData.reduce((sum, item) => sum + (item.marks || 0), 0);
                const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

                doc.setFillColor(59, 130, 246, 0.1);
                doc.rect(margin, y, contentWidth, 26, 'F')
                doc.setDrawColor(59, 130, 246);
                doc.setLineWidth(2);
                doc.rect(margin, y, contentWidth, 26, 'S');
                doc.setLineWidth(0.5);

                y += 8;
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(59, 130, 246);
                doc.text('OVERALL SCORE', margin + 5, y);

                doc.setFontSize(28);
                doc.text(`${totalScore}/${totalPossible}`, pageWidth - margin - 45, y + 4, { align: 'right' });

                doc.setFontSize(16);
                doc.text(`${percentage}%`, pageWidth - margin - 5, y + 4, { align: 'right' });

                doc.setTextColor(0, 0, 0);
                y += 22;
                addSpace(5);
            }

            // Questions, Answers & Feedback
            addText('DETAILED ASSESSMENT', 15, true, [31, 41, 55]);
            addSpace(3);

            const sortedAnswers = [...answersData].sort((a, b) =>
                (a.originalIndex ?? 0) - (b.originalIndex ?? 0)
            );

            sortedAnswers.forEach((answerItem, index) => {
                if (y > pageHeight - 100) {
                    doc.addPage();
                    y = 20;
                }

                const feedback = feedbackData.find(f => f.questionId === answerItem.questionId);
                const isCorrect = feedback && feedback.marks > 0;

                doc.setFillColor(isCorrect ? 220 : 254, isCorrect ? 252 : 226, isCorrect ? 231 : 230);
                doc.rect(margin, y, contentWidth, 10, 'F');
                doc.setDrawColor(isCorrect ? 34 : 220, isCorrect ? 197 : 38, isCorrect ? 94 : 38);
                doc.setLineWidth(1);
                doc.rect(margin, y, contentWidth, 10, 'S');
                doc.setLineWidth(0.5);

                y += 7;
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(31, 41, 55);
                doc.text(`Question ${index + 1}`, margin + 5, y);

                if (feedback) {
                    doc.setFontSize(11);
                    doc.setTextColor(isCorrect ? 34 : 220, isCorrect ? 197 : 38, isCorrect ? 94 : 38);
                    doc.text(`${feedback.marks} marks`, pageWidth - margin - 5, y, { align: 'right' });
                }

                doc.setTextColor(0, 0, 0);
                y += 6;

                addText('Question:', 10, true, [107, 114, 128]);
                const questionText = stripHtml(answerItem.question || 'No question text');
                addText(questionText, 9, false);
                addSpace(3);

                if (answerItem.type) {
                    const typeText = answerItem.type === 'mcq' ? 'MCQ' : 'Coding';
                    addText(typeText, 8, false, [107, 114, 128]);
                    addSpace(2);
                }

                addText("Student's Answer:", 10, true, [107, 114, 128]);
                const studentAnswer = answerItem.answer || answerItem.selectedOptionText || 'No answer provided';

                if (answerItem.type === 'mcq' && answerItem.selectedOption !== undefined) {
                    addText(`Selected Option: ${String.fromCharCode(65 + answerItem.selectedOption)} - ${studentAnswer}`, 9, false);
                } else {
                    const maxAnswerLength = 500;
                    const truncatedAnswer = studentAnswer.length > maxAnswerLength
                        ? studentAnswer.substring(0, maxAnswerLength) + '... (truncated)'
                        : studentAnswer;
                    addText(truncatedAnswer, 8, false);
                }
                addSpace(3);

                if (answerItem.expectedOutput) {
                    addText('Expected Output:', 10, true, [107, 114, 128]);
                    addText(answerItem.expectedOutput, 8, false);
                    addSpace(3);
                }

                if (feedback) {
                    doc.setFillColor(isCorrect ? 240 : 254, isCorrect ? 253 : 242, isCorrect ? 244 : 242);
                    const feedbackStartY = y;

                    const feedbackText = `AI Feedback: ${feedback.feedback}`;
                    const feedbackLines = doc.splitTextToSize(sanitizeText(feedbackText), contentWidth - 10);
                    const feedbackHeight = feedbackLines.length * lineHeight + 8;

                    if (y + feedbackHeight > pageHeight - 30) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.rect(margin, y, contentWidth, feedbackHeight, 'F');
                    doc.setDrawColor(isCorrect ? 34 : 220, isCorrect ? 197 : 38, isCorrect ? 94 : 38);
                    doc.setLineWidth(3);
                    doc.line(margin, y, margin, y + feedbackHeight);
                    doc.setLineWidth(0.5);

                    y += 6;
                    addText('AI Feedback:', 10, true, [107, 114, 128]);
                    addText(feedback.feedback, 9, false);
                    y = feedbackStartY + feedbackHeight + 2;
                }

                addSpace(5);

                doc.setDrawColor(229, 231, 235);
                doc.line(margin, y, pageWidth - margin, y);
                addSpace(5);
            });

            // Performance Summary
            if (feedbackData.length > 0) {
                if (y > pageHeight - 70) {
                    doc.addPage();
                    y = 20;
                }

                const correctCount = feedbackData.filter(f => f.marks > 0).length;
                const incorrectCount = feedbackData.filter(f => f.marks === 0).length;
                const totalQuestions = feedbackData.length;

                addSpace(5);
                addText('PERFORMANCE SUMMARY', 15, true, [31, 41, 55]);
                addSpace(3);

                doc.setFillColor(249, 250, 251);
                doc.rect(margin, y, contentWidth, 30, 'F');
                doc.setDrawColor(229, 231, 235);
                doc.rect(margin, y, contentWidth, 30, 'S');

                y += 8;

                const colWidth = contentWidth / 3;

                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(34, 197, 94);
                doc.text(`${correctCount}`, margin + colWidth / 2, y, { align: 'center' });
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128);
                doc.text('Correct', margin + colWidth / 2, y + 7, { align: 'center' });

                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(220, 38, 38);
                doc.text(`${incorrectCount}`, margin + colWidth + colWidth / 2, y, { align: 'center' });
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128);
                doc.text('Incorrect', margin + colWidth + colWidth / 2, y + 7, { align: 'center' });

                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(59, 130, 246);
                doc.text(`${totalQuestions}`, margin + colWidth * 2 + colWidth / 2, y, { align: 'center' });
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128);
                doc.text('Total Questions', margin + colWidth * 2 + colWidth / 2, y + 7, { align: 'center' });

                doc.setTextColor(0, 0, 0);
            }

            // Footer
            y = pageHeight - 20;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(107, 114, 128);
            doc.text(`Generated by SysRank on ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
            doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin, y, { align: 'right' });

            // Add violation images if disqualified
            if (submission.disqualified) {
                doc.addPage();
                y = 20;

                addText('[WARNING] DISQUALIFICATION EVIDENCE', 15, true, [220, 38, 38]);
                addSpace(3);
                addText('This candidate was disqualified due to exam violations.', 10, false);
                addSpace(5);
            }

            const filename = `SysRank-Report-${submission.examId}-${submission.email.split('@')[0]}-${Date.now()}.pdf`;
            doc.save(filename);

            toast.success('PDF downloaded successfully!');

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF. Please try again.");
        } finally {
            setDownloadingId(null);
        }
    };

    const parseFeedback = (feedbackString: string | null | any) => {
        if (!feedbackString) return [];

        if (typeof feedbackString === 'object') {
            return Array.isArray(feedbackString) ? feedbackString : [feedbackString];
        }

        try {
            const cleanedString = feedbackString.trim();
            return JSON.parse(cleanedString);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            return [];
        }
    };

    const calculateTotalMarks = (feedback: any[]) => {
        return feedback.reduce((sum, item) => sum + (item.marks || 0), 0);
    };

    const calculateTotalPossibleMarks = (submission: Submission) => {
        const answersData = typeof submission.answersWithQuestionIds === 'string'
            ? parseFeedback(submission.answersWithQuestionIds)
            : Array.isArray(submission.answersWithQuestionIds)
                ? submission.answersWithQuestionIds
                : [];

        return answersData.reduce((sum: any, item: { marks: any; }) => sum + (item.marks || 0), 0);
    };

    const calculatePercentage = (submission: Submission) => {
        const feedbackData = parseFeedback(submission.ai_feedback);
        const totalPossibleMarks = calculateTotalPossibleMarks(submission);

        if (totalPossibleMarks === 0) return 0;

        return Math.round((calculateTotalMarks(feedbackData) / totalPossibleMarks) * 100);
    };

    const getQuestionsAttempted = (submission: Submission) => {
        const answersData = typeof submission.answersWithQuestionIds === 'string'
            ? parseFeedback(submission.answersWithQuestionIds)
            : Array.isArray(submission.answersWithQuestionIds)
                ? submission.answersWithQuestionIds
                : [];

        return answersData.length;
    };

    const groupedSubmissions = useMemo(() => {
        const groups: { [examId: string]: Submission[] } = {};
        submissions.forEach((sub: Submission) => {
            if (!groups[sub.examId]) {
                groups[sub.examId] = [];
            }
            groups[sub.examId].push(sub);
        });
        return groups;
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        let filtered = submissions;

        if (filterStatus !== "all") {
            filtered = filtered.filter((s: Submission) =>
                filterStatus === "qualified" ? !s.disqualified : s.disqualified
            );
        }

        if (selectedExam !== "all") {
            filtered = filtered.filter((s: Submission) => s.examId === selectedExam);
        }

        if (searchQuery) {
            filtered = filtered.filter((s: Submission) =>
                s.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.examId.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [submissions, filterStatus, selectedExam, searchQuery]);

    const stats = useMemo(() => {
        const total = submissions.length;
        const qualified = submissions.filter((s: Submission) => !s.disqualified).length;
        const disqualified = submissions.filter((s: Submission) => s.disqualified).length;
        const avgScore = submissions.reduce((sum: number, s: Submission) => sum + calculatePercentage(s), 0) / (total || 1);

        return {
            total,
            qualified,
            disqualified,
            avgScore: Math.round(avgScore)
        };
    }, [submissions]);

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return "text-emerald-600 dark:text-emerald-400";
        if (percentage >= 60) return "text-blue-600 dark:text-blue-400";
        if (percentage >= 40) return "text-amber-600 dark:text-amber-400";
        return "text-rose-600 dark:text-rose-400";
    };

    const getScoreBg = (percentage: number) => {
        if (percentage >= 80) return "bg-emerald-50 dark:bg-emerald-950/30";
        if (percentage >= 60) return "bg-blue-50 dark:bg-blue-950/30";
        if (percentage >= 40) return "bg-amber-50 dark:bg-amber-950/30";
        return "bg-rose-50 dark:bg-rose-950/30";
    };

    const getProgressBgColor = (percentage: number) => {
        if (percentage >= 80) return "bg-emerald-500";
        if (percentage >= 60) return "bg-blue-500";
        if (percentage >= 40) return "bg-amber-500";
        return "bg-rose-500";
    };

    if (loading && !submissions.length) {
        return (
            <UnifiedDashboardLayout role="examiner">
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium animate-pulse">Loading submissions...</p>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    if (submissionsError) {
        return (
            <UnifiedDashboardLayout role="examiner">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Card className="max-w-md w-full border-destructive/20 shadow-lg">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center ring-4 ring-destructive/5">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Failed to load submissions</h3>
                                <p className="text-sm text-muted-foreground">
                                    We encountered an error while fetching the submission data.
                                </p>
                            </div>
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full"
                                variant="outline"
                            >
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    return (
        <UnifiedDashboardLayout role="examiner">
            <Head>
                <title>Submissions | SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background/50">
                {/* Header Section */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        Submissions
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        Review and manage candidate exam submissions
                                    </p>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-all duration-300">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total</p>
                                            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-emerald-500/20 transition-all duration-300">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Qualified</p>
                                            <p className="text-2xl font-bold text-foreground mt-1">{stats.qualified}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-rose-500/20 transition-all duration-300">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Disqualified</p>
                                            <p className="text-2xl font-bold text-foreground mt-1">{stats.disqualified}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-blue-500/20 transition-all duration-300">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                                            <p className="text-2xl font-bold text-foreground mt-1">{stats.avgScore}%</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Filters Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                                    <Input
                                        type="text"
                                        placeholder="Search by name, email, or exam ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-10 bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
                                    />
                                </div>
                                <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                                    <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-border/50">
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-4 h-4 text-muted-foreground" />
                                            <SelectValue placeholder="Status" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="qualified">Qualified</SelectItem>
                                        <SelectItem value="disqualified">Disqualified</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={selectedExam} onValueChange={setSelectedExam}>
                                    <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-border/50">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <SelectValue placeholder="Select Exam" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Exams</SelectItem>
                                        {Object.keys(groupedSubmissions).map(examId => (
                                            <SelectItem key={examId} value={examId}>{examId}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {filteredSubmissions.length === 0 ? (
                        <Card className="border-dashed border-2 bg-muted/5 hover:bg-muted/10 transition-colors duration-300">
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                    <div className="relative bg-background p-4 rounded-full ring-1 ring-border shadow-sm">
                                        <FileText className="w-12 h-12 text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="space-y-2 max-w-sm">
                                    <h3 className="text-xl font-semibold text-foreground">
                                        No submissions found
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {filterStatus !== "all" || selectedExam !== "all" || searchQuery
                                            ? "Try adjusting your filters or search query to find what you're looking for."
                                            : "Submissions will appear here once candidates start taking exams."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-[300px]">Candidate</TableHead>
                                        <TableHead>Exam ID</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead className="w-[200px]">Score</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSubmissions.map((submission: Submission, index: number) => {
                                        const percentage = calculatePercentage(submission);
                                        const totalMarks = calculateTotalPossibleMarks(submission);
                                        const score = calculateTotalMarks(parseFeedback(submission.ai_feedback));

                                        return (
                                            <TableRow
                                                key={`${submission.examId}-${submission.email}-${index}`}
                                                className="group hover:bg-muted/30 border-border/50 transition-colors"
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm ring-1 ring-primary/20">
                                                            {(submission.userName || submission.email).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-foreground">
                                                                {submission.userName || submission.email}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {submission.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {submission.examId}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(submission.submittedAt).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className={getScoreColor(percentage)}>{percentage}%</span>
                                                            <span className="text-muted-foreground">{score}/{totalMarks}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${getProgressBgColor(percentage)} transition-all duration-500`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {submission.disqualified ? (
                                                        <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-200">
                                                            Disqualified
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
                                                            Qualified
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setSelectedSubmission(submission)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => downloadAsPDF(submission)}
                                                            disabled={downloadingId === submission.examId + submission.email}
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                        >
                                                            {downloadingId === submission.examId + submission.email ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Download className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </div>

                {/* Detail Dialog */}
                <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-6 border-b border-border/50 bg-muted/10">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xl ring-1 ring-primary/20">
                                    {(selectedSubmission?.userName || selectedSubmission?.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-xl">
                                        {selectedSubmission?.userName || selectedSubmission?.email}
                                    </DialogTitle>
                                    <DialogDescription className="flex items-center gap-4">
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5" />
                                            {selectedSubmission?.email}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            {selectedSubmission?.examId}
                                        </span>
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <ScrollArea className="flex-1 p-6">
                            {selectedSubmission && (() => {
                                const percentage = calculatePercentage(selectedSubmission);
                                const totalMarks = calculateTotalPossibleMarks(selectedSubmission);
                                const score = calculateTotalMarks(parseFeedback(selectedSubmission.ai_feedback));
                                const questionsAttempted = getQuestionsAttempted(selectedSubmission);

                                return (
                                    <div className="space-y-8">
                                        {/* Score Overview */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Card className={`${getScoreBg(percentage)} border-none shadow-none`}>
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-sm font-medium opacity-80">Total Score</p>
                                                        <Trophy className={`w-5 h-5 ${getScoreColor(percentage)}`} />
                                                    </div>
                                                    <p className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
                                                        {score}/{totalMarks}
                                                    </p>
                                                    <p className={`text-sm font-medium mt-1 ${getScoreColor(percentage)} opacity-80`}>
                                                        {percentage}% accuracy
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-muted/50 border-none shadow-none">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-sm font-medium text-muted-foreground">Questions</p>
                                                        <Target className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <p className="text-3xl font-bold text-foreground">
                                                        {questionsAttempted}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        attempted
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-muted/50 border-none shadow-none">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                                                        <Clock className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <p className="text-lg font-bold text-foreground">
                                                        {new Date(selectedSubmission.submittedAt).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {new Date(selectedSubmission.submittedAt).toLocaleTimeString()}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Status Alert */}
                                        <div className={`p-4 rounded-lg border ${!selectedSubmission.disqualified
                                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50"
                                            : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/50"
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                {!selectedSubmission.disqualified ? (
                                                    <>
                                                        <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                                                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Candidate Qualified</p>
                                                            <p className="text-sm text-emerald-700 dark:text-emerald-300">This candidate has successfully passed the exam</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/50">
                                                            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-rose-900 dark:text-rose-100">Candidate Disqualified</p>
                                                            <p className="text-sm text-rose-700 dark:text-rose-300">This candidate was disqualified due to exam violations</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* AI Feedback Section */}
                                        {selectedSubmission.ai_feedback && (
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                                    <BarChart3 className="w-5 h-5 text-primary" />
                                                    AI Feedback Summary
                                                </h3>
                                                <div className="grid gap-4">
                                                    {parseFeedback(selectedSubmission.ai_feedback).map((feedback: any, idx: number) => (
                                                        <Card key={idx} className="border-border/50 shadow-sm">
                                                            <CardHeader className="p-4 pb-2">
                                                                <div className="flex items-center justify-between">
                                                                    <CardTitle className="text-sm font-medium">Question {idx + 1}</CardTitle>
                                                                    <Badge variant={feedback.marks > 0 ? "default" : "secondary"}>
                                                                        {feedback.marks || 0} marks
                                                                    </Badge>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="p-4 pt-2">
                                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                                    {feedback.feedback}
                                                                </p>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </ScrollArea>

                        <DialogFooter className="p-6 border-t border-border/50 bg-muted/10">
                            <Button
                                onClick={() => setSelectedSubmission(null)}
                                variant="outline"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </UnifiedDashboardLayout>
    );
}