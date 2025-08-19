import { useEffect, useState } from "react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Mail,
    MoreHorizontal,
    TrendingUp,
    Users,
    XCircle
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ExaminerLayout from "./ExaminerLayout";

interface Submission {
    examId: string;
    email: string;
    submittedAt: string;
    disqualified: boolean;
    answersWithQuestionIds?: any[];
    answers?: any[];
    answer?: any;
}

export default function ExaminerSubmissions() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const { data: session } = useSession();

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
                console.log("Fetched submissions:", data);
                setSubmissions(data);
            } catch (error) {
                console.error("Error fetching submissions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [session]);

    const downloadAsPDF = async (submission: Submission) => {
        try {
            setDownloadingId(submission.examId + submission.email);

            const doc = new jsPDF();
            let y = 20;
            const lineHeight = 8;
            const pageHeight = doc.internal.pageSize.height;

            const addLine = (text: string, fontSize = 12) => {
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = 20;
                }
                doc.setFontSize(fontSize);
                doc.text(text, 15, y);
                y += lineHeight;
            };

            // Header
            doc.setFontSize(18);
            doc.text("EXAM SUBMISSION REPORT", 15, y);
            y += 15;

            addLine("━".repeat(50), 10);
            addLine(`Exam ID: ${submission.examId || "N/A"}`, 14);
            addLine(`Candidate: ${submission.email || "N/A"}`, 12);
            addLine(`Submitted: ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "N/A"}`, 12);
            addLine(`Status: ${submission.disqualified ? "❌ Disqualified" : "✅ Qualified"}`, 12);
            addLine("━".repeat(50), 10);
            y += 10;

            // Answers
            if (submission.answersWithQuestionIds?.length) {
                addLine("ANSWERS:", 16);
                y += 5;

                const sortedAnswers = [...submission.answersWithQuestionIds].sort((a, b) =>
                    (a.originalIndex ?? 0) - (b.originalIndex ?? 0)
                );

                sortedAnswers.forEach((item, index) => {
                    addLine(`Question ${index + 1} (ID: ${item.questionId || "N/A"})`, 14);
                    addLine("─".repeat(40), 10);

                    const answerText = item.answer || "No answer provided";
                    const answerLines = answerText.split("\n");

                    answerLines.forEach((line: string) => {
                        if (y > pageHeight - 30) {
                            doc.addPage();
                            y = 20;
                        }
                        doc.setFontSize(10);
                        doc.text(line, 15, y);
                        y += 6;
                    });
                    y += 8;
                });
            } else if (submission.answers?.length) {
                addLine("ANSWERS:", 16);
                y += 5;

                submission.answers.forEach((answer, index) => {
                    addLine(`Answer ${index + 1}`, 14);
                    addLine("─".repeat(20), 10);

                    const answerText = answer || "No answer provided";
                    const lines = answerText.split("\n");

                    lines.forEach((line: string) => {
                        if (y > pageHeight - 30) {
                            doc.addPage();
                            y = 20;
                        }
                        doc.setFontSize(10);
                        doc.text(line, 15, y);
                        y += 6;
                    });
                    y += 8;
                });
            } else if (submission.answer) {
                addLine("ANSWER:", 16);
                addLine("─".repeat(10), 10);

                const answerText = submission.answer || "";
                const lines = answerText.split("\n");

                lines.forEach((line: string) => {
                    if (y > pageHeight - 30) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.setFontSize(10);
                    doc.text(line, 15, y);
                    y += 6;
                });
            } else {
                addLine("No answers found in submission.", 12);
            }

            // Save PDF
            const filename = `submission-${submission.examId}-${submission.email.split('@')[0]}.pdf`;
            doc.save(filename);

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setDownloadingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const qualifiedCount = submissions.filter(s => !s.disqualified).length;
    const disqualifiedCount = submissions.filter(s => s.disqualified).length;

    if (loading) {
        return (
            <ExaminerLayout>
                <div className="container mx-auto p-6 space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <Skeleton className="h-4 w-20 mb-2" />
                                    <Skeleton className="h-8 w-16" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card>
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
            <div className="container mx-auto p-6 space-y-8">
                {/* Header Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Exam Submissions</h1>
                            <p className="text-muted-foreground">
                                Manage and review all exam submissions from candidates
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                                    <p className="text-2xl font-bold">{submissions.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Qualified</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{qualifiedCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Disqualified</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{disqualifiedCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Submissions Table */}
                {submissions.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="text-center p-12 space-y-4">
                            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">No submissions yet</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Submissions will appear here once candidates start taking exams.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                All Submissions
                            </CardTitle>
                            <CardDescription>
                                Review and download submission reports
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Exam ID</TableHead>
                                            <TableHead>Candidate</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map((submission, index) => (
                                            <TableRow key={index} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                        {submission.examId}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-xs">
                                                                {submission.email?.charAt(0).toUpperCase() || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium truncate max-w-[200px]">
                                                                {submission.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {submission.submittedAt ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1 text-sm">
                                                                <Calendar className="h-3 w-3" />
                                                                {formatDate(submission.submittedAt)}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                {formatTime(submission.submittedAt)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Badge
                                                        variant={submission.disqualified ? "destructive" : "default"}
                                                        className="gap-1"
                                                    >
                                                        {submission.disqualified ? (
                                                            <><XCircle className="h-3 w-3" /> Disqualified</>
                                                        ) : (
                                                            <><CheckCircle2 className="h-3 w-3" /> Qualified</>
                                                        )}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => downloadAsPDF(submission)}
                                                                disabled={downloadingId === submission.examId + submission.email}
                                                                className="gap-2"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                                {downloadingId === submission.examId + submission.email
                                                                    ? "Generating PDF..."
                                                                    : "Download PDF"
                                                                }
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Summary Section */}
                {submissions.length > 0 && (
                    <>
                        <Separator />
                        <div className="rounded-lg bg-muted/50 p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Summary
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Qualification Rate</p>
                                    <p className="text-2xl font-bold">
                                        {submissions.length > 0 ? Math.round((qualifiedCount / submissions.length) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Most Recent Submission</p>
                                    <p className="text-sm font-medium">
                                        {submissions.length > 0
                                            ? formatDate(submissions.reduce((latest, current) =>
                                                new Date(current.submittedAt) > new Date(latest.submittedAt) ? current : latest
                                            ).submittedAt)
                                            : "N/A"
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </ExaminerLayout>
    );
}