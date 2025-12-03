import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CheckCircle, Clock } from "lucide-react";

interface DashboardStatsProps {
    stats: {
        totalExams: number;
        totalCandidates: number;
        completedExams: number;
        avgDuration: number;
    };
    isLoading: boolean;
}

export default function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
    const statItems = [
        {
            title: "Total Assessments",
            value: stats.totalExams,
            icon: FileText,
            color: "text-blue-600",
            bgColor: "bg-blue-100 dark:bg-blue-900/20",
        },
        {
            title: "Candidates Assessed",
            value: stats.totalCandidates,
            icon: Users,
            color: "text-purple-600",
            bgColor: "bg-purple-100 dark:bg-purple-900/20",
        },
        {
            title: "Completed Exams",
            value: stats.completedExams,
            icon: CheckCircle,
            color: "text-green-600",
            bgColor: "bg-green-100 dark:bg-green-900/20",
        },
        {
            title: "Avg. Duration (min)",
            value: Math.round(stats.avgDuration),
            icon: Clock,
            color: "text-orange-600",
            bgColor: "bg-orange-100 dark:bg-orange-900/20",
        },
    ];

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statItems.map((item, index) => {
                const Icon = item.icon;
                return (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {item.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${item.bgColor}`}>
                                <Icon className={`h-4 w-4 ${item.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{item.value}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
