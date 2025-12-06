import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    XCircle,
    Target,
    Code2,
    Calendar,
    ChevronRight,
    Trophy,
    AlertTriangle
} from 'lucide-react';
import { CompletedExam } from '@/types/attender';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CompletedExamCardProps {
    exam: CompletedExam;
    onClick: () => void;
}

export const CompletedExamCard: React.FC<CompletedExamCardProps> = ({
    exam,
    onClick
}) => {
    const isDisqualified = exam.disqualified;
    const score = (() => {
        const parsed = parseFloat(String(exam.percentage));
        return isNaN(parsed) ? 0 : parsed;
    })();

    const isPassed = !isDisqualified && score >= 60;
    const isHighScorer = !isDisqualified && score >= 90;

    const getStatusConfig = () => {
        if (isDisqualified) return { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertTriangle };
        if (isHighScorer) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Trophy };
        if (isPassed) return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle2 };
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Target };
    };

    const status = getStatusConfig();
    const StatusIcon = status.icon;

    return (
        <div
            onClick={onClick}
            className="group relative p-3 rounded-lg border border-transparent hover:border-border/60 hover:bg-muted/40 transition-all duration-200 cursor-pointer flex items-center gap-3"
        >
            {/* Left Status Indicator */}
            <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-transparent",
                status.bg, status.color,
                "group-hover:border-current/10 transition-colors"
            )}>
                <StatusIcon className="w-5 h-5" />
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-sm text-foreground truncate pr-2 group-hover:text-primary transition-colors">
                        {exam.title}
                    </h4>

                    {/* Score or Status Badge */}
                    <div className="shrink-0 flex items-center gap-2">
                        {isDisqualified ? (
                            <Badge variant="destructive" className="h-5 text-[10px] px-1.5 uppercase">DQ</Badge>
                        ) : (
                            <span className={cn(
                                "text-sm font-bold font-mono tabular-nums",
                                status.color
                            )}>
                                {score}%
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Code2 className="w-3 h-3 opacity-70" />
                        <span>{exam.language}</span>
                    </div>
                    <span className="w-0.5 h-0.5 rounded-full bg-border" />
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-70" />
                        <span>
                            {formatDistanceToNow(new Date(exam.submittedAt), { addSuffix: true })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Icon */}
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />

        </div>
    );
};