"use client";

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
    ChevronRight,
    Layers,
    Sparkles
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

interface PracticeSetSubmission {
    id: number;
    title: string;
    topic: string;
    difficulty: string;
    totalQuestions: number;
    questionsAttempted: string | number; // SQL count returns string sometimes
    totalScore: string | number;
    userName: string;
    email: string;
    createdAt: string;
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
    const [practiceSubmissions, setPracticeSubmissions] = useState<PracticeSetSubmission[]>([]);
    const [practiceLoading, setPracticeLoading] = useState(false);
    const [practiceSearch, setPracticeSearch] = useState('');
    const [practiceFilter, setPracticeFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

    // Guest practice state
    const [guestSubmissions, setGuestSubmissions] = useState<GuestPracticeSubmission[]>([]);
    const [guestLoading, setGuestLoading] = useState(false);
    const [guestSearch, setGuestSearch] = useState('');
    const [guestDifficultyFilter, setGuestDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

    // Dialog state
    const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

    // Practice Details Dialog State
    const [selectedPracticeSetId, setSelectedPracticeSetId] = useState<number | null>(null);
    const [practiceDetailsDialogOpen, setPracticeDetailsDialogOpen] = useState(false);
    const [practiceSetDetails, setPracticeSetDetails] = useState<any[]>([]);
    const [practiceDetailsLoading, setPracticeDetailsLoading] = useState(false);


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
        switch (difficulty?.toLowerCase()) {
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

    const handleViewPracticeDetails = async (setId: number) => {
        setSelectedPracticeSetId(setId);
        setPracticeDetailsDialogOpen(true);
        setPracticeDetailsLoading(true);
        setPracticeSetDetails([]); // Reset previous details

        try {
            const res = await fetch(`/api/admin/practice-set-details?id=${setId}`);
            if (!res.ok) throw new Error('Failed to fetch details');
            const data = await res.json();
            setPracticeSetDetails(data);
        } catch (error) {
            console.error(error);
        } finally {
            setPracticeDetailsLoading(false);
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
            (sub.userName || '').toLowerCase().includes(practiceSearch.toLowerCase()) ||
            (sub.title || '').toLowerCase().includes(practiceSearch.toLowerCase());

        const isCompleted = Number(sub.questionsAttempted) >= sub.totalQuestions;

        const matchesStatus =
            practiceFilter === 'all' ? true :
                practiceFilter === 'completed' ? isCompleted :
                    !isCompleted;

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
        passed: filteredPracticeSubmissions.filter(s => Number(s.questionsAttempted) >= s.totalQuestions).length,
        failed: filteredPracticeSubmissions.filter(s => Number(s.questionsAttempted) < s.totalQuestions).length,
        avgScore: filteredPracticeSubmissions.length > 0
            ? Math.round(filteredPracticeSubmissions.reduce((sum, s) => sum + Number(s.totalScore), 0) / filteredPracticeSubmissions.length)
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

    const selectedPracticeSet = practiceSubmissions.find(p => p.id === selectedPracticeSetId);

    return (
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
                        <Layers className="h-4 w-4" />
                        Practice Sets
                    </TabsTrigger>
                    <TabsTrigger value="guest" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Users className="h-4 w-4" />
                        Guest
                    </TabsTrigger>
                </TabsList>

                {/* EXAM TAB - Hidden for brevity, keeping same logic */}
                <TabsContent value="exam" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* ... (previous exam tab content) ... */}
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
                                    <Layers className="w-4 h-4 text-blue-500" />
                                    Total Sets
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{practiceStats.total}</div>
                                <p className="text-xs text-muted-foreground mt-1">Practice Attempts</p>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Completed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{practiceStats.passed}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {practiceStats.total > 0 ? Math.round((practiceStats.passed / practiceStats.total) * 100) : 0}% completion
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-amber-500" />
                                    InProgress
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{practiceStats.failed}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Sets in progress
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-purple-500" />
                                    Avg Total Score
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{practiceStats.avgScore}</div>
                                <p className="text-xs text-muted-foreground mt-1">Points per set</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Practice Sets</CardTitle>
                                    <CardDescription>
                                        Review practice set completion and performance
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search user or set..."
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
                                            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setPracticeFilter('all')}>All</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setPracticeFilter('completed')}>Completed</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setPracticeFilter('in-progress')}>In Progress</DropdownMenuItem>
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
                                    <Layers className="w-12 h-12 opacity-20 mb-4" />
                                    <h3 className="text-lg font-medium">No practice sets found</h3>
                                    <p className="text-sm">Try adjusting your search or filters.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="w-[200px]">User</TableHead>
                                                <TableHead>Set Title</TableHead>
                                                <TableHead>Topic</TableHead>
                                                <TableHead>Difficulty</TableHead>
                                                <TableHead>Score</TableHead>
                                                <TableHead>Progress</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPracticeSubmissions.map((submission) => {
                                                const progress = Math.round((Number(submission.questionsAttempted) / submission.totalQuestions) * 100);
                                                return (
                                                    <TableRow key={submission.id} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell>
                                                            {submission.userName ? (
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
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm italic">Not Started</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium text-sm">{submission.title}</div>
                                                            <div className="text-xs text-muted-foreground">{submission.totalQuestions} Questions</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                                                                {submission.topic}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={getDifficultyColor(submission.difficulty)}>
                                                                {submission.difficulty}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-bold text-sm">{submission.totalScore}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">{progress}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs text-muted-foreground">
                                                                {new Date(submission.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    handleViewPracticeDetails(submission.id);
                                                                }}
                                                            >
                                                                Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
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
                        {/* Add more stats for guest if needed */}
                    </div>

                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Guest Sessions</CardTitle>
                                    <CardDescription>
                                        Anonymous practice sessions
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableHead>Session ID</TableHead>
                                            <TableHead>Topic</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGuestSubmissions.map((sub) => (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-mono text-xs">{sub.sessionId}</TableCell>
                                                <TableCell>{sub.topic}</TableCell>
                                                <TableCell>{sub.score}</TableCell>
                                                <TableCell>{formatTime(sub.timeSpent)}</TableCell>
                                                <TableCell>{new Date(sub.completedAt).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialog for Exam Details */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle>Submission Details</DialogTitle>
                            <DialogDescription>
                                Review candidate's answers and AI feedback.
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                            if (!selectedSubmission) return;
                            const details = getSubmissionDetails(selectedSubmission);
                            const content = `
                                <html>
                                <head>
                                    <title>Submission Details - ${selectedSubmission.userName}</title>
                                    <style>
                                        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
                                        .header { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                                        .item { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                                        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #f0f0f0; }
                                        .pass { background: #dcfce7; color: #166534; }
                                        .fail { background: #fee2e2; color: #991b1b; }
                                        .label { font-weight: bold; margin-top: 10px; display: block; }
                                        .text-box { background: #f9fafb; padding: 10px; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; margin-top: 5px; }
                                    </style>
                                </head>
                                <body>
                                    <div class="header">
                                        <h1>Exam Submission</h1>
                                        <p><strong>Candidate:</strong> ${selectedSubmission.userName} (${selectedSubmission.email})</p>
                                        <p><strong>Exam ID:</strong> ${selectedSubmission.examId}</p>
                                        <p><strong>Date:</strong> ${new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                                    </div>
                                    ${details.map((d: any, i: number) => `
                                        <div class="item">
                                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                                <span class="badge">Question ${i + 1}</span>
                                                <span class="badge ${d.marksAwarded > 0 ? 'pass' : 'fail'}">${d.marksAwarded} Marks</span>
                                            </div>
                                            <span class="label">Question:</span>
                                            <div class="text-box">${d.question || 'Question text not available'}</div>
                                            <span class="label">User Answer:</span>
                                            <div class="text-box">${d.answer}</div>
                                            <span class="label">AI Feedback:</span>
                                            <div class="text-box" style="color:#4b5563;">${d.feedback}</div>
                                        </div>
                                    `).join('')}
                                    <script>window.print();</script>
                                </body>
                                </html>
                            `;
                            const win = window.open('', '_blank');
                            win?.document.write(content);
                            win?.document.close();
                        }}>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        {selectedSubmission && (
                            <div className="space-y-6 py-4">
                                {getSubmissionDetails(selectedSubmission).map((detail: any, index: number) => (
                                    <div key={index} className="space-y-2 border rounded-lg p-4 bg-muted/20">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline">Question {index + 1}</Badge>
                                            <Badge variant={detail.marksAwarded > 0 ? "default" : "destructive"}>
                                                {detail.marksAwarded} Marks
                                            </Badge>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm mb-1">Question:</div>
                                            <div className="text-sm bg-background p-3 rounded border font-medium mb-3">
                                                {detail.question ? (
                                                    <div
                                                        dangerouslySetInnerHTML={{ __html: detail.question }}
                                                        className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-0"
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground italic">Question text unavailable</span>
                                                )}
                                            </div>

                                            <div className="font-semibold text-sm mb-1">Answer:</div>
                                            <div className="text-sm bg-background p-3 rounded border font-mono whitespace-pre-wrap">
                                                {detail.answer}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                                                <Sparkles className="w-3 h-3 text-primary" /> AI Feedback:
                                            </div>
                                            <div className="text-sm text-muted-foreground bg-primary/5 p-3 rounded border-primary/10">
                                                {detail.feedback}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog for Practice Details */}
            <Dialog open={practiceDetailsDialogOpen} onOpenChange={setPracticeDetailsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle>Practice Set Details</DialogTitle>
                            <DialogDescription>
                                Review user's code submissions for this practice set.
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                            if (!selectedPracticeSet || practiceSetDetails.length === 0) return;

                            const content = `
                                <html>
                                <head>
                                    <title>Practice Details - ${selectedPracticeSet.title}</title>
                                    <style>
                                        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
                                        .header { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                                        .item { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                                        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #f0f0f0; }
                                        .pass { background: #dcfce7; color: #166534; }
                                        .fail { background: #fee2e2; color: #991b1b; }
                                        .label { font-weight: bold; margin-top: 10px; display: block; }
                                        .code-box { background: #1e1e1e; color: #d4d4d4; padding: 10px; border-radius: 4px; white-space: pre-wrap; margin-top: 5px; font-family: monospace; }
                                        .text-box { background: #f9fafb; padding: 10px; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; margin-top: 5px; }
                                    </style>
                                </head>
                                <body>
                                    <div class="header">
                                        <h1>Practice Set: ${selectedPracticeSet.title}</h1>
                                        <p><strong>User:</strong> ${selectedPracticeSet.userName} (${selectedPracticeSet.email})</p>
                                        <p><strong>Topic:</strong> ${selectedPracticeSet.topic}</p>
                                        <p><strong>Date:</strong> ${new Date(selectedPracticeSet.createdAt).toLocaleString()}</p>
                                    </div>
                                    ${practiceSetDetails.map((d: any, i: number) => `
                                        <div class="item">
                                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                                <span class="badge">Question ${i + 1}: ${d.questionTitle || 'Untitled'}</span>
                                                <span class="badge ${d.status === 'Passed' ? 'pass' : 'fail'}">${d.status || 'Attempted'}</span>
                                            </div>
                                            <span class="label">Description:</span>
                                            <div class="text-box">${d.questionDescription || 'No description available'}</div>
                                            <span class="label">User Code (${d.language || 'text'}):</span>
                                            <div class="code-box">${d.userCode || 'No code submitted'}</div>
                                            <div style="margin-top:10px; font-size:12px; color:#666;">
                                                Score: ${d.score} | Passed Tests: ${d.passedCount}/${d.totalCount}
                                            </div>
                                        </div>
                                    `).join('')}
                                    <script>window.print();</script>
                                </body>
                                </html>
                            `;
                            const win = window.open('', '_blank');
                            win?.document.write(content);
                            win?.document.close();
                        }}>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        {practiceDetailsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                <p>Loading details...</p>
                            </div>
                        ) : practiceSetDetails.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No detailed submissions found for this set.
                            </div>
                        ) : (
                            <div className="space-y-6 py-4">
                                {practiceSetDetails.map((detail: any, index: number) => (
                                    <div key={index} className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold">{detail.questionTitle}</div>
                                                <Badge variant="outline" className="mt-1">{detail.difficulty}</Badge>
                                            </div>
                                            <Badge variant={detail.status === 'Passed' ? "default" : "secondary"}>
                                                {detail.status || 'Attempted'}
                                            </Badge>
                                        </div>

                                        <div>
                                            <div className="font-semibold text-sm mb-1">Description:</div>
                                            <div className="text-sm bg-background p-3 rounded border text-muted-foreground mb-3">
                                                {detail.questionDescription ? (
                                                    <div
                                                        dangerouslySetInnerHTML={{ __html: detail.questionDescription }}
                                                        className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-0"
                                                    />
                                                ) : (
                                                    'No description available.'
                                                )}
                                            </div>

                                            <div className="font-semibold text-sm mb-1">Submitted Code ({detail.language}):</div>
                                            <div className="text-sm bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded border font-mono whitespace-pre-wrap overflow-x-auto">
                                                {detail.userCode}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-background p-2 rounded border">
                                            <span>Score: <strong>{detail.score}</strong></span>
                                            <Separator orientation="vertical" className="h-4" />
                                            <span>Test Cases: <strong>{detail.passedCount} / {detail.totalCount}</strong></span>
                                            {detail.createdAt && (
                                                <>
                                                    <Separator orientation="vertical" className="h-4" />
                                                    <span>Submitted: {new Date(detail.createdAt).toLocaleTimeString()}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default ViewResult;