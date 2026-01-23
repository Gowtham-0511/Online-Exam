import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    ArrowRight,
    RefreshCw,
    CalendarDays,
    Timer,
    Users,
    Code2,
    FileText,
    Play,
    Lightbulb,
    Clock,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { Exam } from '@/types/attender';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';

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
        return <LoadingState />;
    }

    console.log(exams);

    // Sort exams by start time (soonest first)
    const sortedExams = [...exams].sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : Infinity;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : Infinity;
        return timeA - timeB;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Header handled by parent now, focusing just on content here */}
                </div>
                {exams.length > 3 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onViewAll}
                        className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        See All <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                )}
            </div>

            {sortedExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sortedExams.slice(0, 3).map((exam) => (
                        <ExamCard
                            key={exam.id}
                            exam={exam}
                            onStart={() => onStartExam(exam.title)}
                            onViewStrategy={() => onViewStrategy(exam)}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState onViewAll={onViewAll} />
            )}
        </div>
    );
};

interface ExamCardProps {
    exam: Exam;
    onStart: () => void;
    onViewStrategy: () => void;
}
const ExamCard: React.FC<ExamCardProps> = ({ exam, onStart, onViewStrategy }) => {
    const startTime = exam.startTime ? new Date(new Date(exam.startTime).getTime() - (5.5 * 60 * 60 * 1000)) : null;
    const endTime = exam.endTime ? new Date(new Date(exam.endTime).getTime() - (5.5 * 60 * 60 * 1000)) : null;
    const now = new Date();

    console.log(startTime, endTime, now);

    // const isStarted = startTime ? now >= startTime : false;
    // const isEnded = endTime ? now > endTime : false;
    const isStarted = true;
    const isEnded = false;

    const isUrgent = startTime
        ? (!isStarted && (startTime.getTime() - now.getTime()) < 1000 * 60 * 60 * 2)
        : false;

    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-border/60 bg-card hover:-translate-y-1 h-full flex flex-col",
            isUrgent && "border-amber-500/50 shadow-amber-500/5"
        )}>
            {/* Top decorative bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-1 transition-colors duration-300",
                isUrgent ? "bg-amber-500" : "bg-primary/20 group-hover:bg-primary"
            )} />

            <CardContent className="p-5 flex flex-col h-full gap-4">

                {/* Header: Title & Urgent Badge */}
                <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                        {isUrgent && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] px-1.5 py-0 mb-1 h-5 gap-1">
                                <Clock className="w-3 h-3 animate-pulse" /> Starting Soon
                            </Badge>
                        )}
                        <h3 className="font-bold text-base leading-snug truncate group-hover:text-primary transition-colors" title={exam.title}>
                            {exam.title}
                        </h3>
                    </div>
                    <div className="shrink-0 p-2 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {exam.assignmentType === 'coding' ? <Code2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs text-muted-foreground flex-1">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 opacity-70" />
                        <span className="truncate">
                            {startTime ? (isToday(startTime) ? 'Today' : isTomorrow(startTime) ? 'Tomorrow' : format(startTime, 'MMM d')) : 'TBA'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Timer className="w-3.5 h-3.5 opacity-70" />
                        <span>{exam.duration} mins</span>
                    </div>

                    {/* Time Range */}
                    <div className="col-span-2 flex items-center gap-2 bg-muted/40 p-2 rounded-md border border-border/40">
                        <Clock className="w-3.5 h-3.5 text-primary/80" />
                        <span className="font-medium text-[11px] text-foreground/90 truncate">
                            {startTime ? format(startTime, 'MMM d h:mm a') : 'TBA'} - {endTime ? format(endTime, 'MMM d h:mm a') : 'TBA'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 flex items-center justify-center">
                            <span className="block w-2 h-2 rounded-full border border-current opacity-70" />
                        </div>
                        <span className="truncate">{exam.language}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 opacity-70" />
                        <span>{exam.participants || 0} enrolled</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2 mt-auto">
                    <Button
                        size="sm"
                        disabled={!isStarted || isEnded}
                        className={cn(
                            "flex-1 font-semibold",
                            isUrgent ? "bg-amber-500 hover:bg-amber-600 text-white" : "shadow-sm",
                            (!isStarted || isEnded) && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
                        )}
                        onClick={onStart}
                    >
                        {!isStarted ? (
                            <>
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                Upcoming
                            </>
                        ) : isEnded ? (
                            <>
                                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                                Expired
                            </>
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                Start
                            </>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="px-2.5 text-muted-foreground hover:text-foreground border border-transparent hover:border-border hover:bg-muted/50"
                        onClick={onViewStrategy}
                        title="View AI Strategy"
                    >
                        <Lightbulb className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const LoadingState = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border p-5 bg-card space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
                <div className="pt-2 flex gap-2">
                    <Skeleton className="h-9 flex-1 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                </div>
            </div>
        ))}
    </div>
);

const EmptyState = ({ onViewAll }: { onViewAll: () => void }) => (
    <Card className="border-dashed border-2 border-muted bg-muted/5 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 mb-3 rounded-xl bg-muted flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No upcoming exams</h3>
            <p className="text-xs text-muted-foreground max-w-[200px] mb-4 leading-relaxed">
                You're all caught up! Check back later or practice on your own.
            </p>
            <Button variant="outline" size="sm" onClick={onViewAll} className="h-8 text-xs gap-1.5">
                <RefreshCw className="h-3 w-3" />
                Reload
            </Button>
        </CardContent>
    </Card>
);