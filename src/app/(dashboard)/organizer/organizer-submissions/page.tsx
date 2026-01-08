"use client";

import { useMemo, useState, useRef } from "react";
import { useMsal } from "@azure/msal-react";
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
    Mail,
    Target,
    BarChart3,
    Loader2,
    Filter,
    AlertCircle,
    ChevronRight,
    Award
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

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

export default function ExaminerSubmissionsPage() {
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "qualified" | "disqualified">("all");
    const [selectedExam, setSelectedExam] = useState("all");
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Data Fetching
    const { data: submissions = [], error: submissionsError, isLoading: loading } = useSWR(
        session?.username
            ? `/api/organizer/submissions/by-examiner?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
        }
    );

    // Animations
    useGSAP(() => {
        if (loading || submissions.length === 0) return;

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo(".animate-header",
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }
        );

        tl.fromTo(".animate-stat",
            { scale: 0.95, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.4, stagger: 0.1 },
            "-=0.3"
        );

        tl.fromTo(".animate-row",
            { x: -10, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.3, stagger: 0.05 },
            "-=0.2"
        );

    }, { scope: containerRef, dependencies: [loading, submissions] });

    // --- Logic Helpers (Preserved) ---
    const parseFeedback = (feedbackString: string | null | any) => {
        if (!feedbackString) return [];
        if (typeof feedbackString === 'object') return Array.isArray(feedbackString) ? feedbackString : [feedbackString];
        try { return JSON.parse(feedbackString.trim()); } catch (e) { return []; }
    };

    const calculateTotalMarks = (feedback: any[]) => feedback.reduce((sum, item) => sum + (item.marks || 0), 0);

    const calculateTotalPossibleMarks = (submission: Submission) => {
        const answersData = typeof submission.answersWithQuestionIds === 'string'
            ? parseFeedback(submission.answersWithQuestionIds)
            : Array.isArray(submission.answersWithQuestionIds) ? submission.answersWithQuestionIds : [];
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
            : Array.isArray(submission.answersWithQuestionIds) ? submission.answersWithQuestionIds : [];
        return answersData.length;
    };

    // --- Filtering & Stats ---
    const groupedSubmissions = useMemo(() => {
        const groups: { [examId: string]: Submission[] } = {};
        submissions.forEach((sub: Submission) => {
            if (!groups[sub.examId]) groups[sub.examId] = [];
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
        return { total, qualified, disqualified, avgScore: Math.round(avgScore) };
    }, [submissions]);

    // --- Styling Helpers ---
    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return "text-emerald-500";
        if (percentage >= 60) return "text-blue-500";
        if (percentage >= 40) return "text-amber-500";
        return "text-rose-500";
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 80) return "bg-emerald-500";
        if (percentage >= 60) return "bg-blue-500";
        if (percentage >= 40) return "bg-amber-500";
        return "bg-rose-500";
    };

    // --- PDF Generator (Preserved Logic) ---
    const downloadAsPDF = async (submission: Submission) => {
        try {
            setDownloadingId(submission.examId + submission.email);
            const doc = new jsPDF();

            // Helper constants
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 14;
            const contentWidth = pageWidth - (margin * 2);

            // --- Helper Functions ---
            const addWatermark = () => {
                const totalPages = doc.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.saveGraphicsState();
                    doc.setTextColor(200, 200, 200);
                    doc.setFontSize(60);
                    doc.setFont("helvetica", "bold");
                    try {
                        // Attempt to set opacity (requires specific jsPDF versions/plugins, silent fail if not present)
                        // @ts-ignore
                        if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.1 }));
                    } catch (e) { /* ignore */ }

                    doc.text("SysRank", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });
                    doc.restoreGraphicsState();
                }
            };

            // --- Header Generation ---
            try {
                const img = new Image();
                img.src = "/syslogo.png";
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                doc.addImage(img, "PNG", margin, 14, 12, 12);
            } catch (e) {
                console.error("Failed to load logo", e);
            }

            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(33, 33, 33);
            doc.text("SysRank", margin + 16, 22);

            doc.setFontSize(16);
            doc.setFont("helvetica", "normal");
            doc.text("Performance Report", margin, 38);

            // Underline
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, 42, pageWidth - margin, 42);

            // --- Metadata & Score Card ---
            const percentage = calculatePercentage(submission);
            const scoreColor = percentage >= 60 ? [16, 185, 129] : [239, 68, 68]; // Green or Red

            // Left Side: Meta
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            let metaY = 52;
            doc.text(`Exam: ${submission.examId}`, margin, metaY);
            doc.text(`User: ${submission.userName}`, margin, metaY + 6);
            doc.text(`Email: ${submission.email}`, margin, metaY + 12);
            doc.text(`Date: ${new Date(submission.submittedAt).toLocaleDateString()}`, margin, metaY + 18);

            // Right Side: Score Card
            const boxWidth = 60;
            const boxHeight = 28;
            const boxX = pageWidth - margin - boxWidth;
            const boxY = 46;

            doc.setFillColor(243, 244, 246); // Light gray bg
            doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "F");

            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            doc.text("Score Obtained", boxX + (boxWidth / 2), boxY + 10, { align: "center" });

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
            doc.text(`${percentage.toFixed(1)}%`, boxX + (boxWidth / 2), boxY + 20, { align: "center" });

            // --- Table Header ---
            let y = 85;
            const col1X = margin;
            const col1W = 15; // Width for "#"
            const col3W = 25; // Width for "Marks"
            const col2X = margin + col1W;
            const col2W = contentWidth - col1W - col3W;
            const col3X = col2X + col2W;

            const tableHeaderHeight = 10;
            doc.setFillColor(139, 92, 246); // Purple #8b5cf6
            doc.rect(margin, y, contentWidth, tableHeaderHeight, "F");

            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text("#", col1X + (col1W / 2), y + 6.5, { align: "center" });
            doc.text("Analysis", col2X + 2, y + 6.5);
            doc.text("Marks", col3X + (col3W / 2), y + 6.5, { align: "center" });

            y += tableHeaderHeight;

            // --- Table Content ---
            const answersData = typeof submission.answersWithQuestionIds === 'string'
                ? JSON.parse(submission.answersWithQuestionIds)
                : (submission.answersWithQuestionIds || []);
            const feedbackData = parseFeedback(submission.ai_feedback);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0); // Reset text color

            answersData.forEach((ans: any, idx: number) => {
                const fb = feedbackData.find((f: any) => f.questionId === ans.questionId);
                const marks = fb?.marks || 0;

                // Content Preparation
                const questionText = `Question: ${ans.question ? ans.question.replace(/<[^>]*>?/gm, '').trim() : 'N/A'}`;
                const answerText = `Your Answer: ${ans.answer || 'N/A'}`;
                const analysisText = `Analysis: ${fb?.feedback || 'No feedback provided.'}`;

                // Calculate Heights
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");

                const questionLines = doc.splitTextToSize(questionText, col2W - 4);
                const answerLines = doc.splitTextToSize(answerText, col2W - 4);
                const analysisLines = doc.splitTextToSize(analysisText, col2W - 4);

                const lineHeight = 4.5;
                const buffer = 6; // Padding top/bottom
                const blockHeight = (questionLines.length + answerLines.length + analysisLines.length) * lineHeight + (buffer * 2);

                // Page Break Check
                if (y + blockHeight > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                    // Re-draw table header on new page? (Optional, let's keep it simple for now)
                    // Or just a line separator
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 1;
                }

                // Draw Row Background (Alternating optional, keeping white for now) and Borders
                doc.setDrawColor(229, 231, 235); // Light grey border
                doc.rect(margin, y, contentWidth, blockHeight); // Outer border
                doc.line(col2X, y, col2X, y + blockHeight); // Vertical line 1
                doc.line(col3X, y, col3X, y + blockHeight); // Vertical line 2

                // Col 1: Index
                doc.setTextColor(80, 80, 80);
                doc.setFont("helvetica", "bold");
                doc.text(`Q${idx + 1}`, col1X + (col1W / 2), y + 10, { align: "center" });

                // Col 2: Content
                let currentTextY = y + buffer;

                // Question (Grayish)
                doc.setTextColor(107, 114, 128);
                doc.setFont("helvetica", "normal");
                doc.text(questionLines, col2X + 2, currentTextY);
                currentTextY += questionLines.length * lineHeight + 2;

                // Answer (Grayish)
                doc.text(answerLines, col2X + 2, currentTextY);
                currentTextY += answerLines.length * lineHeight + 2;

                // Analysis (Darker)
                doc.setTextColor(30, 30, 30);
                doc.text(analysisLines, col2X + 2, currentTextY);

                // Col 3: Marks
                doc.setFont("helvetica", "bold");
                const markColor = marks > 0 ? [34, 197, 94] : [100, 100, 100];
                doc.setTextColor(markColor[0], markColor[1], markColor[2]);
                doc.text(`${marks}`, col3X + (col3W / 2), y + 10, { align: "center" });

                y += blockHeight;
            });

            addWatermark();

            const filename = `SysRank-Report-${submission.userName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
            doc.save(filename);
            toast.success("Detailed Report Downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Download failed");
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading && !submissions.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4 animate-pulse">Fetching submission data...</p>
            </div>
        );
    }

    if (submissionsError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                            <AlertCircle className="w-6 h-6 text-destructive" />
                        </div>
                        <CardTitle className="text-destructive">Failed to Load</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">We couldn't retrieve the submissions.</p>
                        <Button variant="outline" onClick={() => window.location.reload()}>Retry Connection</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background/50 p-6 lg:p-8 font-sans space-y-8">
            {/* Header & Stats */}
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-header opacity-0">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
                            <Award className="w-8 h-8 text-primary" />
                            Results & Submissions
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            Analyze performance and review candidate code.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-header opacity-0">
                    {[
                        { label: "Total Submissions", value: stats.total, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { label: "Qualified", value: stats.qualified, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                        { label: "Disqualified", value: stats.disqualified, icon: XCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
                        { label: "Avg. Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
                    ].map((stat, i) => (
                        <Card key={i} className="animate-stat opacity-0 border-border/40 hover:border-primary/20 transition-all hover:shadow-md bg-card/40 backdrop-blur-sm">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Toolbar */}
                <Card className="animate-header opacity-0 border-border/50 bg-card/40 backdrop-blur-sm sticky top-4 z-20 shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search candidates, emails, or exam IDs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background/50 border-input/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                                <SelectTrigger className="w-[140px] bg-background/50 border-input/50">
                                    <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="qualified">Qualified</SelectItem>
                                    <SelectItem value="disqualified">Disqualified</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={selectedExam} onValueChange={setSelectedExam}>
                                <SelectTrigger className="w-[180px] bg-background/50 border-input/50">
                                    <FileText className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Exam" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Exams</SelectItem>
                                    {Object.keys(groupedSubmissions).map((id) => (
                                        <SelectItem key={id} value={id}>{id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="animate-header opacity-0 border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden min-h-[400px]">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="border-border/50 hover:bg-transparent">
                                <TableHead className="w-[30%]">Candidate</TableHead>
                                <TableHead className="w-[15%]">Exam ID</TableHead>
                                <TableHead className="w-[15%]">Submitted</TableHead>
                                <TableHead className="w-[25%]">Performance</TableHead>
                                <TableHead className="w-[10%] text-center">Status</TableHead>
                                <TableHead className="w-[5%] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubmissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-[300px] text-center">
                                        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                                            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                                                <Search className="w-8 h-8 opacity-50" />
                                            </div>
                                            <p className="text-lg font-medium">No submissions found</p>
                                            <p className="text-sm opacity-70">Adjust your filters or wait for new submissions.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubmissions.map((sub: Submission, idx: number) => {
                                    const percentage = calculatePercentage(sub);
                                    const totalMarks = calculateTotalPossibleMarks(sub);
                                    const score = calculateTotalMarks(parseFeedback(sub.ai_feedback));

                                    return (
                                        <TableRow key={`${sub.examId}-${sub.email}-${idx}`} className="animate-row opacity-0 group border-border/50 hover:bg-muted/40 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                                                        {(sub.userName || sub.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-foreground">{sub.userName || "Unknown User"}</div>
                                                        <div className="text-xs text-muted-foreground">{sub.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[10px] tracking-wider bg-background/50">
                                                    {sub.examId}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3 mr-1.5" />
                                                    {new Date(sub.submittedAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1.5 w-[90%]">
                                                    <div className="flex justify-between text-xs font-medium">
                                                        <span className={getScoreColor(percentage)}>{percentage}%</span>
                                                        <span className="text-muted-foreground">{score}/{totalMarks}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${getProgressColor(percentage)} transition-all duration-500`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={sub.disqualified ? "destructive" : "default"}
                                                    className={`
                                                        ${sub.disqualified
                                                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-200/50'
                                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-200/50'}
                                                        border shadow-none font-medium capitalize
                                                    `}
                                                >
                                                    {sub.disqualified ? 'Disqualified' : 'Qualified'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary" onClick={() => setSelectedSubmission(sub)}>
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 hover:text-primary"
                                                        onClick={() => downloadAsPDF(sub)}
                                                        disabled={downloadingId === sub.examId + sub.email}
                                                    >
                                                        {downloadingId === sub.examId + sub.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Details Dialog */}
            <Dialog open={!!selectedSubmission} onOpenChange={(o) => !o && setSelectedSubmission(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border/50 gap-0">
                    <DialogHeader className="p-6 bg-muted/10 border-b border-border/40">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xl shadow-inner">
                                {(selectedSubmission?.userName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">
                                    {selectedSubmission?.userName}
                                </DialogTitle>
                                <DialogDescription asChild className="flex items-center gap-3 mt-1.5">
                                    <div>
                                        <span className="flex items-center text-xs"><Mail className="w-3 h-3 mr-1" /> {selectedSubmission?.email}</span>
                                        <Separator orientation="vertical" className="h-3" />
                                        <span className="flex items-center text-xs"><Target className="w-3 h-3 mr-1" /> {selectedSubmission?.examId}</span>
                                    </div>
                                </DialogDescription>
                            </div>
                            <div className="ml-auto flex gap-2">
                                {selectedSubmission && (
                                    <Badge
                                        variant="outline"
                                        className={`text-sm px-3 py-1 ${selectedSubmission.disqualified ? 'bg-rose-500/10 text-rose-500 border-rose-200' : 'bg-emerald-500/10 text-emerald-500 border-emerald-200'}`}
                                    >
                                        {selectedSubmission.disqualified ? 'Disqualified' : 'Qualified'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                        {selectedSubmission && (() => {
                            const percentage = calculatePercentage(selectedSubmission);
                            const totalMarks = calculateTotalPossibleMarks(selectedSubmission);
                            const score = calculateTotalMarks(parseFeedback(selectedSubmission.ai_feedback));
                            const feedbackList = parseFeedback(selectedSubmission.ai_feedback);

                            return (
                                <div className="space-y-8">
                                    {/* Score Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl border bg-card text-center space-y-1">
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Score</div>
                                            <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>{score}<span className="text-muted-foreground text-lg">/{totalMarks}</span></div>
                                        </div>
                                        <div className="p-4 rounded-xl border bg-card text-center space-y-1">
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accuracy</div>
                                            <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>{percentage}%</div>
                                        </div>
                                        <div className="p-4 rounded-xl border bg-card text-center space-y-1">
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attempted</div>
                                            <div className="text-3xl font-bold text-foreground">{getQuestionsAttempted(selectedSubmission)}</div>
                                        </div>
                                    </div>

                                    {/* Questions */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-primary" />
                                            Detailed Analysis
                                        </h3>
                                        {feedbackList.map((fb: any, i: number) => (
                                            <Card key={i} className="border-border/40 overflow-hidden">
                                                <div className="flex items-center justify-between p-3 bg-muted/20 border-b border-border/40">
                                                    <div className="font-medium text-sm flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded bg-background border flex items-center justify-center text-xs text-muted-foreground">{i + 1}</span>
                                                        Question Analysis
                                                    </div>
                                                    <Badge variant={fb.marks > 0 ? "default" : "secondary"}>{fb.marks} Marks</Badge>
                                                </div>
                                                <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
                                                    {fb.feedback}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                    <DialogFooter className="p-4 border-t border-border/40 bg-background/80 backdrop-blur-sm">
                        <Button variant="outline" onClick={() => setSelectedSubmission(null)}>Close Review</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}