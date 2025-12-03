import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';
import { useRouter } from 'next/router';

interface Question {
    id: number;
    questionTitle: string;
    language: string;
    difficulty: string;
    topic: string;
    weakArea: string;
    userAttempts: number;
    bestScore: number | null;
    hasPassed: boolean;
}

interface QuestionListProps {
    questions: Question[];
    isLoading: boolean;
}

export const PracticeQuestionList: React.FC<QuestionListProps> = ({
    questions,
    isLoading
}) => {
    const router = useRouter();

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400';
            case 'medium':
                return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400';
            case 'hard':
                return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (question: Question) => {
        if (question.hasPassed) {
            return <Icons.CheckCircle2 className="h-5 w-5 text-emerald-600" />;
        }
        if (question.userAttempts > 0) {
            return <Icons.Clock className="h-5 w-5 text-amber-600" />;
        }
        return <Icons.Circle className="h-5 w-5 text-muted-foreground" />;
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <Card className="border-2 border-dashed">
                <CardContent className="text-center py-16">
                    <Icons.Code2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No practice questions yet</h3>
                    <p className="text-muted-foreground text-sm">
                        Generate personalized questions based on your weak areas
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {questions.map((question) => (
                <Card
                    key={question.id}
                    className="border-2 hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => router.push(`/attender/practice/${question.id}`)}
                >
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            {/* Status Icon */}
                            <div className="flex-shrink-0 mt-1">
                                {getStatusIcon(question)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                        {question.questionTitle}
                                    </h3>
                                    {question.bestScore !== null && (
                                        <div className="flex-shrink-0 text-right">
                                            <div className="text-xl font-bold text-primary">
                                                {question.bestScore.toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Best Score
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                                    {question.weakArea}
                                </p>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                        variant="outline"
                                        className={getDifficultyColor(question.difficulty)}
                                    >
                                        {question.difficulty}
                                    </Badge>
                                    <Badge variant="outline" className="gap-1">
                                        <Icons.Code2 className="h-3 w-3" />
                                        {question.language}
                                    </Badge>
                                    <Badge variant="outline" className="gap-1">
                                        <Icons.Tag className="h-3 w-3" />
                                        {question.topic}
                                    </Badge>
                                    {question.userAttempts > 0 && (
                                        <Badge variant="secondary" className="gap-1">
                                            <Icons.RotateCw className="h-3 w-3" />
                                            {question.userAttempts} {question.userAttempts === 1 ? 'attempt' : 'attempts'}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Arrow */}
                            <Icons.ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};