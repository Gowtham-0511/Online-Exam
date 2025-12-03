"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    FileText,
    TrendingUp,
    BookOpen,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    Activity,
    Clock,
    AlertCircle,
} from "lucide-react";
// import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import Head from "next/head";
import useSWR from "swr";
import { Alert, AlertDescription } from "@/components/ui/alert";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

interface DashboardStats {
    totalUsers: number;
    usersChange: string;
    usersTrend: 'up' | 'down';
    activeExams: number;
    examsChange: string;
    examsTrend: 'up' | 'down';
    totalQuestions: number;
    questionsChange: string;
    questionsTrend: 'up' | 'down';
    avgCompletion: string;
    completionChange: string;
    completionTrend: 'up' | 'down';
}

interface RecentExam {
    id: number;
    title: string;
    category: string;
    participants: number;
    completionRate: number;
    status: 'active' | 'completed';
    createdAt: string;
}

interface DashboardData {
    stats: DashboardStats;
    recentExams: RecentExam[];
}

export default function AdminDashboard() {
    const { data, error, isLoading } = useSWR<DashboardData>(
        '/api/admin/dashboard-stats',
        fetcher,
        {
            refreshInterval: 30000, // Refresh every 30 seconds
            revalidateOnFocus: true,
        }
    );

    const stats = data?.stats ? [
        {
            title: "Total Users",
            value: data.stats.totalUsers.toLocaleString(),
            change: data.stats.usersChange,
            trend: data.stats.usersTrend,
            icon: Users,
            description: "Active users this month"
        },
        {
            title: "Active Exams",
            value: data.stats.activeExams.toString(),
            change: data.stats.examsChange,
            trend: data.stats.examsTrend,
            icon: FileText,
            description: "Currently running exams"
        },
        {
            title: "Total Questions",
            value: data.stats.totalQuestions.toLocaleString(),
            change: data.stats.questionsChange,
            trend: data.stats.questionsTrend,
            icon: BookOpen,
            description: "Questions in database"
        },
        {
            title: "Avg. Completion",
            value: `${data.stats.avgCompletion}%`,
            change: data.stats.completionChange,
            trend: data.stats.completionTrend,
            icon: Activity,
            description: "Average exam completion"
        }
    ] : [];

    const recentExams = data?.recentExams || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Welcome Section with Gradient */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border/50 p-6 backdrop-blur-sm">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
                <div className="relative">
                    <h1 className="text-3xl font-bold text-foreground mb-2 animate-in slide-in-from-left duration-700">
                        Hi, Admin! 👋
                    </h1>
                    <p className="text-muted-foreground animate-in slide-in-from-left duration-700 delay-100">
                        Here's what's happening with your platform today.
                    </p>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load dashboard data. Please refresh the page.
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats Grid with Enhanced Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    // Loading skeletons
                    Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="border-border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-10 rounded-lg" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-24 mb-2" />
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-full mt-1" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card
                                key={index}
                                className="group relative border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden animate-in fade-in-50 slide-in-from-bottom-4"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Gradient overlay on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                        {stat.title}
                                    </CardTitle>
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
                                        <Icon className="h-5 w-5 text-primary group-hover:animate-pulse" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                        {stat.value}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className={`flex items-center font-medium ${stat.trend === 'up'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                            }`}>
                                            {stat.trend === 'up' ? (
                                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                            ) : (
                                                <ArrowDownRight className="w-3 h-3 mr-1" />
                                            )}
                                            {stat.change}
                                        </div>
                                        <span>from last month</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Exams - Enhanced */}
                <Card className="lg:col-span-2 border-border hover:border-primary/30 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-6 delay-200">
                    <CardHeader className="border-b border-border/50 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-primary" />
                                    Recent Exams
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">Latest exam activities and performance</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border">
                                        <Skeleton className="h-5 w-48 mb-2" />
                                        <Skeleton className="h-4 w-64" />
                                        <Skeleton className="h-3 w-32 mt-1" />
                                    </div>
                                ))}
                            </div>
                        ) : recentExams.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No exams found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentExams.map((exam, idx) => (
                                    <div
                                        key={exam.id}
                                        className="group relative flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        {/* Shimmer effect on hover */}
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>

                                        <div className="relative flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                                    {exam.title}
                                                </h4>
                                                <Badge
                                                    variant={exam.status === 'active' ? 'default' : 'secondary'}
                                                    className={`text-xs shrink-0 transition-all ${exam.status === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                        : 'hover:bg-secondary/80'
                                                        }`}
                                                >
                                                    {exam.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" />
                                                    {exam.category}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {exam.participants} participants
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {exam.createdAt}
                                            </p>
                                        </div>
                                        <div className="relative text-right ml-4 shrink-0">
                                            <div className="text-sm font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                                {exam.completionRate}%
                                            </div>
                                            <Progress
                                                value={exam.completionRate}
                                                className="w-24 h-2.5 bg-muted group-hover:bg-muted/70 transition-colors"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions - Enhanced */}
                <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-6 delay-300">
                    <Card className="border-border hover:border-primary/30 transition-all duration-300">
                        <CardHeader className="border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Quick Actions
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">Frequently used admin tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-6">
                            <Button
                                className="w-full justify-start group relative overflow-hidden bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-[1.02]"
                                onClick={() => window.location.href = '/admin/users'}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <Users className="w-4 h-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" />
                                <span className="relative z-10">Add New User</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start group border-border hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                                onClick={() => window.location.href = '/organizer/create-exam'}
                            >
                                <FileText className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                Create Exam
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start group border-border hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                                onClick={() => window.location.href = '/admin/questions'}
                            >
                                <BookOpen className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                Manage Questions
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Additional Stats Card */}
                    <Card className="border-border hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Health</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">System Status</span>
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                                    Operational
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Database</span>
                                <span className="text-xs font-semibold text-foreground">
                                    {isLoading ? <Skeleton className="h-3 w-12" /> : 'Connected'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Last Updated</span>
                                <span className="text-xs font-semibold text-foreground">
                                    {isLoading ? <Skeleton className="h-3 w-16" /> : 'Just now'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}