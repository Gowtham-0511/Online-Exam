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
    },
    {
        title: "Completion Rate",
        value: "87.3%",
        change: "+2.1%",
        trend: "up",
        icon: Target,
        description: "Average exam completion"
    },
    {
        title: "System Health",
        value: "99.9%",
        change: "-0.1%",
        trend: "down",
        icon: Activity,
        description: "Uptime this month"
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
                            Good morning, Admin! 👋
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">
                            Here's what's happening with your platform today.
                        </p>
                    </div>
                    <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                        <Button size="sm" variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule
                        </Button>
                        <Button size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Reports
                        </Button>
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

                        {/* Upcoming Events */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Upcoming Events</CardTitle>
                                <CardDescription>Important dates and deadlines</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {upcomingEvents.map((event) => (
                                        <div key={event.id} className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <div className={`w-2 h-2 rounded-full mt-2 ${event.priority === 'high' ? 'bg-red-500' :
                                                    event.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                                }`} />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                    {event.title}
                                                </p>
                                                <p className="text-xs text-slate-500">{event.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest user actions and system events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-center space-x-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={activity.avatar} alt={activity.user} />
                                            <AvatarFallback>
                                                {activity.user.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm text-slate-900 dark:text-slate-100">
                                                <span className="font-medium">{activity.user}</span>
                                                {' '}{activity.action}{' '}
                                                <span className="font-medium">{activity.target}</span>
                                            </p>
                                            <p className="text-xs text-slate-500">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Performers */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Performers</CardTitle>
                            <CardDescription>Highest scoring users this month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topPerformers.map((performer, index) => (
                                    <div key={performer.id} className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-3 flex-1">
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-600' :
                                                        index === 1 ? 'text-slate-400' : 'text-amber-600'
                                                    }`}>
                                                    #{index + 1}
                                                </span>
                                                {index === 0 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                                            </div>
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={performer.avatar} alt={performer.name} />
                                                <AvatarFallback>
                                                    {performer.name.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                    {performer.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {performer.exams} exams completed
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                {performer.score}%
                                            </div>
                                            <div className="text-xs text-slate-500">avg score</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
