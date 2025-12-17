"use client";

import { useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from 'swr';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    PieChart,
    Activity,
    Award,
    FileText,
    Filter,
    ChevronDown,
    ChevronUp,
    Percent,
    Hash,
    Loader2,
    Trophy,
    Sparkles,
    ArrowUpRight,
    Brain,
    Search
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
// Recharts imports removed as they are currently unused in the simplified design
// If charts are needed later, uncomment the following:
// import {
//     RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer,
//     BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
// } from 'recharts';

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Submission {
    ai_feedback: any;
    userName: string;
    examId: string;
    email: string;
    submittedAt: string;
    disqualified: boolean;
    answersWithQuestionIds?: any[];
}

interface QuestionAnalytics {
    questionId: string;
    questionText: string;
    questionType: string;
    totalMarks: number;
    avgScore: number;
    successRate: number;
    totalAttempts: number;
    correctAnswers: number;
    incorrectAnswers: number;
    partialCredit: number;
    avgTimeTaken?: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    commonMistakes: string[];
    topPerformers: string[];
}

export default function ExamAnalytics() {
    const { data: session } = useSession();
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedExam, setSelectedExam] = useState("all");
    const [sortBy, setSortBy] = useState<'successRate' | 'avgScore' | 'attempts'>('successRate');
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'questions' | 'students'>('questions');

    const [filterPerformance, setFilterPerformance] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [searchTerm, setSearchTerm] = useState("");

    const { data: submissions = [], error, isLoading } = useSWR(
        session?.user?.email
            ? `/api/organizer/submissions/by-examiner?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const [studentAnalysis, setStudentAnalysis] = useState<{
        [email: string]: {
            strengths: Array<{ topic: string; score: number; description: string }>;
            weaknesses: Array<{ topic: string; score: number; description: string }>;
            recommendations: string[];
            loading: boolean;
        };
    }>({});

    const [aiInsights, setAiInsights] = useState<{
        [key: string]: any;
    }>({});
    const [loadingInsights, setLoadingInsights] = useState<{
        [key: string]: boolean;
    }>({});

    // --- Animations ---
    useGSAP(() => {
        if (isLoading) return;

        gsap.set(".animate-header, .animate-stat-card, .animate-content, .animate-list-item", { autoAlpha: 1 });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo(".animate-header",
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6 }
        );

        tl.fromTo(".animate-stat-card",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
            "-=0.4"
        );

        tl.fromTo(".animate-content",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6 },
            "-=0.2"
        );

        tl.fromTo(".animate-list-item",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.05 },
            "-=0.4"
        );

    }, { scope: containerRef, dependencies: [isLoading, viewMode, submissions] });

    const fetchStudentAnalysis = async (student: any) => {
        if (studentAnalysis[student.email] && !studentAnalysis[student.email].loading) {
            return; // Already analyzed
        }

        setStudentAnalysis(prev => ({
            ...prev,
            [student.email]: { strengths: [], weaknesses: [], recommendations: [], loading: true }
        }));

        try {
            const response = await fetch('/api/organizer/ai/analyze-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentData: {
                        userName: student.userName,
                        questionDetails: student.questionDetails
                    }
                })
            });

            const analysis = await response.json();
            setStudentAnalysis(prev => ({
                ...prev,
                [student.email]: { ...analysis.analysis, loading: false }
            }));
        } catch (error) {
            console.error('Failed to analyze student:', error);
            setStudentAnalysis(prev => ({
                ...prev,
                [student.email]: {
                    strengths: [],
                    weaknesses: [],
                    recommendations: ['Analysis unavailable'],
                    loading: false
                }
            }));
        }
    };

    const parseFeedback = (feedbackString: string | null | any) => {
        if (!feedbackString) return [];
        if (typeof feedbackString === 'object') {
            return Array.isArray(feedbackString) ? feedbackString : [feedbackString];
        }
        try {
            return JSON.parse(feedbackString.trim());
        } catch (e) {
            return [];
        }
    };

    const parseAnswers = (answersData: any) => {
        if (!answersData) return [];
        if (Array.isArray(answersData)) return answersData;
        if (typeof answersData === 'string') {
            try {
                return JSON.parse(answersData);
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    const examList = useMemo(() => {
        const exams = new Set<string>();
        submissions.forEach((s: Submission) => exams.add(s.examId));
        return Array.from(exams);
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        if (selectedExam === "all") return submissions;
        return submissions.filter((s: Submission) => s.examId === selectedExam);
    }, [submissions, selectedExam]);

    const examAnalytics = useMemo(() => {
        const examsMap = new Map<string, any>();

        filteredSubmissions.forEach((submission: Submission) => {
            const examId = submission.examId;
            const answers = parseAnswers(submission.answersWithQuestionIds);
            const feedback = parseFeedback(submission.ai_feedback);

            if (!examsMap.has(examId)) {
                examsMap.set(examId, {
                    examId,
                    examTitle: examId,
                    totalSubmissions: 0,
                    totalStudents: new Set(),
                    avgScore: 0,
                    totalScore: 0,
                    totalPossibleScore: 0,
                    successRate: 0,
                    highScores: 0,
                    mediumScores: 0,
                    lowScores: 0,
                    topPerformers: [],
                    completionRate: 0,
                    disqualifiedCount: 0
                });
            }

            const exam = examsMap.get(examId)!;
            exam.totalSubmissions++;
            exam.totalStudents.add(submission.email);

            if (submission.disqualified) {
                exam.disqualifiedCount++;
            }

            let submissionScore = 0;
            let submissionMaxScore = 0;

            answers.forEach((answer: any) => {
                const feedbackItem = feedback.find((f: any) => f.questionId === (answer.questionId || answer.id));
                const score = feedbackItem?.marks || 0;
                const maxMarks = answer.marks || 0;

                submissionScore += score;
                submissionMaxScore += maxMarks;
            });

            exam.totalScore += submissionScore;
            exam.totalPossibleScore += submissionMaxScore;

            const percentage = submissionMaxScore > 0 ? (submissionScore / submissionMaxScore) * 100 : 0;

            if (percentage >= 70) exam.highScores++;
            else if (percentage >= 40) exam.mediumScores++;
            else exam.lowScores++;

            exam.topPerformers.push({
                name: submission.userName || submission.email,
                score: percentage
            });
        });

        examsMap.forEach((exam) => {
            if (exam.totalSubmissions > 0) {
                exam.avgScore = (exam.totalScore / exam.totalPossibleScore) * 100;
                exam.successRate = (exam.highScores / exam.totalSubmissions) * 100;
                exam.completionRate = ((exam.totalSubmissions - exam.disqualifiedCount) / exam.totalSubmissions) * 100;
                exam.totalStudents = exam.totalStudents.size;
            }
            exam.topPerformers.sort((a: any, b: any) => b.score - a.score);
            exam.topPerformers = exam.topPerformers.slice(0, 3);
        });

        return Array.from(examsMap.values());
    }, [filteredSubmissions]);

    const sortedExams = useMemo(() => {
        let sorted = [...examAnalytics];

        if (filterPerformance !== 'all') {
            sorted = sorted.filter(e => {
                if (filterPerformance === 'high') return e.successRate >= 70;
                if (filterPerformance === 'medium') return e.successRate >= 40 && e.successRate < 70;
                if (filterPerformance === 'low') return e.successRate < 40;
                return true;
            });
        }

        if (searchTerm) {
            sorted = sorted.filter(e =>
                e.examTitle.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return sorted;
    }, [examAnalytics, sortBy, filterPerformance, searchTerm]);

    const studentAnalytics = useMemo(() => {
        const studentsMap = new Map<string, any>();

        filteredSubmissions.forEach((submission: Submission) => {
            const studentKey = submission.email;

            // Filter by search term if active
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const nameMatch = (submission.userName || '').toLowerCase().includes(searchLower);
                const emailMatch = submission.email.toLowerCase().includes(searchLower);
                if (!nameMatch && !emailMatch) return;
            }

            const answers = parseAnswers(submission.answersWithQuestionIds);
            const feedback = parseFeedback(submission.ai_feedback);

            if (!studentsMap.has(studentKey)) {
                studentsMap.set(studentKey, {
                    email: submission.email,
                    userName: submission.userName,
                    totalSubmissions: 0,
                    totalQuestions: 0,
                    correctAnswers: 0,
                    incorrectAnswers: 0,
                    partialCredit: 0,
                    totalScore: 0,
                    totalPossibleScore: 0,
                    avgScore: 0,
                    successRate: 0,
                    disqualified: submission.disqualified,
                    submissions: [],
                    strongAreas: [] as string[],
                    weakAreas: [] as string[],
                    questionDetails: [] as any[]
                });
            }

            const student = studentsMap.get(studentKey)!;
            student.totalSubmissions++;
            student.submissions.push({
                examId: submission.examId,
                submittedAt: submission.submittedAt
            });

            answers.forEach((answer: any) => {
                const feedbackItem = feedback.find((f: any) => f.questionId === (answer.questionId || answer.id));
                const score = feedbackItem?.marks || 0;
                const maxMarks = answer.marks || 0;

                student.totalQuestions++;
                student.totalScore += score;
                student.totalPossibleScore += maxMarks;

                if (score === maxMarks) {
                    student.correctAnswers++;
                } else if (score === 0) {
                    student.incorrectAnswers++;
                } else {
                    student.partialCredit++;
                }

                student.questionDetails.push({
                    questionId: answer.questionId || answer.id,
                    questionText: answer.question,
                    questionType: answer.type,
                    score: score,
                    maxMarks: maxMarks,
                    feedback: feedbackItem?.feedback || 'No feedback',
                    examId: submission.examId
                });

                if (score === maxMarks && student.strongAreas.length < 5) {
                    student.strongAreas.push(answer.type || 'unknown');
                } else if (score === 0 && student.weakAreas.length < 5) {
                    student.weakAreas.push(answer.type || 'unknown');
                }
            });
        });

        studentsMap.forEach((student) => {
            if (student.totalQuestions > 0) {
                student.avgScore = (student.totalScore / student.totalPossibleScore) * 100;
                student.successRate = (student.correctAnswers / student.totalQuestions) * 100;
            }
        });

        return Array.from(studentsMap.values()).sort((a, b) => b.successRate - a.successRate);
    }, [filteredSubmissions, searchTerm]);

    const overallStats = useMemo(() => {
        const totalExams = examAnalytics.length;
        const avgSuccessRate = examAnalytics.reduce((sum, e) => sum + e.successRate, 0) / (totalExams || 1);
        const totalSubmissions = examAnalytics.reduce((sum, e) => sum + e.totalSubmissions, 0);
        const highPerformingExams = examAnalytics.filter(e => e.successRate >= 70).length;
        const mediumPerformingExams = examAnalytics.filter(e => e.successRate >= 40 && e.successRate < 70).length;
        const lowPerformingExams = examAnalytics.filter(e => e.successRate < 40).length;

        return {
            totalExams,
            avgSuccessRate,
            totalSubmissions,
            highPerformingExams,
            mediumPerformingExams,
            lowPerformingExams
        };
    }, [examAnalytics]);

    const getStudentsForExam = (examId: string) => {
        const studentsData: Array<{
            email: string;
            userName: string;
            totalScore: number;
            totalPossible: number;
            correctAnswers: number;
            incorrectAnswers: number;
            submittedAt: string;
            disqualified: boolean;
        }> = [];

        filteredSubmissions
            .filter((s: Submission) => s.examId === examId)
            .forEach((submission: Submission) => {
                const answers = parseAnswers(submission.answersWithQuestionIds);
                const feedback = parseFeedback(submission.ai_feedback);

                let totalScore = 0;
                let totalPossible = 0;
                let correctAnswers = 0;
                let incorrectAnswers = 0;

                answers.forEach((answer: any) => {
                    const feedbackItem = feedback.find((f: any) => f.questionId === (answer.questionId || answer.id));
                    const score = feedbackItem?.marks || 0;
                    const maxMarks = answer.marks || 0;

                    totalScore += score;
                    totalPossible += maxMarks;

                    if (score === maxMarks) correctAnswers++;
                    else if (score === 0) incorrectAnswers++;
                });

                studentsData.push({
                    email: submission.email,
                    userName: submission.userName || submission.email,
                    totalScore,
                    totalPossible,
                    correctAnswers,
                    incorrectAnswers,
                    submittedAt: submission.submittedAt,
                    disqualified: submission.disqualified
                });
            });

        return studentsData.sort((a, b) => (b.totalScore / b.totalPossible) - (a.totalScore / a.totalPossible));
    };

    const generateExamReport = async (exam: any) => {
        const key = `exam-report-${exam.examId}`;
        setLoadingInsights(prev => ({ ...prev, [key]: true }));

        try {
            const response = await fetch('/api/organizer/ai/generate-exam-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examData: exam
                })
            });
            const data = await response.json();
            console.log(data.report);
            setAiInsights(prev => ({ ...prev, [key]: data.report }));
        } catch (error) {
            console.error('Failed to generate exam report:', error);
        } finally {
            setLoadingInsights(prev => ({ ...prev, [key]: false }));
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20';
            case 'Medium': return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20';
            case 'Hard': return 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/20';
            default: return 'text-muted-foreground bg-muted';
        }
    };

    const getSuccessRateColor = (rate: number) => {
        if (rate >= 70) return 'text-emerald-600 dark:text-emerald-400';
        if (rate >= 40) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    const getProgressBarColor = (rate: number) => {
        if (rate >= 70) return 'bg-emerald-500';
        if (rate >= 40) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background/50 p-6 lg:p-10">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Skeleton className="h-12 w-64 rounded-lg" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background/50 flex flex-col items-center justify-center p-6">
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Failed to load analytics</h3>
                <p className="text-muted-foreground mb-6">There was an error fetching the data. Please try again.</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background/50 p-6 lg:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* --- Header --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-header opacity-0">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-primary" />
                            Exam Analytics
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Insights into student performance and assessment quality.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedExam} onValueChange={setSelectedExam}>
                            <SelectTrigger className="w-[180px] bg-background border-border/50">
                                <SelectValue placeholder="Filter by Exam" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Exams</SelectItem>
                                {examList.map(examId => (
                                    <SelectItem key={examId} value={examId}>{examId}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* --- Stats Overview --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="animate-stat-card opacity-0 border-border/50 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{overallStats.totalExams}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Across all categories
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="animate-stat-card opacity-0 border-border/50 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{overallStats.totalSubmissions}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Candidates evaluated
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="animate-stat-card opacity-0 border-border/50 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Success Rate</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getSuccessRateColor(overallStats.avgSuccessRate)}`}>
                                {overallStats.avgSuccessRate.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Weighted average
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="animate-stat-card opacity-0 border-border/50 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Performance Mix</CardTitle>
                            <PieChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-none">
                                    {overallStats.highPerformingExams} High
                                </Badge>
                                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-none">
                                    {overallStats.mediumPerformingExams} Mid
                                </Badge>
                                <Badge variant="outline" className="bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-none">
                                    {overallStats.lowPerformingExams} Low
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Main Content --- */}
                <div className="animate-content opacity-0 space-y-6">
                    <Tabs defaultValue="questions" className="w-full" onValueChange={(val) => setViewMode(val as any)}>
                        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                            <TabsList className="bg-muted/50 border border-border/50">
                                <TabsTrigger value="questions" className="gap-2"><FileText className="w-4 h-4" /> Exams</TabsTrigger>
                                <TabsTrigger value="students" className="gap-2"><Users className="w-4 h-4" /> Students</TabsTrigger>
                            </TabsList>

                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                                <div className="relative w-full sm:w-[240px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search exams or students..."
                                        className="pl-9 bg-background border-border/50"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <Select value={filterPerformance} onValueChange={(val: any) => setFilterPerformance(val)}>
                                    <SelectTrigger className="w-full sm:w-[160px] bg-background border-border/50">
                                        <SelectValue placeholder="Performance" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Levels</SelectItem>
                                        <SelectItem value="high">High (≥70%)</SelectItem>
                                        <SelectItem value="medium">Medium (40-69%)</SelectItem>
                                        <SelectItem value="low">Low (&lt;40%)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                                    <SelectTrigger className="w-full sm:w-[160px] bg-background border-border/50">
                                        <SelectValue placeholder="Sort By" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="successRate">Success Rate</SelectItem>
                                        <SelectItem value="avgScore">Average Score</SelectItem>
                                        <SelectItem value="attempts">Uniq. Candidates</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* --- Question/Exam Analytics View --- */}
                        <TabsContent value="questions" className="space-y-4 mt-0">
                            {sortedExams.map((exam, index) => (
                                <Card key={exam.examId} className="animate-list-item opacity-0 border-border/50 overflow-hidden hover:shadow-md transition-all group">
                                    <div
                                        className="p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => setExpandedQuestion(expandedQuestion === exam.examId ? null : exam.examId)}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-lg shadow-sm mt-1 shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                                            {exam.examTitle}
                                                        </h3>
                                                        <Badge variant="secondary" className={`
                                                            ${exam.successRate >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                exam.successRate >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}
                                                        `}>
                                                            {exam.successRate >= 70 ? 'High' : exam.successRate >= 40 ? 'Medium' : 'Low'} Perf.
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{exam.totalStudents} students</span>
                                                        <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{exam.totalSubmissions} submissions</span>
                                                        <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" />{exam.avgScore.toFixed(1)}% avg score</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 w-full md:w-auto">
                                                <div className="flex-1 md:w-48">
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="text-muted-foreground font-medium">Avg Score</span>
                                                        <span className={`font-bold ${getSuccessRateColor(exam.avgScore)}`}>{exam.avgScore.toFixed(1)}%</span>
                                                    </div>
                                                    <Progress value={exam.avgScore} className="h-2" indicatorClassName={getProgressBarColor(exam.avgScore).replace('bg-', '')} />
                                                </div>
                                                <Button variant="ghost" size="icon" className="shrink-0">
                                                    {expandedQuestion === exam.examId ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedQuestion === exam.examId && (
                                        <div className="border-t border-border/50 bg-muted/10 p-6 space-y-6">
                                            {/* Key Metrics Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <Card className="bg-background border-border/50 shadow-none">
                                                    <CardContent className="p-4 flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5"><Target className="w-3 h-3" /> Score</span>
                                                        <span className="text-xl font-bold">{exam.avgScore.toFixed(1)}%</span>
                                                    </CardContent>
                                                </Card>
                                                <Card className="bg-background border-border/50 shadow-none">
                                                    <CardContent className="p-4 flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5"><Users className="w-3 h-3" /> Students</span>
                                                        <span className="text-xl font-bold">{exam.totalStudents}</span>
                                                    </CardContent>
                                                </Card>
                                                <Card className="bg-background border-border/50 shadow-none">
                                                    <CardContent className="p-4 flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Success Rate</span>
                                                        <span className={`text-xl font-bold ${getSuccessRateColor(exam.successRate)}`}>{exam.successRate.toFixed(1)}%</span>
                                                    </CardContent>
                                                </Card>
                                                <Card className="bg-background border-border/50 shadow-none">
                                                    <CardContent className="p-4 flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5"><Activity className="w-3 h-3" /> Completion</span>
                                                        <span className="text-xl font-bold">{exam.completionRate.toFixed(1)}%</span>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Top Performers */}
                                                {exam.topPerformers.length > 0 && (
                                                    <Card className="border-border/50 shadow-none">
                                                        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
                                                            <CardTitle className="text-sm font-medium flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Top Performers</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-0">
                                                            <div className="divide-y divide-border/50">
                                                                {exam.topPerformers.map((performer: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center justify-between p-3 px-4 hover:bg-muted/30">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                                                idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                                                    'bg-orange-100 text-orange-700'
                                                                                }`}>
                                                                                #{idx + 1}
                                                                            </div>
                                                                            <span className="font-medium text-sm">{performer.name}</span>
                                                                        </div>
                                                                        <span className="font-bold text-sm text-primary">{performer.score.toFixed(1)}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Students List */}
                                                <Card className="border-border/50 shadow-none">
                                                    <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
                                                        <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Participants</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-0 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                        <div className="divide-y divide-border/50">
                                                            {getStudentsForExam(exam.examId).map((student: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between p-3 px-4 hover:bg-muted/30">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                                                                            {student.userName.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium text-sm">{student.userName}</span>
                                                                            <span className="text-[10px] text-muted-foreground">{student.email}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* AI Insights Panel */}
                                            <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-base flex items-center gap-2 text-foreground">
                                                            <Brain className="w-5 h-5 text-purple-600" />
                                                            AI-Powered Exam Insights
                                                        </CardTitle>
                                                        <Button
                                                            onClick={() => generateExamReport(exam)}
                                                            disabled={loadingInsights[`exam-report-${exam.examId}`]}
                                                            size="sm"
                                                            variant="default"
                                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                                        >
                                                            {loadingInsights[`exam-report-${exam.examId}`] ? (
                                                                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Analyzing...</>
                                                            ) : (
                                                                <><Sparkles className="w-3.5 h-3.5 mr-2" /> Generate Report</>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {aiInsights[`exam-report-${exam.examId}`] && (
                                                        <div className="bg-background/60 backdrop-blur-sm border border-purple-100 dark:border-purple-800/50 rounded-lg p-4 space-y-3">
                                                            <div>
                                                                <h4 className="font-semibold text-sm mb-1 text-purple-900 dark:text-purple-300">Executive Summary</h4>
                                                                <p className="text-sm text-foreground/80 leading-relaxed">{aiInsights[`exam-report-${exam.examId}`].summary}</p>
                                                            </div>
                                                            <Separator className="bg-purple-200 dark:bg-purple-800/50" />
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Key Findings</h4>
                                                                    <ul className="space-y-1.5">
                                                                        {aiInsights[`exam-report-${exam.examId}`].keyFindings.map((finding: string, idx: number) => (
                                                                            console.log(finding),
                                                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                                                <span className="text-purple-500 mt-0.5">•</span>
                                                                                <span>{finding}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Recommendations</h4>
                                                                    <ul className="space-y-1.5">
                                                                        {aiInsights[`exam-report-${exam.examId}`].recommendations.map((rec: string, idx: number) => (
                                                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                                                <span>{rec}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!aiInsights[`exam-report-${exam.examId}`] && (
                                                        <div className="text-center py-6 text-muted-foreground text-sm">
                                                            Click "Generate Report" to get AI performance analysis and recommendations.
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {exam.disqualifiedCount > 0 && (
                                                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-center gap-3 text-sm font-medium">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {exam.disqualifiedCount} student(s) were disqualified from this exam due to proctoring violations.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </TabsContent>

                        {/* --- Student Analytics View --- */}
                        <TabsContent value="students" className="mt-0">
                            {studentAnalytics.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                                    <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                    <h3 className="text-lg font-semibold text-foreground">No student data available</h3>
                                    <p className="text-sm text-muted-foreground">Student analytics will appear once submissions are received.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {studentAnalytics.map((student, index) => (
                                        <Card key={student.email} className="animate-list-item opacity-0 border-border/50 overflow-hidden hover:shadow-md transition-all">
                                            <div
                                                className="p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                                                onClick={() => setSelectedStudent(selectedStudent === student.email ? null : student.email)}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary">
                                                            {(student.userName || student.email).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-foreground">{student.userName || student.email}</h3>
                                                                {student.disqualified && <Badge variant="destructive" className="text-[10px] h-5">Disqualified</Badge>}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                                <span>{student.email}</span>
                                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                                <span>{student.totalSubmissions} submissions</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-8 w-full md:w-auto">
                                                        <div className="text-center">
                                                            <div className="text-xs text-muted-foreground font-medium mb-1">Success Rate</div>
                                                            <div className={`text-lg font-bold ${getSuccessRateColor(student.successRate)}`}>
                                                                {student.successRate.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-xs text-muted-foreground font-medium mb-1">Score</div>
                                                            <div className="text-lg font-bold">
                                                                {student.totalScore}/{student.totalPossibleScore}
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="shrink-0">
                                                            {selectedStudent === student.email ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedStudent === student.email && (
                                                <div className="border-t border-border/50 bg-muted/10 p-6 space-y-6">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                        {/* Detailed Stats */}
                                                        <Card className="border-border/50 shadow-none">
                                                            <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
                                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                                    <Activity className="w-4 h-4 text-primary" /> Performance Stats
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="p-4 grid grid-cols-2 gap-4">
                                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                                    <div className="text-xs text-muted-foreground mb-1">Correct Answers</div>
                                                                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{student.correctAnswers}</div>
                                                                </div>
                                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                                    <div className="text-xs text-muted-foreground mb-1">Incorrect Answers</div>
                                                                    <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{student.incorrectAnswers}</div>
                                                                </div>
                                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                                    <div className="text-xs text-muted-foreground mb-1">Partial Credit</div>
                                                                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{student.partialCredit}</div>
                                                                </div>
                                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                                    <div className="text-xs text-muted-foreground mb-1">Questions Attempted</div>
                                                                    <div className="text-xl font-bold text-foreground">{student.totalQuestions}</div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>

                                                        {/* AI Analysis */}
                                                        <Card className="border-primary/20 shadow-none bg-primary/5">
                                                            <CardHeader className="py-3 px-4 border-b border-primary/10">
                                                                <div className="flex items-center justify-between">
                                                                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                                                                        <Brain className="w-4 h-4" /> Student Analysis
                                                                    </CardTitle>
                                                                    <Button
                                                                        onClick={() => fetchStudentAnalysis(student)}
                                                                        disabled={studentAnalysis[student.email]?.loading}
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 text-xs border-primary/20 hover:bg-primary/10 hover:text-primary"
                                                                    >
                                                                        {studentAnalysis[student.email]?.loading ? (
                                                                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</>
                                                                        ) : (
                                                                            <><Sparkles className="w-3 h-3 mr-1" /> {studentAnalysis[student.email] ? 'Refresh' : 'Analyze'}</>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="p-4">
                                                                {studentAnalysis[student.email] ? (
                                                                    <div className="space-y-4">
                                                                        <div className="space-y-2">
                                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Top Strengths</h4>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {studentAnalysis[student.email].strengths.slice(0, 3).map((s, i) => (
                                                                                    <Badge key={i} variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                                                                        {s.topic}
                                                                                    </Badge>
                                                                                ))}
                                                                                {studentAnalysis[student.email].strengths.length === 0 && <span className="text-xs text-muted-foreground">No specific strengths identified.</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Areas to Improve</h4>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {studentAnalysis[student.email].weaknesses.slice(0, 3).map((s, i) => (
                                                                                    <Badge key={i} variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400">
                                                                                        {s.topic}
                                                                                    </Badge>
                                                                                ))}
                                                                                {studentAnalysis[student.email].weaknesses.length === 0 && <span className="text-xs text-muted-foreground">No major weaknesses detected.</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground min-h-[140px]">
                                                                        <Sparkles className="w-8 h-8 opacity-20 mb-2" />
                                                                        Click analyze to generate insights using AI.
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    </div>

                                                    {/* Q&A Breakdown */}
                                                    <Card className="border-border/50 shadow-none">
                                                        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20">
                                                            <CardTitle className="text-sm font-medium">Question Breakdown</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                            <div className="divide-y divide-border/50">
                                                                {student.questionDetails.map((q: any, idx: number) => (
                                                                    <div key={idx} className="p-4 hover:bg-muted/30">
                                                                        <div className="flex items-start justify-between gap-4 mb-2">
                                                                            <span className="font-medium text-sm">Question {idx + 1}: <span className="font-normal text-muted-foreground">{q.questionType}</span></span>
                                                                            <Badge variant="outline" className={`${q.score === q.maxMarks ? 'border-emerald-500 text-emerald-500' : q.score === 0 ? 'border-rose-500 text-rose-500' : 'border-amber-500 text-amber-500'}`}>
                                                                                {q.score}/{q.maxMarks}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                                                                            "{q.feedback}"
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}