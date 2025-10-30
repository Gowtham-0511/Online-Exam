import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Brain,
    Clock,
    Target,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Zap,
    Trophy,
    List,
    Timer,
    Lightbulb
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ExamStrategyModalProps = {
    isOpen: boolean;
    onClose: () => void;
    examId: string;
    email: string;
};

export const ExamStrategyModal: React.FC<ExamStrategyModalProps> = ({
    isOpen,
    onClose,
    examId,
    email
}) => {
    const [strategy, setStrategy] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && examId && email) {
            setIsLoading(true);
            fetch('/api/attender/exam-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId, email })
            })
                .then(res => res.json())
                .then(data => {
                    setStrategy(data);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error('Failed to load strategy:', err);
                    setIsLoading(false);
                });
        }
    }, [isOpen, examId, email]);

    const getReadinessColor = (level: string) => {
        switch (level) {
            case 'Excellent': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
            case 'Good': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400';
            case 'Fair': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
            default: return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50';
            case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50';
            case 'Hard': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950/50';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Brain className="h-6 w-6 text-purple-600" />
                        AI Exam Strategy
                    </DialogTitle>
                    <DialogDescription>
                        Personalized strategy based on your performance history
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                ) : strategy?.success ? (
                    <div className="space-y-6 py-4">
                        <Tabs defaultValue="strategy" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="strategy">
                                    <Zap className="h-4 w-4 mr-2" />
                                    Strategy
                                </TabsTrigger>
                                <TabsTrigger value="questions">
                                    <List className="h-4 w-4 mr-2" />
                                    Questions
                                </TabsTrigger>
                                <TabsTrigger value="timing">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Timing
                                </TabsTrigger>
                            </TabsList>

                            {/* Strategy Tab */}
                            <TabsContent value="strategy" className="space-y-4">
                                {/* Time Management */}
                                <div className="p-4 border border-border rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Timer className="h-4 w-4 text-blue-600" />
                                        Time Management
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                                            <p className="text-lg font-bold text-foreground">
                                                {strategy.strategy.timeManagement.totalAvailable} min
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">Estimated Need</p>
                                            <p className="text-lg font-bold text-foreground">
                                                {strategy.strategy.timeManagement.estimatedRequired} min
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">Buffer Time</p>
                                            <p className="text-lg font-bold text-foreground">
                                                {strategy.strategy.timeManagement.buffer} min
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <p className="text-sm text-foreground">
                                            <strong>Recommendation:</strong> {strategy.strategy.timeManagement.recommendation}
                                        </p>
                                    </div>
                                </div>

                                {/* Question Order Strategy */}
                                <div className="p-4 border border-border rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-amber-600" />
                                        Recommended Question Order
                                    </h4>
                                    <div className="space-y-3">
                                        {/* Phase 1 */}
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-medium text-sm text-foreground">
                                                    {strategy.strategy.questionOrder.phase1.title}
                                                </h5>
                                                <Badge variant="outline" className="text-xs">
                                                    {strategy.strategy.questionOrder.phase1.estimatedTime} min
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {strategy.strategy.questionOrder.phase1.strategy}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {strategy.strategy.questionOrder.phase1.questions.slice(0, 10).map((q: number) => (
                                                    <Badge key={q} variant="outline" className="text-xs bg-emerald-100 text-emerald-700">
                                                        Q{q}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Phase 2 */}
                                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-medium text-sm text-foreground">
                                                    {strategy.strategy.questionOrder.phase2.title}
                                                </h5>
                                                <Badge variant="outline" className="text-xs">
                                                    {strategy.strategy.questionOrder.phase2.estimatedTime} min
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {strategy.strategy.questionOrder.phase2.strategy}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {strategy.strategy.questionOrder.phase2.questions.slice(0, 10).map((q: number) => (
                                                    <Badge key={q} variant="outline" className="text-xs bg-blue-100 text-blue-700">
                                                        Q{q}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Phase 3 */}
                                        {strategy.strategy.questionOrder.phase3.questions.length > 0 && (
                                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-medium text-sm text-foreground">
                                                        {strategy.strategy.questionOrder.phase3.title}
                                                    </h5>
                                                    <Badge variant="outline" className="text-xs">
                                                        {strategy.strategy.questionOrder.phase3.estimatedTime} min
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {strategy.strategy.questionOrder.phase3.strategy}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {strategy.strategy.questionOrder.phase3.questions.slice(0, 10).map((q: number) => (
                                                        <Badge key={q} variant="outline" className="text-xs bg-amber-100 text-amber-700">
                                                            Q{q}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tips */}
                                <div className="p-4 border border-border rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-amber-600" />
                                        Pro Tips
                                    </h4>
                                    <div className="space-y-2">
                                        {strategy.strategy.tips.map((tip: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                                <p className="text-sm text-foreground">{tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Questions Tab */}
                            <TabsContent value="questions" className="space-y-3">
                                <div className="max-h-96 overflow-y-auto space-y-2">
                                    {strategy.questionAnalysis.map((question: any) => (
                                        <div key={question.questionId} className="p-3 border border-border rounded-lg hover:border-primary/50 transition-all">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs font-bold">
                                                        Q{question.questionNumber}
                                                    </Badge>
                                                    <Badge variant="outline" className={`text-xs ${getDifficultyColor(question.predictedDifficulty)}`}>
                                                        {question.predictedDifficulty}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {question.marks} marks
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    ~{question.estimatedTime} min
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Topic: {question.topic}</span>
                                                    <span className="font-medium text-foreground">
                                                        Success Probability: {question.successProbability}%
                                                    </span>
                                                </div>
                                                <Progress value={question.successProbability} className="h-1.5" />
                                                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-foreground">
                                                    <strong>Strategy:</strong> {question.recommendation}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* Timing Tab */}
                            <TabsContent value="timing" className="space-y-4">
                                <div className="p-4 border border-border rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-4">Suggested Timeline</h4>
                                    <div className="space-y-3">
                                        {/* Initial Review */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 text-sm font-medium text-foreground">0-5 min</div>
                                            <div className="flex-1 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                                <p className="text-sm text-foreground">Quick scan of all questions</p>
                                            </div>
                                        </div>

                                        {/* Phase 1 */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 text-sm font-medium text-foreground">
                                                5-{5 + strategy.strategy.questionOrder.phase1.estimatedTime} min
                                            </div>
                                            <div className="flex-1 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                                                <p className="text-sm text-foreground">
                                                    Quick wins ({strategy.strategy.questionOrder.phase1.questions.length} questions)
                                                </p>
                                            </div>
                                        </div>

                                        {/* Phase 2 */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 text-sm font-medium text-foreground">
                                                Next {strategy.strategy.questionOrder.phase2.estimatedTime} min
                                            </div>
                                            <div className="flex-1 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                                <p className="text-sm text-foreground">
                                                    Core questions ({strategy.strategy.questionOrder.phase2.questions.length} questions)
                                                </p>
                                            </div>
                                        </div>

                                        {/* Phase 3 */}
                                        {strategy.strategy.questionOrder.phase3.questions.length > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 text-sm font-medium text-foreground">
                                                    Next {strategy.strategy.questionOrder.phase3.estimatedTime} min
                                                </div>
                                                <div className="flex-1 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                                    <p className="text-sm text-foreground">
                                                        Challenging questions ({strategy.strategy.questionOrder.phase3.questions.length} questions)
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Review Time */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 text-sm font-medium text-foreground">
                                                Last {Math.round(strategy.duration * 0.2)} min
                                            </div>
                                            <div className="flex-1 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                                <p className="text-sm text-foreground">Review and finalize answers</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Time Allocation Chart */}
                                <div className="p-4 border border-border rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-3">Time Allocation</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 text-sm text-muted-foreground">Answering</div>
                                            <div className="flex-1">
                                                <Progress value={80} className="h-6" />
                                            </div>
                                            <span className="text-sm font-medium w-16 text-right">80%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 text-sm text-muted-foreground">Review</div>
                                            <div className="flex-1">
                                                <Progress value={20} className="h-6" />
                                            </div>
                                            <span className="text-sm font-medium w-16 text-right">20%</span>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Action Button */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Unable to generate exam strategy</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};