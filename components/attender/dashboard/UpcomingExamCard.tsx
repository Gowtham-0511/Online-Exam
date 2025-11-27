import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Calendar,
    Clock,
    Code2,
    FileText,
    Lightbulb,
    Play,
    Users,
    MoreHorizontal,
    Timer
} from 'lucide-react';
import { Exam } from '@/types/attender';

interface UpcomingExamCardProps {
    exam: Exam;
    onStart: () => void;
    onViewStrategy: () => void;
}

export const UpcomingExamCard: React.FC<UpcomingExamCardProps> = ({
    exam,
    onStart,
    onViewStrategy
}) => {
    const getAssignmentTypeColor = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'mcq': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
            case 'coding': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800';
            case 'theory': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    const isStartingSoon = () => {
        if (!exam.startTime) return false;
        const now = new Date();
        const start = new Date(exam.startTime);
        const diff = start.getTime() - now.getTime();
        return diff > 0 && diff < 30 * 60 * 1000; // Less than 30 mins
    };

    return (
        <Card className="group relative overflow-hidden border-border hover:border-primary/50 hover:shadow-md transition-all duration-300">
            <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                    {/* Left Status Strip */}
                    <div className={`w-full sm:w-1.5 h-1 sm:h-auto ${isStartingSoon() ? 'bg-amber-500' : 'bg-primary'}`} />

                    <div className="flex-1 p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                        {/* Icon Box */}
                        <div className="p-3 rounded-xl bg-primary/10 shrink-0 group-hover:scale-105 transition-transform duration-300">
                            {exam.assignmentType?.toLowerCase() === 'coding' ? (
                                <Code2 className="h-6 w-6 text-primary" />
                            ) : (
                                <FileText className="h-6 w-6 text-primary" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2 w-full">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-lg leading-tight truncate pr-2 group-hover:text-primary transition-colors">
                                    {exam.title}
                                </h3>
                                {isStartingSoon() && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 animate-pulse shrink-0">
                                        Starting Soon
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Code2 className="h-3.5 w-3.5" />
                                    <span className="font-medium text-foreground">{exam.language}</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-1.5">
                                    <Timer className="h-3.5 w-3.5" />
                                    <span>{exam.duration} min</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>{exam.participants} enrolled</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                {exam.assignmentType && (
                                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${getAssignmentTypeColor(exam.assignmentType)}`}>
                                        {exam.assignmentType}
                                    </Badge>
                                )}
                                {exam.startTime && (
                                    <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {new Date(exam.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        {' • '}
                                        {new Date(exam.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <Button
                                onClick={onStart}
                                className="flex-1 sm:flex-none w-full sm:w-32 shadow-sm group-hover:shadow-md transition-all"
                                size="sm"
                            >
                                <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                                Start
                            </Button>
                            <Button
                                onClick={onViewStrategy}
                                variant="outline"
                                className="flex-1 sm:flex-none w-full sm:w-32 border-border hover:border-primary/50 hover:bg-primary/5"
                                size="sm"
                            >
                                <Lightbulb className="h-3.5 w-3.5 mr-2" />
                                Strategy
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};