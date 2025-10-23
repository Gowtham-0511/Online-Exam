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
    Users
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

    const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);

    useEffect(() => {
        const fetchUserAssessments = async () => {
            try {
                const response = await fetch(`/api/attender/allowed-exam?email=${encodeURIComponent(session?.user?.email || "")}`);
                if (response.ok) {
                    const assessments = await response.json();
                    console.log(assessments);
                    setUpcomingExams(assessments);
                }
            } catch (error) {
                console.error('Error fetching assessments:', error);
            }
        };

        fetchUserAssessments();
    }, [session])

    const stats = {
        totalExams: upcomingExams.length || 0,
        averageScore: "-",
        bestRank: "-",
        currentStreak: "-",
        completedExams: 0,
        skillRating: 1200
    }

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {stats.averageScore}<span className="text-lg">%</span>
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <Activity className="h-4 w-4 mr-1" />
                                Keep improving
                            </div>
                        </CardContent>
                    </Card>

                    {/* <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Best Rank</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">#{stats.bestRank}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <Zap className="h-4 w-4 mr-1" />
                                Aim higher
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{stats.currentStreak}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Award className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Keep it up
                            </div>
                        </CardContent>
                    </Card> */}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming Exams */}
                    <div className="lg:col-span-2">
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
                                        {upcomingExams.map((exam) => (
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
                                                            {/* {exam.startTime && exam.endTime && (
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    <span className="truncate">{formatDateTime(exam.startTime, exam.endTime)}</span>
                                                                </div>
                                                            )} */}
                                                            <div className="flex items-center gap-4 flex-wrap">
                                                                <div className="flex items-center gap-2">
                                                                    <Timer className="h-3.5 w-3.5" />
                                                                    <span>{exam.duration} min</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* <Button size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <PlayCircle className="h-4 w-4 mr-1" />
                                                        Start
                                                    </Button> */}
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
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Performance Card */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-lg">Performance Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-foreground">Overall Progress</span>
                                            <span className="text-sm text-muted-foreground">0%</span>
                                        </div>
                                        <Progress value={0} className="h-2" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-foreground">This Month</span>
                                            <span className="text-sm text-muted-foreground">0%</span>
                                        </div>
                                        <Progress value={0} className="h-2" />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-sm font-medium">Completed</span>
                                        </div>
                                        <span className="text-lg font-bold">{stats.completedExams}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Target className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium">Avg. Score</span>
                                        </div>
                                        <span className="text-lg font-bold">{stats.averageScore}%</span>
                                    </div>

                                    {/* <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            <span className="text-sm font-medium">Best Rank</span>
                                        </div>
                                        <span className="text-lg font-bold">#{stats.bestRank}</span>
                                    </div> */}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AttenderLayout>
    )
}

export default index