import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/router";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Exam {
    id: string;
    title: string;
    language: string;
    duration: number;
    createdAt: string;
    status?: "draft" | "published" | "archived";
    questionsCount?: number;
}

interface RecentAssessmentsProps {
    exams: Exam[];
    isLoading: boolean;
}

export default function RecentAssessments({ exams, isLoading }: RecentAssessmentsProps) {
    const router = useRouter();

    if (isLoading) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-3">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Recent Assessments</CardTitle>
                        <CardDescription>
                            Your most recently created exams and their status.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/examiner/view-exams')}>
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {exams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No assessments found. Create your first one!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {exams.slice(0, 5).map((exam) => (
                            <div
                                key={exam.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {exam.language === 'python' ? 'Py' : 'SQL'}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold hover:text-primary cursor-pointer" onClick={() => router.push(`/dashboard/examiner/view-exams?id=${exam.id}`)}>
                                            {exam.title}
                                        </h4>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(exam.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {exam.duration} mins
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                                        {exam.status || 'Active'}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/examiner/view-exams?edit=${exam.id}`)}>
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/examiner/ExamAnalytics?examId=${exam.id}`)}>
                                                Analytics
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
