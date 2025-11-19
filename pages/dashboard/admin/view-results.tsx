import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Search,
    Filter,
    Download,
    Eye,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Clock,
    Trophy,
    Users,
    FileText,
    Code,
    Target,
    Timer,
    Zap
} from 'lucide-react';
import Head from 'next/head';

// Type definitions
interface ExamSubmission {
    id: number;
    email: string;
    userName: string;
    examId: string;
    answersWithQuestionIds: string;
    disqualified: boolean;
    submittedAt: string;
    ai_feedback: string;
}

interface PracticeSubmission {
    id: number;
    questionDescription: string;
    email: string;
    userName: string;
    submittedCode: string;
    language: string;
    isPassed: boolean;
    testCasesPassed: number;
    totalTestCases: number;
    executionTime: number;
    aiFeedback: string;
    score: number;
    attemptNumber: number;
}

interface GuestPracticeSubmission {
    id: number;
    sessionId: string;
    topic: string;
    difficulty: string;
    questionsData: string | any;
    answers: string | any;
    score: string | number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    completedAt: string;
}

const ViewResult: React.FC = () => {
    const [activeTab, setActiveTab] = useState('exam');

    // Exam state
    const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([]);
    const [examLoading, setExamLoading] = useState(true);
    const [examSearch, setExamSearch] = useState('');
    const [examFilter, setExamFilter] = useState<'all' | 'qualified' | 'disqualified'>('all');

    // Practice state
    const [practiceSubmissions, setPracticeSubmissions] = useState<PracticeSubmission[]>([]);
    const [practiceLoading, setPracticeLoading] = useState(false);
    const [practiceSearch, setPracticeSearch] = useState('');
    const [practiceFilter, setPracticeFilter] = useState<'all' | 'passed' | 'failed'>('all');

    // Guest practice state
    const [guestSubmissions, setGuestSubmissions] = useState<GuestPracticeSubmission[]>([]);
    const [guestLoading, setGuestLoading] = useState(false);
    const [guestSearch, setGuestSearch] = useState('');
    const [guestDifficultyFilter, setGuestDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

    // Dialog state for guest practice
    // const [selectedGuestSubmission, setSelectedGuestSubmission] = useState<GuestPracticeSubmission | null>(null);
    const [isGuestDetailsOpen, setIsGuestDetailsOpen] = useState(false);


    // Add this with other state declarations
    const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

    // Add this with other state declarations
    const [selectedGuestSubmission, setSelectedGuestSubmission] = useState<GuestPracticeSubmission | null>(null);
    const [guestDetailsDialogOpen, setGuestDetailsDialogOpen] = useState(false);

    // Fetch exam submissions
    useEffect(() => {
        const getExamResults = async () => {
            try {
                setExamLoading(true);
                const res = await fetch('/api/admin/submissions', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    credentials: 'same-origin'
                });

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setExamSubmissions(data);
            } catch (error) {
                console.error('Error fetching exam submissions:', error);
            } finally {
                setExamLoading(false);
            }
        };

        getExamResults();
    }, []);

    // Fetch practice submissions when tab is activated
    useEffect(() => {
        if (activeTab === 'practice' && practiceSubmissions.length === 0) {
            const getPracticeResults = async () => {
                try {
                    setPracticeLoading(true);
                    const res = await fetch('/api/admin/practice-submissions', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache',
                        },
                        credentials: 'same-origin'
                    });

                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    const data = await res.json();
                    setPracticeSubmissions(data);
                } catch (error) {
                    console.error('Error fetching practice submissions:', error);
                } finally {
                    setPracticeLoading(false);
                }
            };

            getPracticeResults();
        }
    }, [activeTab, practiceSubmissions.length]);

    // Fetch guest practice submissions when tab is activated
    useEffect(() => {
        if (activeTab === 'guest' && guestSubmissions.length === 0) {
            const getGuestResults = async () => {
                try {
                    setGuestLoading(true);
                    const res = await fetch('/api/admin/guest-practice-submissions', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache',
                        },
                        credentials: 'same-origin'
                    });

                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    const data = await res.json();
                    setGuestSubmissions(data);
                } catch (error) {
                    console.error('Error fetching guest submissions:', error);
                } finally {
                    setGuestLoading(false);
                }
            };

            getGuestResults();
        }
    }, [activeTab, guestSubmissions.length]);

    // Helper functions for exam submissions
    const calculateTotalScore = (answersJson: string) => {
        try {
            const answers = JSON.parse(answersJson);
            return answers.reduce((total: number, ans: any) => total + (ans.marks || 0), 0);
        } catch {
            return 0;
        }
    };

    const calculateAIScore = (feedbackJson: string) => {
        try {
            const feedback = JSON.parse(feedbackJson);
            return feedback.reduce((total: number, item: any) => total + (item.marks || 0), 0);
        } catch {
            return 0;
        }
    };

    // Filter exam submissions
    const filteredExamSubmissions = examSubmissions.filter(sub => {
        const matchesSearch =
            sub.userName.toLowerCase().includes(examSearch.toLowerCase()) ||
            sub.email.toLowerCase().includes(examSearch.toLowerCase()) ||
            sub.examId.toLowerCase().includes(examSearch.toLowerCase());

        const matchesStatus =
            examFilter === 'all' ? true :
                examFilter === 'qualified' ? !sub.disqualified :
                    sub.disqualified;

        return matchesSearch && matchesStatus;
    });

    // Filter practice submissions
    const filteredPracticeSubmissions = practiceSubmissions.filter(sub => {
        const matchesSearch =
            sub.userName.toLowerCase().includes(practiceSearch.toLowerCase()) ||
            sub.email.toLowerCase().includes(practiceSearch.toLowerCase()) ||
            sub.questionDescription.toLowerCase().includes(practiceSearch.toLowerCase());

        const matchesStatus =
            practiceFilter === 'all' ? true :
                practiceFilter === 'passed' ? sub.isPassed :
                    !sub.isPassed;

        return matchesSearch && matchesStatus;
    });

    // Filter guest submissions
    const filteredGuestSubmissions = guestSubmissions.filter(sub => {
        const matchesSearch =
            sub.sessionId.toLowerCase().includes(guestSearch.toLowerCase()) ||
            sub.topic.toLowerCase().includes(guestSearch.toLowerCase());

        const matchesDifficulty =
            guestDifficultyFilter === 'all' ? true :
                sub.difficulty.toLowerCase() === guestDifficultyFilter;

        return matchesSearch && matchesDifficulty;
    });

    // Stats calculations
    const examStats = {
        total: filteredExamSubmissions.length,
        qualified: filteredExamSubmissions.filter(s => !s.disqualified).length,
        disqualified: filteredExamSubmissions.filter(s => s.disqualified).length,
        avgScore: filteredExamSubmissions.length > 0
            ? Math.round(filteredExamSubmissions.reduce((sum, s) => sum + calculateAIScore(s.ai_feedback), 0) / filteredExamSubmissions.length)
            : 0
    };

    const practiceStats = {
        total: filteredPracticeSubmissions.length,
        passed: filteredPracticeSubmissions.filter(s => s.isPassed).length,
        failed: filteredPracticeSubmissions.filter(s => !s.isPassed).length,
        avgScore: filteredPracticeSubmissions.length > 0
            ? Math.round(filteredPracticeSubmissions.reduce((sum, s) => sum + s.score, 0) / filteredPracticeSubmissions.length)
            : 0
    };

    // Add this helper function before guestStats
    const parseScore = (score: string | number): number => {
        return typeof score === 'string' ? parseFloat(score) || 0 : score || 0;
    };

    const guestStats = {
        total: filteredGuestSubmissions.length,
        avgScore: filteredGuestSubmissions.length > 0
            ? Math.round(filteredGuestSubmissions.reduce((sum, s) => sum + parseScore(s.score), 0) / filteredGuestSubmissions.length)
            : 0,
        avgCorrect: filteredGuestSubmissions.length > 0
            ? Math.round(filteredGuestSubmissions.reduce((sum, s) => sum + (s.correctAnswers || 0), 0) / filteredGuestSubmissions.length)
            : 0,
        avgTime: filteredGuestSubmissions.length > 0
            ? Math.round(filteredGuestSubmissions.reduce((sum, s) => sum + (s.timeSpent || 0), 0) / filteredGuestSubmissions.length)
            : 0
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const handleViewGuestDetails = (submission: GuestPracticeSubmission) => {
        setSelectedGuestSubmission(submission);
        setIsGuestDetailsOpen(true);
    };

    // Add this helper function before the return statement
    const getSubmissionDetails = (submission: ExamSubmission) => {
        try {
            const answers = JSON.parse(submission.answersWithQuestionIds);
            const feedback = JSON.parse(submission.ai_feedback);

            // Combine answers with feedback
            return answers.map((answer: any) => {
                const feedbackItem = feedback.find((f: any) => f.questionId === answer.questionId);
                return {
                    ...answer,
                    feedback: feedbackItem?.feedback || 'No feedback available',
                    marksAwarded: feedbackItem?.marks || 0
                };
            });
        } catch (error) {
            console.error('Error parsing submission details:', error);
            return [];
        }
    };

    // Replace the existing getGuestSubmissionDetails function
    const getGuestSubmissionDetails = (submission: GuestPracticeSubmission) => {
        try {
            const questionsData = typeof submission.questionsData === 'string'
                ? JSON.parse(submission.questionsData)
                : submission.questionsData;

            const answers = typeof submission.answers === 'string'
                ? JSON.parse(submission.answers)
                : submission.answers;

            return questionsData.map((question: any, index: number) => {
                const userAnswer = question.type === 'mcq'
                    ? answers.mcq[index]
                    : answers.coding[index];

                return {
                    ...question,
                    userAnswer,
                    questionNumber: index + 1
                };
            });
        } catch (error) {
            console.error('Error parsing guest submission details:', error);
            return [];
        }
    };

    return (
        <UnifiedDashboardLayout role='admin'>
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Assessment Results</h1>
                        <p className="text-muted-foreground mt-1">
                            View and manage all assessment submissions across different types
                        </p>
                    </div>
                    {/* <Button className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Results
                    </Button> */}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                        <TabsTrigger value="exam" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Exam
                        </TabsTrigger>
                        <TabsTrigger value="practice" className="gap-2">
                            <Code className="h-4 w-4" />
                            Practice
                        </TabsTrigger>
                        <TabsTrigger value="guest" className="gap-2">
                            <Users className="h-4 w-4" />
                            Guest Practice
                        </TabsTrigger>
                    </TabsList>

                    {/* EXAM TAB */}
                    <TabsContent value="exam" className="space-y-4">
                        {/* Stats Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{examStats.total}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Exam attempts</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Qualified</CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{examStats.qualified}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {examStats.total > 0 ? Math.round((examStats.qualified / examStats.total) * 100) : 0}% of total
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Disqualified</CardTitle>
                                    <XCircle className="h-4 w-4 text-destructive" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-destructive">{examStats.disqualified}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {examStats.total > 0 ? Math.round((examStats.disqualified / examStats.total) * 100) : 0}% of total
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                                    <Trophy className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{examStats.avgScore}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Out of total marks</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Exam Submissions</CardTitle>
                                        <CardDescription>
                                            Showing {filteredExamSubmissions.length} submission(s)
                                        </CardDescription>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Search by name or email..."
                                                className="pl-8 w-[300px]"
                                                value={examSearch}
                                                onChange={(e) => setExamSearch(e.target.value)}
                                            />
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="gap-2">
                                                    <Filter className="h-4 w-4" />
                                                    Filter
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setExamFilter('all')}>
                                                    All Submissions
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setExamFilter('qualified')}>
                                                    Qualified Only
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setExamFilter('disqualified')}>
                                                    Disqualified Only
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {examLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center space-y-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                            <p className="text-sm text-muted-foreground">Loading submissions...</p>
                                        </div>
                                    </div>
                                ) : filteredExamSubmissions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-semibold text-lg">No submissions found</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {examSearch || examFilter !== 'all'
                                                ? 'Try adjusting your search or filters'
                                                : 'Submissions will appear here once candidates complete the exam'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]">#</TableHead>
                                                    <TableHead>Candidate</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Exam ID</TableHead>
                                                    <TableHead>Score</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Submitted</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredExamSubmissions.map((submission, index) => {
                                                    const aiScore = calculateAIScore(submission.ai_feedback);
                                                    const totalMarks = calculateTotalScore(submission.answersWithQuestionIds);

                                                    return (
                                                        <TableRow key={submission.id}>
                                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                                            <TableCell>
                                                                <div className="font-medium">{submission.userName}</div>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {submission.email}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-mono text-xs">
                                                                    {submission.examId}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">{aiScore}</span>
                                                                    <span className="text-muted-foreground text-sm">/ {totalMarks}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {submission.disqualified ? (
                                                                    <Badge variant="destructive" className="gap-1">
                                                                        <XCircle className="h-3 w-3" />
                                                                        Disqualified
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        Qualified
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem
                                                                            className="gap-2"
                                                                            onClick={() => {
                                                                                setSelectedSubmission(submission);
                                                                                setDetailsDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                            View Details
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem className="gap-2">
                                                                            <Download className="h-4 w-4" />
                                                                            Download Report
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PRACTICE TAB */}
                    <TabsContent value="practice" className="space-y-4">
                        {/* Stats Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                                    <Code className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{practiceStats.total}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Practice submissions</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Passed</CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{practiceStats.passed}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {practiceStats.total > 0 ? Math.round((practiceStats.passed / practiceStats.total) * 100) : 0}% success rate
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Failed</CardTitle>
                                    <XCircle className="h-4 w-4 text-destructive" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-destructive">{practiceStats.failed}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {practiceStats.total > 0 ? Math.round((practiceStats.failed / practiceStats.total) * 100) : 0}% of attempts
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                                    <Trophy className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{practiceStats.avgScore}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Average performance</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Practice Submissions</CardTitle>
                                        <CardDescription>
                                            Showing {filteredPracticeSubmissions.length} submission(s)
                                        </CardDescription>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Search by name or question..."
                                                className="pl-8 w-[300px]"
                                                value={practiceSearch}
                                                onChange={(e) => setPracticeSearch(e.target.value)}
                                            />
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="gap-2">
                                                    <Filter className="h-4 w-4" />
                                                    Filter
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Filter by Result</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setPracticeFilter('all')}>
                                                    All Submissions
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPracticeFilter('passed')}>
                                                    Passed Only
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPracticeFilter('failed')}>
                                                    Failed Only
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {practiceLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center space-y-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                            <p className="text-sm text-muted-foreground">Loading practice submissions...</p>
                                        </div>
                                    </div>
                                ) : filteredPracticeSubmissions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Code className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-semibold text-lg">No practice submissions found</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {practiceSearch || practiceFilter !== 'all'
                                                ? 'Try adjusting your search or filters'
                                                : 'Practice submissions will appear here'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]">#</TableHead>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Question</TableHead>
                                                    <TableHead>Language</TableHead>
                                                    <TableHead>Test Cases</TableHead>
                                                    <TableHead>Score</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Attempt</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPracticeSubmissions.map((submission, index) => (
                                                    <TableRow key={submission.id}>
                                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{submission.userName}</div>
                                                                <div className="text-xs text-muted-foreground">{submission.email}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[200px] truncate" title={submission.questionDescription}>
                                                                {submission.questionDescription}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-mono text-xs">
                                                                {submission.language}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <Target className="h-3 w-3 text-muted-foreground" />
                                                                <span className="font-medium">{submission.testCasesPassed}</span>
                                                                <span className="text-muted-foreground text-sm">/ {submission.totalTestCases}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-semibold">{submission.score}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm">
                                                                <Zap className="h-3 w-3 text-muted-foreground" />
                                                                {submission.executionTime}ms
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-xs">
                                                                #{submission.attemptNumber}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {submission.isPassed ? (
                                                                <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Passed
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="destructive" className="gap-1">
                                                                    <XCircle className="h-3 w-3" />
                                                                    Failed
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem className="gap-2">
                                                                        <Eye className="h-4 w-4" />
                                                                        View Code
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="gap-2">
                                                                        <FileText className="h-4 w-4" />
                                                                        View Feedback
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* GUEST PRACTICE TAB */}
                    <TabsContent value="guest" className="space-y-4">
                        {/* Stats Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{guestStats.total}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Guest attempts</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                                    <Trophy className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{guestStats.avgScore}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Average points</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Avg Correct</CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{guestStats.avgCorrect}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Questions answered</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                                    <Timer className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatTime(guestStats.avgTime)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Per session</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Guest Practice Sessions</CardTitle>
                                        <CardDescription>
                                            Showing {filteredGuestSubmissions.length} session(s)
                                        </CardDescription>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Search by session or topic..."
                                                className="pl-8 w-[300px]"
                                                value={guestSearch}
                                                onChange={(e) => setGuestSearch(e.target.value)}
                                            />
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="gap-2">
                                                    <Filter className="h-4 w-4" />
                                                    Filter
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('all')}>
                                                    All Difficulties
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('easy')}>
                                                    Easy
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('medium')}>
                                                    Medium
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('hard')}>
                                                    Hard
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {guestLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center space-y-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                            <p className="text-sm text-muted-foreground">Loading guest sessions...</p>
                                        </div>
                                    </div>
                                ) : filteredGuestSubmissions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-semibold text-lg">No guest sessions found</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {guestSearch || guestDifficultyFilter !== 'all'
                                                ? 'Try adjusting your search or filters'
                                                : 'Guest practice sessions will appear here'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]">#</TableHead>
                                                    <TableHead>Session ID</TableHead>
                                                    <TableHead>Topic</TableHead>
                                                    <TableHead>Difficulty</TableHead>
                                                    <TableHead>Score</TableHead>
                                                    <TableHead>Accuracy</TableHead>
                                                    <TableHead>Time Spent</TableHead>
                                                    <TableHead>Completed</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredGuestSubmissions.map((submission, index) => {
                                                    const accuracy = submission.totalQuestions > 0
                                                        ? Math.round((submission.correctAnswers / submission.totalQuestions) * 100)
                                                        : 0;

                                                    return (
                                                        <TableRow key={submission.id}>
                                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-mono text-xs">
                                                                    {submission.sessionId.substring(0, 8)}...
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-medium">{submission.topic}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={getDifficultyColor(submission.difficulty)}>
                                                                    {submission.difficulty}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-semibold text-lg">{submission.score}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                                        <span className="font-medium">{submission.correctAnswers}</span>
                                                                    </div>
                                                                    <span className="text-muted-foreground text-sm">/ {submission.totalQuestions}</span>
                                                                    <span className="text-xs text-muted-foreground">({accuracy}%)</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                                    {formatTime(submission.timeSpent)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                {new Date(submission.completedAt).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem
                                                                            className="gap-2"
                                                                            onClick={() => {
                                                                                setSelectedGuestSubmission(submission);
                                                                                setGuestDetailsDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                            View Details
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Replace the Dialog opening tag and content */}
            {selectedSubmission && (
                <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                    <DialogContent className="max-w-5xl max-h-[90vh] bg-card border-border p-0">
                        <div className="p-6 border-b border-border">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Submission Details</DialogTitle>
                                <DialogDescription className="text-base">
                                    {selectedSubmission.userName} - {selectedSubmission.email}
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <ScrollArea className="h-[70vh] px-6">
                            <div className="space-y-6 py-4">
                                {/* Summary Info */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Exam ID</p>
                                        <p className="font-semibold text-base break-words">{selectedSubmission.examId}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Submitted At</p>
                                        <p className="font-semibold text-base">
                                            {new Date(selectedSubmission.submittedAt).toLocaleString('en-US', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                                        <p className="font-bold text-2xl">
                                            {calculateAIScore(selectedSubmission.ai_feedback)} / {calculateTotalScore(selectedSubmission.answersWithQuestionIds)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                                        <div className="mt-1">
                                            {selectedSubmission.disqualified ? (
                                                <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Disqualified
                                                </Badge>
                                            ) : (
                                                <Badge className="gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Qualified
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-6" />

                                {/* Questions, Answers, and Feedback */}
                                <div className="space-y-4 pb-4">
                                    {getSubmissionDetails(selectedSubmission).map((item: any, index: number) => (
                                        <div key={item.questionId} className="border border-border rounded-lg overflow-hidden bg-card">
                                            {/* Question Header */}
                                            <div className="p-4 bg-muted/50 border-b border-border">
                                                <div className="flex items-center justify-between gap-4 mb-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-sm font-semibold px-2.5 py-0.5">
                                                            Q{index + 1}
                                                        </Badge>
                                                        <Badge
                                                            variant={item.type === 'mcq' ? 'secondary' : 'default'}
                                                            className="text-sm px-2.5 py-0.5"
                                                        >
                                                            {item.type === 'mcq' ? 'MCQ' : 'Coding'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-lg font-bold">
                                                            {item.marksAwarded} / {item.marks}
                                                        </span>
                                                        {item.marksAwarded === item.marks ? (
                                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                        ) : item.marksAwarded > 0 ? (
                                                            <Clock className="h-5 w-5 text-yellow-600" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5 text-destructive" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Question Text */}
                                                <div className="text-base font-semibold leading-relaxed break-words">
                                                    <div
                                                        dangerouslySetInnerHTML={{
                                                            __html: item.question
                                                                .replace(/<p[^>]*>/g, '')
                                                                .replace(/<\/p>/g, '<br />')
                                                                .replace(/<div[^>]*>/g, '')
                                                                .replace(/<\/div>/g, '<br />')
                                                                .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br />')
                                                                .replace(/&nbsp;/g, ' ')
                                                                .trim()
                                                        }}
                                                        className="[&_b]:font-bold [&_strong]:font-bold [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono break-words"
                                                    />
                                                </div>
                                            </div>

                                            {/* Answer and Feedback */}
                                            <div className="p-4 space-y-4">
                                                {/* User's Answer */}
                                                <div>
                                                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                                                        User's Answer:
                                                    </p>
                                                    {item.type === 'mcq' ? (
                                                        <div className="p-3 bg-muted/30 rounded-md border border-border break-words">
                                                            <p className="font-medium">{item.selectedOptionText || item.answer}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-muted/30 rounded-md border border-border overflow-hidden">
                                                            <pre className="overflow-x-auto text-sm font-mono whitespace-pre-wrap break-words">
                                                                <code className="text-foreground">{item.answer}</code>
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* AI Feedback */}
                                                <div>
                                                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                                                        Feedback:
                                                    </p>
                                                    <div className={`p-4 rounded-md border-l-4 ${item.marksAwarded === item.marks
                                                        ? 'bg-green-500/10 border-green-600'
                                                        : item.marksAwarded > 0
                                                            ? 'bg-yellow-500/10 border-yellow-600'
                                                            : 'bg-red-500/10 border-red-600'
                                                        }`}>
                                                        <p className="text-sm leading-relaxed break-words">{item.feedback}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}

            {/* Guest Practice Details Dialog */}
            {selectedGuestSubmission && (
                <Dialog open={guestDetailsDialogOpen} onOpenChange={setGuestDetailsDialogOpen}>
                    <DialogContent className="max-w-5xl max-h-[90vh] bg-card border-border p-0 flex flex-col">
                        <div className="p-6 border-b border-border shrink-0">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Guest Practice Session Details</DialogTitle>
                                <DialogDescription className="text-base">
                                    Session ID: {selectedGuestSubmission.sessionId}
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <ScrollArea className="flex-1 px-6 overflow-y-auto">
                            <div className="space-y-6 py-4 pb-6">
                                {/* Summary Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Topic</p>
                                        <p className="font-semibold text-base">{selectedGuestSubmission.topic}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Difficulty</p>
                                        <Badge className={getDifficultyColor(selectedGuestSubmission.difficulty)}>
                                            {selectedGuestSubmission.difficulty}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Score</p>
                                        <p className="font-bold text-2xl">{selectedGuestSubmission.score}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                                        <p className="font-bold text-2xl">
                                            {selectedGuestSubmission.totalQuestions > 0
                                                ? Math.round((selectedGuestSubmission.correctAnswers / selectedGuestSubmission.totalQuestions) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Correct Answers</p>
                                        <p className="font-semibold text-lg text-green-600">
                                            {selectedGuestSubmission.correctAnswers} / {selectedGuestSubmission.totalQuestions}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                                        <p className="font-semibold text-lg">{formatTime(selectedGuestSubmission.timeSpent)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm text-muted-foreground mb-1">Completed At</p>
                                        <p className="font-semibold text-base">
                                            {new Date(selectedGuestSubmission.completedAt).toLocaleString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <Separator className="my-6" />

                                {/* Questions and Answers */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-xl">Questions & Answers</h3>

                                    {getGuestSubmissionDetails(selectedGuestSubmission).map((item: any) => (
                                        <div key={item.questionNumber} className="border border-border rounded-lg overflow-hidden bg-card">
                                            {/* Question Header */}
                                            <div className="p-4 bg-muted/50 border-b border-border">
                                                <div className="flex items-center justify-between gap-4 mb-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-sm font-semibold px-2.5 py-0.5">
                                                            Q{item.questionNumber}
                                                        </Badge>
                                                        <Badge
                                                            variant={item.type === 'mcq' ? 'secondary' : 'default'}
                                                            className="text-sm px-2.5 py-0.5"
                                                        >
                                                            {item.type === 'mcq' ? 'MCQ' : 'Coding'}
                                                        </Badge>
                                                        {item.type === 'coding' && item.language && (
                                                            <Badge variant="outline" className="text-sm px-2.5 py-0.5 font-mono">
                                                                {item.language.toUpperCase()}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Question Title */}
                                                <h4 className="text-lg font-bold mb-3 break-words">{item.question}</h4>

                                                {/* Question Description */}
                                                {item.description && (
                                                    <div className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap bg-muted/30 p-3 rounded-md max-w-full overflow-hidden">
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Answer Section */}
                                            <div className="p-4 space-y-4">
                                                {/* User's Answer */}
                                                <div>
                                                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                                                        User's Answer:
                                                    </p>
                                                    {item.type === 'mcq' ? (
                                                        <div className="p-3 bg-muted/30 rounded-md border border-border break-words">
                                                            <p className="font-medium">
                                                                {item.userAnswer >= 0 && item.options
                                                                    ? item.options[item.userAnswer]
                                                                    : item.userAnswer === -1
                                                                        ? <span className="text-muted-foreground italic">Not answered</span>
                                                                        : item.userAnswer}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-muted/30 rounded-md border border-border overflow-hidden max-w-full">
                                                            <pre className="overflow-x-auto text-sm font-mono whitespace-pre-wrap break-words max-w-full">
                                                                <code className="text-foreground">
                                                                    {item.userAnswer || <span className="text-muted-foreground italic">No answer provided</span>}
                                                                </code>
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Test Cases (for coding questions) */}
                                                {item.type === 'coding' && item.testCases && item.testCases.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-semibold text-muted-foreground mb-2">
                                                            Test Cases:
                                                        </p>
                                                        <div className="space-y-2">
                                                            {item.testCases.map((testCase: any, tcIndex: number) => (
                                                                <div key={tcIndex} className="p-3 bg-muted/30 rounded-md border border-border">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                                        <div className="break-words">
                                                                            <p className="text-muted-foreground font-medium mb-1">Input:</p>
                                                                            <code className="text-xs font-mono break-words block">{testCase.input}</code>
                                                                        </div>
                                                                        <div className="break-words">
                                                                            <p className="text-muted-foreground font-medium mb-1">Expected Output:</p>
                                                                            <code className="text-xs font-mono break-words block">{testCase.expectedOutput}</code>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Explanation (if available) */}
                                                {item.explanation && (
                                                    <div>
                                                        <p className="text-sm font-semibold text-muted-foreground mb-2">
                                                            Explanation:
                                                        </p>
                                                        <div className="p-4 rounded-md bg-blue-500/10 border-l-4 border-blue-600 break-words max-w-full overflow-hidden">
                                                            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                                                {item.explanation}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </UnifiedDashboardLayout>
    );
};

export default ViewResult;