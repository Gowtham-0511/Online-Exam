import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Trophy } from 'lucide-react';

type ExamReadinessProps = {
    completedExams: number;
    averageScore: string | number;
    recentTrend?: 'improving' | 'stable' | 'declining';
};

export const ExamReadinessCard: React.FC<ExamReadinessProps> = ({
    completedExams,
    averageScore,
    recentTrend = 'stable'
}) => {
    const avgScore = typeof averageScore === 'string' ? 0 : parseFloat(averageScore.toString());

    const getReadinessLevel = () => {
        if (completedExams === 0) return { level: 'Start Learning', color: 'text-gray-600', icon: AlertTriangle };
        if (avgScore >= 80) return { level: 'Excellent', color: 'text-emerald-600', icon: Trophy };
        if (avgScore >= 60) return { level: 'Good', color: 'text-blue-600', icon: CheckCircle2 };
        return { level: 'Keep Practicing', color: 'text-amber-600', icon: AlertTriangle };
    };

    const readiness = getReadinessLevel();
    const ReadinessIcon = readiness.icon;

    return (
        <Card className="border-border">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <ReadinessIcon className={`h-5 w-5 ${readiness.color}`} />
                    Exam Readiness
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Overall Readiness</span>
                        <Badge variant="outline" className={readiness.color}>
                            {readiness.level}
                        </Badge>
                    </div>
                    <Progress value={avgScore} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>{avgScore.toFixed(0)}%</span>
                        <span>100%</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Exams Completed</span>
                        <span className="font-medium text-foreground">{completedExams}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Score</span>
                        <span className="font-medium text-foreground">
                            {typeof averageScore === 'string' ? averageScore : `${averageScore}%`}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Recent Trend</span>
                        <Badge variant="outline" className="text-xs">
                            {recentTrend === 'improving' ? '↗ Improving' :
                                recentTrend === 'declining' ? '↘ Declining' : '→ Stable'}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};