import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Calendar,
    ArrowRight,
    RefreshCw,
    CalendarDays,
    Clock
} from 'lucide-react';
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
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-9 w-24" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-border p-4 bg-card">
                            <div className="flex gap-4">
                                <Skeleton className="h-12 w-12 rounded-lg" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                        <Calendar className="h-5 w-5 text-primary" />
                        Upcoming Exams
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your scheduled assessments and challenges
                    </p>
                </div>
                {exams.length > 0 && (
                    <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10" onClick={onViewAll}>
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div> */}

            {exams.length > 0 ? (
                <div className="space-y-4">
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
                <Card className="border-dashed border-2 border-muted bg-muted/5 shadow-none">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                            <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">No upcoming exams</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mb-6">
                            You're all caught up! Check back later for new assignments or explore the practice zone.
                        </p>
                        <Button variant="outline" onClick={onViewAll} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Refresh List
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};