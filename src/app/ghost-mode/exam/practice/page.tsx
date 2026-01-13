"use client"

import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Code2,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Home,
    RotateCcw,
    Trophy,
    Target,
    AlertCircle,
    Play,
    Loader2,
    Terminal,
    Download,
    ChevronLeft,
    ChevronRight,
    Flag,
    Eye,
    EyeOff,
    FileText,
    ListChecks,
    Zap,
    Activity,
    Sparkles,
    Ghost,
    BookOpen,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MCQQuestion {
    type: "mcq";
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface CodingQuestion {
    type: "coding";
    language: "python" | "sql" | "javascript" | "java" | "pyspark" | "dax" | "dbt" | "snowflake";
    topic: string;
    difficulty: string;
    questionTitle: string;
    questionDescription: string;
    hints: string[];
    solutionExplanation: string;
    basedOnExam: string;
    description: string;
    starterCode: string;
    testCases: Array<{
        input: string;
        expectedOutput: string;
        isHidden: boolean;
    }>;
    solution: string;
    explanation: string;
}

type Question = MCQQuestion | CodingQuestion;

interface TestResult {
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    error?: string;
}

const isEquivalent = (actual: any, expected: any): boolean => {
    if (actual === expected) return true;

    // Handle string/number comparison with date normalization
    if ((typeof actual === 'string' || typeof actual === 'number') &&
        (typeof expected === 'string' || typeof expected === 'number')) {
        const s1 = String(actual).trim();
        const s2 = String(expected).trim();
        if (s1 === s2) return true;

        // Try date comparison for strings that look like dates
        // Matches common formats: '2023-12-05 08:00:00' or '2023-12-05T08:00:00.000Z'
        if (s1.length >= 10 && s2.length >= 10) {
            const d1 = new Date(s1).getTime();
            const d2 = new Date(s2).getTime();
            if (!isNaN(d1) && !isNaN(d2)) {
                return d1 === d2;
            }
        }
        return false;
    }

    if (Array.isArray(actual) && Array.isArray(expected)) {
        if (actual.length !== expected.length) return false;
        for (let i = 0; i < actual.length; i++) {
            if (!isEquivalent(actual[i], expected[i])) return false;
        }
        return true;
    }

    if (typeof actual === 'object' && actual !== null && typeof expected === 'object' && expected !== null) {
        const actualKeys = Object.keys(actual);
        const expectedKeys = Object.keys(expected);
        if (actualKeys.length !== expectedKeys.length) return false;

        // Normalize keys to lowercase for comparison
        const actualNorm: any = {};
        for (const k of actualKeys) actualNorm[k.toLowerCase()] = actual[k];

        const expectedNorm: any = {};
        for (const k of expectedKeys) expectedNorm[k.toLowerCase()] = expected[k];

        const keys = Object.keys(actualNorm);
        for (const key of keys) {
            if (!(key in expectedNorm)) return false;
            if (!isEquivalent(actualNorm[key], expectedNorm[key])) return false;
        }
        return true;
    }

    return false;
};

const compareOutputs = (actual: string, expected: string): boolean => {
    actual = actual.trim();
    expected = expected.trim();
    if (actual === expected) return true;
    try {
        const actualObj = JSON.parse(actual);
        const expectedObj = JSON.parse(expected);
        return isEquivalent(actualObj, expectedObj);
    } catch (e) {
        return actual === expected;
    }
};

export default function PracticeExam() {
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [codeAnswers, setCodeAnswers] = useState<string[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [examDetails, setExamDetails] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionId, setSubmissionId] = useState<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [questionResults, setQuestionResults] = useState<{ [key: number]: TestResult[] }>({});
    const [activeTab, setActiveTab] = useState<"problem" | "submission">("problem");
    const [showSolution, setShowSolution] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [executionMode, setExecutionMode] = useState<"docker" | "ai">("ai");

    const [showExitWarning, setShowExitWarning] = useState(false);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [warnings, setWarnings] = useState<string[]>([]);

    // Refs for GSAP animations
    const headerRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const bottomNavRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const fullscreenPromptRef = useRef<HTMLDivElement>(null);

    // Load questions and initialize
    useEffect(() => {
        const storedQuestions = sessionStorage.getItem("practiceQuestions");
        const storedExamDetails = sessionStorage.getItem("anonymousExam");

        if (storedQuestions) {
            const parsedQuestions = JSON.parse(storedQuestions);
            setQuestions(parsedQuestions);
            setSelectedAnswers(new Array(parsedQuestions.length).fill(-1));
            setCodeAnswers(
                parsedQuestions.map((q: Question) =>
                    q.type === "coding" ? q.starterCode : ""
                )
            );
        }

        if (storedExamDetails) {
            const examData = JSON.parse(storedExamDetails);
            setExamDetails(examData);
            setTimeLeft(examData.duration * 60);
        } else {
            router.push("/");
        }
    }, [router]);

    // GSAP Animations for initial load
    useEffect(() => {
        if (!showResults && !showFullscreenPrompt && questions.length > 0) {
            const ctx = gsap.context(() => {
                gsap.from(headerRef.current, {
                    y: -60,
                    opacity: 0,
                    duration: 0.6,
                    ease: "power3.out"
                });

                gsap.from(leftPanelRef.current, {
                    x: -100,
                    opacity: 0,
                    duration: 0.8,
                    delay: 0.2,
                    ease: "power3.out"
                });

                gsap.from(rightPanelRef.current, {
                    x: 100,
                    opacity: 0,
                    duration: 0.8,
                    delay: 0.2,
                    ease: "power3.out"
                });

                gsap.from(bottomNavRef.current, {
                    y: 60,
                    opacity: 0,
                    duration: 0.6,
                    delay: 0.4,
                    ease: "power3.out"
                });
            });

            return () => ctx.revert();
        }
    }, [showResults, showFullscreenPrompt, questions]);

    // Animate question transitions
    useEffect(() => {
        if (!showResults && !showFullscreenPrompt && leftPanelRef.current) {
            gsap.fromTo(leftPanelRef.current.querySelector('.question-content'),
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
            );
        }
    }, [currentQuestion, showResults, showFullscreenPrompt]);

    // Animate results page
    useEffect(() => {
        if (showResults && resultsRef.current) {
            const ctx = gsap.context(() => {
                gsap.from(".score-circle", {
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: "power2.out",
                    delay: 0.6
                }
                );
            }, resultsRef);

            return () => ctx.revert();
        }
    }, [showResults]);

    // Animate fullscreen prompt
    useEffect(() => {
        if (showFullscreenPrompt && fullscreenPromptRef.current) {
            const ctx = gsap.context(() => {
                gsap.from(fullscreenPromptRef.current, {
                    scale: 0.8,
                    opacity: 0,
                    duration: 0.6,
                    ease: "back.out(1.7)"
                });

                gsap.from(".prompt-icon", {
                    scale: 0,
                    rotation: -360,
                    duration: 0.8,
                    delay: 0.2,
                    ease: "back.out(1.7)"
                });

                gsap.from(".exam-stat", {
                    x: -20,
                    opacity: 0,
                    duration: 0.5,
                    stagger: 0.1,
                    delay: 0.4,
                    ease: "power2.out"
                });
            }, fullscreenPromptRef);

            return () => ctx.revert();
        }
    }, [showFullscreenPrompt]);

    // Timer
    useEffect(() => {
        if (timeLeft > 0 && !showResults) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && questions.length > 0 && !showResults) {
            handleSubmit();
        }
    }, [timeLeft, showResults]);

    const prepareSqlQuery = (testCaseInput: string, userCode: string): string => {
        if (!testCaseInput) return userCode;

        const createStatements = testCaseInput.match(/CREATE TABLE[^;]+;/gi) || [];
        const insertStatements = testCaseInput.match(/INSERT INTO[^;]+;/gi) || [];
        const dropStatements = createStatements.map((stmt) => {
            const match = stmt.match(/CREATE TABLE\s+(\w+)/i);
            return match ? `DROP TABLE IF EXISTS ${match[1]};` : '';
        }).filter(Boolean);

        return `${dropStatements.join('\n')}\n${testCaseInput};\n${userCode}`;
    };

    const handleRunCode = async () => {
        const question = questions[currentQuestion] as CodingQuestion;
        const code = codeAnswers[currentQuestion];

        setIsRunning(true);
        setTestResults([]);

        // Animate run button
        gsap.to(".run-code-btn", {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });

        try {
            const results: TestResult[] = [];
            const visibleTests = question.testCases.filter((tc) => !tc.isHidden);

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

            setTestResults(results);
            setQuestionResults(prev => ({
                ...prev,
                [currentQuestion]: results
            }));

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
        } catch (error: any) {
            console.error("Error running code:", error);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        exitFullscreen();
        setShowResults(true);
        setIsSubmitting(false);
    };

    const hasQuestionBeenRun = (questionIndex: number): boolean => {
        const q = questions[questionIndex];

        if (q.type === "mcq") {
            return selectedAnswers[questionIndex] !== -1;
        } else if (q.type === "coding") {
            return questionResults[questionIndex] && questionResults[questionIndex].length > 0;
        }

        return false;
    };

    const getQuestionResult = (questionIndex: number): boolean => {
        const q = questions[questionIndex];

        if (q.type === "mcq") {
            return selectedAnswers[questionIndex] === q.correctAnswer;
        } else if (q.type === "coding") {
            const results = questionResults[questionIndex];

            if (!results || results.length === 0) {
                return false;
            }

            const visibleTests = q.testCases.filter(tc => !tc.isHidden);

            if (visibleTests.length === 0) {
                return false;
            }

            const allPassed = results.every(r => r.passed === true);

            return allPassed && results.length === visibleTests.length;
        }

        return false;
    };

    const calculateScore = () => {
        let correct = 0;

        questions.forEach((q, idx) => {
            if (getQuestionResult(idx)) {
                correct++;
            }
        });

        return {
            correct,
            incorrect: questions.length - correct,
            total: questions.length
        };
    };

    const currentQ = questions[currentQuestion];

    const loadImageAsBase64 = (imagePath: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            };
            img.onerror = reject;
            img.src = imagePath;
        });
    };

    const downloadPDF = async () => {
        setIsAnalyzing(true);
        let analysis = aiAnalysis;

        try {
            if (!analysis) {
                const questionDetails = questions.map((q, index) => {
                    const isCorrect = getQuestionResult(index);
                    let userAnswer = "";
                    let testResultsData = null;

                    if (q.type === "mcq") {
                        userAnswer = selectedAnswers[index] !== -1 ? q.options[selectedAnswers[index]] : "Not Answered";
                    } else {
                        userAnswer = codeAnswers[index] || "No Code Submitted";
                        testResultsData = questionResults[index];
                    }

                    return {
                        questionText: q.type === "mcq" ? q.question : q.questionTitle,
                        questionType: q.type,
                        userAnswer,
                        isCorrect,
                        testCaseResults: testResultsData
                    };
                });

                const response = await fetch("/api/ghost-mode/exam/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ questionDetails })
                });

                if (response.ok) {
                    analysis = await response.json();
                    setAiAnalysis(analysis);
                }
            }
        } catch (error) {
            console.error("Error getting AI analysis:", error);
        } finally {
            setIsAnalyzing(false);
        }

        const doc = new jsPDF();
        const score = calculateScore();
        const scorePercentage = (score.correct / score.total) * 100;

        let logoBase64 = '';
        try {
            logoBase64 = await loadImageAsBase64('/syslogo.png');
        } catch (error) {
            console.warn('Could not load logo:', error);
        }

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        const addWatermark = () => {
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(50);
            doc.saveGraphicsState();
            (doc as any).setGState(new (doc as any).GState({ opacity: 0.1 }));
            const watermarkText = examDetails?.topic?.toUpperCase() || "PRACTICE EXAM";
            doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
                align: 'center',
                angle: 45
            } as any);
            doc.restoreGraphicsState();
        };

        const addHeader = () => {
            doc.setFillColor(63, 169, 160);
            doc.rect(0, 0, pageWidth, 35, 'F');

            if (logoBase64) {
                try {
                    doc.addImage(logoBase64, 'PNG', 10, 5, 25, 25);
                } catch (error) {
                    console.warn('Could not add logo to PDF:', error);
                }
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('Sysrank Assessment', logoBase64 ? 40 : 15, 15);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Practice Exam Report', logoBase64 ? 40 : 15, 22);

            doc.setFontSize(9);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}`, pageWidth - 15, 15, { align: 'right' });
        };

        const addFooter = (page: number, total: number) => {
            doc.setPage(page);
            doc.setFillColor(245, 245, 245);
            doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, pageHeight - 7);
            doc.text(`Page ${page} of ${total}`, pageWidth - 15, pageHeight - 7, { align: 'right' });
            doc.text("Report generated by SysRank AI - Practice Platform", pageWidth / 2, pageHeight - 7, { align: 'center' });
        };

        // --- Start Content ---
        addHeader();
        addWatermark();

        let yPos = 45;

        // Executive Summary
        doc.setFontSize(16);
        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "bold");
        doc.text("Executive Summary", 15, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Questions: ${score.total}`, 15, yPos);
        doc.text(`Correct Answers: ${score.correct}`, 60, yPos);
        doc.text(`Score: ${scorePercentage.toFixed(1)}%`, 110, yPos);
        yPos += 15;

        const cleanContent = (text: string) => {
            if (!text) return "";

            // Handle HTML entities and cleanup
            let decoded = text
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&bull;/g, '•')
                .replace(/&middot;/g, '·');

            // Handle those weird &c&h&a&r& or &s&u&c&c&e&s&s& patterns
            if (decoded.includes('&') && decoded.split('&').length > decoded.length / 2) {
                decoded = decoded.replace(/&/g, '');
            }

            return decoded
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]*>?/gm, '')
                .trim();
        };

        const tableData = questions.map((q, index) => {
            const isCorrect = getQuestionResult(index);
            const hasRun = hasQuestionBeenRun(index);
            const feedback = analysis?.questionFeedback?.[index] || "No additional feedback available.";

            if (q.type === "mcq") {
                const userAnswer = selectedAnswers[index] !== -1 ? q.options[selectedAnswers[index]] : "Not Answered";
                const correctAnswer = q.options[q.correctAnswer];

                return [
                    `Q${index + 1}`,
                    cleanContent(q.question),
                    hasRun ? (isCorrect ? "PASS" : "FAIL") : "NOT ANSWERED",
                    userAnswer,
                    correctAnswer,
                    feedback
                ];
            } else {
                const results = questionResults[index];
                let statusHeader = "Not Run";
                let testCaseList = "";

                if (results && results.length > 0) {
                    const passedCount = results.filter(r => r.passed).length;
                    const totalCount = results.length;

                    if (passedCount === totalCount) {
                        statusHeader = `All Passed (${passedCount}/${totalCount})`;
                    } else if (passedCount > 0) {
                        statusHeader = `Partial (${passedCount}/${totalCount})`;
                    } else {
                        statusHeader = `Failed (${passedCount}/${totalCount})`;
                    }

                    testCaseList = results.map((r, i) =>
                        `Test ${i + 1} ${r.passed ? "PASSED" : "FAILED"}`
                    ).join("\n");
                }

                const questionText = `${q.questionTitle}\n\n${cleanContent(q.questionDescription || q.description || "")}`;
                const userCode = codeAnswers[index] || "No Code Submitted";
                const resultSummary = results && results.length > 0 ? `${statusHeader}\n\n${testCaseList}` : "Not Run";

                return [
                    `Q${index + 1}`,
                    questionText,
                    hasRun ? (isCorrect ? "PASS" : "FAIL") : "NOT ANSWERED",
                    userCode,
                    resultSummary,
                    feedback
                ];
            }
        });

        autoTable(doc, {
            startY: yPos,
            head: [["#", "Question", "Result", "Your Answer", "Correct Answer", "AI Feedback"]],
            body: tableData,
            theme: "grid",
            headStyles: {
                fillColor: [63, 169, 160],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 9,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [50, 50, 50],
                overflow: 'linebreak'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'left', cellWidth: 35 },
                2: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
                3: { halign: 'left', cellWidth: 40, font: 'courier' },
                4: { halign: 'left', cellWidth: 40 },
                5: { halign: 'left', cellWidth: 35 }
            },
            margin: { left: 15, right: 15, top: 40, bottom: 20 },
            didParseCell: (data: any) => {
                if (data.column.index === 2 && data.section === 'body') {
                    const result = data.cell.text[0];
                    if (result === 'PASS') {
                        data.cell.styles.textColor = [34, 197, 94];
                    } else if (result.includes('FAIL')) {
                        data.cell.styles.textColor = [239, 68, 68];
                    } else {
                        data.cell.styles.textColor = [156, 163, 175];
                    }
                }
            }
        });

        // Add Insights Sections at the end
        if (analysis) {
            doc.addPage();
            addHeader();
            addWatermark();

            let analyzeY = 50;

            // Strengths
            doc.setFillColor(240, 253, 244); // Light green
            doc.rect(15, analyzeY, pageWidth - 30, 8, 'F');
            doc.setFontSize(12);
            doc.setTextColor(21, 128, 61);
            doc.setFont("helvetica", "bold");
            doc.text("Key Strengths", 20, analyzeY + 6);
            analyzeY += 12;

            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "normal");
            analysis.strengths.forEach((s: string) => {
                const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 40);
                doc.text(lines, 20, analyzeY);
                analyzeY += (lines.length * 5) + 2;
            });

            analyzeY += 10;

            // Weaknesses
            doc.setFillColor(254, 242, 242); // Light red
            doc.rect(15, analyzeY, pageWidth - 30, 8, 'F');
            doc.setTextColor(185, 28, 28);
            doc.setFont("helvetica", "bold");
            doc.text("Areas of Weakness", 20, analyzeY + 6);
            analyzeY += 12;

            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "normal");
            analysis.weaknesses.forEach((w: string) => {
                const lines = doc.splitTextToSize(`• ${w}`, pageWidth - 40);
                doc.text(lines, 20, analyzeY);
                analyzeY += (lines.length * 5) + 2;
            });

            analyzeY += 10;

            // Recommendations
            doc.setFillColor(239, 246, 255); // Light blue
            doc.rect(15, analyzeY, pageWidth - 30, 8, 'F');
            doc.setTextColor(29, 78, 216);
            doc.setFont("helvetica", "bold");
            doc.text("Roadmap for Improvement", 20, analyzeY + 6);
            analyzeY += 12;

            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "normal");
            analysis.improvements.forEach((imp: string) => {
                const lines = doc.splitTextToSize(`• ${imp}`, pageWidth - 40);
                doc.text(lines, 20, analyzeY);
                analyzeY += (lines.length * 5) + 2;
            });
        }

        const pageCount = (doc as any).internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            addFooter(i, pageCount);
            if (i > 1) {
                addWatermark();
                addHeader();
            }
        }

        const fileName = `${examDetails?.topic || "practice"}-exam-report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const enterFullscreen = () => {
        const element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
            (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
            (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
            (element as any).msRequestFullscreen();
        }
    };

    const exitFullscreen = () => {
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).mozFullScreenElement && !(document as any).msFullscreenElement) {
            return;
        }

        if (document.exitFullscreen) {
            document.exitFullscreen().catch(console.error);
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        }
    };

    const handleStartExam = () => {
        enterFullscreen();
        setShowFullscreenPrompt(false);
    };

    const confirmExit = () => {
        router.push('/ghost-mode/dream-exam');
    };

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                        <div>
                            <h3 className="font-semibold text-foreground mb-2">No Practice Exam Found</h3>
                            <p className="text-sm text-muted-foreground">
                                Start a new practice exam from the learning page.
                            </p>
                        </div>
                        <Button onClick={() => router.push("/")} className="w-full">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Learning
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (showResults) {
        const score = calculateScore();
        const scorePercentage = (score.correct / score.total) * 100;

        return (
            <div className="min-h-screen bg-background font-sans">
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
                                        Dream Exam Results
                                    </h1>
                                </div>
                            </div>

                            <Button
                                onClick={confirmExit}
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

                {/* Status Banner */}
                <div className="bg-green-50 dark:bg-green-950/30 border-b border-green-100 dark:border-green-900/50 px-4 py-2">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">Exam Complete!</span>
                        <span>Your results are ready for review.</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="container mx-auto px-4 sm:px-6 py-12 max-w-7xl">
                    {/* Score Card */}
                    <Card className="mb-10 overflow-hidden shadow-xl border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
                        <CardContent className="pt-8 pb-8">
                            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                                {/* Score Circle */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-40 h-40">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                stroke="currentColor"
                                                strokeWidth="10"
                                                fill="none"
                                                className="text-muted/20"
                                            />
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                stroke="currentColor"
                                                strokeWidth="10"
                                                fill="none"
                                                strokeDasharray={`${2 * Math.PI * 70}`}
                                                strokeDashoffset={`${2 * Math.PI * 70 * (1 - scorePercentage / 100)}`}
                                                className={`transition-all duration-1000 ${scorePercentage >= 70
                                                    ? "text-green-500"
                                                    : scorePercentage >= 50
                                                        ? "text-yellow-500"
                                                        : "text-red-500"
                                                    }`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="text-4xl font-bold text-foreground">
                                                {Math.round(scorePercentage)}%
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">Overall Score</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="flex-1 grid grid-cols-3 gap-6 w-full max-w-2xl">
                                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/20 hover:border-green-500/40 transition-all">
                                        <div className="text-3xl font-bold text-green-500 mb-2">{score.correct}</div>
                                        <div className="text-sm text-muted-foreground font-medium">Correct</div>
                                    </div>
                                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/20 hover:border-red-500/40 transition-all">
                                        <div className="text-3xl font-bold text-red-500 mb-2">{score.incorrect}</div>
                                        <div className="text-sm text-muted-foreground font-medium">Incorrect</div>
                                    </div>
                                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary/40 transition-all">
                                        <div className="text-3xl font-bold text-primary mb-2">{score.total}</div>
                                        <div className="text-sm text-muted-foreground font-medium">Total</div>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-8" />

                            {/* Actions */}
                            <div className="flex flex-wrap gap-4 justify-center">
                                <Button
                                    variant="outline"
                                    onClick={downloadPDF}
                                    disabled={isAnalyzing}
                                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group h-12"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Generating AI Analysis...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            Download Detailed PDF Report
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Review Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-1 h-10 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                            <h2 className="text-2xl font-bold text-foreground">Review Your Answers</h2>
                        </div>

                        {questions.map((q, index) => {
                            const isCorrect = getQuestionResult(index);
                            const hasRun = hasQuestionBeenRun(index);

                            if (q.type === "mcq") {
                                return (
                                    <Card key={index} className="overflow-hidden hover:shadow-lg transition-all border-l-4 hover:border-l-primary border-l-transparent">
                                        <CardContent className="pt-6">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect
                                                    ? "bg-green-500/10 ring-2 ring-green-500/20"
                                                    : "bg-red-500/10 ring-2 ring-red-500/20"
                                                    }`}>
                                                    {isCorrect ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-red-500" />
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <h3 className="font-semibold text-foreground text-lg">
                                                            Question {index + 1}
                                                            <Badge
                                                                className={`ml-3 ${isCorrect
                                                                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                                    : "bg-red-500/10 text-red-600 border-red-500/20"
                                                                    }`}
                                                                variant="outline"
                                                            >
                                                                {isCorrect ? "Correct" : "Incorrect"}
                                                            </Badge>
                                                        </h3>
                                                    </div>

                                                    <p className="text-foreground mb-5 text-base">{q.question}</p>

                                                    <div className="space-y-3">
                                                        {q.options.map((option, optionIndex) => {
                                                            const isCorrectAnswer = optionIndex === q.correctAnswer;
                                                            const isSelectedAnswer = optionIndex === selectedAnswers[index];

                                                            return (
                                                                <div
                                                                    key={optionIndex}
                                                                    className={`p-4 rounded-lg border-2 transition-all ${isCorrectAnswer
                                                                        ? "border-green-500 bg-green-500/5"
                                                                        : isSelectedAnswer
                                                                            ? "border-red-500 bg-red-500/5"
                                                                            : "border-border bg-background/50"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrectAnswer || isSelectedAnswer
                                                                            ? "border-current"
                                                                            : "border-border"
                                                                            }`}>
                                                                            {(isCorrectAnswer || isSelectedAnswer) && (
                                                                                <div className="w-3 h-3 rounded-full bg-current"></div>
                                                                            )}
                                                                        </div>
                                                                        <span className={`${isCorrectAnswer || isSelectedAnswer ? "font-medium" : ""}`}>
                                                                            {option}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {q.explanation && (
                                                        <Alert className="mt-5 border-primary/20 bg-primary/5">
                                                            <AlertCircle className="h-4 w-4 text-primary" />
                                                            <AlertDescription className="text-foreground ml-2">
                                                                {q.explanation}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            } else if (q.type === "coding") {
                                const results = questionResults[index];

                                return (
                                    <Card key={index} className="overflow-hidden hover:shadow-lg transition-all border-l-4 hover:border-l-primary border-l-transparent">
                                        <CardContent className="pt-6">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${hasRun
                                                    ? (isCorrect
                                                        ? "bg-green-500/10 ring-2 ring-green-500/20"
                                                        : "bg-red-500/10 ring-2 ring-red-500/20"
                                                    )
                                                    : "bg-gray-500/10 ring-2 ring-gray-500/20"
                                                    }`}>
                                                    {hasRun ? (
                                                        isCorrect ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        )
                                                    ) : (
                                                        <AlertCircle className="w-5 h-5 text-gray-500" />
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <h3 className="font-semibold text-foreground text-lg">
                                                            Question {index + 1}
                                                            <Badge
                                                                className={`ml-3 ${hasRun
                                                                    ? (isCorrect
                                                                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                                        : "bg-red-500/10 text-red-600 border-red-500/20"
                                                                    )
                                                                    : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                                                                    }`}
                                                                variant="outline"
                                                            >
                                                                {hasRun ? (isCorrect ? "Passed" : "Failed") : "Not Run"}
                                                            </Badge>
                                                        </h3>
                                                    </div>

                                                    <p className="text-foreground mb-2 font-semibold text-base">{q.questionTitle}</p>
                                                    <p className="text-muted-foreground text-sm mb-5">{q.questionDescription}</p>

                                                    {results && results.length > 0 && (
                                                        <div className="space-y-3 mt-5">
                                                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                                <Activity className="w-4 h-4 text-primary" />
                                                                Test Results:
                                                            </h4>
                                                            {results.map((result, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-4 rounded-lg border-2 transition-all ${result.passed
                                                                        ? "border-green-500 bg-green-500/5"
                                                                        : "border-red-500 bg-red-500/5"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-medium">Test Case {idx + 1}</span>
                                                                        <Badge
                                                                            variant={result.passed ? "default" : "destructive"}
                                                                            className="text-xs"
                                                                        >
                                                                            {result.passed ? "Passed" : "Failed"}
                                                                        </Badge>
                                                                    </div>
                                                                    {!result.passed && result.error && (
                                                                        <div className="text-xs mt-2">
                                                                            <span className="text-muted-foreground">Error:</span>
                                                                            <pre className="mt-1 p-3 bg-background rounded text-red-400 overflow-x-auto text-xs font-mono border border-red-500/20">
                                                                                {result.error}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {!hasRun && (
                                                        <Alert className="mt-5 border-amber-500/20 bg-amber-500/5">
                                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                                            <AlertDescription className="text-foreground ml-2">
                                                                This question was not run during the exam.
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Fullscreen Prompt
    if (showFullscreenPrompt && !showResults) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans">
                {/* Animated background elements */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <Card className="max-w-3xl w-full shadow-2xl border-primary/20 relative z-10 bg-gradient-to-br from-card via-card to-primary/5">
                    <CardContent className="pt-10 pb-8 px-8">
                        <div className="text-center space-y-8">
                            {/* Icon with enhanced styling */}
                            <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/30 ring-4 ring-primary/10">
                                <AlertCircle className="w-12 h-12 text-primary-foreground" />
                            </div>

                            {/* Title & Description */}
                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold text-foreground">
                                    Fullscreen Mode Required
                                </h2>
                                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                                    To maintain exam integrity and provide the best experience, please enter fullscreen mode
                                </p>
                            </div>

                            {/* Exam Details Grid - Enhanced */}
                            <Card className="bg-gradient-to-br from-primary/5 via-muted/30 to-primary/5 border-primary/20 shadow-inner overflow-hidden">
                                <CardContent className="pt-6 pb-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-background/80 to-background/50 border border-primary/10 hover:border-primary/30 transition-all">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                                                <BookOpen className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="text-2xl font-bold text-foreground mb-1">
                                                {examDetails?.topic}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Topic
                                            </div>
                                        </div>

                                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-background/80 to-background/50 border border-primary/10 hover:border-primary/30 transition-all">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                                                <Target className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="text-2xl font-bold text-foreground mb-1">
                                                {questions.length}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Questions
                                            </div>
                                        </div>

                                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-background/80 to-background/50 border border-primary/10 hover:border-primary/30 transition-all">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                                                <Clock className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="text-2xl font-bold text-foreground mb-1">
                                                {examDetails?.duration}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Minutes
                                            </div>
                                        </div>

                                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-background/80 to-background/50 border border-primary/10 hover:border-primary/30 transition-all">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                                                <Sparkles className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="text-2xl font-bold text-foreground mb-1 capitalize">
                                                {examDetails?.difficulty}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Difficulty
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Separator className="my-2" />

                            {/* Action Buttons - Enhanced */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/ghost-mode/dream-exam")}
                                    className="flex-1 h-12 text-base hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-600 transition-all group"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                    Cancel Exam
                                </Button>
                                <Button
                                    onClick={handleStartExam}
                                    className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all group"
                                >
                                    <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                    Start Exam in Fullscreen
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main Exam Interface - HackerRank Style
    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Top Navigation Bar */}
            <header ref={headerRef} className="h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center px-4 flex-shrink-0 shadow-sm">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/ghost-mode/dream-exam")} className="hover:bg-red-500/10 hover:text-red-600 transition-all">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Exit
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md">
                                <Code2 className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <span className="font-semibold text-foreground">{examDetails?.topic}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Warning Badge */}
                        {tabSwitchCount > 0 && (
                            <Badge variant="destructive" className="animate-pulse shadow-lg">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {tabSwitchCount} Warning{tabSwitchCount > 1 ? 's' : ''}
                            </Badge>
                        )}
                        {/* Timer */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${timeLeft < 300 ? "bg-red-500/10 ring-2 ring-red-500/20" : "bg-muted"
                            }`}>
                            <Clock className={`w-4 h-4 ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                            <span className={`font-mono text-sm ${timeLeft < 300 ? "text-red-500 font-bold" : "text-foreground"}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        {/* Submit Button */}
                        <Button onClick={handleSubmit} disabled={isSubmitting} size="sm" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/20">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Flag className="w-4 h-4 mr-2" />
                                    Submit
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Problem Description */}
                <div ref={leftPanelRef} className="w-1/2 border-r border-border flex flex-col bg-card">
                    {/* Problem Navigation */}
                    <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-muted/30">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                            <TabsList className="bg-transparent border-0 h-auto p-0">
                                <TabsTrigger
                                    value="problem"
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 data-[state=active]:text-primary transition-all"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Problem
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Problem Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-6 space-y-6 question-content">
                            {/* Question Header */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                        <span className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold shadow-md">
                                            {currentQuestion + 1}
                                        </span>
                                        {currentQ.type === "coding" ? currentQ.questionTitle : currentQ.question}
                                    </h1>
                                </div>
                                {currentQ.type === "coding" && (
                                    <Badge variant="outline" className="border-primary/30 bg-primary/5">
                                        <Code2 className="w-3 h-3 mr-1" />
                                        {currentQ.language.toUpperCase()}
                                    </Badge>
                                )}
                            </div>

                            <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                            {/* Problem Description */}
                            {currentQ.type === "coding" ? (
                                <div className="space-y-4">
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <div
                                            className="text-foreground leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: currentQ.questionDescription }}
                                        />
                                    </div>

                                    {/* Test Cases */}
                                    {currentQ.testCases.filter(tc => !tc.isHidden).length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-primary" />
                                                Sample Test Cases
                                            </h3>
                                            {currentQ.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                                                <div key={idx} className="rounded-lg border border-border bg-muted/30 overflow-hidden hover:border-primary/30 transition-all">
                                                    <div className="px-4 py-2 bg-muted/50 border-b border-border">
                                                        <span className="text-sm font-medium text-foreground">Test Case {idx + 1}</span>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        <div>
                                                            <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
                                                            <pre className="text-sm bg-background p-3 rounded border border-border overflow-x-auto font-mono">
                                                                <code className="text-foreground">{tc.input || "No input"}</code>
                                                            </pre>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-medium text-muted-foreground mb-1">Expected Output:</div>
                                                            <pre className="text-sm bg-background p-3 rounded border border-border overflow-x-auto font-mono">
                                                                <code className="text-foreground">{tc.expectedOutput}</code>
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // MCQ Options
                                <div className="space-y-3">
                                    {currentQ.options.map((option, optionIndex) => (
                                        <button
                                            key={optionIndex}
                                            onClick={() => {
                                                const newAnswers = [...selectedAnswers];
                                                newAnswers[currentQuestion] = optionIndex;
                                                setSelectedAnswers(newAnswers);

                                                // Animate selection
                                                gsap.to(`.option-${currentQuestion}-${optionIndex}`, {
                                                    scale: 0.98,
                                                    duration: 0.1,
                                                    yoyo: true,
                                                    repeat: 1
                                                });
                                            }}
                                            className={`option-${currentQuestion}-${optionIndex} w-full text-left p-4 rounded-lg border-2 transition-all ${selectedAnswers[currentQuestion] === optionIndex
                                                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedAnswers[currentQuestion] === optionIndex
                                                    ? "border-primary bg-primary"
                                                    : "border-border"
                                                    }`}>
                                                    {selectedAnswers[currentQuestion] === optionIndex && (
                                                        <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
                                                    )}
                                                </div>
                                                <span className="text-foreground">{option}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Code Editor or Answer */}
                <div ref={rightPanelRef} className="w-1/2 flex flex-col bg-background">
                    {currentQ.type === "coding" ? (
                        <>
                            {/* Editor Header */}
                            <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium text-foreground">Code Editor</span>
                                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                        {currentQ.language}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    {showSolution && (
                                        <Badge variant="outline" className="text-xs border-amber-500/30 bg-amber-500/5 text-amber-600">
                                            <Eye className="w-3 h-3 mr-1" />
                                            Solution Visible
                                        </Badge>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowSolution(!showSolution);
                                            gsap.to(".editor-container", {
                                                opacity: 0,
                                                duration: 0.2,
                                                onComplete: () => {
                                                    gsap.to(".editor-container", {
                                                        opacity: 1,
                                                        duration: 0.2
                                                    });
                                                }
                                            });
                                        }}
                                        className="hover:bg-primary/10 hover:text-primary transition-all"
                                    >
                                        {showSolution ? (
                                            <><EyeOff className="w-4 h-4 mr-2" />Hide Solution</>
                                        ) : (
                                            <><Eye className="w-4 h-4 mr-2" />Show Solution</>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Code Editor */}
                            <div className="flex-1 overflow-hidden editor-container">
                                <Editor
                                    height="100%"
                                    defaultLanguage={
                                        currentQ.language === "python" ? "python" :
                                            currentQ.language === "javascript" ? "javascript" :
                                                currentQ.language === "java" ? "java" :
                                                    currentQ.language === "pyspark" ? "python" :
                                                        currentQ.language === "dax" ? "sql" :
                                                            "sql"
                                    }
                                    value={showSolution ? currentQ.solution : codeAnswers[currentQuestion]}
                                    onChange={(value) => {
                                        if (!showSolution) {
                                            const newAnswers = [...codeAnswers];
                                            newAnswers[currentQuestion] = value || "";
                                            setCodeAnswers(newAnswers);
                                        }
                                    }}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        lineNumbers: "on",
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        tabSize: 4,
                                        readOnly: showSolution,
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    }}
                                />
                            </div>

                            {/* Run Code Panel */}
                            <div className="border-t border-border bg-card">
                                {/* Action Bar */}
                                <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-muted/30">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-primary" />
                                            Test Results
                                        </span>
                                        <div className="flex items-center bg-muted rounded-md p-1 scale-90">
                                            {/* <button
                                                onClick={() => setExecutionMode("docker")}
                                                className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${executionMode === "docker"
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                            >
                                                DOCKER
                                            </button> */}
                                            <button
                                                onClick={() => setExecutionMode("ai")}
                                                className={`px-4 py-1 text-[10px] font-bold rounded-sm transition-all flex items-center gap-1.5 ${executionMode === "ai"
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                AI ENGINE
                                            </button>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleRunCode}
                                        disabled={isRunning}
                                        size="sm"
                                        className="run-code-btn bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/20"
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
                                </div>

                                {/* Test Results */}
                                <ScrollArea className="h-48">
                                    <div className="p-4">
                                        {testResults.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground text-sm">
                                                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                Click "Run Code" to test your solution
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {testResults.map((result, idx) => (
                                                    <div key={idx} className={`test-result-item p-3 rounded-lg border-2 transition-all ${result.passed
                                                        ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                                                        : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {result.passed ? (
                                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                ) : (
                                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                                )}
                                                                <span className="text-sm font-medium text-foreground">
                                                                    Test Case {idx + 1}
                                                                </span>
                                                            </div>
                                                            <Badge variant={result.passed ? "default" : "destructive"} className={`text-[10px] uppercase h-5 ${result.passed ? "bg-green-500 hover:bg-green-600" : ""}`}>
                                                                {result.passed ? "Passed" : "Failed"}
                                                            </Badge>
                                                        </div>

                                                        <div className="text-xs space-y-2 mt-2">
                                                            {result.input && (
                                                                <div>
                                                                    <span className="text-muted-foreground font-medium">Input:</span>
                                                                    <pre className="mt-1 p-2 bg-background/50 rounded text-foreground overflow-x-auto font-mono border border-border/50 max-h-24">
                                                                        {result.input}
                                                                    </pre>
                                                                </div>
                                                            )}

                                                            {!result.passed && (
                                                                <>
                                                                    {result.error && (
                                                                        <div>
                                                                            <span className="text-muted-foreground font-medium text-red-500/80">Error:</span>
                                                                            <pre className="mt-1 p-2 bg-red-500/5 rounded text-red-400 overflow-x-auto font-mono border border-red-500/20">
                                                                                {result.error}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span className="text-muted-foreground font-medium">Expected:</span>
                                                                        <pre className="mt-1 p-2 bg-background/50 rounded text-foreground overflow-x-auto font-mono border border-border/50 max-h-24">
                                                                            {typeof result.expectedOutput === 'string' ? result.expectedOutput : JSON.stringify(result.expectedOutput, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                    {result.actualOutput && (
                                                                        <div>
                                                                            <span className="text-muted-foreground font-medium text-amber-500/80">Got:</span>
                                                                            <pre className="mt-1 p-2 bg-amber-500/5 rounded text-foreground overflow-x-auto font-mono border border-amber-500/20 max-h-24">
                                                                                {typeof result.actualOutput === 'string' ? result.actualOutput : JSON.stringify(result.actualOutput, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {testResults.every(r => r.passed) && (
                                                    <Alert className="border-green-500 bg-green-500/10">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        <AlertDescription className="text-green-600 dark:text-green-400">
                                                            All test cases passed! Great job! 🎉
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </>
                    ) : (
                        // MCQ Selected Answer Display
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center space-y-4 max-w-md">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg transition-all ${selectedAnswers[currentQuestion] !== -1
                                    ? "bg-gradient-to-br from-primary to-primary/80 shadow-primary/30"
                                    : "bg-muted"
                                    }`}>
                                    {selectedAnswers[currentQuestion] !== -1 ? (
                                        <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
                                    ) : (
                                        <AlertCircle className="w-8 h-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        {selectedAnswers[currentQuestion] !== -1
                                            ? "Answer Selected"
                                            : "No Answer Selected"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedAnswers[currentQuestion] !== -1
                                            ? "You can change your answer by selecting a different option from the left panel."
                                            : "Please select an answer from the options on the left."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div ref={bottomNavRef} className="h-16 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
                <Button
                    variant="outline"
                    onClick={() => {
                        setCurrentQuestion(Math.max(0, currentQuestion - 1));
                        // Smooth scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentQuestion === 0}
                    className="hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                </Button>

                {/* Question Progress */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">
                        Question {currentQuestion + 1} of {questions.length}
                    </span>
                    <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 rounded-full"
                            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <Button
                    onClick={() => {
                        setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1));
                        // Smooth scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentQuestion === questions.length - 1}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
                >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
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
    );
}