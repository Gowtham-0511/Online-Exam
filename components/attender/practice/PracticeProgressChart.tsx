import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import * as Icons from 'lucide-react';

interface ProgressChartProps {
    languageProgress: Record<string, any>;
    topicProgress: Record<string, any>;
}

export const PracticeProgressChart: React.FC<ProgressChartProps> = ({
    languageProgress,
    topicProgress
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language Progress */}
            <Card className="border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icons.Code2 className="h-5 w-5 text-primary" />
                        Language Progress
                    </CardTitle>
                    <CardDescription>
                        Your performance across different programming languages
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {languageProgress && Object.keys(languageProgress).length > 0 ? (
                        Object.entries(languageProgress).map(([language, stats]: [string, any]) => {
                            const completionRate = stats.attempted > 0
                                ? (stats.completed / stats.attempted) * 100
                                : 0;

                            return (
                                <div key={language} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{language}</span>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>{stats.completed}/{stats.attempted}</span>
                                            <span className="font-semibold text-primary">
                                                {stats.avgScore?.toFixed(0) || 0}%
                                            </span>
                                        </div>
                                    </div>
                                    <Progress value={completionRate} className="h-2" />
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Icons.Code2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No practice data yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Topic Progress */}
            <Card className="border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icons.Tag className="h-5 w-5 text-primary" />
                        Topic Progress
                    </CardTitle>
                    <CardDescription>
                        Your mastery of different programming concepts
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {topicProgress && Object.keys(topicProgress).length > 0 ? (
                        Object.entries(topicProgress).map(([topic, stats]: [string, any]) => {
                            const completionRate = stats.attempted > 0
                                ? (stats.completed / stats.attempted) * 100
                                : 0;

                            return (
                                <div key={topic} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{topic}</span>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>{stats.completed}/{stats.attempted}</span>
                                            {/* <span className="font-semibold text-primary">
                                                {stats.avgScore?.toFixed(0) || 0}%
                                            </span> */}
                                        </div>
                                    </div>
                                    <Progress value={completionRate} className="h-2" />
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Icons.Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No practice data yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};