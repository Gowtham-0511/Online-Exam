import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Target, Brain } from 'lucide-react';

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
            <Card className="border-border">
                <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!prediction?.hasData) {
        return (
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        Performance Prediction
                    </CardTitle>
                    <CardDescription>Complete more exams to see predictions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Take at least 2 exams to unlock AI predictions</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getTrendIcon = () => {
        switch (prediction.trend) {
            case 'improving': return <TrendingUp className="h-5 w-5 text-emerald-600" />;
            case 'declining': return <TrendingDown className="h-5 w-5 text-rose-600" />;
            default: return <Minus className="h-5 w-5 text-blue-600" />;
        }
    };

    const getTrendColor = () => {
        switch (prediction.trend) {
            case 'improving': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
            case 'declining': return 'text-rose-600 bg-rose-50 dark:bg-rose-950/20';
            default: return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
        }
    };

    const getRiskColor = () => {
        switch (prediction.riskLevel) {
            case 'low': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
            case 'high': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
        }
    };

    return (
        <Card className="border-border">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Performance Prediction
                </CardTitle>
                <CardDescription>AI-powered forecast based on your history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Predicted Score */}
                <div className={`p-4 rounded-lg ${getTrendColor()}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Next Exam Prediction</span>
                        {getTrendIcon()}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{prediction.predictedScore.toFixed(0)}%</span>
                        <Badge variant="outline" className="text-xs">
                            {prediction.confidence}% confident
                        </Badge>
                    </div>
                    <p className="text-xs mt-2 opacity-80 capitalize">
                        Trend: {prediction.trend}
                    </p>
                </div>

                {/* Risk Level */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Risk Level</span>
                    </div>
                    <Badge variant="outline" className={getRiskColor()}>
                        {prediction.riskLevel.toUpperCase()}
                    </Badge>
                </div>

                {/* Insights */}
                {prediction.insights.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Key Insights</h4>
                        <div className="space-y-1.5">
                            {prediction.insights.slice(0, 3).map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>{insight}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};