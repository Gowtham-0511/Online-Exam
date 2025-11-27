import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
    Sparkles,
    ArrowLeft,
    Ghost,
    Target,
    Brain,
    Code,
    Layers,
    Clock,
    CheckCircle2,
    Loader2,
    Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const DreamExamBuilder = () => {
    const router = useRouter();
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedExam, setGeneratedExam] = useState<any>(null);

    // Form State
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [questionCount, setQuestionCount] = useState([10]);

    const handleGenerate = async () => {
        if (!topic) return;

        setIsGenerating(true);

        try {
            const response = await fetch('/api/attender/ghost-mode/generate-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    difficulty,
                    questionCount: questionCount[0],
                    questionType: 'mcq'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate exam');
            }

            const exam = await response.json();

            // Store in localStorage
            localStorage.setItem(`ghost_exam_${exam.examId}`, JSON.stringify(exam));

            setIsGenerating(false);
            setGeneratedExam({
                examId: exam.examId,
                title: exam.title,
                description: exam.description,
                questionCount: exam.questions.length,
                duration: exam.duration,
                difficulty: difficulty,
                type: 'mcq'
            });
        } catch (error) {
            console.error('Generation error:', error);
            setIsGenerating(false);
        }
    };

    const handleStartExam = () => {
        if (generatedExam?.examId) {
            router.push(`/exam/ghost-mode/${generatedExam.examId}`);
        }
    };

    const confirmExit = () => {
        router.push('/dashboard/attender/ghost-mode');
    };

    return (
        <>
            <Head>
                <title>Dream Exam Builder - Ghost Mode</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-semibold text-foreground">
                                        Dream Exam Builder
                                    </h1>
                                </div>
                            </div>

                            <Button
                                onClick={() => setShowExitWarning(true)}
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Exit
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Warning Banner */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 px-4 py-2">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Ghost Mode Active:</span>
                        <span>Exams created here are temporary and won't be saved.</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
                    {!generatedExam ? (
                        <div className="space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight">Design Your Perfect Exam</h2>
                                <p className="text-muted-foreground">
                                    Tell our AI what you want to practice, and we'll generate a custom exam just for you.
                                </p>
                            </div>

                            <Card className="border-border/50 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Exam Configuration</CardTitle>
                                    <CardDescription>Customize every aspect of your practice session.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Topic */}
                                    <div className="space-y-2">
                                        <Label htmlFor="topic">What do you want to learn?</Label>
                                        <div className="relative">
                                            <Brain className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="topic"
                                                placeholder="e.g., React Hooks, Python Data Structures, System Design..."
                                                className="pl-9"
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div className="space-y-2">
                                        <Label>Difficulty Level</Label>
                                        <Select value={difficulty} onValueChange={setDifficulty}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select difficulty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="easy">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        Beginner Friendly
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                        Intermediate Challenge
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="hard">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                        Expert Mode
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Question Count */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>Number of Questions</Label>
                                            <Badge variant="secondary">{questionCount[0]} Questions</Badge>
                                        </div>
                                        <Slider
                                            value={questionCount}
                                            onValueChange={setQuestionCount}
                                            max={30}
                                            min={5}
                                            step={5}
                                            className="py-4"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Quick (5)</span>
                                            <span>Standard (15)</span>
                                            <span>Marathon (30)</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        className="w-full h-12 text-lg gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
                                        onClick={handleGenerate}
                                        disabled={!topic || isGenerating}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Crafting Your Exam...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Generate Dream Exam
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    ) : (
                        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold">Exam Ready!</h2>
                                <p className="text-muted-foreground">
                                    Your custom exam has been generated successfully.
                                </p>
                            </div>

                            <Card className="border-border/50 shadow-lg overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-600" />
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl mb-1">{generatedExam.title}</CardTitle>
                                            <CardDescription>{generatedExam.description}</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="capitalize">
                                            {generatedExam.difficulty}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Layers className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-sm font-medium">{generatedExam.questionCount} Questions</p>
                                            <p className="text-xs text-muted-foreground capitalize">{generatedExam.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-sm font-medium">~{generatedExam.duration} Mins</p>
                                            <p className="text-xs text-muted-foreground">Estimated Time</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex-col gap-3">
                                    <Button className="w-full h-11 text-lg gap-2" onClick={handleStartExam}>
                                        Start Exam Now
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => setGeneratedExam(null)}>
                                        Create Another
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Exit Warning Dialog */}
                <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <Ghost className="w-6 h-6 text-destructive" />
                            </div>
                            <DialogTitle className="text-center">Exit Dream Exam?</DialogTitle>
                            <DialogDescription className="text-center">
                                Any unsaved configuration or progress will be lost.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowExitWarning(false)}
                                className="flex-1"
                            >
                                Stay Here
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmExit}
                                className="flex-1"
                            >
                                Yes, Exit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
};

export default DreamExamBuilder;
