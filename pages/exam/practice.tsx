import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
    ArrowRight,
    Home,
    RotateCcw,
    Trophy,
    Target,
    Zap,
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
} from "lucide-react";
import Editor from "@monaco-editor/react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MCQQuestion {
    type: "mcq";
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface CodingQuestion {
    type: "coding";
    language: "python" | "sql" | "javascript" | "java" | "pyspark" | "dax";
    question: string;
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

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [warnings, setWarnings] = useState<string[]>([]);

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
            router.push("/learning");
        }
    }, [router]);

    // Timer
    useEffect(() => {
        if (timeLeft > 0 && !showResults) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && questions.length > 0 && !showResults) {
            handleSubmit();
        }
    }, [timeLeft, showResults]);


    // Fullscreen change detection
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
            );

            setIsFullscreen(isCurrentlyFullscreen);

            // If user exits fullscreen during exam, show warning and pause
            if (!isCurrentlyFullscreen && !showFullscreenPrompt && !showResults) {
                const warning = `Warning: Exited fullscreen at ${new Date().toLocaleTimeString()}`;
                setWarnings(prev => [...prev, warning]);
                alert("⚠️ Warning: You exited fullscreen mode!\n\nPlease return to fullscreen to continue the exam.");
                enterFullscreen();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [showFullscreenPrompt, showResults]);

    // Tab switch / window blur detection
    useEffect(() => {
        if (showFullscreenPrompt || showResults) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                const warning = `Warning: Tab switched at ${new Date().toLocaleTimeString()}`;
                setWarnings(prev => [...prev, warning]);
                setTabSwitchCount(prev => prev + 1);
            }
        };

        const handleBlur = () => {
            if (!showResults) {
                const warning = `Warning: Window lost focus at ${new Date().toLocaleTimeString()}`;
                setWarnings(prev => [...prev, warning]);
                setTabSwitchCount(prev => prev + 1);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [showFullscreenPrompt, showResults]);

    // Show alert after multiple tab switches
    useEffect(() => {
        if (tabSwitchCount > 0 && tabSwitchCount % 3 === 0 && !showResults) {
            alert(`⚠️ Warning: You have switched tabs ${tabSwitchCount} times!\n\nExcessive tab switching may result in exam termination.`);
        }
    }, [tabSwitchCount, showResults]);

    // Prevent right-click and copy-paste
    useEffect(() => {
        if (showFullscreenPrompt || showResults) return;

        const preventContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        const preventCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            return false;
        };

        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('copy', preventCopy);
        document.addEventListener('cut', preventCopy);

        return () => {
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener('copy', preventCopy);
            document.removeEventListener('cut', preventCopy);
        };
    }, [showFullscreenPrompt, showResults]);

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

        try {
            const results: TestResult[] = [];
            const visibleTests = question.testCases.filter((tc) => !tc.isHidden);

            for (const testCase of visibleTests) {
                try {
                    const language = question.language.toLowerCase();
                    let endpoint = "/api/execute/";

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
                    } else {
                        throw new Error(`Unsupported language: ${question.language}`);
                    }

                    const requestBody = language === "sql" || language === "mysql" || language === "postgresql"
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
                            }
                            : {
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
                        const actualOutput = result.output?.trim() || "";
                        const expectedOutput = testCase.expectedOutput.trim();
                        const passed = actualOutput === expectedOutput;

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
            // Store results for this specific question
            setQuestionResults(prev => ({
                ...prev,
                [currentQuestion]: results
            }));
        } catch (error: any) {
            console.error("Error running code:", error);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/practice/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: examDetails?.sessionId || localStorage.getItem("guestSessionId"),
                    examId: examDetails?.id,
                    questions,
                    answers: {
                        mcq: selectedAnswers,
                        coding: codeAnswers
                    },
                    timeSpent: (examDetails?.duration * 60) - timeLeft,
                    topic: examDetails?.topic,
                    difficulty: examDetails?.difficulty,
                    violations: {
                        tabSwitches: tabSwitchCount,
                        warnings: warnings
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSubmissionId(data.submissionId);
            }
        } catch (error) {
            console.error("Error submitting exam:", error);
        } finally {
            exitFullscreen(); // Exit fullscreen after submission
            setShowResults(true);
            setIsSubmitting(false);
        }
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
            // Check if this question has test results
            const results = questionResults[questionIndex];

            if (!results || results.length === 0) {
                return false; // Not run yet
            }

            // Check if all visible test cases passed
            const visibleTests = q.testCases.filter(tc => !tc.isHidden);

            if (visibleTests.length === 0) {
                return false;
            }

            // All results must be passed
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

    // Add this function before the downloadPDF function
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
        const doc = new jsPDF();
        const score = calculateScore();
        const scorePercentage = (score.correct / score.total) * 100;

        // Load logo
        let logoBase64 = '';
        try {
            logoBase64 = await loadImageAsBase64('/logo3.png');
        } catch (error) {
            console.warn('Could not load logo:', error);
        }

        // Page dimensions
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Add watermark
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

        // Add header with logo
        const addHeader = () => {
            // Header background
            doc.setFillColor(63, 169, 160);
            doc.rect(0, 0, pageWidth, 35, 'F');

            // Add logo if available
            if (logoBase64) {
                try {
                    doc.addImage(logoBase64, 'PNG', 10, 5, 25, 25); // x, y, width, height
                } catch (error) {
                    console.warn('Could not add logo to PDF:', error);
                }
            }

            // Company/Platform name (moved to the right of logo)
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('Sysrank Assessment', logoBase64 ? 40 : 15, 15);

            // Subtitle
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Practice Exam Report', logoBase64 ? 40 : 15, 22);

            // Date on the right
            doc.setFontSize(9);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`, pageWidth - 15, 15, { align: 'right' } as any);

            // Reset colors
            doc.setTextColor(50, 50, 50);
        };

        // Add footer
        const addFooter = (pageNum: number, totalPages: number) => {
            // Footer line
            doc.setDrawColor(63, 169, 160);
            doc.setLineWidth(0.5);
            doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

            // Footer text
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.setFont('helvetica', 'normal');

            // Left side - confidential
            doc.text('Confidential - For Review Only', 15, pageHeight - 10);

            // Center - page number
            doc.text(
                `Page ${pageNum} of ${totalPages}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' } as any
            );

            // Right side - website
            doc.text('www.systechusa.com', pageWidth - 15, pageHeight - 10, { align: 'right' } as any);
        };

        // Add watermark to first page
        addWatermark();

        // Add header
        addHeader();

        // Exam Details Section
        let yPos = 45;

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 68, 86);
        doc.text('Practice Exam Report', 15, yPos);

        yPos += 12;

        // Info cards
        const cardData = [
            { label: 'Topic', value: examDetails?.topic || 'N/A' },
            { label: 'Difficulty', value: examDetails?.difficulty || 'N/A' },
            { label: 'Duration', value: `${examDetails?.duration || 'N/A'} minutes` },
            // { label: 'Session ID', value: (examDetails?.sessionId || '').substring(0, 20) + '...' }
        ];

        cardData.forEach((card, index) => {
            const xPos = 15 + (index % 2) * 95;
            const cardY = yPos + Math.floor(index / 2) * 20;

            // Card background
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(xPos, cardY, 90, 16, 2, 2, 'F');

            // Label
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(card.label, xPos + 3, cardY + 6);

            // Value
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(50, 50, 50);
            doc.text(card.value, xPos + 3, cardY + 12);
        });

        yPos += 50;

        // Score Section with visual circle
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(63, 169, 160);
        doc.text('Score Summary', 15, yPos);

        yPos += 10;

        // Score circle
        const centerX = pageWidth / 2;
        const circleY = yPos + 25;
        const radius = 20;

        // Outer circle (background)
        doc.setFillColor(240, 240, 240);
        doc.circle(centerX, circleY, radius, 'F');

        // Score color based on percentage
        let scoreColorR = 239, scoreColorG = 68, scoreColorB = 68;
        if (scorePercentage >= 70) {
            scoreColorR = 34; scoreColorG = 197; scoreColorB = 94;
        } else if (scorePercentage >= 50) {
            scoreColorR = 234; scoreColorG = 179; scoreColorB = 8;
        }

        // Draw score percentage as text in circle
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(scoreColorR, scoreColorG, scoreColorB);
        doc.text(`${Math.round(scorePercentage)}%`, centerX, circleY, { align: 'center' } as any);

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Overall Score', centerX, circleY + 6, { align: 'center' } as any);

        // Stats boxes around circle
        const stats = [
            { label: 'Correct', value: score.correct, r: 34, g: 197, b: 94, x: 30, y: circleY - 10 },
            { label: 'Incorrect', value: score.incorrect, r: 239, g: 68, b: 68, x: 30, y: circleY + 10 },
            { label: 'Total', value: score.total, r: 63, g: 169, b: 160, x: pageWidth - 50, y: circleY - 10 },
            { label: 'Tab Switches', value: tabSwitchCount, r: 234, g: 179, b: 8, x: pageWidth - 50, y: circleY + 10 }
        ];

        stats.forEach(stat => {
            doc.setFillColor(stat.r, stat.g, stat.b);
            doc.roundedRect(stat.x - 3, stat.y - 5, 35, 10, 1, 1, 'F');

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(stat.value.toString(), stat.x, stat.y, { align: 'left' } as any);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(stat.label, stat.x + 12, stat.y, { align: 'left' } as any);
        });

        yPos += 60;

        // Performance badge
        let performance = "Needs Improvement";
        let perfR = 239, perfG = 68, perfB = 68;
        if (scorePercentage >= 70) {
            performance = "Excellent";
            perfR = 34; perfG = 197; perfB = 94;
        } else if (scorePercentage >= 50) {
            performance = "Good";
            perfR = 234; perfG = 179; perfB = 8;
        }

        doc.setFillColor(perfR, perfG, perfB);
        doc.roundedRect(15, yPos, 70, 12, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`Performance: ${performance}`, 18, yPos + 8);

        yPos += 20;

        // Violations warning (if any)
        if (warnings.length > 0) {
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(239, 68, 68);
            doc.setLineWidth(1);
            doc.roundedRect(15, yPos, pageWidth - 30, 8 + (warnings.length * 5), 2, 2, 'FD');

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(239, 68, 68);
            doc.text('WARNING: Exam Violations Detected', 18, yPos + 6);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            warnings.slice(0, 3).forEach((warning, idx) => {
                doc.text(`• ${warning}`, 20, yPos + 12 + (idx * 5));
            });

            yPos += 10 + (warnings.length * 5);
        }

        yPos += 10;

        // Questions Review Section
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(63, 169, 160);
        doc.text('Questions Review', 15, yPos);

        yPos += 8;

        // Prepare table data
        const tableData = questions.map((q, index) => {
            const isCorrect = getQuestionResult(index);
            const hasRun = hasQuestionBeenRun(index);

            if (q.type === "mcq") {
                return [
                    `Q${index + 1}`,
                    "MCQ",
                    hasRun ? (isCorrect ? "PASS" : "FAIL") : "NOT ANSWERED",
                    hasRun ? (isCorrect ? "Correct" : "Incorrect") : "Not Answered"
                ];
            } else {
                const results = questionResults[index];
                let statusText = "Not Run";

                if (results && results.length > 0) {
                    const passedCount = results.filter(r => r.passed).length;
                    const totalCount = results.length;

                    if (passedCount === totalCount) {
                        statusText = `All Tests Passed (${totalCount}/${totalCount})`;
                    } else if (passedCount > 0) {
                        statusText = `Partial (${passedCount}/${totalCount} Tests)`;
                    } else {
                        statusText = `Failed (${passedCount}/${totalCount} Tests)`;
                    }
                }

                return [
                    `Q${index + 1}`,
                    q.language.toUpperCase(),
                    hasRun ? (isCorrect ? "PASS" : "FAIL") : "NOT ANSWERED",
                    statusText
                ];
            }
        });

        // Draw table
        autoTable(doc, {
            startY: yPos,
            head: [["Question", "Type", "Result", "Status"]],
            body: tableData,
            theme: "grid",
            headStyles: {
                fillColor: [63, 169, 160],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 10,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [50, 50, 50]
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 25 },
                1: { halign: 'center', cellWidth: 35 },
                2: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
                3: { halign: 'left' }
            },
            margin: { left: 15, right: 15 },
            didDrawCell: (data: any) => {
                // Color code the Result column
                if (data.column.index === 2 && data.section === 'body') {
                    const result = data.cell.text[0];
                    if (result === 'PASS') {
                        doc.setTextColor(34, 197, 94);
                    } else if (result === 'FAIL') {
                        doc.setTextColor(239, 68, 68);
                    } else {
                        doc.setTextColor(156, 163, 175);
                    }
                    doc.text(result, data.cell.x + data.cell.width / 2, data.cell.y + 6, { align: 'center' } as any);
                }
            }
        });

        // Add footer to all pages
        const pageCount = (doc as any).internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            addFooter(i, pageCount);
            if (i > 1) {
                addWatermark();
                addHeader();
            }
        }

        // Save the PDF
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
        if (document.exitFullscreen) {
            document.exitFullscreen();
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

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                        <div>
                            <h3 className="font-semibold text-foreground mb-2">No Practice Exam Found</h3>
                            <p className="text-sm text-muted-foreground">
                                Start a new practice exam from the learning page.
                            </p>
                        </div>
                        <Button onClick={() => router.push("/learning")} className="w-full">
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
            <>
                <Head>
                    <title>Practice Results | {examDetails?.topic}</title>
                </Head>

                <div className="min-h-screen bg-background">
                    {/* Header */}
                    <header className="border-b border-border bg-card sticky top-0 z-50">
                        <div className="container mx-auto px-4 sm:px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                                        <Trophy className="w-5 h-5 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-foreground">Practice Complete</h1>
                                        <p className="text-xs text-muted-foreground">{examDetails?.topic}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => router.push("/learning")}>
                                    <Home className="w-4 h-4 mr-2" />
                                    Home
                                </Button>
                            </div>
                        </div>
                    </header>

                    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
                        {/* Score Card */}
                        <Card className="mb-6">
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    {/* Score Circle */}
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-32 h-32">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="64"
                                                    cy="64"
                                                    r="56"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    className="text-muted"
                                                />
                                                <circle
                                                    cx="64"
                                                    cy="64"
                                                    r="56"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    strokeDasharray={`${2 * Math.PI * 56}`}
                                                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - scorePercentage / 100)}`}
                                                    className={`transition-all duration-1000 ${scorePercentage >= 70 ? "text-green-500" :
                                                        scorePercentage >= 50 ? "text-yellow-500" : "text-red-500"
                                                        }`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className="text-3xl font-bold text-foreground">
                                                    {Math.round(scorePercentage)}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">Score</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                                        <div className="text-center p-4 rounded-lg bg-green-500/10">
                                            <div className="text-2xl font-bold text-green-500">{score.correct}</div>
                                            <div className="text-xs text-muted-foreground mt-1">Correct</div>
                                        </div>
                                        <div className="text-center p-4 rounded-lg bg-red-500/10">
                                            <div className="text-2xl font-bold text-red-500">{score.incorrect}</div>
                                            <div className="text-xs text-muted-foreground mt-1">Incorrect</div>
                                        </div>
                                        <div className="text-center p-4 rounded-lg bg-primary/10">
                                            <div className="text-2xl font-bold text-primary">{score.total}</div>
                                            <div className="text-xs text-muted-foreground mt-1">Total</div>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-6" />

                                {/* Actions */}
                                <div className="flex flex-wrap gap-3">
                                    <Button variant="outline" onClick={() => router.push("/learning")} className="flex-1 sm:flex-none">
                                        <Home className="w-4 h-4 mr-2" />
                                        Home
                                    </Button>
                                    <Button variant="outline" onClick={downloadPDF} className="flex-1 sm:flex-none">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Report
                                    </Button>
                                    <Button className="flex-1 sm:flex-none">
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Try Again
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Review Answers */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-foreground">Review Your Answers</h2>
                            {questions.map((q, index) => {
                                const isCorrect = getQuestionResult(index);
                                const hasRun = hasQuestionBeenRun(index);
                                if (q.type === "mcq") {
                                    return (
                                        <Card key={index}>
                                            <CardContent className="pt-6">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-green-500/10" : "bg-red-500/10"
                                                        }`}>
                                                        {isCorrect ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <h3 className="font-medium text-foreground">
                                                                Question {index + 1}
                                                                <Badge className="ml-2" variant={isCorrect ? "default" : "destructive"}>
                                                                    {isCorrect ? "Correct" : "Incorrect"}
                                                                </Badge>
                                                            </h3>
                                                        </div>
                                                        <p className="text-foreground mb-4">{q.question}</p>
                                                        <div className="space-y-2">
                                                            {q.options.map((option, optionIndex) => {
                                                                const isCorrectAnswer = optionIndex === q.correctAnswer;
                                                                const isSelectedAnswer = optionIndex === selectedAnswers[index];
                                                                return (
                                                                    <div
                                                                        key={optionIndex}
                                                                        className={`p-3 rounded-lg border-2 ${isCorrectAnswer
                                                                            ? "border-green-500 bg-green-500/5"
                                                                            : isSelectedAnswer
                                                                                ? "border-red-500 bg-red-500/5"
                                                                                : "border-border"
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isCorrectAnswer || isSelectedAnswer ? "border-current" : "border-border"
                                                                                }`}>
                                                                                {(isCorrectAnswer || isSelectedAnswer) && (
                                                                                    <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                                                                                )}
                                                                            </div>
                                                                            <span className={isCorrectAnswer || isSelectedAnswer ? "font-medium" : ""}>
                                                                                {option}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {q.explanation && (
                                                            <Alert className="mt-4">
                                                                <AlertCircle className="h-4 w-4" />
                                                                <AlertDescription>{q.explanation}</AlertDescription>
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
                                        <Card key={index}>
                                            <CardContent className="pt-6">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${hasRun ? (isCorrect ? "bg-green-500/10" : "bg-red-500/10") : "bg-gray-500/10"
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
                                                        <div className="flex items-start justify-between mb-3">
                                                            <h3 className="font-medium text-foreground">
                                                                Question {index + 1}
                                                                <Badge className="ml-2" variant={hasRun ? (isCorrect ? "default" : "destructive") : "secondary"}>
                                                                    {hasRun ? (isCorrect ? "Passed" : "Failed") : "Not Run"}
                                                                </Badge>
                                                            </h3>
                                                        </div>
                                                        <p className="text-foreground mb-2 font-semibold">{q.question}</p>
                                                        <p className="text-muted-foreground text-sm mb-4">{q.description}</p>

                                                        {results && results.length > 0 && (
                                                            <div className="space-y-2 mt-4">
                                                                <h4 className="text-sm font-semibold text-foreground">Test Results:</h4>
                                                                {results.map((result, idx) => (
                                                                    <div key={idx} className={`p-3 rounded-lg border-2 ${result.passed ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"
                                                                        }`}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-sm font-medium">Test Case {idx + 1}</span>
                                                                            <Badge variant={result.passed ? "default" : "destructive"} className="text-xs">
                                                                                {result.passed ? "Passed" : "Failed"}
                                                                            </Badge>
                                                                        </div>
                                                                        {!result.passed && result.error && (
                                                                            <div className="text-xs mt-2">
                                                                                <span className="text-muted-foreground">Error:</span>
                                                                                <pre className="mt-1 p-2 bg-background rounded text-red-400 overflow-x-auto text-xs">
                                                                                    {result.error}
                                                                                </pre>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {!hasRun && (
                                                            <Alert className="mt-4">
                                                                <AlertCircle className="h-4 w-4" />
                                                                <AlertDescription>
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
            </>
        );
    }

    // Fullscreen Prompt
    if (showFullscreenPrompt && !showResults) {
        return (
            <>
                <Head>
                    <title>Enter Fullscreen | Practice Exam</title>
                </Head>

                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full">
                        <CardContent className="pt-8 pb-6">
                            <div className="text-center space-y-6">
                                {/* Icon */}
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-10 h-10 text-primary" />
                                </div>

                                {/* Title */}
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Fullscreen Mode Required
                                    </h2>
                                    <p className="text-muted-foreground">
                                        To maintain exam integrity, you must enter fullscreen mode
                                    </p>
                                </div>

                                {/* Exam Details */}
                                <Card className="bg-muted/50">
                                    <CardContent className="pt-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-primary">
                                                    {examDetails?.topic}
                                                </div>
                                                <div className="text-muted-foreground">Topic</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-primary">
                                                    {questions.length}
                                                </div>
                                                <div className="text-muted-foreground">Questions</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-primary">
                                                    {examDetails?.duration}
                                                </div>
                                                <div className="text-muted-foreground">Minutes</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-primary capitalize">
                                                    {examDetails?.difficulty}
                                                </div>
                                                <div className="text-muted-foreground">Difficulty</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Separator />

                                {/* Rules */}
                                <div className="text-left space-y-3">
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                        <Target className="w-5 h-5 text-primary" />
                                        Exam Rules
                                    </h3>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>You must remain in fullscreen mode throughout the exam</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <span>Switching tabs or windows will be recorded as a violation</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <span>Right-click and copy-paste are disabled during the exam</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                            <span>Timer starts immediately after entering fullscreen</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                            <span>Excessive violations may result in automatic submission</span>
                                        </li>
                                    </ul>
                                </div>

                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">F11</kbd> or click the button below to enter fullscreen mode
                                    </AlertDescription>
                                </Alert>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push("/learning")}
                                        className="flex-1"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleStartExam}
                                        className="flex-1 bg-primary hover:bg-primary/90"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Exam in Fullscreen
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    // Main Exam Interface - HackerRank Style
    return (
        <>
            <Head>
                <title>Practice Exam | {examDetails?.topic}</title>
            </Head>

            <div className="h-screen flex flex-col bg-background">
                {/* Top Navigation Bar */}
                <header className="h-14 border-b border-border bg-card flex items-center px-4 flex-shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => router.push("/learning")}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Exit
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex items-center gap-2">
                                <Code2 className="w-5 h-5 text-primary" />
                                <span className="font-semibold text-foreground">{examDetails?.topic}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Warning Badge */}
                            {tabSwitchCount > 0 && (
                                <Badge variant="destructive" className="animate-pulse">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {tabSwitchCount} Warning{tabSwitchCount > 1 ? 's' : ''}
                                </Badge>
                            )}
                            {/* Timer */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                                <Clock className={`w-4 h-4 ${timeLeft < 300 ? "text-red-500" : "text-muted-foreground"}`} />
                                <span className={`font-mono text-sm ${timeLeft < 300 ? "text-red-500 font-bold" : "text-foreground"}`}>
                                    {formatTime(timeLeft)}
                                </span>
                            </div>

                            {/* Submit Button */}
                            <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
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
                    <div className="w-1/2 border-r border-border flex flex-col bg-card">
                        {/* Problem Navigation */}
                        <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                                <TabsList className="bg-transparent border-0 h-auto p-0">
                                    <TabsTrigger value="problem" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Problem
                                    </TabsTrigger>
                                    <TabsTrigger value="submission" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                                        <ListChecks className="w-4 h-4 mr-2" />
                                        Submissions
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Problem Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6 space-y-6">
                                {/* Question Header */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h1 className="text-2xl font-bold text-foreground">
                                            {currentQuestion + 1}. {currentQ.type === "coding" ? currentQ.question : currentQ.question}
                                        </h1>
                                    </div>
                                    {currentQ.type === "coding" && (
                                        <Badge variant="outline">
                                            <Code2 className="w-3 h-3 mr-1" />
                                            {currentQ.language.toUpperCase()}
                                        </Badge>
                                    )}
                                </div>

                                <Separator />

                                {/* Problem Description */}
                                {currentQ.type === "coding" ? (
                                    <div className="space-y-4">
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <div
                                                className="text-foreground leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: currentQ.description }}
                                            />
                                        </div>

                                        {/* Test Cases */}
                                        {currentQ.testCases.filter(tc => !tc.isHidden).length > 0 && (
                                            <div className="space-y-3">
                                                <h3 className="font-semibold text-foreground">Sample Test Cases</h3>
                                                {currentQ.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                                                    <div key={idx} className="rounded-lg border border-border bg-muted/50 overflow-hidden">
                                                        <div className="px-4 py-2 bg-muted border-b border-border">
                                                            <span className="text-sm font-medium text-foreground">Test Case {idx + 1}</span>
                                                        </div>
                                                        <div className="p-4 space-y-3">
                                                            <div>
                                                                <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
                                                                <pre className="text-sm bg-background p-3 rounded border border-border overflow-x-auto">
                                                                    <code className="text-foreground">{tc.input || "No input"}</code>
                                                                </pre>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-medium text-muted-foreground mb-1">Expected Output:</div>
                                                                <pre className="text-sm bg-background p-3 rounded border border-border overflow-x-auto">
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
                                                }}
                                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedAnswers[currentQuestion] === optionIndex
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedAnswers[currentQuestion] === optionIndex
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
                    <div className="w-1/2 flex flex-col bg-background">
                        {currentQ.type === "coding" ? (
                            <>
                                {/* Editor Header */}
                                <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-card">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium text-foreground">Code Editor</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {currentQ.language}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {showSolution && (
                                            <Badge variant="outline" className="text-xs">
                                                <Eye className="w-3 h-3 mr-1" />
                                                Solution Visible
                                            </Badge>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowSolution(!showSolution)}
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
                                <div className="flex-1 overflow-hidden">
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
                                        }}
                                    />
                                </div>

                                {/* Run Code Panel */}
                                <div className="border-t border-border bg-card">
                                    {/* Action Bar */}
                                    <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                                        <span className="text-sm font-medium text-foreground">Test Results</span>
                                        <Button
                                            onClick={handleRunCode}
                                            disabled={isRunning}
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
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
                                                        <div key={idx} className={`p-3 rounded-lg border-2 ${result.passed
                                                            ? "border-green-500 bg-green-500/5"
                                                            : "border-red-500 bg-red-500/5"
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
                                                                <Badge variant={result.passed ? "default" : "destructive"} className="text-xs">
                                                                    {result.passed ? "Passed" : "Failed"}
                                                                </Badge>
                                                            </div>
                                                            {!result.passed && (
                                                                <div className="text-xs space-y-2 mt-2">
                                                                    {result.error && (
                                                                        <div>
                                                                            <span className="text-muted-foreground">Error:</span>
                                                                            <pre className="mt-1 p-2 bg-background rounded text-red-400 overflow-x-auto">
                                                                                {result.error}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span className="text-muted-foreground">Expected:</span>
                                                                        <pre className="mt-1 p-2 bg-background rounded text-foreground overflow-x-auto">
                                                                            {result.expectedOutput}
                                                                        </pre>
                                                                    </div>
                                                                    {result.actualOutput && (
                                                                        <div>
                                                                            <span className="text-muted-foreground">Got:</span>
                                                                            <pre className="mt-1 p-2 bg-background rounded text-foreground overflow-x-auto">
                                                                                {result.actualOutput}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
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
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                        {selectedAnswers[currentQuestion] !== -1 ? (
                                            <CheckCircle2 className="w-8 h-8 text-primary" />
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
                <div className="h-16 border-t border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                        disabled={currentQuestion === 0}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                    </Button>

                    {/* Question Progress */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Question {currentQuestion + 1} of {questions.length}
                        </span>
                        <Progress value={((currentQuestion + 1) / questions.length) * 100} className="w-32" />
                    </div>

                    <Button
                        onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                        disabled={currentQuestion === questions.length - 1}
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </>
    );
}