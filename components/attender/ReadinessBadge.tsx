import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

type ReadinessBadgeProps = {
    readinessScore: number;
    readinessLevel: string;
    color: string;
    compact?: boolean;
};

export const ReadinessBadge: React.FC<ReadinessBadgeProps> = ({
    readinessScore,
    readinessLevel,
    color,
    compact = false
}) => {
    const getIcon = () => {
        if (readinessScore >= 80) return <CheckCircle2 className="h-3 w-3" />;
        if (readinessScore >= 65) return <TrendingUp className="h-3 w-3" />;
        if (readinessScore >= 50) return <Target className="h-3 w-3" />;
        return <AlertCircle className="h-3 w-3" />;
    };

    const colorClasses = {
        emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
        blue: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
        amber: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
        orange: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
        red: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
    };

    if (compact) {
        return (
            <Badge variant="outline" className={`${colorClasses[color as keyof typeof colorClasses]} flex items-center gap-1 px-2 py-1`}>
                {getIcon()}
                <span className="text-xs font-medium">{readinessScore}%</span>
            </Badge>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <span className="text-xs font-medium text-muted-foreground">Readiness</span>
                </div>
                <Badge variant="outline" className={colorClasses[color as keyof typeof colorClasses]}>
                    {readinessLevel}
                </Badge>
            </div>
            <Progress value={readinessScore} className="h-2" />
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Match Score</span>
                <span className="font-bold text-foreground">{readinessScore}%</span>
            </div>
        </div>
    );
};