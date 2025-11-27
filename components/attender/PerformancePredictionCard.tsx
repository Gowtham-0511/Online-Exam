import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    AlertCircle,
    Target,
    Brain,
    Zap,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
        return (
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    if (!prediction?.hasData) {
        return (
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm h-full flex flex-col justify-center">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        Performance Prediction
                    </CardTitle>
                    <CardDescription>Complete more exams to see predictions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
                        <div className="w-16 h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
                            <Target className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="max-w-[200px] mx-auto">Take at least 2 exams to unlock AI predictions</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getTrendIcon = () => {
        switch (prediction.trend) {
            case 'improving': return <TrendingUp className="h-5 w-5 text-emerald-500" />;
            case 'declining': return <TrendingDown className="h-5 w-5 text-rose-500" />;
            default: return <Minus className="h-5 w-5 text-blue-500" />;
        }
    };

    const getTrendColor = () => {
        switch (prediction.trend) {
            case 'improving': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'declining': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    const getRiskColor = () => {
        switch (prediction.riskLevel) {
            case 'low': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'high': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        }
    };

    return (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/50 backdrop-blur-sm overflow-hidden group h-full">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-32 h-32 text-primary -rotate-12 translate-x-8 -translate-y-8" />
            </div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl ring-1 ring-purple-500/20">
                            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Performance Forecast</CardTitle>
                            <CardDescription className="text-xs font-medium mt-0.5">
                                AI-powered score prediction
                            </CardDescription>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                        AI Beta
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10 pt-4">
                {/* Predicted Score */}
                <div className={cn("p-5 rounded-xl border transition-colors", getTrendColor())}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-80">Next Exam</span>
                        {getTrendIcon()}
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-bold tracking-tight">{prediction.predictedScore.toFixed(0)}%</span>
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm shadow-sm border-0">
                            {prediction.confidence}% confidence
                        </Badge>
                    </div>
                    <p className="text-xs mt-3 font-medium flex items-center gap-1.5 opacity-90">
                        <span className="capitalize">{prediction.trend}</span> trend detected based on recent performance
                    </p>
                </div>

                {/* Risk Level */}
                <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-full bg-background shadow-sm">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Risk Assessment</span>
                    </div>
                    <Badge variant="outline" className={cn("capitalize font-bold border", getRiskColor())}>
                        {prediction.riskLevel} Risk
                    </Badge>
                </div>

                {/* Insights */}
                {prediction.insights.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            Key Insights
                        </h4>
                        <div className="space-y-2">
                            {prediction.insights.slice(0, 3).map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm group/insight p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0 opacity-50 group-hover/insight:opacity-100 transition-opacity" />
                                    <span className="text-muted-foreground group-hover/insight:text-foreground transition-colors leading-relaxed">
                                        {insight}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};