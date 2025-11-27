import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
    Brain,
    TrendingUp,
    TrendingDown,
    Target,
    Lightbulb,
    Sparkles,
    Zap,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    if (isLoading) {
        return (
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <div className="grid grid-cols-1 gap-3">
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-20 w-full rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <div className="grid grid-cols-1 gap-3">
                            <Skeleton className="h-20 w-full rounded-xl" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !insights?.hasData) {
        return null;
    }

    return (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/50 backdrop-blur-sm overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-24 h-24 text-primary rotate-12" />
            </div>

            <CardHeader className="pb-6 border-b border-border/50 relative z-10">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                            <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                AI Performance Analysis
                                <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-wider">
                                    Beta
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-muted-foreground mt-1">
                                Personalized insights based on your recent activity
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-8 relative z-10">
                {/* Strengths Section */}
                {insights.strengths.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-500">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <h3>Top Strengths</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {insights.strengths.slice(0, 3).map((strength, idx) => (
                                <div
                                    key={idx}
                                    className="group/item p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-all duration-300 hover:border-primary/20"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-sm text-foreground group-hover/item:text-primary transition-colors">
                                            {strength.topic}
                                        </span>
                                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                                            {strength.score}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={strength.score}
                                        className="h-1.5 mb-3 bg-muted"
                                        indicatorClassName="bg-gradient-to-r from-emerald-500 to-emerald-400"
                                    />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {strength.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weaknesses Section */}
                {insights.weaknesses.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                                <TrendingDown className="h-4 w-4" />
                            </div>
                            <h3>Areas for Improvement</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {insights.weaknesses.slice(0, 3).map((weakness, idx) => (
                                <div
                                    key={idx}
                                    className="group/item p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-all duration-300 hover:border-amber-500/20"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-sm text-foreground group-hover/item:text-amber-500 transition-colors">
                                            {weakness.topic}
                                        </span>
                                        <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                                            {weakness.score}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={weakness.score}
                                        className="h-1.5 mb-3 bg-muted"
                                        indicatorClassName="bg-gradient-to-r from-amber-500 to-amber-400"
                                    />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {weakness.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations Section */}
                {insights.recommendations.length > 0 && (
                    <div className="pt-6 border-t border-border/50 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <div className="p-1 rounded bg-blue-500/10 text-blue-500">
                                <Lightbulb className="h-4 w-4" />
                            </div>
                            <h3>Recommended Actions</h3>
                        </div>
                        <div className="space-y-2">
                            {insights.recommendations.slice(0, 3).map((rec, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors group/rec"
                                >
                                    <div className="mt-1 p-1 rounded-full bg-blue-500/10 text-blue-500 group-hover/rec:bg-blue-500 group-hover/rec:text-white transition-colors">
                                        <Target className="h-3 w-3" />
                                    </div>
                                    <p className="text-xs text-muted-foreground group-hover/rec:text-foreground transition-colors leading-relaxed pt-0.5">
                                        {rec}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};