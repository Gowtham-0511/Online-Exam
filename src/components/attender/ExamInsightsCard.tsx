import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Lightbulb, TrendingUp } from 'lucide-react';

type ExamInsightsCardProps = {
    recommendation: string;
    estimatedScore: number;
    insights: string[];
    readinessScore: number;
};

export const ExamInsightsCard: React.FC<ExamInsightsCardProps> = ({
    recommendation,
    estimatedScore,
    insights,
    readinessScore
}) => {
    return (
        <div className="space-y-3">
            {/* AI Recommendation */}
            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-2">
                    <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
                            AI Recommendation
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                            {recommendation}
                        </p>
                    </div>
                </div>
            </div>

            {/* Estimated Score */}
            {readinessScore >= 50 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Predicted Score
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        <span className="text-sm font-bold text-foreground">
                            ~{estimatedScore}%
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Insights */}
            {insights.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Lightbulb className="h-3 w-3" />
                        <span>Quick Insights</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {insights.map((insight, idx) => (
                            <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                            >
                                {insight}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};