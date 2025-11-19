import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Users,
    FileText,
    TrendingUp,
    BookOpen,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
} from "lucide-react";
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import Head from "next/head";

// Mock data - replace with real API calls
const stats = [
    {
        title: "Total Users",
        value: "2,847",
        change: "+12.5%",
        trend: "up",
        icon: Users,
        description: "Active users this month"
    },
    {
        title: "Active Exams",
        value: "156",
        change: "+8.2%",
        trend: "up",
        icon: FileText,
        description: "Currently running exams"
    }
];

const recentExams = [
    {
        id: 1,
        title: "JavaScript Fundamentals",
        category: "Programming",
        participants: 45,
        completionRate: 92,
        status: "active",
        createdAt: "2 hours ago"
    },
    {
        id: 2,
        title: "Data Structures & Algorithms",
        category: "Computer Science",
        participants: 78,
        completionRate: 85,
        status: "active",
        createdAt: "5 hours ago"
    },
    {
        id: 3,
        title: "React Development",
        category: "Frontend",
        participants: 23,
        completionRate: 96,
        status: "completed",
        createdAt: "1 day ago"
    },
    {
        id: 4,
        title: "Database Design",
        category: "Backend",
        participants: 67,
        completionRate: 89,
        status: "active",
        createdAt: "2 days ago"
    }
];

export default function AdminDashboard() {
    return (
        <UnifiedDashboardLayout role="admin">
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="space-y-6">
                {/* Welcome Section */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Hi, Admin! 👋
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Here's what's happening with your platform today.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={index} className="border-border hover:shadow-sm transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </CardTitle>
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-foreground">
                                        {stat.value}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <div className={`flex items-center ${stat.trend === 'up'
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
                                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Exams */}
                    <Card className="lg:col-span-2 border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Recent Exams</CardTitle>
                                    <CardDescription className="text-xs mt-1">Latest exam activities and performance</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentExams.map((exam) => (
                                    <div
                                        key={exam.id}
                                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-sm text-foreground truncate">
                                                    {exam.title}
                                                </h4>
                                                <Badge
                                                    variant={exam.status === 'active' ? 'default' : 'secondary'}
                                                    className="text-xs shrink-0"
                                                >
                                                    {exam.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {exam.category} • {exam.participants} participants
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">{exam.createdAt}</p>
                                        </div>
                                        <div className="text-right ml-4 shrink-0">
                                            <div className="text-sm font-semibold text-foreground mb-1">
                                                {exam.completionRate}%
                                            </div>
                                            <Progress value={exam.completionRate} className="w-20 h-2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <div className="space-y-6">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-base">Quick Actions</CardTitle>
                                <CardDescription className="text-xs mt-1">Frequently used admin tasks</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button className="w-full justify-start">
                                    <Users className="w-4 h-4 mr-2" />
                                    Add New User
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Create Exam
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Manage Questions
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </UnifiedDashboardLayout>
    );
}