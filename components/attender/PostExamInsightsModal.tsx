import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    TrendingUp,
    Lightbulb,
    Brain,
    Target,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                            <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                Exam Performance Analysis
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-wider">
                                    AI Powered
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium mt-1">
                                Detailed insights and personalized feedback from your submission
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-8">
                    {isLoading ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <Skeleton className="h-24 w-full rounded-xl" />
                                <Skeleton className="h-24 w-full rounded-xl" />
                                <Skeleton className="h-24 w-full rounded-xl" />
                            </div>
                            <Skeleton className="h-64 w-full rounded-xl" />
                            <Skeleton className="h-32 w-full rounded-xl" />
                        </div>
                    ) : insights?.hasData ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-5 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center text-center group hover:bg-emerald-500/10 transition-colors">
                                    <div className="p-2 rounded-full bg-emerald-500/10 mb-3 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground mb-1">
                                        {insights.userInsights.correctAnswers}
                                    </p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Correct Answers</p>
                                </div>

                                <div className="p-5 bg-amber-500/5 rounded-xl border border-amber-500/20 flex flex-col items-center justify-center text-center group hover:bg-amber-500/10 transition-colors">
                                    <div className="p-2 rounded-full bg-amber-500/10 mb-3 group-hover:scale-110 transition-transform">
                                        <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground mb-1">
                                        {insights.userInsights.partialCredit}
                                    </p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Partial Credit</p>
                                </div>

                                <div className="p-5 bg-rose-500/5 rounded-xl border border-rose-500/20 flex flex-col items-center justify-center text-center group hover:bg-rose-500/10 transition-colors">
                                    <div className="p-2 rounded-full bg-rose-500/10 mb-3 group-hover:scale-110 transition-transform">
                                        <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground mb-1">
                                        {insights.userInsights.incorrectAnswers}
                                    </p>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incorrect Answers</p>
                                </div>
                            </div>

                            {/* Question Breakdown */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-primary/10 rounded-lg">
                                        <Target className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-foreground">Question Analysis</h3>
                                </div>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {insights.userInsights.questionBreakdown.map((q: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="group p-4 bg-card hover:bg-accent/5 rounded-xl border border-border/50 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">Q{idx + 1}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "border-0 font-bold",
                                                                q.category === 'correct' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                                    q.category === 'partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                                                        'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                            )}
                                                        >
                                                            {q.percentage}% Score
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                                                        {q.questionText.replace(/<[^>]*>/g, '').substring(0, 120)}...
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-sm font-bold text-foreground">{q.userScore}</span>
                                                    <span className="text-xs text-muted-foreground">/{q.maxScore}</span>
                                                </div>
                                            </div>
                                            <div className="pl-3 border-l-2 border-primary/20">
                                                <p className="text-xs text-muted-foreground italic">
                                                    "{q.feedback}"
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Common Mistakes */}
                                {insights.commonMistakes?.commonMistakes && insights.commonMistakes.commonMistakes.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Common Patterns</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {insights.commonMistakes.commonMistakes.slice(0, 3).map((mistake: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-sm font-semibold text-foreground">{mistake.pattern}</p>
                                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">
                                                            {mistake.frequency}% freq
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-start gap-2 mt-2">
                                                        <Lightbulb className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {mistake.suggestion}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Improvement Tips */}
                                {insights.commonMistakes?.improvementTips && insights.commonMistakes.improvementTips.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                                <Sparkles className="h-4 w-4 text-purple-500" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Pro Tips</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {insights.commonMistakes.improvementTips.map((tip: string, idx: number) => (
                                                <div key={idx} className="flex items-start gap-3 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 hover:bg-purple-500/10 transition-colors group">
                                                    <div className="mt-0.5 p-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                        <ArrowRight className="h-3 w-3" />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                                                        {tip}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-muted-foreground animate-in fade-in zoom-in-95">
                            <div className="p-4 bg-muted/50 rounded-full mb-4">
                                <AlertCircle className="h-10 w-10 opacity-50" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">No Insights Available</h3>
                            <p className="text-sm max-w-xs mx-auto">
                                We couldn't generate insights for this exam at the moment. Please try again later.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};