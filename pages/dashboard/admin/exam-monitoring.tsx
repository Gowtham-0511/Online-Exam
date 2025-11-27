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
    Timer,
    Zap,
    MoreHorizontal,
    Calendar,
    Laptop
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import Head from "next/head";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
                <title>Exam Monitoring | SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
                            <Activity className="w-8 h-8 text-primary" />
                            Live Exam Monitoring
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Track real-time exam sessions, user activity, and performance metrics.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshAll}
                            disabled={isRefreshing}
                            className="gap-2 shadow-sm hover:shadow-md transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            variant={autoRefresh ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`gap-2 shadow-sm hover:shadow-md transition-all ${autoRefresh ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        >
                            <Activity className="w-4 h-4" />
                            {autoRefresh ? 'Live Updates On' : 'Live Updates Paused'}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 shadow-sm hover:shadow-md transition-all">
                            <Download className="w-4 h-4" />
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                    <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                Active Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalActive}</div>
                            <p className="text-xs text-muted-foreground mt-1">Currently taking exams</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-purple-500" />
                                Avg Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.averageProgress}%</div>
                            <Progress value={stats.averageProgress} className="mt-2 h-1.5 bg-purple-500/20" indicatorClassName="bg-purple-500" />
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Play className="w-4 h-4 text-emerald-500" />
                                Code Executions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalCodeRuns}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total runs across all questions</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                Avg Time/Question
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{formatTime(stats.averageTimePerQuestion)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Per question average</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Exam Selector & Filters */}
                <Card className="border-border/50 shadow-sm animate-in slide-in-from-bottom-4 duration-500 delay-200">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Filter className="w-4 h-4 text-primary" />
                                    </div>
                                    <Select
                                        value={activeExam}
                                        onValueChange={setActiveExam}
                                        disabled={isLoadingExams}
                                    >
                                        <SelectTrigger className="w-full sm:w-[300px] h-10">
                                            <SelectValue placeholder={isLoadingExams ? "Loading exams..." : "Select Exam to Monitor"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                <span className="font-medium">All Exams</span>
                                            </SelectItem>
                                            {examList.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.title}>
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span>{exam.title}</span>
                                                        {exam.activeUsers > 0 && (
                                                            <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-emerald-500/10 text-emerald-600">
                                                                {exam.activeUsers} live
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="h-8 w-px bg-border hidden sm:block" />

                                {activeExam !== 'all' && (
                                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Active Exam</span>
                                            <span className="font-semibold text-sm">{examList.find(e => e.title === activeExam)?.title}</span>
                                        </div>
                                        <Badge variant="outline" className="bg-primary/5">
                                            {examList.find(e => e.title === activeExam)?.language.toUpperCase()}
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50">
                                    <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {autoRefresh ? 'Live Data Feed' : 'Feed Paused'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Tabs */}
                <Tabs defaultValue="live-sessions" className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-muted/50 p-1">
                        <TabsTrigger value="live-sessions" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Activity className="w-4 h-4" />
                            Live Sessions
                        </TabsTrigger>
                        <TabsTrigger value="question-analytics" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </TabsTrigger>
                        <TabsTrigger value="activity-feed" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Zap className="w-4 h-4" />
                            Activity
                        </TabsTrigger>
                    </TabsList>

                    {/* Live Sessions Tab */}
                    <TabsContent value="live-sessions" className="space-y-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Active Sessions</CardTitle>
                                        <CardDescription>
                                            Monitor students currently taking exams in real-time
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by name or email..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 h-9 bg-background"
                                            />
                                        </div>
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="w-[130px] h-9">
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
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="w-[250px]">Candidate</TableHead>
                                                <TableHead>Exam</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-[200px]">Progress</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Current Q</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSessions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-[300px] text-center">
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                            <div className="p-4 rounded-full bg-muted/50 mb-4">
                                                                <Users className="w-8 h-8 opacity-50" />
                                                            </div>
                                                            <p className="text-lg font-medium">No active sessions found</p>
                                                            <p className="text-sm">Try adjusting your filters or selecting a different exam.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredSessions.map((session, index) => (
                                                    <TableRow key={index} className="group hover:bg-muted/30 transition-colors">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-9 w-9 border border-border">
                                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                                        {session.userName.substring(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-medium text-sm">{session.userName}</div>
                                                                    <div className="text-xs text-muted-foreground">{session.userEmail}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm font-medium">{session.examTitle}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={getStatusColor(session.status)}>
                                                                {session.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-muted-foreground">{session.questionsAttempted} of {session.totalQuestions}</span>
                                                                    <span className="font-medium">
                                                                        {Math.round((session.questionsAttempted / session.totalQuestions) * 100)}%
                                                                    </span>
                                                                </div>
                                                                <Progress
                                                                    value={(session.questionsAttempted / session.totalQuestions) * 100}
                                                                    className="h-1.5"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
                                                                <Timer className="w-3.5 h-3.5" />
                                                                {formatTime(session.timeElapsed)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="font-mono text-xs">
                                                                Q{session.currentQuestion}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedUser(session.userEmail)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Question Analytics Tab */}
                    <TabsContent value="question-analytics" className="space-y-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                                <CardTitle className="text-lg font-semibold">Question Performance</CardTitle>
                                <CardDescription>
                                    Analyze difficulty levels and completion rates across questions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="w-[80px]">Rank</TableHead>
                                                <TableHead>Question Title</TableHead>
                                                <TableHead>Difficulty</TableHead>
                                                <TableHead>Attempts</TableHead>
                                                <TableHead>Avg Time</TableHead>
                                                <TableHead>Code Runs</TableHead>
                                                <TableHead className="w-[200px]">Completion Rate</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {questionAnalytics.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-[200px] text-center text-muted-foreground">
                                                        No analytics data available. Select an exam to view details.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                questionAnalytics.map((question) => (
                                                    <TableRow key={question.questionId} className="hover:bg-muted/30">
                                                        <TableCell>
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                                #{question.questionIndex}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {question.questionId}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                                                                {question.difficulty.toUpperCase()}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{question.totalAttempts}</TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {formatTime(question.averageTime)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5">
                                                                <Play className="w-3.5 h-3.5 text-muted-foreground" />
                                                                <span>{question.codeRuns}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-medium">{question.completionRate}%</span>
                                                                </div>
                                                                <Progress
                                                                    value={question.completionRate}
                                                                    className="h-1.5"
                                                                    indicatorClassName={
                                                                        question.completionRate > 75 ? "bg-emerald-500" :
                                                                            question.completionRate > 40 ? "bg-amber-500" : "bg-rose-500"
                                                                    }
                                                                />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activity Feed Tab */}
                    <TabsContent value="activity-feed" className="space-y-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                                <CardTitle className="text-lg font-semibold">Live Activity Feed</CardTitle>
                                <CardDescription>
                                    Real-time log of student interactions and system events
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[600px]">
                                    <div className="p-4 space-y-4">
                                        {recentActions.map((action, idx) => (
                                            <div
                                                key={action.id || idx}
                                                className="flex gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-all duration-200 group"
                                            >
                                                <div className="flex-shrink-0 mt-1">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-4 ring-background group-hover:ring-muted/30 transition-all">
                                                        {getActionIcon(action.actionType)}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm">{action.userName}</span>
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 h-5 uppercase tracking-wider">
                                                                {action.actionType.replace('_', ' ')}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {new Date(action.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Action performed on <span className="font-medium text-foreground">Question {action.questionIndex}</span>
                                                        {action.timeSpent > 0 && ` • Time spent: ${formatTime(action.timeSpent)}`}
                                                    </p>
                                                    {action.metadata && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {action.metadata.language && (
                                                                <Badge variant="outline" className="text-xs font-normal bg-muted/50">
                                                                    {action.metadata.language}
                                                                </Badge>
                                                            )}
                                                            {action.metadata.runNumber && (
                                                                <Badge variant="outline" className="text-xs font-normal bg-muted/50">
                                                                    Run #{action.metadata.runNumber}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
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
                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Laptop className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl">Session Details</DialogTitle>
                                    <DialogDescription>
                                        Detailed breakdown of student performance
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedUser && (
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-6 space-y-6">
                                    {/* User Info Card */}
                                    <div className="p-4 rounded-xl border border-border/50 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                                                    {selectedUser.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-semibold text-lg">{selectedUser}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    Session Active
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="text-right px-4 py-2 bg-background rounded-lg border border-border/50">
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Questions</div>
                                                <div className="font-bold text-lg">
                                                    {activeSessions.find(s => s.userEmail === selectedUser)?.questionsAttempted}
                                                    <span className="text-muted-foreground text-sm font-normal"> / {activeSessions.find(s => s.userEmail === selectedUser)?.totalQuestions}</span>
                                                </div>
                                            </div>
                                            <div className="text-right px-4 py-2 bg-background rounded-lg border border-border/50">
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Time</div>
                                                <div className="font-bold text-lg font-mono">
                                                    {formatTime(activeSessions.find(s => s.userEmail === selectedUser)?.timeElapsed || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Question Breakdown */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-primary" />
                                                Question Progress
                                            </h4>
                                            <div className="rounded-xl border border-border/50 overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/50">
                                                            <TableHead className="w-[100px]">Question</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Time</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {[1, 2, 3].map((qId) => (
                                                            <TableRow key={qId} className="hover:bg-muted/30">
                                                                <TableCell className="font-medium">Q{qId}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className={qId === 1 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                                                                        {qId === 1 ? "Completed" : "In Progress"}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right font-mono text-xs">
                                                                    {qId === 1 ? "5m 30s" : "8m 45s"}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-primary" />
                                                Recent Activity
                                            </h4>
                                            <ScrollArea className="h-[300px] rounded-xl border border-border/50 bg-background p-4">
                                                <div className="space-y-4">
                                                    {recentActions
                                                        .filter(a => a.userEmail === selectedUser)
                                                        .map((action, idx) => (
                                                            <div key={idx} className="relative pl-6 pb-4 border-l border-border last:pb-0">
                                                                <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-sm font-medium">
                                                                        {action.actionType.replace('_', ' ').toUpperCase()}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {new Date(action.timestamp).toLocaleTimeString()} • Question {action.questionIndex}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    {recentActions.filter(a => a.userEmail === selectedUser).length === 0 && (
                                                        <div className="text-center text-muted-foreground py-8 text-sm">
                                                            No recent activity recorded
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter className="p-4 border-t border-border/50 bg-muted/20">
                            <Button variant="outline" onClick={() => setSelectedUser(null)}>
                                Close Details
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </UnifiedDashboardLayout>
    );
}