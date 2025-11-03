import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import * as Icons from 'lucide-react';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PracticeQuestionPage = () => {
    const router = useRouter();
    const { questionId } = router.query;
    const { data: session, status } = useSession();

    const [code, setCode] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('problem');
    const [showHints, setShowHints] = useState(false);
    const [visibleHintCount, setVisibleHintCount] = useState(0);
    const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');

    const { data: questionData, isLoading } = useSWR(
        questionId && session?.user?.email
            ? `/api/practice/get-questions?email=${encodeURIComponent(session.user.email)}&limit=100`
            : null,
        fetcher
    );

    const question = questionData?.questions?.find((q: any) => q.id === parseInt(questionId as string));

    React.useEffect(() => {
        if (question) {
            setCode(question.starterCode);
        }
    }, [question]);

    if (status === 'loading' || isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Icons.Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session?.user?.email || !question) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Icons.AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Question not found</h3>
                    <Button onClick={() => router.push('/dashboard/attender/practice')}>
                        <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Practice
                    </Button>
                </div>
            </div>
        );
    }

    const handleRunCode = async () => {
        setIsRunning(true);
        setExecutionResult(null);

        try {
            const response = await fetch('/api/practice/execute-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language: question.language,
                    testCases: question.testCases
                })
            });

            const result = await response.json();
            setExecutionResult(result);
            setActiveTab('testcases');
        } catch (error) {
            console.error('Execution error:', error);
            setExecutionResult({
                success: false,
                error: 'Failed to execute code'
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (!executionResult) {
            alert('Please run your code first!');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/practice/submit-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    practiceQuestionId: question.id,
                    email: session.user.email,
                    userName: session.user.name,
                    submittedCode: code,
                    language: question.language,
                    executionResult
                })
            });

            const result = await response.json();

            if (response.ok) {
                setActiveTab('testcases');
                setTimeout(() => {
                    if (result.isPassed) {
                        router.push('/dashboard/attender/practice');
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setCode(question.starterCode);
        setExecutionResult(null);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400';
            case 'hard': return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboard/attender/practice')}
                            className="gap-2"
                        >
                            <Icons.ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-semibold">{question.questionTitle}</h1>
                            <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <Icons.Code2 className="h-3 w-3" />
                                {question.language}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {question.bestScore !== null && (
                            <Badge variant="outline" className="gap-1 border-primary text-primary">
                                <Icons.Trophy className="h-3 w-3" />
                                Best: {question.bestScore.toFixed(0)}%
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
                        >
                            {theme === 'vs-dark' ? (
                                <Icons.Sun className="h-4 w-4" />
                            ) : (
                                <Icons.Moon className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Left Panel - Problem Description */}
                    <ResizablePanel defaultSize={40} minSize={30}>
                        <div className="h-full flex flex-col bg-card">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                <div className="border-b px-4 flex-shrink-0">
                                    <TabsList className="h-12 bg-transparent">
                                        <TabsTrigger value="problem" className="gap-2">
                                            <Icons.FileText className="h-4 w-4" />
                                            Problem
                                        </TabsTrigger>
                                        <TabsTrigger value="testcases" className="gap-2">
                                            <Icons.FlaskConical className="h-4 w-4" />
                                            Test Cases
                                            {executionResult && (
                                                executionResult.success ? (
                                                    <Icons.CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                ) : (
                                                    <Icons.XCircle className="h-3 w-3 text-rose-500" />
                                                )
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="hints" className="gap-2">
                                            <Icons.Lightbulb className="h-4 w-4" />
                                            Hints ({visibleHintCount}/{question.hints.length})
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Problem Tab */}
                                <TabsContent value="problem" className="mt-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-full">
                                        <div className="p-6 space-y-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Badge variant="outline" className="gap-1">
                                                        <Icons.Tag className="h-3 w-3" />
                                                        {question.topic}
                                                    </Badge>
                                                </div>
                                                <div
                                                    className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto"
                                                    dangerouslySetInnerHTML={{ __html: question.questionDescription }}
                                                />
                                            </div>

                                            {question.weakArea && (
                                                <Alert className="border-primary/50 bg-primary/5">
                                                    <Icons.Target className="h-4 w-4" />
                                                    <AlertDescription>
                                                        <strong>Focus Area:</strong> {question.weakArea}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* Test Cases Tab */}
                                <TabsContent value="testcases" className="mt-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-full">
                                        <div className="p-6 space-y-4">
                                            {executionResult ? (
                                                <>
                                                    <Alert className={executionResult.success ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-rose-500 bg-rose-50 dark:bg-rose-950/20'}>
                                                        {executionResult.success ? (
                                                            <Icons.CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                        ) : (
                                                            <Icons.XCircle className="h-4 w-4 text-rose-600" />
                                                        )}
                                                        <AlertDescription>
                                                            <div className="font-semibold mb-1">
                                                                {executionResult.success ? 'All test cases passed! 🎉' : 'Some test cases failed'}
                                                            </div>
                                                            <div className="text-sm">
                                                                Passed: {executionResult.testCasesPassed}/{executionResult.totalTestCases}
                                                            </div>
                                                            {executionResult.executionTime && (
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    Runtime: {executionResult.executionTime}ms
                                                                </div>
                                                            )}
                                                        </AlertDescription>
                                                    </Alert>

                                                    {executionResult.testResults?.map((result: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className={`rounded-lg border-2 p-4 ${result.passed
                                                                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                                                                : 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="font-semibold text-sm">Test Case {idx + 1}</span>
                                                                <Badge variant={result.passed ? 'default' : 'destructive'} className="gap-1">
                                                                    {result.passed ? (
                                                                        <>
                                                                            <Icons.Check className="h-3 w-3" />
                                                                            Passed
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Icons.X className="h-3 w-3" />
                                                                            Failed
                                                                        </>
                                                                    )}
                                                                </Badge>
                                                            </div>

                                                            {!result.testCase.isHidden && (
                                                                <div className="space-y-2 text-xs">
                                                                    <div>
                                                                        <p className="font-semibold text-muted-foreground mb-1">Input:</p>
                                                                        <pre className="bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-w-full">
                                                                            {result.testCase.input}
                                                                        </pre>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-muted-foreground mb-1">Expected Output:</p>
                                                                        <pre className="bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-w-full">
                                                                            {result.testCase.expectedOutput}
                                                                        </pre>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-muted-foreground mb-1">Your Output:</p>
                                                                        <pre className={`border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-w-full ${result.passed ? 'bg-background' : 'bg-rose-50 dark:bg-rose-950/20'
                                                                            }`}>
                                                                            {result.actualOutput || '(empty)'}
                                                                        </pre>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {result.error && (
                                                                <div className="mt-2">
                                                                    <p className="text-xs font-semibold text-rose-600 mb-1">Error:</p>
                                                                    <pre className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-w-full">
                                                                        {result.error}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <Icons.FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                                    <p className="text-muted-foreground">Run your code to see test results</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* Hints Tab */}
                                <TabsContent value="hints" className="mt-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-full">
                                        <div className="p-6 space-y-4">
                                            {visibleHintCount === 0 ? (
                                                <div className="text-center py-12">
                                                    <Icons.Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                                    <p className="text-muted-foreground mb-4">Need help? Reveal a hint</p>
                                                    <Button onClick={() => setVisibleHintCount(1)} variant="outline" className="gap-2">
                                                        <Icons.Eye className="h-4 w-4" />
                                                        Show First Hint
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    {question.hints.slice(0, visibleHintCount).map((hint: string, idx: number) => (
                                                        <Alert key={idx} className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                                                            <Icons.Lightbulb className="h-4 w-4 text-amber-600" />
                                                            <AlertDescription>
                                                                <strong>Hint {idx + 1}:</strong> {hint}
                                                            </AlertDescription>
                                                        </Alert>
                                                    ))}
                                                    {visibleHintCount < question.hints.length && (
                                                        <Button
                                                            onClick={() => setVisibleHintCount(visibleHintCount + 1)}
                                                            variant="outline"
                                                            className="w-full gap-2"
                                                        >
                                                            <Icons.Eye className="h-4 w-4" />
                                                            Show Next Hint ({visibleHintCount + 1}/{question.hints.length})
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel - Code Editor */}
                    <ResizablePanel defaultSize={60} minSize={40}>
                        <div className="h-full flex flex-col">
                            {/* Editor Header */}
                            <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icons.Code2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Code Editor</span>
                                    <Badge variant="outline" className="text-xs">{question.language}</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="gap-2 text-xs"
                                >
                                    <Icons.RotateCcw className="h-3 w-3" />
                                    Reset
                                </Button>
                            </div>

                            {/* Monaco Editor */}
                            <div className="flex-1">
                                <Editor
                                    height="100%"
                                    language={question.language.toLowerCase()}
                                    value={code}
                                    onChange={(value) => setCode(value || '')}
                                    theme={theme}
                                    options={{
                                        minimap: { enabled: true },
                                        fontSize: 14,
                                        lineNumbers: 'on',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        tabSize: 4,
                                        wordWrap: 'on',
                                        formatOnPaste: true,
                                        formatOnType: true,
                                        suggestOnTriggerCharacters: true,
                                        quickSuggestions: true,
                                    }}
                                />
                            </div>

                            {/* Action Bar */}
                            <div className="border-t bg-card p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={handleRunCode}
                                            disabled={isRunning}
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            {isRunning ? (
                                                <>
                                                    <Icons.Loader2 className="h-4 w-4 animate-spin" />
                                                    Running...
                                                </>
                                            ) : (
                                                <>
                                                    <Icons.Play className="h-4 w-4" />
                                                    Run Code
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !executionResult}
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Icons.Send className="h-4 w-4" />
                                                Submit
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default PracticeQuestionPage;