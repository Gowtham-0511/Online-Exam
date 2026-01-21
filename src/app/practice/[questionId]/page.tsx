'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import useSWR from 'swr';
import gsap from 'gsap';
import Editor from '@monaco-editor/react';
import { useTheme } from "next-themes";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import * as Icons from 'lucide-react';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PracticeQuestionPage = () => {
    const router = useRouter();
    const params = useParams();
    const questionId = params?.questionId as string;
    const { instance, accounts, inProgress } = useMsal();
    const session = accounts[0];

    const [code, setCode] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('problem');
    const [visibleHintCount, setVisibleHintCount] = useState(0);
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [selectedMcqAnswer, setSelectedMcqAnswer] = useState<number | null>(null);

    // New state for enhanced run code
    const [testResults, setTestResults] = useState<any[]>([]);
    const [codeRunCounts, setCodeRunCounts] = useState<Record<string, number>>({});
    const [executionMode, setExecutionMode] = useState<"standard" | "ai">("ai");

    // Fetch current question
    const { data: questionData, isLoading } = useSWR(
        questionId && session?.username
            ? `/api/attender/practice/get-questions?email=${encodeURIComponent(session.username)}&limit=100`
            : null,
        fetcher
    );

    const question = questionData?.questions?.find((q: any) => q.id === parseInt(questionId));

    console.log(question);

    // Fetch set context to determine "Next" question
    const setId = question?.practiceSetId;
    const { data: setData } = useSWR(
        setId ? `/api/attender/practice/get-set-questions?setId=${setId}` : null,
        fetcher
    );

    const isMcqQuestion = question?.type === 'mcq';
    const mcqOptions = question?.mcqOptions ? (typeof question.mcqOptions === 'string' ? JSON.parse(question.mcqOptions) : question.mcqOptions) : null;

    const isSqlQuestion = ['sql', 'mysql', 'postgresql', 'snowflake'].includes(question?.language?.toLowerCase());
    const schema = React.useMemo(() => {
        if (!isSqlQuestion || !question?.testCases) return [];
        try {
            const tcs = typeof question.testCases === 'string' ? JSON.parse(question.testCases) : question.testCases;
            if (!tcs || !tcs.length) return [];

            const input = tcs[0].input || '';
            const tables: { name: string; columns: { name: string; type: string }[] }[] = [];
            // Regex to match CREATE TABLE statements, handling optional quotes and IF NOT EXISTS
            const regex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?['"`\[]?(\w+)['"`\]]?\s*\(([\s\S]+?)\);/gi;
            let match;

            while ((match = regex.exec(input)) !== null) {
                const tableName = match[1];
                const columnsDef = match[2];
                // Split by comma, ignoring commas inside parentheses (e.g. DECIMAL(10,2))
                const columnParts = columnsDef.split(/,(?![^(]*\))/);

                const columns = columnParts.map((part) => {
                    const cleanPart = part.trim();
                    if (!cleanPart) return null;
                    // Skip constraint definitions like PRIMARY KEY, FOREIGN KEY, etc.
                    if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT|UNIQUE|CHECK|INDEX|KEY)\b/i.test(cleanPart)) return null;

                    // Split by first whitespace to separate name and type
                    const firstSpace = cleanPart.indexOf(' ');
                    if (firstSpace === -1) return { name: cleanPart, type: 'Unknown' };

                    const name = cleanPart.substring(0, firstSpace).trim().replace(/^['"`\[]|['"`\]]$/g, '');
                    const type = cleanPart.substring(firstSpace).trim();

                    return { name, type };
                }).filter((c): c is { name: string; type: string } => c !== null);

                if (columns.length > 0) {
                    tables.push({ name: tableName, columns });
                }
            }
            return tables;
        } catch (e) {
            console.error("Error parsing schema:", e);
            return [];
        }
    }, [question, isSqlQuestion]);

    React.useEffect(() => {
        if (question && !isMcqQuestion) {
            setCode(question.starterCode || '');
        }
    }, [question, isMcqQuestion]);

    if (isLoading || inProgress === InteractionStatus.Startup) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Icons.Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session?.username || !question) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Icons.AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Question not found</h3>
                    <Button onClick={() => router.push('/attender/practice')}>
                        <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Practice
                    </Button>
                </div>
            </div>
        );
    }

    const prepareSqlQuery = (testCaseInput: string, userCode: string): string => {
        if (!testCaseInput) return userCode;
        const createStatements = testCaseInput.match(/CREATE TABLE[^;]+;/gi) || [];
        const dropStatements = createStatements.map((stmt) => {
            const match = stmt.match(/CREATE TABLE\s+(\w+)/i);
            return match ? `DROP TABLE IF EXISTS ${match[1]};` : '';
        }).filter(Boolean);
        return `${dropStatements.join('\n')}\n${testCaseInput};\n${userCode}`;
    };

    const compareOutputs = (actual: string, expected: string): boolean => {
        if (actual === expected) return true;
        const normalize = (str: string) => str ? str.toString().trim().replace(/\r\n/g, '\n').replace(/\s+$/gm, '') : '';
        return normalize(actual) === normalize(expected);
    };

    const handleRunCode = async (silent = false) => {
        setIsRunning(true);
        if (!silent) setTestResults([]);

        // Track code runs
        const currentQId = question.id.toString();
        const newRunCounts = { ...codeRunCounts };
        newRunCounts[currentQId] = (newRunCounts[currentQId] || 0) + 1;
        setCodeRunCounts(newRunCounts);

        // Animate run button if not silent
        if (!silent) {
            gsap.to(".run-code-btn", {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        }

        try {
            const results: any[] = [];
            const testCases = question.testCases ? (typeof question.testCases === 'string' ? JSON.parse(question.testCases) : question.testCases) : [];
            const visibleTests = testCases.filter((tc: any) => !tc.isHidden);

            // If no code, return failed result
            if (!code.trim()) {
                const failedResult = {
                    success: false,
                    testCasesPassed: 0,
                    totalTestCases: visibleTests.length,
                    testResults: [],
                    error: "No code submitted"
                };
                if (!silent) setExecutionResult(failedResult);
                return failedResult;
            }

            for (const testCase of visibleTests) {
                try {
                    const language = question.language.toLowerCase();
                    let endpoint = executionMode === "ai" ? "/api/execute/ai" : "/api/execute/";

                    if (executionMode !== "ai") {
                        if (language === "python" || language === "python3") {
                            endpoint += "python";
                        } else if (language === "javascript" || language === "js" || language === "node") {
                            endpoint += "javascript";
                        } else if (language === "java") {
                            endpoint += "java";
                        } else if (language === "pyspark" || language === "spark" || language === "databricks") {
                            endpoint += "pyspark";
                        } else if (language === "dax" || language === "powerbi") {
                            endpoint += "dax";
                        } else if (language === "c++" || language === "cpp") {
                            endpoint += "cpp";
                        } else if (language === "sql" || language === "mysql" || language === "postgresql") {
                            endpoint += "sql";
                        } else if (language === "dbt") {
                            endpoint += "dbt";
                        } else if (language === "snowflake") {
                            endpoint += "snowflake";
                        } else {
                            throw new Error(`Unsupported language: ${question.language}`);
                        }
                    }

                    const requestBody = executionMode === "ai"
                        ? {
                            code: language === "sql" ? prepareSqlQuery(testCase.input, code) : code,
                            language: language,
                            question: question.questionDescription || question.description,
                            testCase: testCase
                        }
                        : (language === "sql" || language === "mysql" || language === "postgresql")
                            ? {
                                query: prepareSqlQuery(testCase.input, code),
                                testCase: testCase,
                                serverType: 'postgres',
                                credentials: {
                                    host: '20.83.224.62',
                                    port: 5432,
                                    username: 'sysrankuser',
                                    password: 'RankPass!123',
                                    database: 'practice_db'
                                }
                            }
                            : (language === "dax" || language === "powerbi")
                                ? {
                                    expression: code,
                                    testCase: {
                                        input: testCase.input,
                                        expectedOutput: testCase.expectedOutput
                                    }
                                } : (language === "snowflake") ? {
                                    query: prepareSqlQuery(testCase.input, code),
                                    testCase: {
                                        input: testCase.input,
                                        expectedOutput: testCase.expectedOutput
                                    }
                                } : {
                                    code,
                                    testCase: {
                                        input: testCase.input,
                                        expectedOutput: testCase.expectedOutput
                                    }
                                };

                    const response = await fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody),
                    });

                    const result = await response.json();

                    if (result.success) {
                        let actualOutput = "";
                        if (typeof result.output === "string") {
                            actualOutput = result.output.trim();
                        } else if (result.output) {
                            actualOutput = JSON.stringify(result.output);
                        }

                        let expectedOutput = "";
                        if (typeof testCase.expectedOutput === "string") {
                            expectedOutput = testCase.expectedOutput.trim();
                        } else if (testCase.expectedOutput) {
                            expectedOutput = JSON.stringify(testCase.expectedOutput);
                        }

                        const passed = compareOutputs(actualOutput, expectedOutput);

                        results.push({
                            passed,
                            input: testCase.input,
                            expectedOutput,
                            actualOutput,
                        });
                    } else {
                        results.push({
                            passed: false,
                            input: testCase.input,
                            expectedOutput: testCase.expectedOutput,
                            actualOutput: "",
                            error: result.error || "Execution failed",
                        });
                    }
                } catch (error: any) {
                    results.push({
                        passed: false,
                        input: testCase.input,
                        expectedOutput: testCase.expectedOutput,
                        actualOutput: "",
                        error: error.message || "Execution error",
                    });
                }
            }

            if (!silent) setTestResults(results);

            // Calculate final result for compatibility with submit logic
            const passedCount = results.filter(r => r.passed).length;
            const finalResult = {
                success: passedCount === results.length,
                testCasesPassed: passedCount,
                totalTestCases: results.length,
                testResults: results
            };

            if (!silent) {
                setExecutionResult(finalResult);

                // Set initial state and animate test results
                gsap.set(".test-result-item", { x: -20, opacity: 0 });

                setTimeout(() => {
                    const elements = document.querySelectorAll(".test-result-item");
                    if (elements.length > 0) {
                        gsap.to(".test-result-item", {
                            x: 0,
                            opacity: 1,
                            duration: 0.4,
                            stagger: 0.1,
                            ease: "power2.out"
                        });
                    }
                }, 50);

                setActiveTab('testcases');
            }
            return finalResult;
        } catch (error: any) {
            console.error("Error running code:", error);
            return { success: false, error: 'Execution failed' };
        } finally {
            setIsRunning(false);
        }
    };

    const handleNext = async () => {
        setIsSubmitting(true);
        try {
            let execResult = executionResult;

            if (isMcqQuestion) {
                // For MCQ, calculate simple result silently
                const isCorrect = selectedMcqAnswer === mcqOptions.correctAnswer;
                execResult = {
                    success: isCorrect,
                    isMcq: true,
                    selectedAnswer: selectedMcqAnswer,
                    correctAnswer: mcqOptions.correctAnswer,
                    isCorrect
                };
            } else {
                // For coding, if they haven't run it, run it silently now to get a grade
                if (!execResult) {
                    execResult = await handleRunCode(true); // Silent run
                }
            }

            // Save Answer
            await fetch('/api/attender/practice/submit-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    practiceQuestionId: question.id,
                    email: session.username,
                    userName: session.name,
                    submittedCode: isMcqQuestion ? null : code,
                    selectedMcqAnswer: isMcqQuestion ? selectedMcqAnswer : null,
                    language: question.language,
                    executionResult: execResult
                })
            });

            // Navigate to Next Question or Set Page
            if (setData && setData.questions) {
                const currentIndex = setData.questions.findIndex((q: any) => q.id === question.id);
                if (currentIndex !== -1 && currentIndex < setData.questions.length - 1) {
                    const nextQuestion = setData.questions[currentIndex + 1];
                    router.push(`/practice/${nextQuestion.id}`);
                } else if (setId) {
                    // Finished Set
                    router.push(`/attender/practice/set/${setId}`);
                } else {
                    router.push('/attender/practice');
                }
            } else {
                router.push('/attender/practice');
            }

        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400';
            case 'hard': return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            <header className="border-b bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()} // Go back to set usually
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
                                {isMcqQuestion ? <Icons.ListChecks className="h-3 w-3" /> : <Icons.Code2 className="h-3 w-3" />}
                                {isMcqQuestion ? 'MCQ' : question.language}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isMcqQuestion && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            >
                                {resolvedTheme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Left Panel */}
                    <ResizablePanel defaultSize={isMcqQuestion ? 100 : 40} minSize={30}>
                        <div className="h-full flex flex-col bg-card">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                <div className="border-b px-4 flex-shrink-0">
                                    <TabsList className="h-12 bg-transparent">
                                        <TabsTrigger value="problem" className="gap-2">
                                            <Icons.FileText className="h-4 w-4" />
                                            Problem
                                        </TabsTrigger>
                                        {!isMcqQuestion && (
                                            <TabsTrigger value="testcases" className="gap-2">
                                                <Icons.FlaskConical className="h-4 w-4" />
                                                Run Results
                                            </TabsTrigger>
                                        )}
                                        <TabsTrigger value="hints" className="gap-2">
                                            <Icons.Lightbulb className="h-4 w-4" />
                                            Hints ({visibleHintCount}/{question.hints?.length || 0})
                                        </TabsTrigger>
                                        {isSqlQuestion && schema && schema.length > 0 && (
                                            <TabsTrigger value="schema" className="gap-2">
                                                <Icons.Database className="h-4 w-4" />
                                                Schema
                                            </TabsTrigger>
                                        )}
                                    </TabsList>
                                </div>

                                <TabsContent value="problem" className="mt-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-full">
                                        <div className="p-6 space-y-6">
                                            <div
                                                className="prose prose-sm dark:prose-invert max-w-none break-words [&_*]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:break-words [&_code]:whitespace-pre-wrap"
                                                dangerouslySetInnerHTML={{ __html: question.questionDescription }}
                                            />
                                            {question.weakArea && (
                                                <Alert className="border-primary/50 bg-primary/5">
                                                    <Icons.Target className="h-4 w-4" />
                                                    <AlertDescription><strong>Focus Area:</strong> {question.weakArea}</AlertDescription>
                                                </Alert>
                                            )}

                                            {isMcqQuestion && mcqOptions && (
                                                <div className="space-y-4 mt-6">
                                                    <h3 className="font-semibold text-lg">Select your answer:</h3>
                                                    <RadioGroup
                                                        value={selectedMcqAnswer?.toString()}
                                                        onValueChange={(value) => setSelectedMcqAnswer(parseInt(value))}
                                                    >
                                                        {mcqOptions.options.map((option: string, idx: number) => (
                                                            <div key={idx} className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedMcqAnswer === idx ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                                                                }`}>
                                                                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                                                                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-sm leading-relaxed">
                                                                    <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                                                                    {option}
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                    <div className="flex justify-end pt-6">
                                                        <Button
                                                            onClick={handleNext}
                                                            disabled={selectedMcqAnswer === null || isSubmitting}
                                                            className="min-w-[140px] gap-2"
                                                            size="lg"
                                                        >
                                                            {isSubmitting ? <><Icons.Loader2 className="animate-spin h-4 w-4" /> Saving...</> : <>Save & Next <Icons.ChevronRight className="h-4 w-4" /></>}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {!isMcqQuestion && (
                                    <TabsContent value="testcases" className="mt-0 flex-1 overflow-hidden">
                                        <ScrollArea className="h-full">
                                            <div className="p-6">
                                                {executionResult ? (
                                                    // Only show rudimentary results if manually run.
                                                    <div className="space-y-4">
                                                        {executionResult.testResults?.map((res: any, i: number) => (
                                                            <div key={i} className={`test-result-item p-4 rounded border ${res.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                                                                <div className="font-semibold mb-2 flex items-center gap-2">
                                                                    {res.passed ? <Icons.CheckCircle className="h-4 w-4 text-emerald-500" /> : <Icons.XCircle className="h-4 w-4 text-rose-500" />}
                                                                    Test Case {i + 1}
                                                                </div>
                                                                {/* Added whitespace-pre-wrap and break-all to ensure full visibility */}
                                                                <div className="space-y-2 text-xs">
                                                                    <div>
                                                                        <span className="font-medium text-muted-foreground">Input:</span>
                                                                        <pre className="bg-background/50 p-2 rounded mt-1 whitespace-pre-wrap break-all">{res.input || res.testCase?.input}</pre>
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium text-muted-foreground">Output:</span>
                                                                        <pre className="bg-background/50 p-2 rounded mt-1 whitespace-pre-wrap break-all">{res.actualOutput}</pre>
                                                                    </div>
                                                                    {!res.passed && (
                                                                        <div>
                                                                            <span className="font-medium text-muted-foreground">Expected:</span>
                                                                            <pre className="bg-background/50 p-2 rounded mt-1 whitespace-pre-wrap break-all">{res.expectedOutput}</pre>
                                                                        </div>
                                                                    )}
                                                                    {res.error && (
                                                                        <div className="text-rose-500 mt-2">
                                                                            Error: {res.error}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <div className="text-center text-muted-foreground py-10">Run code to see logic check.</div>}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                )}

                                <TabsContent value="hints" className="mt-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-full">
                                        <div className="p-6 space-y-4">
                                            {visibleHintCount > 0 ? question.hints?.slice(0, visibleHintCount).map((h: string, i: number) => (
                                                <Alert key={i} className="bg-amber-500/10 border-amber-500/20"><AlertDescription>Hint {i + 1}: {h}</AlertDescription></Alert>
                                            )) : <div className="text-center py-10 text-muted-foreground">Hints hidden</div>}
                                            {visibleHintCount < (question.hints?.length || 0) && (
                                                <Button variant="outline" onClick={() => setVisibleHintCount(curr => curr + 1)} className="w-full">
                                                    Reveal Hint
                                                </Button>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {isSqlQuestion && schema && schema.length > 0 && (
                                    <TabsContent value="schema" className="mt-0 flex-1 overflow-hidden">
                                        <ScrollArea className="h-full">
                                            <div className="p-6">
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-2">
                                                        <Icons.Database className="h-5 w-5 text-primary" />
                                                        <h3 className="text-lg font-semibold">Database Schema</h3>
                                                    </div>

                                                    {schema.map((table: any, idx: number) => (
                                                        <div key={idx} className="border rounded-lg overflow-hidden bg-card">
                                                            <div className="px-4 py-2 bg-muted/50 border-b flex items-center font-medium">
                                                                <Icons.Table className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                {table.name}
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-muted/20 text-muted-foreground font-medium text-xs uppercase">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left">Column</th>
                                                                            <th className="px-4 py-2 text-left">Type</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y">
                                                                        {table.columns.map((col: any, cIdx: number) => (
                                                                            <tr key={cIdx} className="hover:bg-muted/10">
                                                                                <td className="px-4 py-2 font-mono text-foreground/90">{col.name}</td>
                                                                                <td className="px-4 py-2 text-muted-foreground">{col.type}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <Alert>
                                                        <Icons.Info className="h-4 w-4" />
                                                        <AlertDescription>
                                                            These tables are available for your query. The data types shown match the database environment.
                                                        </AlertDescription>
                                                    </Alert>
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </div>
                    </ResizablePanel>

                    {!isMcqQuestion && (
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={60} minSize={40}>
                                <div className="h-full flex flex-col">
                                    <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Icons.Code2 className="h-4 w-4 text-muted-foreground" /> Editor
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setCode(question.starterCode || '')} className="text-xs gap-1"><Icons.RotateCcw className="h-3 w-3" />Reset</Button>
                                    </div>
                                    <div className="flex-1">
                                        <Editor height="100%" language={question.language.toLowerCase()} value={code} onChange={(v) => setCode(v || '')} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ minimap: { enabled: false }, fontSize: 14 }} />
                                    </div>
                                    <div className="border-t bg-card p-4 flex justify-between items-center">
                                        <Button onClick={() => handleRunCode(false)} disabled={isRunning} variant="secondary" className="run-code-btn gap-2">
                                            {isRunning ? <Icons.Loader2 className="animate-spin h-4 w-4" /> : <Icons.Play className="h-4 w-4" />} Run Code
                                        </Button>
                                        <Button onClick={handleNext} disabled={isSubmitting} className="gap-2 min-w-[140px]">
                                            {isSubmitting ? <><Icons.Loader2 className="animate-spin h-4 w-4" /> Saving...</> : <>Save & Next <Icons.ChevronRight className="h-4 w-4" /></>}
                                        </Button>
                                    </div>
                                </div>
                            </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default PracticeQuestionPage;