import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Question {
    questionText: string;
    language: string;
    testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
    starterCode?: string;
    hints?: string[];
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

    const runCode = async () => {
        setIsRunning(true);
        setOutput('');
        setTestResults([]);

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
                setOutput(`✓ ${passed}/${result.results.length} test cases passed`);
            } else {
                setOutput(`Error: ${result.error}`);
            }
        } catch (error: any) {
            setOutput(`Error: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold mb-2">Problem</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {question.questionText}
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold mb-2">Test Cases</h3>
                    <div className="space-y-2">
                        {question.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                            <Card key={idx} className="p-3">
                                <p className="text-xs text-muted-foreground">Input:</p>
                                <code className="text-sm">{tc.input}</code>
                                <p className="text-xs text-muted-foreground mt-2">Expected Output:</p>
                                <code className="text-sm">{tc.expectedOutput}</code>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Your Code</h3>
                        <Button onClick={runCode} disabled={isRunning} size="sm">
                            {isRunning ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</>
                            ) : (
                                <><Play className="w-4 h-4 mr-2" /> Run Code</>
                            )}
                        </Button>
                    </div>
                    <Textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="font-mono text-sm min-h-[300px]"
                        placeholder="Write your code here..."
                    />
                </div>

                {output && (
                    <Card className="bg-muted">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Output</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="text-sm whitespace-pre-wrap">{output}</pre>
                            {testResults.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {testResults.map((result, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            {result.passed ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span>Test Case {idx + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {question.hints && question.hints.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Hints 💡</h3>
                        <div className="space-y-2">
                            {question.hints.map((hint, idx) => (
                                <details key={idx} className="bg-muted p-3 rounded cursor-pointer">
                                    <summary className="text-sm font-medium">Hint {idx + 1}</summary>
                                    <p className="text-sm text-muted-foreground mt-2">{hint}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}