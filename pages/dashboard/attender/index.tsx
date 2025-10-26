import React, { useEffect, useState } from 'react'
import AttenderLayout from './AttenderLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    BookOpen,
    Trophy,
    TrendingUp,
    Calendar,
    Award,
    Target,
    Zap,
    ChevronRight,
    BarChart3,
    Activity,
    Code,
    Brain,
    Timer,
    PlayCircle,
    CheckCircle2,
    AlertCircle,
    Clock,
    Users,
    XCircle
} from 'lucide-react'
import { useSession } from "next-auth/react";

const index = () => {
    const { data: session, status } = useSession();

    type Exam = {
        id: React.Key | null | undefined;
        title: string;
        language: string;
        date: string;
        time: string;
        duration: string;
        difficulty: string;
        participants: number;
        startTime: string;
        endTime: string;
    };

    type CompletedExam = {
        id: number;
        examId: string;
        title: string;
        language: string;
        submittedAt: string;
        disqualified: boolean;
        duration: number;
        totalMarksObtained?: number;
        totalPossibleMarks?: number;
        percentage?: number;
    };

    const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
    const [completedExams, setCompletedExams] = useState<CompletedExam[]>([]);

    useEffect(() => {
        const fetchUserAssessments = async () => {
            if (!session?.user?.email) return;

            try {
                // Fetch upcoming exams (not submitted)
                const upcomingResponse = await fetch(
                    `/api/attender/allowed-exam?email=${encodeURIComponent(session.user.email)}`
                );
                if (upcomingResponse.ok) {
                    const assessments = await upcomingResponse.json();
                    console.log('Upcoming exams:', assessments);
                    setUpcomingExams(assessments);
                }

                // Fetch completed exams
                const completedResponse = await fetch(
                    `/api/attender/completed-exams?email=${encodeURIComponent(session.user.email)}`
                );
                if (completedResponse.ok) {
                    const completed = await completedResponse.json();
                    console.log('Completed exams:', completed);
                    setCompletedExams(completed);
                }
            } catch (error) {
                console.error('Error fetching assessments:', error);
            }
        };

        fetchUserAssessments();
    }, [session]);

    const stats = {
        totalExams: upcomingExams.length || 0,
        averageScore: completedExams.length > 0
            ? (
                completedExams.reduce((sum, exam) => {
                    const pct = Number(exam.percentage)
                    return sum + (isNaN(pct) ? 0 : pct)
                }, 0) / completedExams.length
            ).toFixed(1)
            : "-",
        bestRank: "-",
        currentStreak: "-",
        completedExams: completedExams.length,
        skillRating: 1200
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900';
            case 'hard': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-900';
            default: return 'bg-secondary text-secondary-foreground border-border';
        }
    };

    const formatDateTime = (startTime: string, endTime: string) => {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const startDate = start.toLocaleDateString();
        const startTimeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${startDate} • ${startTimeStr} - ${endTimeStr}`;
    };

    return (
        <AttenderLayout>
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Welcome back, {session?.user?.name?.split(' ')[0] || 'Coder'}!
                        </h1>
                        <p className="text-muted-foreground">
                            Ready to ace your next challenge?
                        </p>
                    </div>
                    <Button
                        onClick={() => window.location.href = '/dashboard/attender/view-exams'}
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Code className="h-4 w-4 mr-2" />
                        Browse All Exams
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Available Exams</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{stats.totalExams}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Ready to start
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Completed Exams</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{stats.completedExams}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <Activity className="h-4 w-4 mr-1" />
                                Keep improving
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {typeof stats.averageScore === 'string' && stats.averageScore === '-'
                                            ? stats.averageScore
                                            : `${stats.averageScore}%`
                                        }
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                {completedExams.length > 0 ? 'Keep improving' : 'Start taking exams'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Exams */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl">Upcoming Exams</CardTitle>
                                    <CardDescription className="mt-1">
                                        {upcomingExams.length} exams scheduled
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.location.href = '/dashboard/attender/view-exams'}
                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                    View All
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {upcomingExams && upcomingExams.length > 0 ? (
                                <div className="space-y-3">
                                    {upcomingExams.slice(0, 5).map((exam) => (
                                        <Card key={exam.id} className="p-4 border-border hover:border-primary/50 transition-all duration-200 hover:shadow-sm cursor-pointer group">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                                                            <Brain className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                                {exam.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-xs border-border">
                                                                    <Code className="h-3 w-3 mr-1" />
                                                                    {exam.language}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 text-sm text-muted-foreground ml-11">
                                                        <div className="flex items-center gap-4 flex-wrap">
                                                            <div className="flex items-center gap-2">
                                                                <Timer className="h-3.5 w-3.5" />
                                                                <span>{exam.duration} min</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground mb-2">No upcoming exams</h3>
                                    <p className="text-muted-foreground text-sm mb-4">Check back later or browse available exams</p>
                                    <Button variant="outline" onClick={() => window.location.href = '/dashboard/attender/view-exams'}>
                                        Browse Exams
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Completed Exams */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl">Completed Exams</CardTitle>
                                    <CardDescription className="mt-1">
                                        {completedExams.length} exams completed
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {completedExams && completedExams.length > 0 ? (
                                <div className="space-y-3">
                                    {completedExams.slice(0, 5).map((exam) => (
                                        <Card key={exam.id} className="p-4 border-border">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className={`p-2 rounded-lg shrink-0 ${exam.disqualified ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                                                            {exam.disqualified ? (
                                                                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                                            ) : (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-foreground truncate">
                                                                {exam.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-xs border-border">
                                                                    <Code className="h-3 w-3 mr-1" />
                                                                    {exam.language}
                                                                </Badge>
                                                                {/* Add percentage badge */}
                                                                {exam.percentage !== null && exam.percentage !== undefined && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs ${exam.percentage >= 80
                                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200'
                                                                            : exam.percentage >= 60
                                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200'
                                                                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200'
                                                                            }`}
                                                                    >
                                                                        {exam.percentage}%
                                                                    </Badge>
                                                                )}
                                                                {exam.disqualified && (
                                                                    <Badge variant="outline" className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                                                                        Disqualified
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 text-sm text-muted-foreground ml-11">
                                                        <div className="flex items-center gap-4 flex-wrap">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                <span>
                                                                    {new Date(exam.submittedAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            {/* Add marks display */}
                                                            {exam.totalMarksObtained !== null && exam.totalPossibleMarks !== null && (
                                                                <div className="flex items-center gap-2">
                                                                    <Target className="h-3.5 w-3.5" />
                                                                    <span>{exam.totalMarksObtained}/{exam.totalPossibleMarks} marks</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <Timer className="h-3.5 w-3.5" />
                                                                <span>{exam.duration} min</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground mb-2">No completed exams yet</h3>
                                    <p className="text-muted-foreground text-sm">Start taking exams to see your results here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AttenderLayout>
    )
}

export default index