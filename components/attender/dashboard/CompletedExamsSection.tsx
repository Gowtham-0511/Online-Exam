import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';
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
            <Card className="border-2">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <Skeleton className="h-7 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </div>
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
                            <Icons.History className="h-6 w-6 text-primary" />
                            Recent Submissions
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                            Review your completed exams and performance
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {exams.length > 0 ? (
                    <div className="space-y-3">
                        {exams.slice(0, 5).map((exam) => (
                            <CompletedExamCard
                                key={exam.id}
                                exam={exam}
                                onClick={() => onExamClick(exam.examId, userEmail)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                            <Icons.BookOpen className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Start taking exams to track your progress
                        </p>
                        <Button onClick={onViewAll}>
                            <Icons.Play className="mr-2 h-4 w-4" />
                            Take Your First Exam
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};