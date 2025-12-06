import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
    Brain,
    TrendingUp,
    Zap,
    Target,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useState } from 'react';

type AIInsightsProps = {
    insights: {
        hasData: boolean;
        strengths: Array<{ topic: string; score: number; description: string }>;
        weaknesses: Array<{ topic: string; score: number; description: string }>;
        recommendations: string[];
    } | null;
    isLoading: boolean;
    error: any;
};

export const AIInsightsCard: React.FC<AIInsightsProps> = ({ insights, isLoading, error }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (error || !insights?.hasData) {
        return null; // Or a minimalist empty state if preferred
    }

    return (
        <Card className="border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md overflow-hidden shadow-sm group">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shadow-sm border border-indigo-500/20">
                        <Brain className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
                            AI Diagnostic
                            <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-indigo-500/10 text-indigo-500 border-indigo-200 dark:border-indigo-800">
                                BETA
                            </Badge>
                        </h3>
                        <p className="text-[10px] text-muted-foreground">Real-time skill analysis</p>
                    </div>
                </div>
            </div>

            <CardContent className="p-4 space-y-4">

                {/* Top Strengths */}
                {insights.strengths.length > 0 && (
                    <section className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            Dominant Skills
                        </div>
                        <div className="space-y-1.5">
                            {insights.strengths.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <span className="text-xs font-medium text-foreground truncate max-w-[180px]" title={item.topic}>
                                        {item.topic}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.score}%` }} />
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-500 w-6 text-right">
                                            {item.score}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Weaknesses */}
                {insights.weaknesses.length > 0 && (
                    <section className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <Zap className="h-3 w-3 text-amber-500" />
                            Focus Areas
                        </div>
                        <div className="space-y-2">
                            {insights.weaknesses.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-foreground truncate max-w-[180px]" title={item.topic}>
                                            {item.topic}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-500">
                                            {item.score}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-amber-500/10 h-1 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full"
                                            style={{ width: `${Math.max(item.score, 5)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Recommendations (Expanded Only) */}
                {isExpanded && insights.recommendations.length > 0 && (
                    <section className="pt-3 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                            <Target className="h-3 w-3 text-blue-500" />
                            Smart Actions
                        </div>
                        <div className="space-y-1.5">
                            {insights.recommendations.slice(0, 3).map((rec, idx) => (
                                <div key={idx} className="flex gap-2 text-[11px] text-muted-foreground leading-tight">
                                    <div className="mt-1 w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                                    {rec}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Toggle */}
                {insights.recommendations.length > 0 && (
                    <div onClick={() => setIsExpanded(!isExpanded)} className="pt-1 cursor-pointer flex justify-center">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide">
                            {isExpanded ? 'Less Details' : 'View Action Plan'}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const LoadingSkeleton = () => (
    <div className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
        <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
        </div>
    </div>
);