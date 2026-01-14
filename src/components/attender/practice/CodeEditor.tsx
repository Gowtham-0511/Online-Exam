import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as Icons from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';

interface CodeEditorProps {
    questionId: number;
    questionTitle: string;
    questionDescription: string;
    language: string;
    starterCode: string;
    testCases: Array<{
        input: string;
        expectedOutput: string;
        isHidden: boolean;
    }>;
    hints: string[];
    email: string;
    userName: string;
    onSubmitSuccess?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
    questionId,
    questionTitle,
    questionDescription,
    language,
    starterCode,
    testCases,
    hints,
    email,
    userName,
    onSubmitSuccess
}) => {
    const [code, setCode] = useState(starterCode);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [showHints, setShowHints] = useState(false);
    const [visibleHintCount, setVisibleHintCount] = useState(0);
    const [activeTab, setActiveTab] = useState('description');

    const editorRef = useRef<any>(null);

    const getLanguageMode = (lang: string) => {
        switch (lang.toLowerCase()) {
            case 'python': return 'python';
            case 'javascript':
            case 'js': return 'javascript';
            case 'sql': return 'sql';
            case 'react': return 'javascript';
            default: return 'plaintext';
        }
    };

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        // Set theme
        monaco.editor.defineTheme('customDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1e1e1e',
            }
        });
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setExecutionResult(null);

        try {
            const response = await fetch('/api/practice/execute-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language,
                    testCases
                })
            });

            const result = await response.json();
            setExecutionResult(result);
            setActiveTab('results');
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
            toast.error('Please run your code first before submitting!');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/practice/submit-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    practiceQuestionId: questionId,
                    email,
                    userName,
                    submittedCode: code,
                    language,
                    executionResult
                })
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(`Submission successful! Score: ${result.score.toFixed(0)}%`);
                if (onSubmitSuccess) {
                    onSubmitSuccess();
                }
            } else {
                toast.error(result.error || 'Failed to submit');
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Failed to submit answer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShowHint = () => {
        if (visibleHintCount < hints.length) {
            setVisibleHintCount(visibleHintCount + 1);
            setShowHints(true);
            setActiveTab('hints');
        }
    };

    const handleReset = () => {
        setCode(starterCode);
        setExecutionResult(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
            {/* Left Panel - Question & Info */}
            <Card className="flex flex-col overflow-hidden">
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Icons.FileText className="h-5 w-5 text-primary" />
                        {questionTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                        <TabsList className="w-full justify-start rounded-none border-b px-4">
                            <TabsTrigger value="description">Description</TabsTrigger>
                            <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                            <TabsTrigger value="hints">
                                Hints ({visibleHintCount}/{hints.length})
                            </TabsTrigger>
                            {executionResult && (
                                <TabsTrigger value="results">
                                    Results
                                    {executionResult.success ? (
                                        <Icons.CheckCircle2 className="ml-2 h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <Icons.XCircle className="ml-2 h-4 w-4 text-rose-500" />
                                    )}
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* Description Tab */}
                        <TabsContent value="description" className="p-6 space-y-4">
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: questionDescription }}
                            />
                        </TabsContent>

                        {/* Test Cases Tab */}
                        <TabsContent value="testcases" className="p-6 space-y-4">
                            {testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                                <Card key={idx}>
                                    <CardContent className="p-4">
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                    Input:
                                                </p>
                                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                    {tc.input}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                    Expected Output:
                                                </p>
                                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                    {tc.expectedOutput}
                                                </pre>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            <Alert>
                                <Icons.Info className="h-4 w-4" />
                                <AlertDescription>
                                    Your code will also be tested against hidden test cases.
                                </AlertDescription>
                            </Alert>
                        </TabsContent>

                        {/* Hints Tab */}
                        <TabsContent value="hints" className="p-6 space-y-4">
                            {visibleHintCount === 0 ? (
                                <div className="text-center py-8">
                                    <Icons.Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                    <p className="text-muted-foreground mb-4">
                                        Need help? Click below to reveal a hint.
                                    </p>
                                    <Button onClick={handleShowHint} variant="outline">
                                        <Icons.Eye className="mr-2 h-4 w-4" />
                                        Show First Hint
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {hints.slice(0, visibleHintCount).map((hint, idx) => (
                                        <Alert key={idx}>
                                            <Icons.Lightbulb className="h-4 w-4" />
                                            <AlertDescription>
                                                <strong>Hint {idx + 1}:</strong> {hint}
                                            </AlertDescription>
                                        </Alert>
                                    ))}
                                    {visibleHintCount < hints.length && (
                                        <Button
                                            onClick={handleShowHint}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            <Icons.Eye className="mr-2 h-4 w-4" />
                                            Show Next Hint ({visibleHintCount + 1}/{hints.length})
                                        </Button>
                                    )}
                                </>
                            )}
                        </TabsContent>

                        {/* Results Tab */}
                        {executionResult && (
                            <TabsContent value="results" className="p-6 space-y-4">
                                <Alert className={executionResult.success ? 'border-emerald-500' : 'border-rose-500'}>
                                    {executionResult.success ? (
                                        <Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <Icons.XCircle className="h-4 w-4 text-rose-500" />
                                    )}
                                    <AlertDescription>
                                        <strong>
                                            {executionResult.success
                                                ? 'All test cases passed!'
                                                : 'Some test cases failed'}
                                        </strong>
                                        <div className="mt-2">
                                            Passed: {executionResult.testCasesPassed}/{executionResult.totalTestCases}
                                        </div>
                                        {executionResult.executionTime && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Execution time: {executionResult.executionTime}ms
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>

                                {/* Individual Test Results */}
                                <div className="space-y-3">
                                    {executionResult.testResults?.map((result: any, idx: number) => (
                                        <Card key={idx} className={result.passed ? 'border-emerald-500/50' : 'border-rose-500/50'}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold">
                                                        Test Case {idx + 1}
                                                    </span>
                                                    <Badge variant={result.passed ? 'default' : 'destructive'}>
                                                        {result.passed ? 'Passed' : 'Failed'}
                                                    </Badge>
                                                </div>

                                                {!result.testCase.isHidden && (
                                                    <>
                                                        <div className="space-y-2 text-xs">
                                                            <div>
                                                                <p className="font-semibold text-muted-foreground">Input:</p>
                                                                <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto text-xs">
                                                                    {result.testCase.input}
                                                                </pre>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-muted-foreground">Expected:</p>
                                                                <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto text-xs">
                                                                    {result.testCase.expectedOutput}
                                                                </pre>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-muted-foreground">Your Output:</p>
                                                                <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto text-xs">
                                                                    {result.actualOutput}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {result.error && (
                                                    <div className="mt-2">
                                                        <p className="text-xs font-semibold text-rose-600">Error:</p>
                                                        <pre className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2 rounded mt-1 overflow-x-auto">
                                                            {result.error}
                                                        </pre>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </CardContent>
            </Card>

            {/* Right Panel - Code Editor */}
            <Card className="flex flex-col overflow-hidden">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icons.Code2 className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Code Editor</span>
                            <Badge variant="outline">{language}</Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="gap-2"
                        >
                            <Icons.RotateCcw className="h-4 w-4" />
                            Reset
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <Editor
                        height="100%"
                        language={getLanguageMode(language)}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        onMount={handleEditorDidMount}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 4,
                            wordWrap: 'on',
                        }}
                    />
                </CardContent>
                <div className="border-t p-4 bg-muted/30">
                    <div className="flex gap-2">
                        <Button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className="flex-1 gap-2"
                            variant="outline"
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
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !executionResult}
                            className="flex-1 gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Icons.Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Icons.Send className="h-4 w-4" />
                                    Submit Solution
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};