import React from 'react';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
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
            case 'mcq': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400';
            case 'coding': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400';
            case 'theory': return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-400';
        }
    };

    return (
        <div className="group relative p-5 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card">
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Icons.FileText className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-2 truncate">
                        {exam.title}
                    </h3>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap mb-3">
                        <Badge variant="outline" className="text-xs">
                            <Icons.Code2 className="h-3 w-3 mr-1" />
                            {exam.language}
                        </Badge>
                        <div className="flex items-center gap-1">
                            <Icons.Clock className="h-3.5 w-3.5" />
                            <span>{exam.duration} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Icons.Users className="h-3.5 w-3.5" />
                            <span>{exam.participants} participants</span>
                        </div>
                        {exam.assignmentType && (
                            <Badge className={`text-xs ${getAssignmentTypeColor(exam.assignmentType)}`}>
                                {exam.assignmentType}
                            </Badge>
                        )}
                    </div>

                    {exam.startTime && exam.endTime && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Icons.Calendar className="h-3.5 w-3.5" />
                            <span>
                                {new Date(exam.startTime).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                                {' - '}
                                {new Date(exam.endTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={onStart}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                        >
                            <Icons.Play className="h-3.5 w-3.5" />
                            Start Exam
                        </button>
                        <button
                            onClick={onViewStrategy}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/50 rounded-lg transition-colors"
                        >
                            <Icons.Lightbulb className="h-3.5 w-3.5" />
                            Strategy
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
        </div>
    );
};