import React, { useEffect, useState } from 'react'
import AttenderLayout from './AttenderLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
    BookOpen,
    Trophy,
    TrendingUp,
    Calendar,
    Award,
    Clock,
    Users,
    Target,
    Zap,
    Star,
    ChevronRight,
    BarChart3,
    Activity,
    Code,
    Brain,
    Timer,
    PlayCircle,
    CheckCircle2,
    AlertCircle
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
            case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
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
            <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted/30">
                <div className="container mx-auto px-6 py-8 max-w-7xl">
                    {/* Header Section */}
                    <div className="mb-10">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
                            <div className="mb-6 lg:mb-0">
                                <div className="flex items-center space-x-3 mb-2">
                                    {/* <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                                        <AvatarImage src={session?.user?.image || ""} />
                                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                            {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar> */}
                                    <div>
                                        <h1 className="text-3xl lg:text-4xl font-bold bg-systech-gradient bg-clip-text text-transparent">
                                            Welcome back, {session?.user?.name?.split(' ')[0] || 'Coder'}!
                                        </h1>
                                        <p className="text-muted-foreground text-lg">
                                            Ready to ace your next challenge?
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
                                    <Star className="h-4 w-4 mr-2" />
                                    Skill Rating: {stats.skillRating}
                                </Badge>
                                <Button
                                    onClick={() => window.location.href = '/dashboard/attender/view-exams'}
                                    className="bg-primary hover:bg-primary/90 shadow-lg"
                                >
                                    <Code className="h-4 w-4 mr-2" />
                                    Browse All Exams
                                </Button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="relative overflow-hidden border-0 shadow-lg bg-systech-gradient text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm font-medium">Available Exams</p>
                                            <p className="text-3xl font-bold mt-1">{stats.totalExams}</p>
                                        </div>
                                        <BookOpen className="h-8 w-8 text-white/70" />
                                    </div>
                                    <div className="mt-4 flex items-center text-white/80 text-sm">
                                        <TrendingUp className="h-4 w-4 mr-1" />
                                        Ready to start
                                    </div>
                                </CardContent>
                                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
                            </Card>

                            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm font-medium">Average Score</p>
                                            <p className="text-3xl font-bold mt-1">{stats.averageScore}<span className="text-xl">%</span></p>
                                        </div>
                                        <Target className="h-8 w-8 text-white/70" />
                                    </div>
                                    <div className="mt-4 flex items-center text-white/80 text-sm">
                                        <Activity className="h-4 w-4 mr-1" />
                                        Keep improving
                                    </div>
                                </CardContent>
                                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
                            </Card>

                            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm font-medium">Best Rank</p>
                                            <p className="text-3xl font-bold mt-1">#{stats.bestRank}</p>
                                        </div>
                                        <Trophy className="h-8 w-8 text-white/70" />
                                    </div>
                                    <div className="mt-4 flex items-center text-white/80 text-sm">
                                        <Zap className="h-4 w-4 mr-1" />
                                        Aim higher
                                    </div>
                                </CardContent>
                                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
                            </Card>

                            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/80 text-sm font-medium">Current Streak</p>
                                            <p className="text-3xl font-bold mt-1">{stats.currentStreak}</p>
                                        </div>
                                        <Award className="h-8 w-8 text-white/70" />
                                    </div>
                                    <div className="mt-4 flex items-center text-white/80 text-sm">
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Keep it up
                                    </div>
                                </CardContent>
                                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
                            </Card>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Upcoming Exams */}
                        <div className="lg:col-span-2">
                            <Card className="border shadow-xl bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Calendar className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">Upcoming Exams</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {upcomingExams.length} exams scheduled
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.location.href = '/dashboard/attender/view-exams'}
                                            className="text-primary hover:text-primary/90 hover:bg-primary/10"
                                        >
                                            View All
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {upcomingExams && upcomingExams.length > 0 ? (
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {upcomingExams.map((exam, index) => (
                                                <div key={exam.id} className="group relative">
                                                    <Card className="p-6 border hover:border-primary/50 transition-all duration-300 hover:shadow-md cursor-pointer bg-card/80 hover:bg-card">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-3 mb-3">
                                                                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                                        <Brain className="h-5 w-5 text-primary" />
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                                                            {exam.title}
                                                                        </h3>
                                                                        <div className="flex items-center space-x-2 mt-1">
                                                                            <Badge variant="outline" className="text-xs">
                                                                                <Code className="h-3 w-3 mr-1" />
                                                                                {exam.language}
                                                                            </Badge>
                                                                            <Badge className={`text-xs ${getDifficultyColor(exam.difficulty)}`}>
                                                                                {exam.difficulty || 'Medium'}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2 text-sm text-muted-foreground">
                                                                    {exam.startTime && exam.endTime && (
                                                                        <div className="flex items-center space-x-2">
                                                                            <Calendar className="h-4 w-4" />
                                                                            <span>{formatDateTime(exam.startTime, exam.endTime)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center space-x-4">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Timer className="h-4 w-4" />
                                                                            <span>{exam.duration} minutes</span>
                                                                        </div>
                                                                        {exam.participants > 0 && (
                                                                            <div className="flex items-center space-x-2">
                                                                                <Users className="h-4 w-4" />
                                                                                <span>{exam.participants} participants</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <PlayCircle className="h-4 w-4 mr-1" />
                                                                Start
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium text-muted-foreground mb-2">No upcoming exams</h3>
                                            <p className="text-muted-foreground mb-4">Check back later or browse available exams</p>
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
                            <Card className="border shadow-xl bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center space-x-2">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <BarChart3 className="h-5 w-5 text-primary" />
                                        </div>
                                        <span>Performance Overview</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium">Overall Progress</span>
                                                <span className="text-sm text-muted-foreground">0%</span>
                                            </div>
                                            <Progress value={0} className="h-3 bg-muted">
                                                <div className="h-full bg-systech-gradient rounded-full" />
                                            </Progress>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium">This Month</span>
                                                <span className="text-sm text-muted-foreground">0%</span>
                                            </div>
                                            <Progress value={0} className="h-3 bg-muted">
                                                <div className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full" />
                                            </Progress>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                <span className="text-sm font-medium">Completed</span>
                                            </div>
                                            <span className="text-lg font-bold">{stats.completedExams}</span>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <Target className="h-5 w-5 text-primary" />
                                                <span className="text-sm font-medium">Avg. Score</span>
                                            </div>
                                            <span className="text-lg font-bold">{stats.averageScore}%</span>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <Trophy className="h-5 w-5 text-yellow-500" />
                                                <span className="text-sm font-medium">Best Rank</span>
                                            </div>
                                            <span className="text-lg font-bold">#{stats.bestRank}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card className="border shadow-xl bg-primary/5 backdrop-blur-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center space-x-2 text-primary">
                                        <Zap className="h-5 w-5" />
                                        <span>Quick Actions</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button
                                        className="w-full justify-start"
                                        variant="outline"
                                        onClick={() => window.location.href = '/dashboard/attender/view-exams'}
                                    >
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        Browse All Exams
                                    </Button>
                                    <Button
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        View Statistics
                                    </Button>
                                    <Button
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <Trophy className="h-4 w-4 mr-2" />
                                        Leaderboard
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AttenderLayout>
    )
}

export default index