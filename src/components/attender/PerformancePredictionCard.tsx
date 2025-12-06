import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Brain,
    AlertTriangle,
    CheckCircle2,
    Info,
    HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type PredictionProps = {
    prediction: {
        hasData: boolean;
        predictedScore: number;
        trend: 'improving' | 'declining' | 'stable';
        confidence: number;
        insights: string[];
        riskLevel: 'low' | 'medium' | 'high';
    } | null;
    isLoading: boolean;
};

export const PerformancePredictionCard: React.FC<PredictionProps> = ({ prediction, isLoading }) => {
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (!prediction?.hasData) {
        return <EmptyState />;
    }

    const { trend, predictedScore, confidence, riskLevel } = prediction;

    const trendConfig = {
        improving: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        declining: { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        stable: { icon: Minus, color: 'text-blue-500', bg: 'bg-blue-500/10' }
    }[trend];

    const riskConfig = {
        low: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: "Low Risk" },
        medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: "Moderate Risk" },
        high: { color: 'text-rose-500', bg: 'bg-rose-500/10', label: "High Risk" }
    }[riskLevel];

    const TrendIcon = trendConfig.icon;

    return (
        <Card className="border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                        <Brain className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Score Forecast</span>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-help">
                                <span>{confidence}% confidence</span>
                                <HelpCircle className="w-3 h-3" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs max-w-[200px]">
                            Based on your consistency and performance across recent exams.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <CardContent className="p-4 space-y-4">
                {/* Score Projection */}
                <div className="flex items-center gap-4">
                    <div className={cn("flex-1 p-3 rounded-lg border flex flex-col items-center justify-center gap-1",
                        trendConfig.bg, "border-transparent"
                    )}>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Projected</span>
                        <span className={cn("text-3xl font-bold tracking-tighter", trendConfig.color)}>
                            {predictedScore.toFixed(0)}%
                        </span>
                    </div>

                    <div className="flex-1 space-y-2">
                        {/* Trend Badge */}
                        <div className={cn("flex items-center gap-2 p-2 rounded-md border border-border/50 bg-card")}>
                            <div className={cn("p-1 rounded-full shrink-0", trendConfig.bg)}>
                                <TrendIcon className={cn("w-3 h-3", trendConfig.color)} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-semibold text-foreground capitalize">{trend}</span>
                                <span className="text-[9px] text-muted-foreground">Trend</span>
                            </div>
                        </div>

                        {/* Risk Badge */}
                        <div className={cn("flex items-center gap-2 p-2 rounded-md border border-border/50 bg-card")}>
                            <div className={cn("p-1 rounded-full shrink-0", riskConfig.bg)}>
                                <AlertTriangle className={cn("w-3 h-3", riskConfig.color)} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-semibold text-foreground">{riskConfig.label}</span>
                                <span className="text-[9px] text-muted-foreground">Status</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Micro Insights */}
                {prediction.insights.length > 0 && (
                    <div className="pt-2 border-t border-border/40 space-y-2">
                        {prediction.insights.slice(0, 2).map((insight, idx) => (
                            <div key={idx} className="flex gap-2 text-[11px] text-muted-foreground leading-tight">
                                <Info className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                {insight}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const LoadingSkeleton = () => (
    <Card className="border-border/50 shadow-sm">
        <div className="p-4 border-b border-border/40 flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
        </div>
        <CardContent className="p-4 space-y-3">
            <div className="flex gap-3">
                <Skeleton className="h-16 w-1/2 rounded-lg" />
                <div className="w-1/2 space-y-2">
                    <Skeleton className="h-7 w-full rounded-md" />
                    <Skeleton className="h-7 w-full rounded-md" />
                </div>
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
        </CardContent>
    </Card>
);

const EmptyState = () => (
    <Card className="border-dashed border-2 border-muted bg-muted/5 shadow-none h-full flex flex-col justify-center min-h-[180px]">
        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                <Brain className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs font-medium text-foreground">No predictions yet</p>
            <p className="text-[10px] text-muted-foreground max-w-[150px]">
                Complete at least 2 exams to unlock AI forecasting.
            </p>
        </div>
    </Card>
);