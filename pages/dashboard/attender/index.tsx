import React, { useEffect, useState } from 'react'
import AttenderLayout from './AttenderLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    BookOpen,
    Clock,
    Trophy,
    TrendingUp,
    Calendar,
    PlayCircle,
    CheckCircle2,
    Star,
    Users,
    Target,
    Brain,
    Award
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

    const recentResults = [
        {
            id: 1,
            exam: "Object Oriented Programming",
            score: 85,
            maxScore: 100,
            rank: 12,
            totalParticipants: 156,
            date: "2025-08-28"
        },
        {
            id: 2,
            exam: "Computer Networks",
            score: 92,
            maxScore: 100,
            rank: 5,
            totalParticipants: 134,
            date: "2025-08-25"
        },
        {
            id: 3,
            exam: "Operating Systems",
            score: 78,
            maxScore: 100,
            rank: 23,
            totalParticipants: 189,
            date: "2025-08-20"
        }
    ]

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
        totalExams: 15,
        averageScore: 83.2,
        bestRank: 2,
        currentStreak: 5
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600 dark:text-green-400'
        if (score >= 75) return 'text-blue-600 dark:text-blue-400'
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-red-600 dark:text-red-400'
    }

    return (
        <AttenderLayout>
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
                <div className="container mx-auto px-4 py-8">
                    {/* Welcome Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                    Welcome to SysRank
                                </h1>
                                <p className="text-muted-foreground text-lg mt-2">
                                    Ready to test your knowledge and climb the rankings?
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Exams</p>
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{upcomingExams.length}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/20 border-green-200 dark:border-green-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-2">
                                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Avg. Score</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.averageScore}%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-2">
                                        <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Best Rank</p>
                                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">#{stats.bestRank}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Upcoming Exams */}
                        <div className="lg:col-span-2">
                            <Card className="h-fit">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            <CardTitle>Upcoming Exams</CardTitle>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            View All
                                        </Button>
                                    </div>
                                    <CardDescription>
                                        Don't miss your scheduled examinations
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {upcomingExams && upcomingExams.length > 0 ? upcomingExams.map((exam) => (
                                        <div key={exam.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-1">{exam.title}</h3>
                                                    <p className="text-sm text-muted-foreground mb-2">{exam.language}</p>
                                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                        {exam.startTime && exam.endTime ? (
                                                            <div className="flex items-center space-x-1">
                                                                <Calendar className="h-4 w-4" />
                                                                <span>{new Date(exam.startTime).toLocaleTimeString([], { year: 'numeric', month: '2-digit', day: '2-digit' })} - {new Date(exam.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        ) : null}
                                                        {exam.participants ? (
                                                            <div className="flex items-center space-x-1">
                                                                <Users className="h-4 w-4" />
                                                                <span>{exam.participants} participants</span>
                                                            </div>
                                                        ) : null}
                                                        {/* {exam.startTime && exam.endTime ? (
                                                            <div className="flex items-center space-x-1">
                                                                <Clock className="h-4 w-4" />
                                                                <span>{new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(exam.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        ) : null} */}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Duration: {exam.duration} Mins
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center text-muted-foreground py-4">
                                            No upcoming exams found.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Recent Activity */}
                            {/* <Card className="mt-6">
                                <CardHeader>
                                    <div className="flex items-center space-x-2">
                                        <Brain className="h-5 w-5 text-primary" />
                                        <CardTitle>Recent Results</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Your latest exam performances
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {recentResults.map((result) => (
                                        <div key={result.id} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="font-semibold">{result.exam}</h3>
                                                    <p className="text-sm text-muted-foreground">{result.date}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                                                        {result.score}/{result.maxScore}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Rank #{result.rank} of {result.totalParticipants}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Score Progress</span>
                                                    <span>{result.score}%</span>
                                                </div>
                                                <Progress value={result.score} className="h-2" />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card> */}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Quick Actions */}
                            {/* <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Target className="h-5 w-5" />
                                        <span>Quick Actions</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button className="w-full bg-systech-gradient text-white hover:opacity-90" size="lg">
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Take Practice Test
                                    </Button>
                                    <Button variant="outline" className="w-full" size="lg">
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        Browse Exams
                                    </Button>
                                    <Button variant="outline" className="w-full" size="lg">
                                        <Trophy className="h-4 w-4 mr-2" />
                                        View Rankings
                                    </Button>
                                </CardContent>
                            </Card> */}

                            {/* Performance Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Award className="h-5 w-5" />
                                        <span>Performance</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Overall Progress</span>
                                            <span className="text-sm text-muted-foreground">83%</span>
                                        </div>
                                        <Progress value={83} className="h-2" />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">This Month</span>
                                            <span className="text-sm text-muted-foreground">+12%</span>
                                        </div>
                                        <Progress value={67} className="h-2" />
                                    </div>

                                    <div className="pt-2 border-t">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Exams Completed</span>
                                            <span className="font-semibold">{upcomingExams.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-1">
                                            <span className="text-muted-foreground">Average Score</span>
                                            <span className="font-semibold">{stats.averageScore}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Leaderboard Preview */}
                            {/* <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Trophy className="h-5 w-5" />
                                        <span>Top Performers</span>
                                    </CardTitle>
                                    <CardDescription>This week's leaderboard</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        { name: "Alex Chen", score: 97.5, rank: 1 },
                                        { name: "Sarah Kumar", score: 95.2, rank: 2 },
                                        { name: "You", score: 92.8, rank: 3, isCurrentUser: true }
                                    ].map((user, index) => (
                                        <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg ${user.isCurrentUser ? 'bg-primary/10 border border-primary/20' : ''}`}>
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                                                {user.rank}
                                            </div>
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="text-xs">
                                                    {user.name.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.score}% avg</p>
                                            </div>
                                            {user.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card> */}

                            {/* Achievements */}
                            {/* <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Star className="h-5 w-5" />
                                        <span>Recent Achievements</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                                        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                                            <Star className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">5-Day Streak!</p>
                                            <p className="text-xs text-muted-foreground">Keep it up!</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Top 10 Rank</p>
                                            <p className="text-xs text-muted-foreground">In Computer Networks</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                            <Brain className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Quick Learner</p>
                                            <p className="text-xs text-muted-foreground">15 exams completed</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card> */}
                        </div>
                    </div>
                </div>
            </div>
        </AttenderLayout>
    )
}

export default index