import React from 'react';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { CompletedExam } from '@/types/attender';

interface CompletedExamCardProps {
    exam: CompletedExam;
    onClick: () => void;
}

export const CompletedExamCard: React.FC<CompletedExamCardProps> = ({
    exam,
    onClick
}) => {
    const getStatusIcon = () => {
        if (exam.disqualified) {
            return <Icons.XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />;
        }
        if (exam.percentage && exam.percentage >= 80) {
            return <Icons.CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
        }
        return <Icons.Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />;
    };

    const getStatusBgColor = () => {
        if (exam.disqualified) return 'bg-rose-500/10';
        if (exam.percentage && exam.percentage >= 80) return 'bg-emerald-500/10';
        return 'bg-amber-500/10';
    };

    const getPercentageColor = () => {
        if (!exam.percentage) return '';
        if (exam.percentage >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (exam.percentage >= 60) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    return (
        <div
            onClick={onClick}
            className="group relative p-5 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer bg-card"
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${getStatusBgColor()}`}>
                    {getStatusIcon()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold text-base truncate">
                            {exam.title}
                        </h3>
                        {exam.percentage !== null && exam.percentage !== undefined && !exam.disqualified && (
                            <div className="text-right shrink-0">
                                <div className={`text-2xl font-bold ${getPercentageColor()}`}>
                                    {exam.percentage}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {exam.totalMarksObtained}/{exam.totalPossibleMarks}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-xs">
                            <Icons.Code2 className="h-3 w-3 mr-1" />
                            {exam.language}
                        </Badge>
                        <div className="flex items-center gap-1">
                            <Icons.Clock className="h-3.5 w-3.5" />
                            <span>
                                {new Date(exam.submittedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Icons.Timer className="h-3.5 w-3.5" />
                            <span>{exam.duration} min</span>
                        </div>
                        {exam.disqualified && (
                            <Badge className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200">
                                Disqualified
                            </Badge>
                        )}
                    </div>
                </div>

                <Icons.ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
        </div>
    );
};