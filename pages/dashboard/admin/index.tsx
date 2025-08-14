import AdminLayout from "./layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Users,
    FileText,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    Eye,
    Calendar,
    Award,
    BookOpen,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    Star,
    Target,
    Activity
} from "lucide-react";

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

const recentActivity = [
    {
        id: 1,
        user: "John Doe",
        action: "completed exam",
        target: "JavaScript Fundamentals",
        time: "5 minutes ago",
        avatar: "/api/placeholder/32/32"
    },
    {
        id: 2,
        user: "Sarah Wilson",
        action: "created new exam",
        target: "Python Basics",
        time: "15 minutes ago",
        avatar: "/api/placeholder/32/32"
    },
    {
        id: 3,
        user: "Mike Johnson",
        action: "updated skillset",
        target: "Web Development",
        time: "1 hour ago",
        avatar: "/api/placeholder/32/32"
    },
    {
        id: 4,
        user: "Emma Davis",
        action: "submitted results",
        target: "Data Analysis Quiz",
        time: "2 hours ago",
        avatar: "/api/placeholder/32/32"
    }
];

const upcomingEvents = [
    {
        id: 1,
        title: "System Maintenance",
        date: "Tomorrow, 2:00 AM",
        type: "maintenance",
        priority: "high"
    },
    {
        id: 2,
        title: "Q4 Performance Review",
        date: "Dec 15, 2024",
        type: "review",
        priority: "medium"
    },
    {
        id: 3,
        title: "New Feature Release",
        date: "Dec 20, 2024",
        type: "release",
        priority: "high"
    }
];

const topPerformers = [
    {
        id: 1,
        name: "Alice Johnson",
        score: 98.5,
        exams: 12,
        avatar: "/api/placeholder/32/32"
    },
    {
        id: 2,
        name: "Bob Smith",
        score: 96.2,
        exams: 8,
        avatar: "/api/placeholder/32/32"
    },
    {
        id: 3,
        name: "Carol Williams",
        score: 94.8,
        exams: 15,
        avatar: "/api/placeholder/32/32"
    }
];

export default function AdminDashboard() {
    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Welcome Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Hi, Admin! 👋
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">
                            Here's what's happening with your platform today.
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        {stat.title}
                                    </CardTitle>
                                    <Icon className="h-4 w-4 text-slate-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {stat.value}
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                                        <div className={`flex items-center ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
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
                                    <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Exams */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Recent Exams</CardTitle>
                                    <CardDescription>Latest exam activities and performance</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentExams.map((exam) => (
                                    <div key={exam.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                                    {exam.title}
                                                </h4>
                                                <Badge variant={exam.status === 'active' ? 'default' : 'secondary'}>
                                                    {exam.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {exam.category} • {exam.participants} participants
                                            </p>
                                            <p className="text-xs text-slate-500">{exam.createdAt}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {exam.completionRate}%
                                            </div>
                                            <Progress value={exam.completionRate} className="w-20" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions & Upcoming Events */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>Frequently used admin tasks</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
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
                                <Button variant="outline" className="w-full justify-start">
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    View Analytics
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
