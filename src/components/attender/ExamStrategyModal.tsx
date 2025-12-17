import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Brain,
    Clock,
    Target,
    Zap,
    Trophy,
    List,
    Timer,
    Lightbulb,
    Hourglass,
    AlertCircle,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

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
            case 'Easy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'Medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'Hard': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-xl sm:rounded-2xl">

                {/* Header */}
                <DialogHeader className="p-4 border-b border-border/40 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent opacity-50" />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg ring-1 ring-purple-500/20 shadow-sm backdrop-blur-sm">
                            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold tracking-tight">AI Strategy Insight</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Personalized attack plan generated for you
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-8rem)] bg-background/40">
                    <div className="p-4 pb-20"> {/* Added pb-20 just in case to safely scroll all content */}
                        {isLoading ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                                </div>
                                <Skeleton className="h-48 w-full rounded-xl" />
                                <Skeleton className="h-32 w-full rounded-xl" />
                            </div>
                        ) : strategy?.success ? (
                            <Tabs defaultValue="strategy" className="w-full space-y-4">
                                <TabsList className="w-full justify-start h-9 p-1 bg-muted/40 backdrop-blur-sm rounded-lg border border-border/40">
                                    {[
                                        { value: 'strategy', label: 'Overview', icon: Zap },
                                        { value: 'questions', label: 'Analysis', icon: List },
                                        { value: 'timing', label: 'Timing', icon: Clock }
                                    ].map(tab => (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className="flex-1 text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all font-medium"
                                        >
                                            <tab.icon className="h-3.5 w-3.5 mr-2" />
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Strategy Tab */}
                                <TabsContent value="strategy" className="space-y-4 animate-in slide-in-from-right-4 duration-300">

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <MetricCard
                                            icon={Timer}
                                            label="Budget"
                                            value={`${strategy.strategy.timeManagement.totalAvailable}m`}
                                            subtext="Total"
                                            color="text-blue-500"
                                            bg="bg-blue-500/10"
                                        />
                                        <MetricCard
                                            icon={Hourglass}
                                            label="Required"
                                            value={`${strategy.strategy.timeManagement.estimatedRequired}m`}
                                            subtext="Est. pace"
                                            color="text-amber-500"
                                            bg="bg-amber-500/10"
                                        />
                                        <MetricCard
                                            icon={Target}
                                            label="Buffer"
                                            value={`${strategy.strategy.timeManagement.buffer}m`}
                                            subtext="Review"
                                            color="text-emerald-500"
                                            bg="bg-emerald-500/10"
                                        />
                                    </div>

                                    {/* AI Insight Alert */}
                                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 flex items-start gap-3">
                                        <div className="p-1.5 bg-background rounded-full shadow-sm shrink-0">
                                            <Lightbulb className="h-4 w-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-xs mb-0.5 text-foreground">AI Recommendation</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {strategy.strategy.timeManagement.recommendation}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Phased Approach */}
                                    <Card className="border-border/50 bg-card/60 overflow-hidden">
                                        <CardContent className="p-4 space-y-4">
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <Trophy className="h-3.5 w-3.5" /> Execution Plan
                                            </h3>

                                            <div className="space-y-4 relative pl-3 border-l-2 border-border/50">
                                                {[
                                                    { phase: strategy.strategy.questionOrder.phase1, color: 'emerald' },
                                                    { phase: strategy.strategy.questionOrder.phase2, color: 'blue' },
                                                    ...(strategy.strategy.questionOrder.phase3.questions.length > 0 ? [{ phase: strategy.strategy.questionOrder.phase3, color: 'amber' }] : [])
                                                ].map((item, idx) => (
                                                    <div key={idx} className="relative pl-5">
                                                        <div className={`absolute -left-[19px] top-1 h-3 w-3 rounded-full border-2 border-background bg-${item.color}-500 shadow-sm`} />
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-semibold text-sm text-foreground">{item.phase.title}</h4>
                                                                <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5">
                                                                    ~{item.phase.estimatedTime}m
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-snug">{item.phase.strategy}</p>
                                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                                {item.phase.questions.slice(0, 8).map((q: number) => (
                                                                    <Badge key={q} variant="outline" className="bg-background/50 text-[10px] h-5 px-1.5 font-mono">Q{q}</Badge>
                                                                ))}
                                                                {item.phase.questions.length > 8 && (
                                                                    <Badge className="text-[10px] h-5 px-1.5 text-muted-foreground">+{item.phase.questions.length - 8}</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Pro Tips */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {strategy.strategy.tips.map((tip: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0" />
                                                <p className="text-xs text-muted-foreground font-medium leading-snug">{tip}</p>
                                            </div>
                                        ))}
                                    </div>

                                </TabsContent>

                                {/* Questions Tab */}
                                <TabsContent value="questions" className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid gap-3">
                                        {strategy.questionAnalysis.map((question: any) => (
                                            <div key={question.questionId} className="group p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 hover:border-border transition-all duration-300">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center font-bold text-sm text-foreground">
                                                            {question.questionNumber}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-foreground">{question.topic}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-transparent h-5", getDifficultyColor(question.predictedDifficulty))}>
                                                                    {question.predictedDifficulty}
                                                                </Badge>
                                                                <span className="w-0.5 h-0.5 rounded-full bg-border" />
                                                                <span className="text-[10px] text-muted-foreground">{question.marks} marks</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="gap-1 pl-1.5 text-[10px] h-6">
                                                        <Clock className="h-3 w-3 opacity-70" />
                                                        {question.estimatedTime}m
                                                    </Badge>
                                                </div>

                                                <div className="pl-11 space-y-3">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-[10px] font-medium">
                                                            <span className="text-muted-foreground">Success Prob.</span>
                                                            <span className={cn(
                                                                question.successProbability >= 70 ? 'text-emerald-500' :
                                                                    question.successProbability >= 40 ? 'text-amber-500' : 'text-rose-500'
                                                            )}>
                                                                {question.successProbability}%
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={question.successProbability}
                                                            className="h-1.5 bg-muted"
                                                            indicatorClassName={cn(
                                                                "transition-all",
                                                                question.successProbability >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                                                    question.successProbability >= 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                                                        'bg-gradient-to-r from-rose-500 to-rose-400'
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="flex gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                                                        <Zap className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                                                        <p className="text-muted-foreground leading-snug">
                                                            <span className="font-semibold text-foreground mr-1">AI Tip:</span>
                                                            {question.recommendation}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* Timing Tab */}
                                <TabsContent value="timing" className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Timeline */}
                                        <Card className="border-border/50 bg-card/60">
                                            <CardContent className="p-4">
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Suggested Timeline</h3>
                                                <div className="space-y-6 relative pl-1.5">
                                                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border/50" />
                                                    {[
                                                        { time: '0-5m', title: 'Initial Scan', desc: 'Read all questions, mark easy ones', color: 'bg-purple-500' },
                                                        { time: `5-${5 + strategy.strategy.questionOrder.phase1.estimatedTime}m`, title: 'Quick Wins', desc: 'Solve high-confidence questions', color: 'bg-emerald-500' },
                                                        { time: 'Mid Exam', title: 'Deep Work', desc: 'Focus on core complex problems', color: 'bg-blue-500' },
                                                        { time: 'Last 15m', title: 'Final Review', desc: 'Check edge cases & submit', color: 'bg-amber-500' }
                                                    ].map((step, idx) => (
                                                        <div key={idx} className="relative flex gap-3 pl-5 group">
                                                            <div className={cn("absolute left-0 top-1 w-5 h-5 rounded-full border-4 border-background z-10", step.color)} />
                                                            <div>
                                                                <Badge variant="secondary" className="mb-0.5 text-[10px] h-5">{step.time}</Badge>
                                                                <h4 className="font-bold text-xs text-foreground">{step.title}</h4>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Allocation Chart */}
                                        <div className="space-y-4">
                                            <Card className="border-border/50 bg-card/60">
                                                <CardContent className="p-4">
                                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Effort Distribution</h3>
                                                    <div className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between text-xs font-medium">
                                                                <span className="text-muted-foreground">Execution</span>
                                                                <span className="text-blue-500">80%</span>
                                                            </div>
                                                            <Progress value={80} className="h-1.5 bg-muted" indicatorClassName="bg-blue-500" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between text-xs font-medium">
                                                                <span className="text-muted-foreground">Review & Buffer</span>
                                                                <span className="text-purple-500">20%</span>
                                                            </div>
                                                            <Progress value={20} className="h-1.5 bg-muted" indicatorClassName="bg-purple-500" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-2.5">
                                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-semibold text-xs text-amber-600 dark:text-amber-500">Pacing Alert</h4>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">If stuck on a hard question for 5 mins, mark it for review and move on.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                <div className="p-3 rounded-full bg-muted text-muted-foreground/50">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-sm">Strategy Unavailable</h3>
                                    <p className="text-muted-foreground text-xs max-w-xs mx-auto">
                                        We couldn't generate a personalized plan at this moment.
                                    </p>
                                </div>
                                <Button variant="outline" onClick={onClose} size="sm" className="h-8 text-xs">Close</Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end gap-3 backdrop-blur-md absolute bottom-0 left-0 right-0 z-50">
                    <Button variant="ghost" onClick={onClose} className="h-9 text-xs">Close</Button>
                    <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 h-9 text-xs">
                        I'm Ready <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Helper Components
const MetricCard = ({ icon: Icon, label, value, subtext, color, bg }: any) => (
    <div className="p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:shadow-md transition-all duration-300 group">
        <div className="flex items-center gap-2 mb-2">
            <div className={cn("p-1.5 rounded-lg transition-colors", bg, color)}>
                <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground group-hover:scale-105 transition-transform origin-left">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>
    </div>
);