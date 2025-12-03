"use client";

import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, FileText, BarChart3, Database, ArrowRight, Sparkles } from "lucide-react";
import DashboardStats from "@/components/dashboard/organizer/DashboardStats";
import RecentAssessments from "@/components/dashboard/organizer/RecentAssessments";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ExaminerDashboard() {
    const { data: session } = useSession();
    const router = useRouter();

    const { data: exams = [], isLoading: examsLoading } = useSWR(
        session?.user?.email
            ? `/api/organizer/assessment/by-user?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher
    );

    const { data: submissions = [], isLoading: submissionsLoading } = useSWR(
        session?.user?.email
            ? `/api/organizer/submissions/by-organizer?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher
    );

    // Calculate stats
    const stats = {
        totalExams: exams.length || 0,
        totalCandidates: new Set(submissions.map((s: any) => s.email)).size || 0,
        completedExams: submissions.length || 0,
        avgDuration: exams.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0) / (exams.length || 1)
    };

    const isLoading = examsLoading || submissionsLoading;

    const quickActions = [
        {
            title: "Create Assessment",
            description: "Design a new coding or MCQ exam",
            icon: Plus,
            action: () => router.push('/organizer/create-exam'),
            color: "text-blue-600",
            bgColor: "bg-blue-100 dark:bg-blue-900/20"
        },
        {
            title: "Question Bank",
            description: "Manage your question repository",
            icon: Database,
            action: () => router.push('/organizer/questions'), // Assuming this route exists or will exist
            color: "text-purple-600",
            bgColor: "bg-purple-100 dark:bg-purple-900/20"
        },
        {
            title: "View Analytics",
            description: "Track student performance",
            icon: BarChart3,
            action: () => router.push('/organizer/ExamAnalytics'),
            color: "text-green-600",
            bgColor: "bg-green-100 dark:bg-green-900/20"
        }
    ];

    return (
        <div className="min-h-screen bg-background p-6 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Welcome back, {session?.user?.name?.split(' ')[0] || 'organizer'}! 👋
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Here's what's happening with your assessments today.
                        </p>
                    </div>
                    <Button onClick={() => router.push('/organizer/create-exam')} className="bg-primary hover:bg-primary/90 transition-colors">
                        <Plus className="mr-2 h-4 w-4" /> Create New Exam
                    </Button>
                </div>

                {/* Stats Grid */}
                <div>
                    <DashboardStats stats={stats} isLoading={isLoading} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Assessments */}
                    <div className="lg:col-span-2">
                        <RecentAssessments exams={exams} isLoading={examsLoading} />
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>Common tasks you perform</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {quickActions.map((action, index) => {
                                    const Icon = action.icon;
                                    return (
                                        <div
                                            key={index}
                                            onClick={action.action}
                                            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-all hover:scale-[1.02] group"
                                        >
                                            <div className={`p-2 rounded-lg ${action.bgColor} transition-transform group-hover:scale-110`}>
                                                <Icon className={`h-5 w-5 ${action.color}`} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                                                    {action.title}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {action.description}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* AI Feature Promo */}
                        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-100 dark:border-purple-900">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                    <Sparkles className="h-5 w-5" />
                                    AI Question Generator
                                </CardTitle>
                                <CardDescription className="text-purple-600/80 dark:text-purple-400/80">
                                    Generate high-quality questions with test cases instantly.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="outline"
                                    className="w-full border-purple-200 hover:bg-purple-100 dark:border-purple-800 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 transition-colors"
                                    onClick={() => router.push('/organizer/create-exam')}
                                >
                                    Try it now
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}