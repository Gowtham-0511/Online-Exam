import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { useSession } from "next-auth/react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Loader2,
    Mail,
    TrendingUp,
    Users,
    X,
    XCircle
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ExaminerLayout from "./ExaminerLayout";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

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

interface Question {
    id: string;
    examId: string;
    questionText: string;
    expectedOutput?: string;
    order: number;
    questions?: string;
}

export default function ExaminerSubmissions() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [questionsCache, setQuestionsCache] = useState<{ [examId: string]: Question[] }>({});
    const { data: session } = useSession();

    const [activeTab, setActiveTab] = useState<'all' | 'qualified' | 'disqualified'>('all');

    const [selectedFeedback, setSelectedFeedback] = useState<{
        email: string;
        examId: string;
        feedback: any[];
    } | null>(null);

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

            try {
                let fixed = feedbackString
                    .replace(/data-end=\\"(\d+)"/g, 'data-end=\\"$1\\"')
                    .replace(/data-end=\\"(\d+)\s/g, 'data-end=\\"$1\\" ')
                    .replace(/(\d+)"\u003E/g, '$1\\"\u003E')
                    .replace(/,(\s*[}\]])/g, '$1');

                return JSON.parse(fixed);
            } catch (fixError) {
                console.error('Auto-fix failed:', fixError);

                try {
                    const match = feedbackString.match(/^\s*\[[\s\S]*\]\s*$/);
                    if (match) {
                        const objects = [];
                        const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
                        let objMatch;

                        while ((objMatch = objRegex.exec(feedbackString)) !== null) {
                            try {
                                objects.push(JSON.parse(objMatch[0]));
                            } catch (e) {
                            }
                        }

                        if (objects.length > 0) {
                            return objects;
                        }
                    }
                } catch (extractError) {
                    console.error('Extraction failed:', extractError);
                }
            }

            return [];
        }
    };

    const calculateTotalMarks = (feedback: any[]) => {
        return feedback.reduce((sum, item) => sum + (item.marks || 0), 0);
    };

    const calculatePercentage = (feedback: any[], examId: string, email: string) => {
        const submission = submissions.find(s =>
            s.examId === examId &&
            (s.userName === email || s.email === email)
        );

        if (!submission) return 0;

        const answersData = typeof submission.answersWithQuestionIds === 'string'
            ? parseFeedback(submission.answersWithQuestionIds)
            : Array.isArray(submission.answersWithQuestionIds)
                ? submission.answersWithQuestionIds
                : [];

        const totalPossibleMarks = feedback.reduce((sum, item) => {
            const q = answersData.find((a: any) => a.questionId === item.questionId);
            return sum + (q?.marks || 0);
        }, 0);

        if (totalPossibleMarks === 0) return 0;

        return Math.round((calculateTotalMarks(feedback) / totalPossibleMarks) * 100);
    };

    const filteredSubmissions = useMemo(() => {
        switch (activeTab) {
            case 'qualified':
                return submissions.filter(s => !s.disqualified);
            case 'disqualified':
                return submissions.filter(s => s.disqualified);
            default:
                return submissions;
        }
    }, [submissions, activeTab]);

    const groupedSubmissions = useMemo(() => {
        const groups: { [examId: string]: Submission[] } = {};
        filteredSubmissions.forEach(sub => {
            if (!groups[sub.examId]) {
                groups[sub.examId] = [];
            }
            groups[sub.examId].push(sub);
        });
        return groups;
    }, [filteredSubmissions]);

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!session?.user?.email) return;

            try {
                setLoading(true);
                const res = await fetch(`/api/submissions/by-examiner?email=${session.user.email}`);

                if (!res.ok) {
                    throw new Error('Failed to fetch submissions');
                }

                const data = await res.json();
                setSubmissions(data);
            } catch (error) {
                console.error("Error fetching submissions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [session]);

    const fetchQuestions = async (examId: string): Promise<Question[]> => {
        if (questionsCache[examId]) {
            return questionsCache[examId];
        }

        try {
            const res = await fetch(`/api/submissions/${examId}`);
            if (!res.ok) {
                throw new Error('Failed to fetch questions');
            }
            const questions = await res.json();

            setQuestionsCache(prev => ({
                ...prev,
                [examId]: questions
            }));

            return questions;
        } catch (error) {
            console.error('Error fetching questions:', error);
            return [];
        }
    };

    const fetchViolationImages = async (examId: string, email: string) => {
        try {
            const res = await fetch(`/api/submissions/violations?examId=${examId}&email=${email}`);
            if (!res.ok) {
                throw new Error("Failed to fetch violation images");
            }
            const data = await res.json();
            return data.map((row: any) => row.imageBase64);
        } catch (err) {
            console.error("fetchViolationImages error:", err);
            return [];
        }
    }

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

                const violationImages = await fetchViolationImages(submission.examId, submission.email);
                if (violationImages.length > 0) {
                    addText('Violation Screenshots:', 11, true);
                    addSpace(3);

                    for (const imgBase64 of violationImages) {
                        if (y > pageHeight - 100) {
                            doc.addPage();
                            y = 20;
                        }
                        try {
                            const imgProps = doc.getImageProperties(imgBase64);
                            const imgWidth = Math.min(contentWidth, 150);
                            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                            doc.addImage(imgBase64, 'JPEG', margin, y, imgWidth, imgHeight);
                            y += imgHeight + 8;
                        } catch (e) {
                            console.error("Error adding image to PDF:", e);
                            addText("Error displaying violation image.", 9);
                        }
                    }
                } else {
                    addText("No violation images recorded.", 9);
                }
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

    const qualifiedCount = submissions.filter(s => !s.disqualified).length;
    const disqualifiedCount = submissions.filter(s => s.disqualified).length;

    if (loading) {
        return (
            <ExaminerLayout>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="border-border">
                                <CardContent className="p-6">
                                    <Skeleton className="h-4 w-20 mb-2" />
                                    <Skeleton className="h-8 w-16" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-border">
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-48" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-8 w-24" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ExaminerLayout>
        );
    }

    return (
        <ExaminerLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Exam Submissions
                    </h1>
                    <p className="text-muted-foreground">
                        Manage and review all candidate submissions
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg w-fit border border-border">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'all'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        All ({submissions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('qualified')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'qualified'
                            ? 'bg-emerald-500 text-white shadow-sm dark:bg-emerald-600'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Qualified ({qualifiedCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('disqualified')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'disqualified'
                            ? 'bg-rose-500 text-white shadow-sm dark:bg-rose-600'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Disqualified ({disqualifiedCount})
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{submissions.length}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Qualified</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{qualifiedCount}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Disqualified</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{disqualifiedCount}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                    <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {submissions.length > 0 ? Math.round((qualifiedCount / submissions.length) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Grouped Submissions */}
                {Object.keys(groupedSubmissions).length === 0 ? (
                    <Card className="border-2 border-dashed border-border">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
                            <p className="text-muted-foreground text-sm">
                                {activeTab === 'all'
                                    ? 'Submissions will appear here once candidates start taking exams'
                                    : `No ${activeTab} submissions to display`
                                }
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedSubmissions).map(([examId, examSubmissions]) => {
                            const examQualified = examSubmissions.filter(s => !s.disqualified).length;
                            const examDisqualified = examSubmissions.filter(s => s.disqualified).length;

                            return (
                                <Card key={examId} className="border-border">
                                    <CardHeader className="border-b border-border">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{examId}</CardTitle>
                                                    <CardDescription className="flex items-center gap-3 mt-1 text-xs">
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {examSubmissions.length} submissions
                                                        </span>
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {examQualified} passed
                                                        </span>
                                                        {examDisqualified > 0 && (
                                                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                                                <XCircle className="w-3 h-3" />
                                                                {examDisqualified} disqualified
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground">Pass Rate</div>
                                                <div className="text-xl font-bold text-primary">
                                                    {Math.round((examQualified / examSubmissions.length) * 100)}%
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-0">
                                        <div className="divide-y divide-border">
                                            {examSubmissions.map((submission, index) => (
                                                <div
                                                    key={index}
                                                    className="p-4 hover:bg-muted/30 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <Avatar className="w-9 h-9 border-2 border-border">
                                                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                                                    {submission.email?.charAt(0).toUpperCase() || 'U'}
                                                                </AvatarFallback>
                                                            </Avatar>

                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-semibold text-sm text-foreground">
                                                                        {submission.userName || submission.email}
                                                                    </p>
                                                                    <Badge
                                                                        variant={submission.disqualified ? "destructive" : "default"}
                                                                        className="text-xs"
                                                                    >
                                                                        {submission.disqualified ? (
                                                                            <><XCircle className="w-3 h-3 mr-1" />Disqualified</>
                                                                        ) : (
                                                                            <><CheckCircle2 className="w-3 h-3 mr-1" />Qualified</>
                                                                        )}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {submission.email}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {submission.ai_feedback && (
                                                                <Button
                                                                    onClick={() => setSelectedFeedback({
                                                                        email: submission.userName || submission.email,
                                                                        examId: submission.examId,
                                                                        feedback: parseFeedback(submission.ai_feedback)
                                                                    })}
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <FileText className="w-4 h-4 mr-2" />
                                                                    Feedback
                                                                </Button>
                                                            )}

                                                            <Button
                                                                onClick={() => downloadAsPDF(submission)}
                                                                disabled={downloadingId === submission.examId + submission.email}
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                {downloadingId === submission.examId + submission.email ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Generating...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Download className="w-4 h-4 mr-2" />
                                                                        PDF
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedFeedback && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedFeedback(null)}
                >
                    <div
                        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="relative p-6 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-t-2xl">
                            <button
                                onClick={() => setSelectedFeedback(null)}
                                className="absolute top-4 right-4 w-10 h-10 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors group"
                            >
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white" />
                            </button>

                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        AI Feedback Report
                                    </h2>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {selectedFeedback.email}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            {selectedFeedback.examId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Overall Score Card */}
                            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Total Score</p>
                                            <p className="text-4xl font-bold text-primary">
                                                {calculateTotalMarks(selectedFeedback.feedback)}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                out of {(() => {
                                                    const submission = submissions.find(s =>
                                                        s.examId === selectedFeedback.examId &&
                                                        (s.userName === selectedFeedback.email || s.email === selectedFeedback.email)
                                                    );

                                                    if (!submission) return 0;

                                                    const answersData = typeof submission.answersWithQuestionIds === 'string'
                                                        ? parseFeedback(submission.answersWithQuestionIds)
                                                        : Array.isArray(submission.answersWithQuestionIds)
                                                            ? submission.answersWithQuestionIds
                                                            : [];

                                                    return selectedFeedback.feedback.reduce((sum, item) => {
                                                        const q = answersData.find((a: any) => a.questionId === item.questionId);
                                                        return sum + (q?.marks || 0);
                                                    }, 0);
                                                })()} marks
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="w-24 h-24 rounded-full border-8 border-primary/20 flex items-center justify-center bg-primary/5">
                                                <span className="text-2xl font-bold text-primary">
                                                    {calculatePercentage(selectedFeedback.feedback, selectedFeedback.examId, selectedFeedback.email)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Question-wise Feedback */}
                            {selectedFeedback.feedback.map((item, index) => (
                                <Card key={index} className="border border-border hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${item.marks > 0 ? 'bg-green-500' : 'bg-red-500'
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">Question {index + 1}</CardTitle>
                                                    <p className="text-xs text-muted-foreground">ID: {item.questionId}</p>
                                                </div>
                                            </div>

                                            {/* Score Badge */}
                                            <Badge
                                                variant={item.marks > 0 ? "default" : "destructive"}
                                                className="text-lg px-4 py-1"
                                            >
                                                {item.marks} marks
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* Question Text */}
                                        <div>
                                            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                                                Question:
                                            </Label>
                                            <div className="p-3 bg-muted/50 rounded-lg border border-border">
                                                <div
                                                    className="text-sm prose prose-sm max-w-none dark:prose-invert"
                                                    dangerouslySetInnerHTML={{ __html: item.question }}
                                                />
                                            </div>
                                        </div>

                                        {/* AI Feedback */}
                                        <div>
                                            <Label className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                                <span className="text-lg">🤖</span>
                                                AI Feedback:
                                            </Label>
                                            <div className={`p-4 rounded-lg border-l-4 ${item.marks > 0
                                                ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
                                                : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
                                                }`}>
                                                <p className="text-sm leading-relaxed">{item.feedback}</p>
                                            </div>
                                        </div>

                                        {/* Performance Indicator */}
                                        <div className="flex items-center gap-2 pt-2">
                                            {item.marks > 0 ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                        Correct Answer
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-5 h-5 text-red-600" />
                                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                        Incorrect Answer
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Summary Stats */}
                            <Card className="bg-muted/50 border-border">
                                <CardContent className="p-6">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Performance Summary
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                                {selectedFeedback.feedback.filter(f => f.marks > 0).length}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">Correct</p>
                                        </div>
                                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                                {selectedFeedback.feedback.filter(f => f.marks === 0).length}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">Incorrect</p>
                                        </div>
                                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <p className="text-3xl font-bold text-primary">
                                                {selectedFeedback.feedback.length}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">Total Questions</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-border bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end gap-3">
                            <Button
                                onClick={() => setSelectedFeedback(null)}
                                variant="outline"
                                className="px-6"
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    const submission = submissions.find(s =>
                                        s.examId === selectedFeedback.examId &&
                                        (s.userName === selectedFeedback.email || s.email === selectedFeedback.email)
                                    );
                                    if (submission) {
                                        downloadAsPDF(submission);
                                    }
                                }}
                                className="px-6 gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Report
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ExaminerLayout>
    );
}