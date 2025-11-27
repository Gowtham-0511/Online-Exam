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
    Zap,
    Calendar,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import Head from 'next/head';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

    // Dialog state
    const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

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

    // Helper functions
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

    const parseScore = (score: string | number): number => {
        return typeof score === 'string' ? parseFloat(score) || 0 : score || 0;
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'hard': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    const getSubmissionDetails = (submission: ExamSubmission) => {
        try {
            const answers = JSON.parse(submission.answersWithQuestionIds);
            const feedback = JSON.parse(submission.ai_feedback);

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

    // Filters
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

    const filteredGuestSubmissions = guestSubmissions.filter(sub => {
        const matchesSearch =
            sub.sessionId.toLowerCase().includes(guestSearch.toLowerCase()) ||
            sub.topic.toLowerCase().includes(guestSearch.toLowerCase());

        const matchesDifficulty =
            guestDifficultyFilter === 'all' ? true :
                sub.difficulty.toLowerCase() === guestDifficultyFilter;

        return matchesSearch && matchesDifficulty;
    });

    // Stats
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

    return (
        <UnifiedDashboardLayout role='admin'>
            <Head>
                <title>Assessment Results | SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
                            <Trophy className="w-8 h-8 text-primary" />
                            Assessment Results
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Analyze performance across exams, practice problems, and guest sessions.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-muted/50 p-1">
                        <TabsTrigger value="exam" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <FileText className="h-4 w-4" />
                            Exam
                        </TabsTrigger>
                        <TabsTrigger value="practice" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Code className="h-4 w-4" />
                            Practice
                        </TabsTrigger>
                        <TabsTrigger value="guest" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Users className="h-4 w-4" />
                            Guest
                        </TabsTrigger>
                    </TabsList>

                    {/* EXAM TAB */}
                    <TabsContent value="exam" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        Total Submissions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{examStats.total}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Exam attempts</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Qualified
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{examStats.qualified}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {examStats.total > 0 ? Math.round((examStats.qualified / examStats.total) * 100) : 0}% success rate
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-rose-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-rose-500" />
                                        Disqualified
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{examStats.disqualified}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {examStats.total > 0 ? Math.round((examStats.disqualified / examStats.total) * 100) : 0}% failure rate
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                        Avg Score
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{examStats.avgScore}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Points per exam</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Exam Submissions</CardTitle>
                                        <CardDescription>
                                            Detailed list of all candidate submissions
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search candidates..."
                                                value={examSearch}
                                                onChange={(e) => setExamSearch(e.target.value)}
                                                className="pl-9 h-9 bg-background"
                                            />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="gap-2 h-9">
                                                    <Filter className="w-4 h-4" />
                                                    Filter
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setExamFilter('all')}>All</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setExamFilter('qualified')}>Qualified</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setExamFilter('disqualified')}>Disqualified</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {examLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                        <p>Loading submissions...</p>
                                    </div>
                                ) : filteredExamSubmissions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <FileText className="w-12 h-12 opacity-20 mb-4" />
                                        <h3 className="text-lg font-medium">No submissions found</h3>
                                        <p className="text-sm">Try adjusting your search or filters.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableHead className="w-[250px]">Candidate</TableHead>
                                                    <TableHead>Exam ID</TableHead>
                                                    <TableHead>Score</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Submitted</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredExamSubmissions.map((submission) => {
                                                    const aiScore = calculateAIScore(submission.ai_feedback);
                                                    const totalMarks = calculateTotalScore(submission.answersWithQuestionIds);

                                                    return (
                                                        <TableRow key={submission.id} className="group hover:bg-muted/30 transition-colors">
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-9 w-9 border border-border">
                                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                                            {submission.userName.substring(0, 2).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <div className="font-medium text-sm">{submission.userName}</div>
                                                                        <div className="text-xs text-muted-foreground">{submission.email}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                                                                    {submission.examId}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-sm">{aiScore}</span>
                                                                    <span className="text-muted-foreground text-xs">/ {totalMarks}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {submission.disqualified ? (
                                                                    <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20">
                                                                        Disqualified
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                                                                        Qualified
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {new Date(submission.submittedAt).toLocaleDateString()}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedSubmission(submission);
                                                                        setDetailsDialogOpen(true);
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    Details
                                                                </Button>
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
                    <TabsContent value="practice" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Code className="w-4 h-4 text-blue-500" />
                                        Total Attempts
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{practiceStats.total}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Practice submissions</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Passed
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{practiceStats.passed}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {practiceStats.total > 0 ? Math.round((practiceStats.passed / practiceStats.total) * 100) : 0}% success rate
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-rose-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-rose-500" />
                                        Failed
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{practiceStats.failed}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {practiceStats.total > 0 ? Math.round((practiceStats.failed / practiceStats.total) * 100) : 0}% failure rate
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                        Avg Score
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{practiceStats.avgScore}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Points per attempt</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Practice Submissions</CardTitle>
                                        <CardDescription>
                                            Review coding practice attempts and results
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search user or question..."
                                                value={practiceSearch}
                                                onChange={(e) => setPracticeSearch(e.target.value)}
                                                className="pl-9 h-9 bg-background"
                                            />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="gap-2 h-9">
                                                    <Filter className="w-4 h-4" />
                                                    Filter
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Filter by Result</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setPracticeFilter('all')}>All</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPracticeFilter('passed')}>Passed</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPracticeFilter('failed')}>Failed</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {practiceLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                        <p>Loading practice data...</p>
                                    </div>
                                ) : filteredPracticeSubmissions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <Code className="w-12 h-12 opacity-20 mb-4" />
                                        <h3 className="text-lg font-medium">No practice submissions found</h3>
                                        <p className="text-sm">Try adjusting your search or filters.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableHead className="w-[200px]">User</TableHead>
                                                    <TableHead>Question</TableHead>
                                                    <TableHead>Language</TableHead>
                                                    <TableHead>Test Cases</TableHead>
                                                    <TableHead>Score</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPracticeSubmissions.map((submission) => (
                                                    <TableRow key={submission.id} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8 border border-border">
                                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                                        {submission.userName.substring(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-medium text-sm">{submission.userName}</div>
                                                                    <div className="text-xs text-muted-foreground">{submission.email}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[200px] truncate font-medium text-sm" title={submission.questionDescription}>
                                                                {submission.questionDescription}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                                                                {submission.language}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-sm">
                                                                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                                                                <span className="font-medium">{submission.testCasesPassed}</span>
                                                                <span className="text-muted-foreground text-xs">/ {submission.totalTestCases}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-bold text-sm">{submission.score}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                                                <Zap className="w-3.5 h-3.5" />
                                                                {submission.executionTime}ms
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {submission.isPassed ? (
                                                                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                                                                    Passed
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20">
                                                                    Failed
                                                                </Badge>
                                                            )}
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

                    {/* GUEST TAB */}
                    <TabsContent value="guest" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        Total Sessions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{guestStats.total}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Guest attempts</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Avg Correct
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{guestStats.avgCorrect}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Questions answered</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                        Avg Score
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{guestStats.avgScore}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Points per session</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-purple-500" />
                                        Avg Time
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatTime(guestStats.avgTime)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Per session</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Guest Sessions</CardTitle>
                                        <CardDescription>
                                            Anonymous practice sessions and their outcomes
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search topic or session ID..."
                                                value={guestSearch}
                                                onChange={(e) => setGuestSearch(e.target.value)}
                                                className="pl-9 h-9 bg-background"
                                            />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="gap-2 h-9">
                                                    <Filter className="w-4 h-4" />
                                                    Filter
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('all')}>All</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('easy')}>Easy</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('medium')}>Medium</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setGuestDifficultyFilter('hard')}>Hard</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {guestLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                        <p>Loading guest sessions...</p>
                                    </div>
                                ) : filteredGuestSubmissions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <Users className="w-12 h-12 opacity-20 mb-4" />
                                        <h3 className="text-lg font-medium">No guest sessions found</h3>
                                        <p className="text-sm">Try adjusting your search or filters.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableHead className="w-[150px]">Session ID</TableHead>
                                                    <TableHead>Topic</TableHead>
                                                    <TableHead>Difficulty</TableHead>
                                                    <TableHead>Score</TableHead>
                                                    <TableHead>Accuracy</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Completed</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredGuestSubmissions.map((submission) => {
                                                    const accuracy = submission.totalQuestions > 0
                                                        ? Math.round((submission.correctAnswers / submission.totalQuestions) * 100)
                                                        : 0;

                                                    return (
                                                        <TableRow key={submission.id} className="group hover:bg-muted/30 transition-colors">
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                                                                    {submission.sessionId.substring(0, 8)}...
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-medium text-sm">{submission.topic}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={getDifficultyColor(submission.difficulty)}>
                                                                    {submission.difficulty}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-bold text-sm">{submission.score}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1.5 text-sm">
                                                                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    <span className="font-medium">{accuracy}%</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {formatTime(submission.timeSpent)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(submission.completedAt).toLocaleDateString()}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedGuestSubmission(submission);
                                                                        setGuestDetailsDialogOpen(true);
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    Details
                                                                </Button>
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

                {/* Exam Details Dialog */}
                <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                    <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl">Submission Details</DialogTitle>
                                    <DialogDescription>
                                        {selectedSubmission?.userName} • {selectedSubmission?.email}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedSubmission && (
                            <ScrollArea className="h-[calc(85vh-280px)]">
                                <div className="p-6 space-y-6">
                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Exam ID</p>
                                            <p className="font-semibold text-sm break-all">{selectedSubmission.examId}</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Score</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-primary">{calculateAIScore(selectedSubmission.ai_feedback)}</span>
                                                <span className="text-sm text-muted-foreground">/ {calculateTotalScore(selectedSubmission.answersWithQuestionIds)}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                                            {selectedSubmission.disqualified ? (
                                                <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Disqualified</Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Qualified</Badge>
                                            )}
                                        </div>
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Submitted</p>
                                            <p className="font-medium text-sm">
                                                {new Date(selectedSubmission.submittedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Questions List */}
                                    <div className="space-y-6">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Code className="w-5 h-5 text-primary" />
                                            Questions & Feedback
                                        </h3>
                                        {getSubmissionDetails(selectedSubmission).map((item: any, index: number) => (
                                            <div key={item.questionId} className="rounded-xl border border-border/50 overflow-hidden bg-card">
                                                <div className="p-4 bg-muted/30 border-b border-border/50 flex items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="bg-background">Q{index + 1}</Badge>
                                                            <Badge variant="secondary" className="text-xs">{item.type === 'mcq' ? 'MCQ' : 'Coding'}</Badge>
                                                        </div>
                                                        <div
                                                            className="text-sm font-medium mt-2 prose dark:prose-invert max-w-none"
                                                            dangerouslySetInnerHTML={{
                                                                __html: item.question
                                                                    .replace(/<p[^>]*>/g, '')
                                                                    .replace(/<\/p>/g, '<br />')
                                                                    .trim()
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-lg">{item.marksAwarded}</span>
                                                            <span className="text-muted-foreground text-sm">/ {item.marks}</span>
                                                        </div>
                                                        {item.marksAwarded === item.marks ? (
                                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Perfect</Badge>
                                                        ) : item.marksAwarded > 0 ? (
                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Partial</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Failed</Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-4 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">User Answer</p>
                                                        <div className="bg-muted/30 rounded-lg border border-border/50 p-3 overflow-x-auto">
                                                            {item.type === 'mcq' ? (
                                                                <p className="text-sm font-medium">{item.selectedOptionText || item.answer}</p>
                                                            ) : (
                                                                <pre className="text-sm font-mono text-foreground/90">{item.answer}</pre>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Feedback</p>
                                                        <div className={`rounded-lg border p-3 text-sm leading-relaxed ${item.marksAwarded === item.marks
                                                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                            : item.marksAwarded > 0
                                                                ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-300'
                                                                : 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-300'
                                                            }`}>
                                                            {item.feedback}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ScrollArea>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Guest Details Dialog */}
                <Dialog open={guestDetailsDialogOpen} onOpenChange={setGuestDetailsDialogOpen}>
                    <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl">Guest Session Details</DialogTitle>
                                    <DialogDescription>
                                        Session ID: {selectedGuestSubmission?.sessionId}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedGuestSubmission && (
                            <ScrollArea className="h-[calc(100vh-280px)]">
                                <div className="p-6 space-y-6">
                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Topic</p>
                                            <p className="font-semibold text-sm">{selectedGuestSubmission.topic}</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Difficulty</p>
                                            <Badge variant="outline" className={getDifficultyColor(selectedGuestSubmission.difficulty)}>
                                                {selectedGuestSubmission.difficulty}
                                            </Badge>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Score</p>
                                            <p className="text-2xl font-bold text-primary">{selectedGuestSubmission.score}</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Accuracy</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                    {selectedGuestSubmission.totalQuestions > 0
                                                        ? Math.round((selectedGuestSubmission.correctAnswers / selectedGuestSubmission.totalQuestions) * 100)
                                                        : 0}%
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    ({selectedGuestSubmission.correctAnswers}/{selectedGuestSubmission.totalQuestions})
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Questions List */}
                                    <div className="space-y-6">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Code className="w-5 h-5 text-primary" />
                                            Session Q&A
                                        </h3>
                                        {getGuestSubmissionDetails(selectedGuestSubmission).map((item: any) => (
                                            <div key={item.questionNumber} className="rounded-xl border border-border/50 overflow-hidden bg-card">
                                                <div className="p-4 bg-muted/30 border-b border-border/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className="bg-background">Q{item.questionNumber}</Badge>
                                                        <Badge variant="secondary" className="text-xs">{item.type === 'mcq' ? 'MCQ' : 'Coding'}</Badge>
                                                        {item.type === 'coding' && item.language && (
                                                            <Badge variant="outline" className="font-mono text-xs">{item.language}</Badge>
                                                        )}
                                                    </div>
                                                    <h4 className="font-medium text-base mb-2">{item.question}</h4>
                                                    {item.description && (
                                                        <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="p-4 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">User Answer</p>
                                                        <div className="bg-muted/30 rounded-lg border border-border/50 p-3 overflow-x-auto">
                                                            {item.type === 'mcq' ? (
                                                                <p className="text-sm font-medium">
                                                                    {item.userAnswer >= 0 && item.options
                                                                        ? item.options[item.userAnswer]
                                                                        : <span className="text-muted-foreground italic">Not answered</span>}
                                                                </p>
                                                            ) : (
                                                                <pre className="text-sm font-mono text-foreground/90">
                                                                    {item.userAnswer || <span className="text-muted-foreground italic">No answer provided</span>}
                                                                </pre>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.explanation && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Explanation</p>
                                                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-700 dark:text-blue-300">
                                                                {item.explanation}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ScrollArea>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </UnifiedDashboardLayout>
    );
};

export default ViewResult;