import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Play, CheckCircle, XCircle, Loader2,
    Lightbulb, Code2, ListChecks, AlertCircle,
    ChevronRight, Terminal, Clock, RotateCcw,
    Check, X, Info, Sparkles
} from 'lucide-react';

interface Question {
    questionText: string;
    language: string;
    testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
    starterCode?: string;
    hints?: string[];
    difficulty?: string;
    topic?: string;
    totalMarks?: number;
}

interface Props {
    question: Question;
    onClose: () => void;
}

export default function CodePlayground({ question, onClose }: Props) {
    const [code, setCode] = useState(question.starterCode || '');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('description');
    const [showHints, setShowHints] = useState<{ [key: number]: boolean }>({});

    const runCode = async () => {
        setIsRunning(true);
        setOutput('');
        setTestResults([]);
        setActiveTab('testcases');

        try {
            const response = await fetch('/api/code/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language: question.language,
                    testCases: question.testCases.filter(tc => !tc.isHidden)
                })
            });

            const result = await response.json();

            if (result.success) {
                setTestResults(result.results);
                const passed = result.results.filter((r: any) => r.passed).length;
                const allPassed = passed === result.results.length;
                setOutput(allPassed
                    ? `✓ All ${result.results.length} test cases passed!`
                    : `${passed}/${result.results.length} test cases passed`
                );
            } else {
                setOutput(`Error: ${result.error}`);
            }
        } catch (error: any) {
            setOutput(`Error: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const resetCode = () => {
        setCode(question.starterCode || '');
        setOutput('');
        setTestResults([]);
    };

    const toggleHint = (index: number) => {
        setShowHints(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
            case 'hard': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    const passedCount = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;
    const allTestsPassed = totalTests > 0 && passedCount === totalTests;

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4">
            {/* Left Panel - Problem Description */}
            <div className="lg:w-1/2 flex flex-col min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                        <TabsTrigger value="description" className="data-[state=active]:bg-background">
                            <Code2 className="w-4 h-4 mr-2" />
                            Description
                        </TabsTrigger>
                        <TabsTrigger value="testcases" className="data-[state=active]:bg-background">
                            <ListChecks className="w-4 h-4 mr-2" />
                            Test Cases
                            {totalTests > 0 && (
                                <Badge variant={allTestsPassed ? "default" : "secondary"} className="ml-2 h-5 px-1.5">
                                    {passedCount}/{totalTests}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="hints" className="data-[state=active]:bg-background">
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Hints
                        </TabsTrigger>
                    </TabsList>

                    {/* Description Tab */}
                    <TabsContent value="description" className="flex-1 overflow-auto mt-4 space-y-4">
                        {/* Problem Header */}
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="text-xl font-bold text-foreground leading-tight flex-1">
                                    {question.questionText}
                                </h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {question.difficulty && (
                                    <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                                        {question.difficulty}
                                    </Badge>
                                )}
                                <Badge variant="secondary" className="font-mono">
                                    {question.language}
                                </Badge>
                                {question.topic && (
                                    <Badge variant="outline">
                                        {question.topic}
                                    </Badge>
                                )}
                                {question.totalMarks && (
                                    <Badge variant="outline" className="border-primary/30">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        {question.totalMarks} points
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Problem Statement */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-primary" />
                                    Problem Statement
                                </h3>
                                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-lg border border-border">
                                    {question.questionText}
                                </div>
                            </div>

                            {/* Example Test Cases */}
                            {question.testCases && question.testCases.filter(tc => !tc.isHidden).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-primary" />
                                        Example Test Cases
                                    </h3>
                                    <div className="space-y-3">
                                        {question.testCases.filter(tc => !tc.isHidden).slice(0, 2).map((tc, idx) => (
                                            <Card key={idx} className="border-border bg-card">
                                                <CardContent className="p-4 space-y-3">
                                                    <div>
                                                        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                                            <ChevronRight className="w-3 h-3" />
                                                            Input:
                                                        </div>
                                                        <code className="block text-sm font-mono bg-muted p-2 rounded border border-border text-foreground">
                                                            {tc.input}
                                                        </code>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                                            <ChevronRight className="w-3 h-3" />
                                                            Expected Output:
                                                        </div>
                                                        <code className="block text-sm font-mono bg-muted p-2 rounded border border-border text-foreground">
                                                            {tc.expectedOutput}
                                                        </code>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Test Cases Tab */}
                    <TabsContent value="testcases" className="flex-1 overflow-auto mt-4">
                        {testResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <ListChecks className="w-16 h-16 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    No Results Yet
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Run your code to see test results
                                </p>
                                <Button onClick={runCode} disabled={isRunning} size="sm">
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Run Code
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Results Summary */}
                                <Card className={`border-2 ${allTestsPassed ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            {allTestsPassed ? (
                                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="font-semibold text-foreground">
                                                    {output}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {allTestsPassed ? 'Great job! All test cases passed.' : 'Some test cases failed. Review your code.'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Individual Test Results */}
                                <div className="space-y-3">
                                    {testResults.map((result, idx) => (
                                        <Card key={idx} className={`border ${result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        {result.passed ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                        )}
                                                        <span className="font-semibold text-sm text-foreground">
                                                            Test Case {idx + 1}
                                                        </span>
                                                    </div>
                                                    <Badge variant={result.passed ? "default" : "destructive"} className="text-xs">
                                                        {result.passed ? 'Passed' : 'Failed'}
                                                    </Badge>
                                                </div>

                                                {!result.passed && (
                                                    <div className="space-y-2 text-sm">
                                                        <div>
                                                            <div className="text-xs text-muted-foreground mb-1">Expected:</div>
                                                            <code className="block font-mono bg-muted p-2 rounded text-foreground">
                                                                {result.expected || 'N/A'}
                                                            </code>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted-foreground mb-1">Got:</div>
                                                            <code className="block font-mono bg-muted p-2 rounded text-foreground">
                                                                {result.actual || 'N/A'}
                                                            </code>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Hints Tab */}
                    <TabsContent value="hints" className="flex-1 overflow-auto mt-4">
                        {question.hints && question.hints.length > 0 ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground">
                                        Click on a hint to reveal it. Try solving without hints first!
                                    </p>
                                </div>

                                {question.hints.map((hint, idx) => (
                                    <Card key={idx} className="border-border">
                                        <CardContent className="p-0">
                                            <button
                                                onClick={() => toggleHint(idx)}
                                                className="w-full p-4 text-left hover:bg-muted/30 transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-medium text-foreground">
                                                        Hint {idx + 1}
                                                    </span>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showHints[idx] ? 'rotate-90' : ''}`} />
                                            </button>

                                            {showHints[idx] && (
                                                <>
                                                    <Separator />
                                                    <div className="p-4 bg-muted/30">
                                                        <p className="text-sm text-foreground/90 leading-relaxed">
                                                            {hint}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <Lightbulb className="w-16 h-16 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    No Hints Available
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Try solving this problem on your own!
                                </p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right Panel - Code Editor */}
            <div className="lg:w-1/2 flex flex-col min-h-0">
                <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
                    {/* Editor Header */}
                    <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">Code Editor</span>
                            <Badge variant="secondary" className="text-xs font-mono">
                                {question.language}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetCode}
                                className="text-xs"
                                disabled={isRunning}
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                            </Button>
                        </div>
                    </div>

                    {/* Code Textarea */}
                    <div className="flex-1 overflow-hidden">
                        <Textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-full font-mono text-sm resize-none border-0 focus-visible:ring-0 rounded-none bg-background"
                            placeholder={`// Write your ${question.language} code here...\n\n`}
                            disabled={isRunning}
                        />
                    </div>

                    {/* Editor Footer - Action Buttons */}
                    <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Auto-save enabled</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={runCode}
                                disabled={isRunning || !code.trim()}
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Run Code
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                onClick={runCode}
                                disabled={isRunning || !code.trim()}
                                className="bg-primary hover:bg-primary/90"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Submit
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Console Output (Optional - shown below editor on mobile) */}
                {output && (
                    <Card className="mt-4 border-border lg:hidden">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Terminal className="w-4 h-4" />
                                Console Output
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-sm font-medium ${allTestsPassed ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                                {output}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}