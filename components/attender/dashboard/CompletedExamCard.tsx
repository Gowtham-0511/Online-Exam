import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    XCircle,
    Target,
    Code2,
    Clock,
    Timer,
    ChevronRight,
    Trophy,
    Calendar
} from 'lucide-react';
import { CompletedExam } from '@/types/attender';
import { cn } from '@/lib/utils';

interface CompletedExamCardProps {
    exam: CompletedExam;
    onClick: () => void;
}

export const CompletedExamCard: React.FC<CompletedExamCardProps> = ({
    exam,
    onClick
}) => {
    const isDisqualified = exam.disqualified;
    const score = exam.percentage || 0;
    const isPassed = score >= 60; // Assuming 60 is pass, can be adjusted
    const isHighScorer = score >= 80;

    const getStatusColor = () => {
        if (isDisqualified) return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
        if (isHighScorer) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (isPassed) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    };

    const getStatusIcon = () => {
        if (isDisqualified) return <XCircle className="h-5 w-5" />;
        if (isHighScorer) return <Trophy className="h-5 w-5" />;
        if (isPassed) return <CheckCircle2 className="h-5 w-5" />;
        return <Target className="h-5 w-5" />;
    };

    return (
        <div
            onClick={onClick}
            className="group relative p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 hover:border-primary/20 hover:shadow-sm transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className="flex items-center gap-4 relative z-10">
                {/* Status Icon */}
                <div className={cn("p-3 rounded-xl shrink-0 transition-colors", getStatusColor())}>
                    {getStatusIcon()}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                            <h3 className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
                                {exam.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Code2 className="h-3 w-3" />
                                    <span>{exam.language}</span>
                                </div>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        {new Date(exam.submittedAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Score Section */}
                        {!isDisqualified && (
                            <div className="text-right shrink-0">
                                <div className={cn("text-xl font-bold tabular-nums",
                                    isHighScorer ? "text-emerald-600 dark:text-emerald-400" :
                                        isPassed ? "text-amber-600 dark:text-amber-400" :
                                            "text-rose-600 dark:text-rose-400"
                                )}>
                                    {score}%
                                </div>
                                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                    Score
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Metadata */}
                    <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-border/50 font-normal">
                            <Timer className="h-3 w-3 mr-1" />
                            {exam.duration} min
                        </Badge>

                        {isDisqualified && (
                            <Badge variant="destructive" className="text-xs">
                                Disqualified
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Arrow Action */}
                <div className="pl-2">
                    <div className="p-2 rounded-full bg-muted/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Hover Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};