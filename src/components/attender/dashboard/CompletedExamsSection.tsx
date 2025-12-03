import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    History,
    BookOpen,
    Play,
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { CompletedExamCard } from './CompletedExamCard';
import { CompletedExam } from '@/types/attender';

interface CompletedExamsSectionProps {
    exams: CompletedExam[];
    isLoading: boolean;
    onExamClick: (examId: string, email: string) => void;
    onViewAll: () => void;
    userEmail: string;
}

export const CompletedExamsSection: React.FC<CompletedExamsSectionProps> = ({
    exams,
    isLoading,
    onExamClick,
    onViewAll,
    userEmail
}) => {
    if (isLoading) {
        return (
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            Recent Submissions
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Track your performance and review insights
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onViewAll}
                        className="text-muted-foreground hover:text-primary gap-1"
                    >
                        View All
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {exams.length > 0 ? (
                    <div className="divide-y divide-border/50">
                        <div className="p-4 space-y-3">
                            {exams.slice(0, 5).map((exam) => (
                                <CompletedExamCard
                                    key={exam.id}
                                    exam={exam}
                                    onClick={() => onExamClick(exam.examId, userEmail)}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <div className="w-16 h-16 mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No submissions yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mb-6">
                            Complete your first exam to unlock detailed performance analytics and AI insights.
                        </p>
                        <Button onClick={onViewAll} className="gap-2">
                            <Play className="h-4 w-4" />
                            Take Your First Exam
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};