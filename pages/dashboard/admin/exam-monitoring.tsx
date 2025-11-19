import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Activity,
    Users,
    Clock,
    Code,
    Play,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Eye,
    Search,
    Filter,
    Download,
    RefreshCw,
    TrendingUp,
    Flag,
    BarChart3,
    PieChart,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import Head from "next/head";

interface ExamSession {
    examId: string;
    examTitle: string;
    userEmail: string;
    userName: string;
    status: 'active' | 'completed' | 'paused';
    startTime: string;
    timeElapsed: number;
    totalQuestions: number;
    questionsAttempted: number;
    currentQuestion: number;
    lastActivity: string;
}

interface QuestionAnalytics {
    questionId: string;
    questionIndex: number;
    questionTitle: string;
    totalAttempts: number;
    averageTime: number;
    codeRuns: number;
    completionRate: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface UserAction {
    id: string;
    userEmail: string;
    userName: string;
    actionType: string;
    questionIndex: number;
    timestamp: string;
    timeSpent: number;
    metadata: any;
}

export default function ExamMonitoring() {
    const [activeExam, setActiveExam] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [activeSessions, setActiveSessions] = useState<ExamSession[]>([]);
    const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
    const [recentActions, setRecentActions] = useState<UserAction[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Add this with other state declarations
    const [examList, setExamList] = useState<Array<{
        id: string;
        title: string;
        language: string;
        assignmentType: string;
        activeUsers: number;
        totalParticipants: number;
    }>>([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);

    useEffect(() => {
        fetchMonitoringData();
    }, [activeExam]);

    useEffect(() => {
        fetchExamList();
    }, []);

    const fetchExamList = async () => {
        setIsLoadingExams(true);
        try {
            const response = await fetch('/api/monitoring/exam-list');
            if (response.ok) {
                const data = await response.json();
                setExamList(data);
            }
        } catch (error) {
            console.error('Failed to fetch exam list:', error);
        } finally {
            setIsLoadingExams(false);
        }
    };

    const fetchMonitoringData = async () => {
        try {
            const sessionsRes = await fetch(`/api/monitoring/live-sessions${activeExam !== 'all' ? `?examId=${activeExam}` : ''}`);
            if (sessionsRes.ok) {
                const sessionsData = await sessionsRes.json();
                setActiveSessions(sessionsData.map((s: any) => ({
                    ...s,
                    lastActivity: getRelativeTime(s.lastActivity)
                })));
            }

            if (activeExam && activeExam !== 'all') {
                const analyticsRes = await fetch(
                    `/api/monitoring/question-analytics?examId=${encodeURIComponent(activeExam)}`
                );
                if (analyticsRes.ok) {
                    const analyticsData = await analyticsRes.json();
                    setQuestionAnalytics(analyticsData);
                }
            } else {
                setQuestionAnalytics([]);
            }

            const actionsRes = await fetch(`/api/monitoring/recent-actions${activeExam !== 'all' ? `?examId=${activeExam}` : ''}`);
            if (actionsRes.ok) {
                const actionsData = await actionsRes.json();
                setRecentActions(actionsData);
            }
        } catch (error) {
            console.error('Failed to fetch monitoring data:', error);
        }
    };

    const getRelativeTime = (timestamp: string) => {
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diff = Math.floor((now - then) / 1000);

        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    };

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            // Fetch latest data
            // fetchLatestData();
        }, 5000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const stats = useMemo(() => {
        let totalCodeRuns = 0;
        questionAnalytics.forEach(q => {
            totalCodeRuns += Number(q.codeRuns);
        });

        let totalActive = activeSessions.filter(s => s.status === 'active').length;

        let averageProgress = Math.round(
            activeSessions.reduce(
                (acc, s) => acc + (s.questionsAttempted / s.totalQuestions * 100),
                0
            ) / (activeSessions.length || 1)
        );

        let averageTimePerQuestion = Math.round(
            questionAnalytics.reduce((acc, q) => acc + q.averageTime, 0) /
            (questionAnalytics.length || 1)
        );

        return {
            totalActive,
            averageProgress,
            totalCodeRuns,
            averageTimePerQuestion
        };
    }, [activeSessions, questionAnalytics]);

    const filteredSessions = useMemo(() => {
        return activeSessions.filter(session => {
            const matchesSearch = session.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                session.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
            const matchesExam = activeExam === 'all' || session.examId === activeExam;

            return matchesSearch && matchesStatus && matchesExam;
        });
    }, [activeSessions, searchQuery, filterStatus, activeExam]);

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchExamList(),
            fetchMonitoringData()
        ]);
        setIsRefreshing(false);
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'medium': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'hard': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-muted-foreground bg-muted border-border';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'completed': return 'bg-primary/10 text-primary border-primary/20';
            case 'paused': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'code_run': return <Play className="w-4 h-4" />;
            case 'question_view': return <Eye className="w-4 h-4" />;
            case 'flag': return <Flag className="w-4 h-4" />;
            case 'answer_update': return <Code className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };

    return (
        <UnifiedDashboardLayout role="admin">
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Activity className="w-6 h-6 text-primary" />
                            Real-Time Exam Monitoring
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Track live exam sessions and user activity
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshAll}
                            disabled={isRefreshing}
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            variant={autoRefresh ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className="gap-2"
                        >
                            <Activity className="w-4 h-4" />
                            {autoRefresh ? 'Live' : 'Paused'}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Exam Selector */}
                <Card className="border-border">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                <Select
                                    value={activeExam}
                                    onValueChange={setActiveExam}
                                    disabled={isLoadingExams}
                                >
                                    <SelectTrigger className="w-full sm:w-80">
                                        <SelectValue placeholder={isLoadingExams ? "Loading exams..." : "Select Exam"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-medium">All Exams</span>
                                                {!isLoadingExams && examList.length > 0 && (
                                                    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                                                        {examList.reduce((sum, exam) => sum + exam.activeUsers, 0)} active
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>

                                        {isLoadingExams ? (
                                            <SelectItem value="loading" disabled>
                                                Loading exams...
                                            </SelectItem>
                                        ) : examList.length === 0 ? (
                                            <SelectItem value="no-exams" disabled>
                                                No exams available
                                            </SelectItem>
                                        ) : (
                                            examList.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.title}>
                                                    <div className="flex flex-col py-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-foreground">{exam.title}</span>
                                                            {exam.activeUsers > 0 && (
                                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                                    {exam.activeUsers} live
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-muted-foreground uppercase">{exam.language}</span>
                                                            <span className="text-xs text-muted-foreground">•</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {exam.totalParticipants} participant{exam.totalParticipants !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1" />

                            <div className="flex items-center gap-3">
                                {activeExam !== 'all' && (
                                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">
                                            {examList.find(e => e.title === activeExam)?.activeUsers || 0}
                                        </span>
                                        <span className="text-xs text-muted-foreground">active now</span>
                                    </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                                        <span className="hidden sm:inline">
                                            {autoRefresh ? 'Live updating' : 'Updates paused'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {activeExam !== 'all' && examList.find(e => e.title === activeExam) && (
                    <Card className="border-border bg-primary/5">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Exam Title</div>
                                    <div className="font-semibold text-foreground truncate">
                                        {examList.find(e => e.title === activeExam)?.title}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Language</div>
                                    <Badge variant="outline" className="bg-muted">
                                        {examList.find(e => e.title === activeExam)?.language.toUpperCase()}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Active Users</div>
                                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                                        {examList.find(e => e.title === activeExam)?.activeUsers || 0}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Total Participants</div>
                                    <div className="font-semibold text-foreground">
                                        {examList.find(e => e.title === activeExam)?.totalParticipants || 0}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Active Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">{stats.totalActive}</div>
                            <p className="text-xs text-muted-foreground mt-1">Currently taking exams</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Avg Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">{stats.averageProgress}%</div>
                            <Progress value={stats.averageProgress} className="mt-2 h-2" />
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Play className="w-4 h-4" />
                                Code Executions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">{stats.totalCodeRuns}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total runs across all questions</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Avg Time/Question
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">{formatTime(stats.averageTimePerQuestion)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Per question average</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="live-sessions" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="live-sessions" className="gap-2">
                            <Activity className="w-4 h-4" />
                            Live Sessions
                        </TabsTrigger>
                        <TabsTrigger value="question-analytics" className="gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Question Analytics
                        </TabsTrigger>
                        <TabsTrigger value="activity-feed" className="gap-2">
                            <Code className="w-4 h-4" />
                            Activity Feed
                        </TabsTrigger>
                    </TabsList>

                    {/* Live Sessions Tab */}
                    <TabsContent value="live-sessions" className="space-y-4">
                        <Card className="border-border">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-base">Active Exam Sessions</CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Real-time view of ongoing exams
                                        </CardDescription>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search users..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 w-full sm:w-64"
                                            />
                                        </div>
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="w-full sm:w-32">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="paused">Paused</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border border-border overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="font-semibold">User</TableHead>
                                                    <TableHead className="font-semibold">Exam</TableHead>
                                                    <TableHead className="font-semibold">Status</TableHead>
                                                    <TableHead className="font-semibold">Progress</TableHead>
                                                    <TableHead className="font-semibold">Time Elapsed</TableHead>
                                                    <TableHead className="font-semibold">Current Q</TableHead>
                                                    <TableHead className="font-semibold">Last Activity</TableHead>
                                                    <TableHead className="font-semibold text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredSessions.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                            No active sessions found
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredSessions.map((session, index) => (
                                                        <TableRow key={index} className="hover:bg-muted/50">
                                                            <TableCell>
                                                                <div>
                                                                    <div className="font-medium text-foreground">{session.userName}</div>
                                                                    <div className="text-xs text-muted-foreground">{session.userEmail}</div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-foreground">{session.examTitle}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={getStatusColor(session.status)}>
                                                                    {session.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between text-xs">
                                                                        <span className="text-muted-foreground">{session.questionsAttempted}/{session.totalQuestions}</span>
                                                                        <span className="font-medium text-foreground">
                                                                            {Math.round((session.questionsAttempted / session.totalQuestions) * 100)}%
                                                                        </span>
                                                                    </div>
                                                                    <Progress
                                                                        value={(session.questionsAttempted / session.totalQuestions) * 100}
                                                                        className="h-2"
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-foreground font-mono">
                                                                {formatTime(session.timeElapsed)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                                                    Q{session.currentQuestion}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {session.lastActivity}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setSelectedUser(session.userEmail)}
                                                                    className="gap-2"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    View Details
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Question Analytics Tab */}
                    <TabsContent value="question-analytics" className="space-y-4">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-base">Question Performance Metrics</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                    Analyze question difficulty and completion rates
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border border-border overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="font-semibold">Q#</TableHead>
                                                    <TableHead className="font-semibold">Question</TableHead>
                                                    <TableHead className="font-semibold">Difficulty</TableHead>
                                                    <TableHead className="font-semibold">Attempts</TableHead>
                                                    <TableHead className="font-semibold">Avg Time</TableHead>
                                                    <TableHead className="font-semibold">Code Runs</TableHead>
                                                    <TableHead className="font-semibold">Completion Rate</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {questionAnalytics.map((question) => (
                                                    <TableRow key={question.questionId} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                                {question.questionIndex}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-foreground">
                                                            {question.questionId}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                                                                {question.difficulty}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-foreground">{question.totalAttempts}</TableCell>
                                                        <TableCell className="text-sm text-foreground font-mono">
                                                            {formatTime(question.averageTime)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Play className="w-4 h-4 text-primary" />
                                                                <span className="text-sm text-foreground font-medium">{question.codeRuns}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Progress value={question.completionRate} className="flex-1 h-2" />
                                                                <span className="text-sm font-medium text-foreground w-12">
                                                                    {question.completionRate}%
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activity Feed Tab */}
                    <TabsContent value="activity-feed" className="space-y-4">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-base">Recent User Actions</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                    Live feed of user interactions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[600px] pr-4">
                                    <div className="space-y-3">
                                        {recentActions.map((action) => (
                                            <div
                                                key={action.id}
                                                className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                            {getActionIcon(action.actionType)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-foreground">{action.userName}</span>
                                                                <Badge variant="outline" className="text-xs bg-muted">
                                                                    {action.actionType.replace('_', ' ')}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Question {action.questionIndex} • Time spent: {formatTime(action.timeSpent)}
                                                            </p>
                                                            {action.metadata && (
                                                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                                    {action.metadata.language && (
                                                                        <span className="px-2 py-1 bg-muted rounded">
                                                                            {action.metadata.language}
                                                                        </span>
                                                                    )}
                                                                    {action.metadata.runNumber && (
                                                                        <span className="px-2 py-1 bg-muted rounded">
                                                                            Run #{action.metadata.runNumber}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <div className="text-xs text-muted-foreground">
                                                            {new Date(action.timestamp).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* User Detail Modal */}
                <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                User Activity Details
                            </DialogTitle>
                            <DialogDescription>
                                Detailed breakdown of user's exam session
                            </DialogDescription>
                        </DialogHeader>

                        {selectedUser && (
                            <div className="space-y-6">
                                {/* User Info */}
                                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">User Email</div>
                                            <div className="text-sm font-medium text-foreground">{selectedUser}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Current Status</div>
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                Active
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Per-question breakdown would go here */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-foreground">Question-wise Activity</h4>
                                    <div className="rounded-lg border border-border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="font-semibold">Question</TableHead>
                                                    <TableHead className="font-semibold">Time Spent</TableHead>
                                                    <TableHead className="font-semibold">Code Runs</TableHead>
                                                    <TableHead className="font-semibold">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow className="hover:bg-muted/50">
                                                    <TableCell className="font-medium text-foreground">Question 1</TableCell>
                                                    <TableCell className="text-sm text-foreground font-mono">5m 30s</TableCell>
                                                    <TableCell className="text-sm text-foreground">3 runs</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Completed
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow className="hover:bg-muted/50">
                                                    <TableCell className="font-medium text-foreground">Question 2</TableCell>
                                                    <TableCell className="text-sm text-foreground font-mono">8m 45s</TableCell>
                                                    <TableCell className="text-sm text-foreground">7 runs</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            In Progress
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Activity Timeline */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-foreground">Activity Timeline</h4>
                                    <ScrollArea className="h-64">
                                        <div className="space-y-2">
                                            {recentActions
                                                .filter(a => a.userEmail === selectedUser)
                                                .map((action, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                            {getActionIcon(action.actionType)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium text-foreground">
                                                                {action.actionType.replace('_', ' ').toUpperCase()}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Question {action.questionIndex} • {new Date(action.timestamp).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </UnifiedDashboardLayout>
    );
}