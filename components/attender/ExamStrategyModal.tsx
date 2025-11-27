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
    Lightbulb,
    ArrowRight,
    Hourglass
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

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

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
            case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800';
            case 'Hard': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden border-border shadow-lg animate-in fade-in zoom-in-95 duration-300">
                <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/10">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
                            <Brain className="h-5 w-5" />
                        </div>
                        AI Exam Strategy
                    </DialogTitle>
                    <DialogDescription>
                        Personalized insights and tactical plan for your upcoming exam
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(85vh-8rem)]">
                    <div className="p-6">
                        {isLoading ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                                </div>
                                <Skeleton className="h-64 w-full rounded-xl" />
                                <Skeleton className="h-48 w-full rounded-xl" />
                            </div>
                        ) : strategy?.success ? (
                            <Tabs defaultValue="strategy" className="w-full space-y-6">
                                <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-xl">
                                    <TabsTrigger value="strategy" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                        <Zap className="h-4 w-4 mr-2" />
                                        Core Strategy
                                    </TabsTrigger>
                                    <TabsTrigger value="questions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                        <List className="h-4 w-4 mr-2" />
                                        Question Analysis
                                    </TabsTrigger>
                                    <TabsTrigger value="timing" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                        <Clock className="h-4 w-4 mr-2" />
                                        Time Management
                                    </TabsTrigger>
                                </TabsList>

                                {/* Strategy Tab */}
                                <TabsContent value="strategy" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                                            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                                <Timer className="h-4 w-4" />
                                                <span className="text-xs font-medium uppercase tracking-wider">Total Time</span>
                                            </div>
                                            <p className="text-2xl font-bold text-foreground">{strategy.strategy.timeManagement.totalAvailable} min</p>
                                            <p className="text-xs text-muted-foreground mt-1">Available for exam</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                                            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                                <Hourglass className="h-4 w-4" />
                                                <span className="text-xs font-medium uppercase tracking-wider">Est. Need</span>
                                            </div>
                                            <p className="text-2xl font-bold text-foreground">{strategy.strategy.timeManagement.estimatedRequired} min</p>
                                            <p className="text-xs text-muted-foreground mt-1">Based on your speed</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                                            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                                <Target className="h-4 w-4" />
                                                <span className="text-xs font-medium uppercase tracking-wider">Buffer</span>
                                            </div>
                                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{strategy.strategy.timeManagement.buffer} min</p>
                                            <p className="text-xs text-muted-foreground mt-1">Safety margin</p>
                                        </div>
                                    </div>

                                    {/* Recommendation Alert */}
                                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-100 flex items-start gap-3">
                                        <Lightbulb className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">AI Recommendation</h4>
                                            <p className="text-sm opacity-90">{strategy.strategy.timeManagement.recommendation}</p>
                                        </div>
                                    </div>

                                    {/* Phased Approach */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-amber-500" />
                                            Execution Phases
                                        </h3>
                                        <div className="relative pl-6 border-l-2 border-border space-y-8">
                                            {/* Phase 1 */}
                                            <div className="relative">
                                                <div className="absolute -left-[29px] top-0 h-4 w-4 rounded-full border-2 border-emerald-500 bg-background" />
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-foreground">{strategy.strategy.questionOrder.phase1.title}</h4>
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                                            {strategy.strategy.questionOrder.phase1.estimatedTime} min
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{strategy.strategy.questionOrder.phase1.strategy}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {strategy.strategy.questionOrder.phase1.questions.slice(0, 10).map((q: number) => (
                                                            <Badge key={q} variant="secondary" className="text-xs font-mono">Q{q}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Phase 2 */}
                                            <div className="relative">
                                                <div className="absolute -left-[29px] top-0 h-4 w-4 rounded-full border-2 border-blue-500 bg-background" />
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-foreground">{strategy.strategy.questionOrder.phase2.title}</h4>
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                                                            {strategy.strategy.questionOrder.phase2.estimatedTime} min
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{strategy.strategy.questionOrder.phase2.strategy}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {strategy.strategy.questionOrder.phase2.questions.slice(0, 10).map((q: number) => (
                                                            <Badge key={q} variant="secondary" className="text-xs font-mono">Q{q}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Phase 3 */}
                                            {strategy.strategy.questionOrder.phase3.questions.length > 0 && (
                                                <div className="relative">
                                                    <div className="absolute -left-[29px] top-0 h-4 w-4 rounded-full border-2 border-amber-500 bg-background" />
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-semibold text-foreground">{strategy.strategy.questionOrder.phase3.title}</h4>
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                                                {strategy.strategy.questionOrder.phase3.estimatedTime} min
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{strategy.strategy.questionOrder.phase3.strategy}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {strategy.strategy.questionOrder.phase3.questions.slice(0, 10).map((q: number) => (
                                                                <Badge key={q} variant="secondary" className="text-xs font-mono">Q{q}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pro Tips */}
                                    <div className="space-y-3 pt-4 border-t border-border">
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pro Tips</h3>
                                        <div className="grid gap-2">
                                            {strategy.strategy.tips.map((tip: string, idx: number) => (
                                                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                                    <p className="text-sm text-foreground">{tip}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Questions Tab */}
                                <TabsContent value="questions" className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid gap-3">
                                        {strategy.questionAnalysis.map((question: any) => (
                                            <div key={question.questionId} className="group p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center p-0 font-bold bg-muted text-foreground border-border">
                                                            {question.questionNumber}
                                                        </Badge>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">{question.topic}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getDifficultyColor(question.predictedDifficulty)}`}>
                                                                    {question.predictedDifficulty}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground">{question.marks} marks</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                                                        <Clock className="h-3 w-3" />
                                                        ~{question.estimatedTime} min
                                                    </div>
                                                </div>

                                                <div className="space-y-3 pl-11">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground">Success Probability</span>
                                                            <span className={`font-bold ${question.successProbability >= 70 ? 'text-emerald-600' : question.successProbability >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                {question.successProbability}%
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={question.successProbability}
                                                            className="h-1.5"
                                                            indicatorClassName={question.successProbability >= 70 ? 'bg-emerald-500' : question.successProbability >= 40 ? 'bg-amber-500' : 'bg-rose-500'}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded border border-border/50">
                                                        <span className="font-semibold text-foreground mr-1">Tip:</span>
                                                        {question.recommendation}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* Timing Tab */}
                                <TabsContent value="timing" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="p-6 rounded-xl border border-border bg-card">
                                        <h3 className="text-lg font-semibold mb-6">Suggested Timeline</h3>
                                        <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-6 before:w-0.5 before:bg-border">
                                            {[
                                                { time: '0-5 min', title: 'Initial Review', desc: 'Quick scan of all questions', color: 'bg-purple-500' },
                                                { time: `5-${5 + strategy.strategy.questionOrder.phase1.estimatedTime} min`, title: 'Phase 1: Quick Wins', desc: `${strategy.strategy.questionOrder.phase1.questions.length} questions`, color: 'bg-emerald-500' },
                                                { time: 'Next Block', title: 'Phase 2: Core Questions', desc: `${strategy.strategy.questionOrder.phase2.questions.length} questions`, color: 'bg-blue-500' },
                                                ...(strategy.strategy.questionOrder.phase3.questions.length > 0 ? [{ time: 'Next Block', title: 'Phase 3: Challenge', desc: `${strategy.strategy.questionOrder.phase3.questions.length} questions`, color: 'bg-amber-500' }] : []),
                                                { time: `Last ${Math.round(strategy.duration * 0.2)} min`, title: 'Final Review', desc: 'Verify answers', color: 'bg-purple-500' }
                                            ].map((item, idx) => (
                                                <div key={idx} className="relative flex gap-6 pb-8 last:pb-0 group">
                                                    <div className={`absolute left-6 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background ${item.color} z-10`} />
                                                    <div className="w-24 pt-0.5 text-xs font-medium text-muted-foreground text-right shrink-0">
                                                        {item.time}
                                                    </div>
                                                    <div className="pb-1">
                                                        <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-xl border border-border bg-card">
                                        <h3 className="text-lg font-semibold mb-4">Time Allocation</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Answering Questions</span>
                                                    <span className="font-bold">80%</span>
                                                </div>
                                                <Progress value={80} className="h-2" indicatorClassName="bg-blue-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Review & Buffer</span>
                                                    <span className="font-bold">20%</span>
                                                </div>
                                                <Progress value={20} className="h-2" indicatorClassName="bg-purple-500" />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                                    <AlertCircle className="h-8 w-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-lg">Strategy Generation Failed</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto">
                                        We couldn't generate a strategy for this exam at the moment. Please try again later.
                                    </p>
                                </div>
                                <Button variant="outline" onClick={onClose}>Close</Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                    <Button onClick={onClose}>
                        Got it, thanks!
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};