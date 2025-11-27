import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
    Play,
    RotateCcw,
    ArrowLeft,
    Ghost,
    Code2,
    Terminal,
    ChevronDown,
    Loader2,
    CheckCircle2,
    XCircle,
    Settings
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const STARTER_CODE = {
    python: `def solution():
    # Write your code here
    pass

# Test your solution
solution()`,
    javascript: `function solution() {
    // Write your code here
}

// Test your solution
solution();`,
    java: `public class Solution {
    public static void main(String[] args) {
        // Write your code here
    }
}`,
    cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    return 0;
}`,
    sql: `-- Write your SQL query here
SELECT 
    column1,
    column2
FROM 
    table_name
WHERE 
    condition;`
};

const CodeSandbox = () => {
    const router = useRouter();
    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(STARTER_CODE.python);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
        setCode(STARTER_CODE[newLanguage as keyof typeof STARTER_CODE]);
        setOutput('');
        setExecutionStatus('idle');
    };

    const handleReset = () => {
        setCode(STARTER_CODE[language as keyof typeof STARTER_CODE]);
        setOutput('');
        setExecutionStatus('idle');
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput('Running code...\n');
        setExecutionStatus('idle');

        try {
            const response = await fetch(`/api/execute/${language}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    testCase: null // No test case for sandbox
                })
            });

            const result = await response.json();

            if (result.success) {
                setOutput(result.output || 'Code executed successfully!');
                setExecutionStatus('success');
            } else {
                setOutput(`Error: ${result.error || 'Execution failed'}\n\n${result.output || ''}`);
                setExecutionStatus('error');
            }
        } catch (error: any) {
            setOutput(`Error: ${error.message || 'Failed to execute code'}`);
            setExecutionStatus('error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <>
            <Head>
                <title>Code Sandbox - Ghost Mode</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/dashboard/attender/ghost-mode')}
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Code2 className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold">Code Sandbox</h1>
                                    <p className="text-xs text-muted-foreground">Practice coding without limits</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="gap-1.5 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                                <Ghost className="w-3 h-3" />
                                Ghost Mode
                            </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                            <Select value={language} onValueChange={handleLanguageChange}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="java">Java</SelectItem>
                                    <SelectItem value="cpp">C++</SelectItem>
                                    <SelectItem value="sql">SQL</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset
                            </Button>

                            <Button
                                onClick={handleRunCode}
                                disabled={isRunning}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" />
                                        Run Code
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Problem Description */}
                    <div className="w-96 border-r bg-muted/30 overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <div>
                                <h2 className="text-xl font-bold mb-2">Practice Problem</h2>
                                <p className="text-sm text-muted-foreground">
                                    Use this sandbox to practice coding and test your solutions
                                </p>
                            </div>

                            <Card className="border-border/50">
                                <CardContent className="p-4 space-y-4">
                                    <div>
                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                            <Code2 className="w-4 h-4 text-primary" />
                                            Instructions
                                        </h3>
                                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                                            <li>Write your code in the editor</li>
                                            <li>Click "Run Code" to execute</li>
                                            <li>View output in the console below</li>
                                            <li>Use "Reset" to start over</li>
                                        </ul>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h3 className="font-semibold mb-2">Sample Input</h3>
                                        <pre className="text-xs bg-muted p-3 rounded-lg font-mono">
                                            {`5
1 2 3 4 5`}
                                        </pre>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2">Expected Output</h3>
                                        <pre className="text-xs bg-muted p-3 rounded-lg font-mono">
                                            {`15`}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                        <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                            Tip
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            This is a practice environment. Your code won't be saved or evaluated.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Code Editor & Console */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Code Editor */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Code2 className="w-4 h-4" />
                                    Code Editor
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    {language}
                                </Badge>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <Textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full h-full resize-none font-mono text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                    placeholder="Write your code here..."
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* Console Output */}
                        <div className="h-64 border-t flex flex-col">
                            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Terminal className="w-4 h-4" />
                                    Console Output
                                </div>
                                {executionStatus !== 'idle' && (
                                    <Badge
                                        variant={executionStatus === 'success' ? 'default' : 'destructive'}
                                        className="text-xs gap-1"
                                    >
                                        {executionStatus === 'success' ? (
                                            <>
                                                <CheckCircle2 className="w-3 h-3" />
                                                Success
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-3 h-3" />
                                                Error
                                            </>
                                        )}
                                    </Badge>
                                )}
                            </div>
                            <ScrollArea className="flex-1 bg-slate-950 dark:bg-slate-950">
                                <div className="p-4">
                                    {output ? (
                                        <pre className="text-sm font-mono text-emerald-400 whitespace-pre-wrap">
                                            {output}
                                        </pre>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">
                                            Output will appear here after running your code...
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CodeSandbox;
