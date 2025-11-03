import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';
import { UpcomingExamCard } from './UpcomingExamCard';
import { Exam } from '@/types/attender';

interface UpcomingExamsSectionProps {
    exams: Exam[];
    isLoading: boolean;
    onStartExam: (examId: string) => void;
    onViewStrategy: (exam: Exam) => void;
    onViewAll: () => void;
}

export const UpcomingExamsSection: React.FC<UpcomingExamsSectionProps> = ({
    exams,
    isLoading,
    onStartExam,
    onViewStrategy,
    onViewAll
}) => {
    if (isLoading) {
        return (
            <Card className="border-2">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <Skeleton className="h-7 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Icons.Calendar className="h-6 w-6 text-primary" />
                            Upcoming Exams
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                            Your scheduled assessments and tests
                        </CardDescription>
                    </div>
                    {exams.length > 0 && (
                        <Button variant="outline" onClick={onViewAll}>
                            View All
                            <Icons.ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {exams.length > 0 ? (
                    <div className="space-y-3">
                        {exams.slice(0, 3).map((exam) => (
                            <UpcomingExamCard
                                key={exam.id}
                                exam={exam}
                                onStart={() => onStartExam(exam.title)}
                                onViewStrategy={() => onViewStrategy(exam)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                            <Icons.Calendar className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No upcoming exams</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Check back later for new assignments
                        </p>
                        <Button onClick={onViewAll}>
                            <Icons.RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};