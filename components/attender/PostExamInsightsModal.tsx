import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type PostExamInsightsProps = {
    isOpen: boolean;
    onClose: () => void;
    examId: string;
    email: string;
};

export const PostExamInsightsModal: React.FC<PostExamInsightsProps> = ({
    isOpen,
    onClose,
    examId,
    email
}) => {
    const [insights, setInsights] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (isOpen && examId && email) {
            setIsLoading(true);
            fetch(`/api/attender/post-exam-insights?examId=${encodeURIComponent(examId)}&email=${encodeURIComponent(email)}`)
                .then(res => res.json())
                .then(data => {
                    setInsights(data);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error('Failed to load insights:', err);
                    setIsLoading(false);
                });
        }
    }, [isOpen, examId, email]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">Exam Performance Analysis</DialogTitle>
                    <DialogDescription>
                        AI-powered insights from your submission
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : insights?.hasData ? (
                    <div className="space-y-6 py-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                                <p className="text-2xl font-bold text-foreground">
                                    {insights.userInsights.correctAnswers}
                                </p>
                                <p className="text-xs text-muted-foreground">Correct</p>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-2" />
                                <p className="text-2xl font-bold text-foreground">
                                    {insights.userInsights.partialCredit}
                                </p>
                                <p className="text-xs text-muted-foreground">Partial</p>
                            </div>
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-800">
                                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 mb-2" />
                                <p className="text-2xl font-bold text-foreground">
                                    {insights.userInsights.incorrectAnswers}
                                </p>
                                <p className="text-xs text-muted-foreground">Incorrect</p>
                            </div>
                        </div>

                        {/* Question Breakdown */}
                        <div>
                            <h3 className="font-semibold text-foreground mb-3">Question-by-Question Analysis</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {insights.userInsights.questionBreakdown.map((q: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="text-sm font-medium text-foreground line-clamp-2">
                                                Q{idx + 1}: {q.questionText.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    q.category === 'correct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50' :
                                                        q.category === 'partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50' :
                                                            'bg-rose-100 text-rose-700 dark:bg-rose-950/50'
                                                }
                                            >
                                                {q.percentage}%
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Score: {q.userScore}/{q.maxScore} • {q.feedback}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Common Mistakes (if available) */}
                        {insights.commonMistakes?.commonMistakes && insights.commonMistakes.commonMistakes.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-blue-600" />
                                    Common Patterns from All Students
                                </h3>
                                <div className="space-y-2">
                                    {insights.commonMistakes.commonMistakes.slice(0, 3).map((mistake: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <p className="text-sm font-medium text-foreground mb-1">{mistake.pattern}</p>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Frequency: {mistake.frequency}% of students
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                                💡 {mistake.suggestion}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Improvement Tips */}
                        {insights.commonMistakes?.improvementTips && insights.commonMistakes.improvementTips.length > 0 && (
                            <div className="pt-4 border-t border-border">
                                <h3 className="font-semibold text-foreground mb-3">Improvement Tips</h3>
                                <div className="space-y-2">
                                    {insights.commonMistakes.improvementTips.map((tip: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
                                            <span className="text-purple-600 dark:text-purple-400 font-bold">→</span>
                                            <p className="text-sm text-foreground">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Unable to load insights for this exam</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};