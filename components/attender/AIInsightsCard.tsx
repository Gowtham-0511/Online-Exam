import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, TrendingDown, Target, Lightbulb, AlertCircle } from 'lucide-react';

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
            <Card className="border-border col-span-full">
                <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !insights?.hasData) {
        return null; // Don't show if no data or error
    }

    return (
        <Card className="border-border col-span-full bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">AI Performance Insights</CardTitle>
                        <CardDescription className="mt-1">
                            Personalized analysis based on your recent exams
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-semibold text-foreground">Your Strengths</h3>
                        </div>
                        <div className="space-y-2">
                            {insights.strengths.slice(0, 3).map((strength, idx) => (
                                <div key={idx} className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm text-foreground">{strength.topic}</span>
                                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-300">
                                            {strength.score}%
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{strength.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <h3 className="font-semibold text-foreground">Areas to Improve</h3>
                        </div>
                        <div className="space-y-2">
                            {insights.weaknesses.slice(0, 3).map((weakness, idx) => (
                                <div key={idx} className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm text-foreground">{weakness.topic}</span>
                                        <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-300">
                                            {weakness.score}%
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{weakness.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {insights.recommendations.length > 0 && (
                    <div className="pt-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="font-semibold text-foreground">Recommendations</h3>
                        </div>
                        <div className="space-y-2">
                            {insights.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
                                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                    <p className="text-sm text-foreground">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};