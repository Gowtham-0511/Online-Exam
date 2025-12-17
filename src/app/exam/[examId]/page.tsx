"use client";

import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Code,
    FileText,
    Flag,
    Shield,
    Terminal,
    Database,
    X,
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Dynamic imports for performance
const ProctoringMonitor = dynamic(() => import("@/components/exam/ProctoringMonitor"));
// const ExamTutorial = dynamic(() => import("@/components/exam/ExamTutorial"));
const CodeEditor = dynamic(() => import("@/components/exam/CodeEditor"));
const SubmitSummary = dynamic(() => import("@/components/exam/SubmitSummary"));

// Hooks
import { useExamState } from "@/hooks/useExamState";
import { useExamViolations } from "@/hooks/useExamViolations";

// Utils
import { shuffleArrayWithSeed, fetcher } from "@/utils/examHelpers";

// Types
import type { Question, AnswerWithQuestionId } from "@/types/exam.types";

const ERDiagramModal = dynamic(() => import("@/components/exam/ERDiagramModal"));

export default function ExamPage() {
    const router = useRouter();
    const params = useParams();
    const { examId } = params;

    console.log(examId);
    const { data: session } = useSession();

    const [showRestoreDialog, setShowRestoreDialog] = useState(false);
    const [pendingProgress, setPendingProgress] = useState<any>(null);

    // State management hooks
    const examState = useExamState();
    // const violations = useExamViolations();

    // Destructure for easier access
    const {
        exam,
        setExam,
        code,
        setCode,
        timeLeft,
        setTimeLeft,
        isDisqualified,
        setDisqualified,
        examStarted,
        setExamStarted,
        output,
        setOutput,
        running,
        setRunning,
        answers,
        setAnswers,
        activeQuestionIndex,
        setActiveQuestionIndex,
        sqlResult,
        setSqlResult,
        shuffledQuestions,
        setShuffledQuestions,
        sidebarOpen,
        setSidebarOpen,
        editorTheme,
        setEditorTheme,
        theme,
        setTheme,
        mcqAnswers,
        setMcqAnswers,
        questionFilter,
        setQuestionFilter,
        flaggedQuestions,
        setFlaggedQuestions,
        searchTerm,
        setSearchTerm,
        showSubmitSummary,
        setShowSubmitSummary,
        isSubmitting,
        setIsSubmitting,
        lastSaved,
        setLastSaved,
        isSaving,
        setIsSaving,
        isOnline,
        setIsOnline,
        timeSinceLastSave,
        setTimeSinceLastSave,
        autoSaveIntervalRef,
        showTutorial,
        setShowTutorial,
        tutorialCompleted,
        setTutorialCompleted,
        questionTimeSpent,
        setQuestionTimeSpent,
        codeRunCounts,
        setCodeRunCounts,
        questionTimeRef,
        examFiles,
        setExamFiles,
        schemaData,
        setSchemaData,
        showErDiagram,
        setShowErDiagram
    } = examState;

    const {
        violations,
        setViolations,
        keyViolations,
        setKeyViolations,
        tabSwitchViolations,
        setTabSwitchViolations,
        screenChangeViolations,
        setScreenChangeViolations,
        lastTabSwitchTime,
        setLastTabSwitchTime,
        lastScreenChangeTime,
        setLastScreenChangeTime,
        isTabVisible,
        setIsTabVisible,
        violationsRef,
        keyViolationsRef,
        tabSwitchViolationsRef,
        screenChangeViolationsRef,
        lastVisibilityChangeRef,
        visibilityTimeoutRef,
        handleContextMenuRef,
        handleKeyDownRef,
        handleBlurRef,
        handleFsChangeRef,
        handleVisibilityChangeRef,
        hasSubmittedRef,
    } = useExamViolations();

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;
        }
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };

    const handleMcqSelect = (optionIndex: number) => {
        setMcqAnswers((prev) => ({
            ...prev,
            [activeQuestionIndex]: optionIndex,
        }));
    };

    // Data fetching with SWR
    const { data: examData, error: examError, isLoading: examLoading } = useSWR(
        examId ? `/api/exam/assessment/${examId}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
            onSuccess: (data) => {
                if (!examId) return;

                const seed = examId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const shuffled = shuffleArrayWithSeed(data.questions || [], seed);
                setExam({ ...data, questions: shuffled });
                setShuffledQuestions(shuffled);
                setTimeLeft(data.duration * 60);
                setAnswers(new Array(shuffled.length).fill(""));
                setMcqAnswers({});
            },
            onError: (error) => {
                console.error('Error fetching exam:', error);
                toast.error("Failed to load exam");
                router.push("/attender");
            }
        }
    );

    console.log(exam)

    // Fetch exam files for Python
    const { data: filesData } = useSWR(
        exam?.language === 'python' && examId
            ? `/api/exam/exam-files/${examId}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            onSuccess: (data) => {
                if (data.files) setExamFiles(data.files);
            }
        }
    );

    // Fetch schema for SQL
    const { data: schemaResult } = useSWR(
        exam?.language === 'sql' && examId
            ? `/api/exam/sql/er-diagram?examId=${examId}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            onSuccess: (data) => {
                if (data) setSchemaData(data);
            }
        }
    );

    const currentQuestion = useMemo(() => {
        return exam?.questions[activeQuestionIndex];
    }, [exam?.questions, activeQuestionIndex]);

    // Auto-save functions
    const saveToLocalStorage = useCallback(() => {
        if (!exam || !examId) return;

        const examState = {
            examId: examId.toString(),
            answers,
            mcqAnswers,
            activeQuestionIndex,
            timeLeft,
            lastSaved: new Date().toISOString(),
            flaggedQuestions: Array.from(flaggedQuestions),
            questionTimeSpent,
            codeRunCounts
        };

        try {
            if (session?.user?.email) {
                localStorage.setItem(
                    `exam_${examId}_${session.user.email}`,
                    JSON.stringify(examState)
                );
                setLastSaved(new Date());
            }
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }, [examId, session, exam, answers, mcqAnswers, activeQuestionIndex, timeLeft, flaggedQuestions, questionTimeSpent, codeRunCounts]);

    const loadSavedState = useCallback(() => {
        if (!examId || !session?.user?.email) return false;

        try {
            const saved = localStorage.getItem(`exam_${examId}_${session.user.email}`);
            if (saved) {
                const state = JSON.parse(saved);
                if (state.examId === examId.toString()) {
                    setAnswers(state.answers || []);
                    setMcqAnswers(state.mcqAnswers || {});
                    setActiveQuestionIndex(state.activeQuestionIndex || 0);
                    setFlaggedQuestions(new Set(state.flaggedQuestions || []));
                    setQuestionTimeSpent(state.questionTimeSpent || {});
                    setCodeRunCounts(state.codeRunCounts || {});
                    setTimeLeft(state.timeLeft || (exam?.duration ? exam.duration * 60 : 0));
                    setLastSaved(new Date(state.lastSaved));

                    toast.success('Previous session restored!');
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to load saved state:', error);
        }
        return false;
    }, [examId, session, exam]);

    const clearSavedState = useCallback(() => {
        if (!examId || !session?.user?.email) return;

        try {
            localStorage.removeItem(`exam_${examId}_${session.user.email}`);
            console.log('Saved state cleared');
        } catch (error) {
            console.error('Failed to clear saved state:', error);
        }
    }, [examId, session]);

    // Answer management

    const isQuestionAnswered = useCallback((index: number) => {
        const question = exam?.questions[index];
        if (question?.type === "mcq") {
            return mcqAnswers[index] !== undefined;
        }
        const answer = answers[index] || '';
        const isAnswered = answer.trim() !== '';
        console.log(`Q${index + 1} answered:`, isAnswered, 'Length:', answer.length);
        return isAnswered;
    }, [answers, mcqAnswers, exam]);

    const toggleFlag = useCallback((index: number) => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            const action = newSet.has(index) ? 'unflag' : 'flag';

            if (newSet.has(index)) {
                newSet.delete(index);
                toast.success(`Question ${index + 1} unflagged`);
            } else {
                newSet.add(index);
                toast.success(`Question ${index + 1} flagged for review`);
            }

            return newSet;
        });
    }, []);

    // Computed values
    const answeredCount = useMemo(() => {
        return answers.filter(answer => answer && answer.trim() !== "").length;
    }, [answers]);

    // Code execution handlers
    const handleRun = async () => {
        if (!exam) return;

        setRunning(true);
        setOutput("Running...");

        setCodeRunCounts(prev => ({
            ...prev,
            [activeQuestionIndex]: (prev[activeQuestionIndex] || 0) + 1
        }));

        try {
            if (exam.language === "sql") await handleRunSql();
            else if (exam.language === "python") await handleRunPython();
            else alert("Unsupported language");
        } catch (err: any) {
            setOutput("Error running code.");
        }

        setRunning(false);
    };

    const handleRunPython = async () => {
        setRunning(true);
        setOutput("Running Python...");

        try {
            const res = await fetch("/api/exam/run-python-docker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    examId: examId?.toString(),
                    userEmail: session?.user?.email || 'anonymous'
                }),
            });

            const data = await res.json();

            if (data.success) {
                setOutput(data.output || "Code executed successfully");
            } else {
                setOutput(data.error || data.output || "Execution failed");
            }
        } catch (err) {
            setOutput("Error while running Python.");
        }

        setRunning(false);
    };

    const handleRunSql = async () => {
        setRunning(true);
        setOutput("Running...");
        setSqlResult(null);

        try {
            const res = await fetch("/api/exam/run-sql-docker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: code,
                    examId: examId,
                    userEmail: session?.user?.email || 'anonymous'
                }),
            });

            const data = await res.json();

            if (data.error) {
                setOutput("❌ Error:\n" + data.error);
                setSqlResult(null);
            } else {
                setOutput("");
                setSqlResult({
                    columns: data.columns,
                    rows: data.rows,
                });
            }
        } catch (e) {
            setOutput("✅ Query executed successfully");
            setSqlResult(null);
        }

        setRunning(false);
    };

    // Submission handlers
    const cleanupExamEnvironment = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => { });
        }

        if (handleContextMenuRef.current) {
            document.removeEventListener("contextmenu", handleContextMenuRef.current);
        }
        if (handleVisibilityChangeRef.current) {
            document.removeEventListener("visibilitychange", handleVisibilityChangeRef.current);
        }
        if (handleFsChangeRef.current) {
            document.removeEventListener("fullscreenchange", handleFsChangeRef.current);
        }
        if (handleBlurRef.current) {
            window.removeEventListener("blur", handleBlurRef.current);
        }
        if (handleKeyDownRef.current) {
            document.removeEventListener("keydown", handleKeyDownRef.current);
        }
        if (visibilityTimeoutRef.current) {
            clearTimeout(visibilityTimeoutRef.current);
            visibilityTimeoutRef.current = null;
        }

        handleContextMenuRef.current = null;
        handleVisibilityChangeRef.current = null;
        handleFsChangeRef.current = null;
        handleBlurRef.current = null;
        handleKeyDownRef.current = null;
        setExamStarted(false);
        setDisqualified(false);
        setViolations(0);
        setKeyViolations(0);
        tabSwitchViolationsRef.current = 0;
        screenChangeViolationsRef.current = 0;
        setTabSwitchViolations(0);
        setScreenChangeViolations(0);
        setLastTabSwitchTime("");
        setLastScreenChangeTime("");
        setIsTabVisible(true);
    };

    const handleSubmitWithDisqualification = async (disqualifiedFlag: boolean) => {
        if (hasSubmittedRef.current) return;

        hasSubmittedRef.current = true;

        if (!exam || !session) return;

        console.log(disqualifiedFlag, "disqualifiedFlag");

        const email = session.user?.email || "unknown";
        const userName = session.user?.name || "Anonymous";
        const examIdStr = examId?.toString() || "unknown";

        const answersWithQuestionIds = answers.map((answer, index) => ({
            questionId: shuffledQuestions[index]?.id || index,
            question: shuffledQuestions[index]?.question || '',
            answer: answer,
            originalIndex: index
        }));

        await fetch("/api/exam/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                examId: examIdStr,
                email,
                userName,
                answers,
                answersWithQuestionIds,
                disqualified: disqualifiedFlag,
                code,
            }),
        });
        await cleanupExamEnvironment();
        router.push("/attender");
    };

    const handleSubmit = async () => {
        if (hasSubmittedRef.current) return;

        hasSubmittedRef.current = true;
        setIsSubmitting(true);

        if (!exam || !session) {
            setIsSubmitting(false);
            return;
        }

        const email = session.user?.email || "unknown";
        const userName = session.user?.name || "Anonymous";
        const examIdStr = examId?.toString() || "unknown";

        const answersWithQuestionIds: AnswerWithQuestionId[] = answers.map((answer, index) => {
            const question = shuffledQuestions[index];
            const isMcq = question?.type === 'mcq';

            let mcqAnswer = '';
            if (isMcq && mcqAnswers[index] !== undefined) {
                const selectedOptionIndex = mcqAnswers[index];
                mcqAnswer = question?.options?.[selectedOptionIndex]?.text || '';
            }

            return {
                questionId: question?.id || index,
                question: question?.question || '',
                answer: isMcq ? mcqAnswer : answer,
                marks: question?.marks || 0,
                originalIndex: index,
                type: question?.type || 'coding',
                selectedOption: isMcq ? mcqAnswers[index] : undefined,
                selectedOptionText: isMcq ? mcqAnswer : undefined
            };
        });

        try {
            const result = await fetch("/api/exam/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    examId: examIdStr,
                    email,
                    userName,
                    answers,
                    answersWithQuestionIds,
                    disqualified: isDisqualified,
                    code,
                }),
            });

            if (result.ok || result.status === 202) {
                const data = await result.json();

                clearSavedState();
                toast.success('Exam submitted successfully!');

                await cleanupExamEnvironment();
                setIsSubmitting(false);

                setTimeout(() => {
                    router.push("/attender");
                }, 1000);

            } else {
                throw new Error('Submission failed');
            }

        } catch (error) {
            console.error("Submission failed:", error);

            toast.error('Submission failed. Retrying...');

            setTimeout(async () => {
                try {
                    const retryResult = await fetch("/api/exam/submissions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            examId: examIdStr,
                            email,
                            userName,
                            answers,
                            answersWithQuestionIds,
                            disqualified: isDisqualified,
                            code,
                        }),
                    });

                    if (retryResult.ok || retryResult.status === 202) {
                        clearSavedState();
                        toast.success('Exam submitted successfully!');
                        await cleanupExamEnvironment();
                        setIsSubmitting(false);
                        router.push("/attender");
                    } else {
                        toast.error('Final submission attempt failed. Please contact support.');
                        hasSubmittedRef.current = false;
                        setIsSubmitting(false);
                    }
                } catch (retryError) {
                    console.error("Retry submission failed:", retryError);
                    toast.error('Failed to submit. Please contact support.');
                    hasSubmittedRef.current = false;
                    setIsSubmitting(false);
                }
            }, 2000);
        }
    };

    const handleDisqualification = async (reason: string) => {
        setDisqualified(true);
        toast.error(`🚫 Disqualified: ${reason}`);

        const examIdStr = examId?.toString() || "unknown";

        let imageBase64 = "";

        await fetch("/api/exam/store-violation-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image: imageBase64,
                examId: examIdStr,
                email: session?.user?.email || "unknown",
                reason,
                time: new Date().toISOString(),
            }),
        });

        handleSubmitWithDisqualification(true);
    };

    // Save exam progress
    const saveExamProgress = async () => {
        if (!exam) return;

        setIsSaving(true);

        try {
            const progressData = {
                examId: exam.id,
                email: session?.user.email,
                answers: answers,
                mcqAnswers: mcqAnswers,
                activeQuestionIndex: activeQuestionIndex,
                timeLeft: timeLeft,
                flaggedQuestions: Array.from(flaggedQuestions),
                questionTimeSpent: questionTimeSpent,
                codeRunCounts: codeRunCounts,
                lastSaved: new Date().toISOString(),
            };

            // Save to localStorage as backup
            localStorage.setItem(`exam_progress_${exam.id}`, JSON.stringify(progressData));

            // Save to server
            const response = await fetch('/api/exam/save-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(progressData),
            });

            if (response.ok) {
                const data = await response.json();
                setLastSaved(new Date());
                toast.success('Progress saved successfully!');
                console.log('Saved at:', data.savedAt);
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save to server. Saved locally as backup.');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save every 30 seconds
    useEffect(() => {
        if (!examStarted || !exam) return;

        const autoSaveInterval = setInterval(() => {
            saveExamProgress();
        }, 30000); // 30 seconds

        return () => clearInterval(autoSaveInterval);
    }, [examStarted, exam, answers, mcqAnswers, activeQuestionIndex, timeLeft, flaggedQuestions]);

    // Save when changing questions
    useEffect(() => {
        if (examStarted && exam) {
            saveExamProgress();
        }
    }, [activeQuestionIndex]);

    // Add keyboard shortcuts (optional)
    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            // Don't trigger if typing in editor
            if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
                return;
            }

            // Next question: Ctrl/Cmd + ]
            if ((e.ctrlKey || e.metaKey) && e.key === ']') {
                e.preventDefault();
                setActiveQuestionIndex(prev =>
                    Math.min((exam?.questions.length || 1) - 1, prev + 1)
                );
            }

            // Previous question: Ctrl/Cmd + [
            if ((e.ctrlKey || e.metaKey) && e.key === '[') {
                e.preventDefault();
                setActiveQuestionIndex(prev => Math.max(0, prev - 1));
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [exam?.questions.length]);

    // Theme effect
    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    // Paste detection
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (examStarted && !hasSubmittedRef.current) {
                const pastedText = e.clipboardData?.getData('text') || '';
                if (pastedText.length > 50) {
                    toast.error('Paste detected!');
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [examStarted, activeQuestionIndex]);

    // Mouse idle detection
    useEffect(() => {
        let idleTimer: NodeJS.Timeout;
        let lastMouseMove = Date.now();

        const handleMouseMove = () => {
            lastMouseMove = Date.now();
        };

        const checkIdle = () => {
            const idleTime = Date.now() - lastMouseMove;
            if (idleTime > 60000 && examStarted && !hasSubmittedRef.current) {
                toast.error('Mouse idle detected!');
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        idleTimer = setInterval(checkIdle, 30000);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            clearInterval(idleTimer);
        };
    }, [examStarted, activeQuestionIndex]);

    // Typing pattern detection
    useEffect(() => {
        let typingStartTime: number | null = null;
        let charCount = 0;

        const handleKeyPress = () => {
            if (!typingStartTime) {
                typingStartTime = Date.now();
                charCount = 0;
            }

            charCount++;

            const elapsed = Date.now() - typingStartTime;
            if (elapsed > 0) {
                const charsPerSecond = (charCount / elapsed) * 1000;

                if (charsPerSecond > 10 && charCount > 50) {
                    toast.error('Rapid typing detected!');

                    typingStartTime = null;
                    charCount = 0;
                }
            }
        };

        document.addEventListener('keypress', handleKeyPress);
        return () => document.removeEventListener('keypress', handleKeyPress);
    }, [examStarted, activeQuestionIndex]);

    // Tab focus loss tracking
    useEffect(() => {
        const handleFocusLoss = () => {
            if (examStarted && !hasSubmittedRef.current) {
                toast.error('Tab focus loss detected!');
            }
        };

        window.addEventListener('blur', handleFocusLoss);
        return () => window.removeEventListener('blur', handleFocusLoss);
    }, [examStarted, activeQuestionIndex]);

    // Screen change tracking
    useEffect(() => {
        const handleScreenChange = () => {
            if (!examStarted || hasSubmittedRef.current) return;

            const currentScreen = {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight
            };

            const initialScreen = window.initialScreenInfo;

            if (initialScreen &&
                (currentScreen.width !== initialScreen.width ||
                    currentScreen.height !== initialScreen.height ||
                    currentScreen.availWidth !== initialScreen.availWidth ||
                    currentScreen.availHeight !== initialScreen.availHeight)) {

                screenChangeViolationsRef.current += 1;
                const newCount = screenChangeViolationsRef.current;
                const timestamp = new Date().toLocaleTimeString();

                setScreenChangeViolations(newCount);
                setLastScreenChangeTime(timestamp);

                console.log(`Screen change detected. Count: ${newCount}/3 at ${timestamp}`);

                if (newCount >= 3) {
                    handleDisqualification(`Screen configuration changes - changed ${newCount} times`);
                } else {
                    toast.error(`⚠️ Screen change detected. Warning ${newCount}/3`);
                }
            }
        };

        window.addEventListener('resize', handleScreenChange);
        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleScreenChange);
        }

        return () => {
            window.removeEventListener('resize', handleScreenChange);
            if (screen.orientation) {
                screen.orientation.removeEventListener('change', handleScreenChange);
            }
        };
    }, [examStarted]);

    // Fullscreen monitoring with 3-strike system
    useEffect(() => {
        const onFsChange = () => {
            if (!document.fullscreenElement && examStarted && !hasSubmittedRef.current) {
                // Increment violation count
                screenChangeViolationsRef.current += 1;
                const newCount = screenChangeViolationsRef.current;
                const timestamp = new Date().toLocaleTimeString();

                // Update state
                setScreenChangeViolations(newCount);
                setLastScreenChangeTime(timestamp);

                // Update total violations
                violationsRef.current += 1;
                setViolations(violationsRef.current);

                // Track the violation
                toast.error(`⚠️ Fullscreen exit detected. Warning ${newCount}/3`);

                console.log(`Fullscreen exited. Violation ${violationsRef.current}/3 at ${timestamp}`);

                // Check if should disqualify
                if (violationsRef.current >= 3) {
                    console.log("3 violations reached - disqualifying");
                    setDisqualified(true);
                    handleSubmitWithDisqualification(true);
                } else {
                    // Show warning toast
                    toast.error(`⚠️ Warning: Fullscreen exit detected! Violation ${violationsRef.current}/3`);

                    // Optional: Show alert
                    if (violationsRef.current === 2) {
                        alert('⚠️ FINAL WARNING: One more violation will disqualify you from the exam!');
                    }
                }
            }
        };

        document.addEventListener("fullscreenchange", onFsChange);
        document.addEventListener("webkitfullscreenchange", onFsChange);
        document.addEventListener("mozfullscreenchange", onFsChange);

        return () => {
            document.removeEventListener("fullscreenchange", onFsChange);
            document.removeEventListener("webkitfullscreenchange", onFsChange);
            document.removeEventListener("mozfullscreenchange", onFsChange);
        };
    }, [examStarted]);

    // Visibility change and tab switch detection
    useEffect(() => {
        if (!examStarted || hasSubmittedRef.current) return;

        const handleVisibilityChange = () => {
            const now = Date.now();
            const timeSinceLastChange = now - lastVisibilityChangeRef.current;

            if (timeSinceLastChange < 500) return;

            lastVisibilityChangeRef.current = now;

            if (document.hidden) {
                setIsTabVisible(false);

                if (visibilityTimeoutRef.current) {
                    clearTimeout(visibilityTimeoutRef.current);
                }

                visibilityTimeoutRef.current = setTimeout(() => {
                    if (document.hidden && !hasSubmittedRef.current) {
                        tabSwitchViolationsRef.current += 1;
                        const newCount = tabSwitchViolationsRef.current;
                        const timestamp = new Date().toLocaleTimeString();

                        setTabSwitchViolations(newCount);
                        setLastTabSwitchTime(timestamp);

                        console.log(`Tab switch violation detected. Count: ${newCount}/3 at ${timestamp}`);

                        if (newCount >= 3) {
                            handleDisqualification(`Tab switching violations - switched tabs ${newCount} times`);
                        } else {
                            toast.error(`⚠️ Tab switching detected. Warning ${newCount}/3`);
                        }
                    }
                }, 1000);
            } else {
                setIsTabVisible(true);

                if (visibilityTimeoutRef.current) {
                    clearTimeout(visibilityTimeoutRef.current);
                    visibilityTimeoutRef.current = null;
                }
            }
        };

        const handleBlur = (e: FocusEvent) => {
            if (e.relatedTarget && document.contains(e.relatedTarget as Node)) {
                return;
            }

            if (examStarted && !hasSubmittedRef.current) {
                tabSwitchViolationsRef.current += 1;
                const newCount = tabSwitchViolationsRef.current;
                const timestamp = new Date().toLocaleTimeString();

                setTabSwitchViolations(newCount);
                setLastTabSwitchTime(timestamp);

                console.log(`Window blur detected. Count: ${newCount}/3 at ${timestamp}`);

                if (newCount >= 3) {
                    handleDisqualification(`Focus lost - left exam window ${newCount} times`);
                } else {
                    toast.error(`⚠️ Window focus lost. Warning ${newCount}/3`);
                }
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && examStarted && !hasSubmittedRef.current) {
                console.log("Exited fullscreen - disqualifying");
                handleDisqualification("Exited fullscreen mode");
            }
        };

        const handleMouseLeave = (e: MouseEvent) => {
            if ((e.clientY <= 0 || e.clientY >= window.innerHeight ||
                e.clientX <= 0 || e.clientX >= window.innerWidth) &&
                examStarted && !hasSubmittedRef.current) {
                toast.error(`⚠️ Mouse left window. Warning`);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const isForbiddenKey =
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
                (e.ctrlKey && ['u', 'U'].includes(e.key));

            if (isForbiddenKey && examStarted && !hasSubmittedRef.current) {
                e.preventDefault();
                keyViolationsRef.current += 1;
                const newCount = keyViolationsRef.current;

                setKeyViolations(newCount);

                if (newCount >= 3) {
                    handleDisqualification(`Developer tools access attempts - ${newCount} times`);
                } else {
                    toast.error(`🚫 Invalid key combination. Warning ${newCount}/3`);
                }
            }
        };

        const handleResize = () => {
            if (!examStarted || hasSubmittedRef.current) return;

            const currentScreen = {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight
            };

            const initialScreen = window.initialScreenInfo;

            if (initialScreen &&
                (currentScreen.width !== initialScreen.width ||
                    currentScreen.height !== initialScreen.height)) {

                toast.error(`⚠️ Window resized. Warning`);
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            if (examStarted && !hasSubmittedRef.current) {
                e.preventDefault();
                violationsRef.current += 1;
                const newCount = violationsRef.current;

                setViolations(newCount);

                if (newCount >= 3) {
                    handleDisqualification(`Right-click violations - ${newCount} times`);
                } else {
                    toast.error(`⚠️ Right-click is disabled. Warning ${newCount}/3`);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', () => setIsTabVisible(true));
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);
        document.addEventListener('contextmenu', handleContextMenu);

        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleResize);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', () => setIsTabVisible(true));
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('contextmenu', handleContextMenu);

            if (screen.orientation) {
                screen.orientation.removeEventListener('change', handleResize);
            }

            if (visibilityTimeoutRef.current) {
                clearTimeout(visibilityTimeoutRef.current);
            }
        };
    }, [examStarted]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft <= 0 && exam) {
            handleSubmit();
            return;
        }

        const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Load answer for active question
    useEffect(() => {
        if (exam?.questions && answers[activeQuestionIndex] !== undefined) {
            setCode(answers[activeQuestionIndex] || "");
        }
    }, [activeQuestionIndex, answers]);

    // Auto-start exam
    useEffect(() => {
        if (exam?.questions && answers.length > 0 && !examStarted) {
            console.log("Auto-starting exam - proctoring will begin");
            setExamStarted(true);
        }
    }, [exam, answers, examStarted]);

    // Load starter code for Python exams
    useEffect(() => {
        if (exam?.questions && answers[activeQuestionIndex] !== undefined) {
            const currentAnswer = answers[activeQuestionIndex] || "";

            if (!currentAnswer && exam.language === 'python' && examFiles.length > 0) {
                const starterCode = `import pandas as pd\nimport numpy as np\n\n# Available files: ${examFiles.map(f => f.file_name).join(', ')}\n\n# Your code here:\n`;
                setCode(starterCode);
            } else {
                setCode(currentAnswer);
            }
        }
    }, [activeQuestionIndex, answers, exam, examFiles]);

    // Online/offline handling
    useEffect(() => {

        const handleOffline = () => {
            setIsOnline(false);
            toast.error('Connection lost! Your work is being saved locally.');
            saveToLocalStorage();
        };
        window.addEventListener('offline', handleOffline);

        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('offline', handleOffline);
        };
    }, [saveToLocalStorage]);

    // Auto-save interval
    useEffect(() => {
        if (!examStarted || hasSubmittedRef.current) return;

        autoSaveIntervalRef.current = setInterval(() => {
            saveToLocalStorage();
        }, 30000);

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [examStarted, saveToLocalStorage, isOnline]);

    // Auto-save on state changes
    useEffect(() => {
        if (examStarted && !hasSubmittedRef.current) {
            saveToLocalStorage();
        }
    }, [answers, mcqAnswers, flaggedQuestions, saveToLocalStorage, examStarted]);

    // Load saved state on mount
    useEffect(() => {
        if (exam && session?.user?.email) {
            const restored = loadSavedState();
            if (restored) {
                console.log('Exam state restored from previous session');
            }
        }
    }, [exam, session, loadSavedState]);


    // Load saved progress from server
    useEffect(() => {
        if (!exam || !session?.user.email) return;

        const loadProgress = async () => {
            try {
                // Try to load from server first
                const response = await fetch(
                    `/api/exam/load-progress?examId=${exam.id}&email=${session?.user.email}`
                );

                if (response.ok) {
                    const { progress } = await response.json();
                    setPendingProgress({
                        ...progress,
                        source: 'server',
                        timestamp: new Date(progress.lastSaved)
                    });
                    setShowRestoreDialog(true);
                    return;
                }
            } catch (error) {
                console.log('No server progress found, checking localStorage...');
            }

            // Fallback to localStorage
            const savedData = localStorage.getItem(`exam_progress_${exam.id}`);
            if (savedData) {
                try {
                    const progress = JSON.parse(savedData);
                    setPendingProgress({
                        ...progress,
                        source: 'local',
                        timestamp: new Date(progress.lastSaved)
                    });
                    setShowRestoreDialog(true);
                } catch (error) {
                    console.error('Failed to restore progress:', error);
                }
            }
        };

        loadProgress();
    }, [exam, session?.user.email]);

    const handleRestoreProgress = () => {
        if (!pendingProgress) return;

        setAnswers(pendingProgress.answers || []);
        setMcqAnswers(pendingProgress.mcqAnswers || {});
        setActiveQuestionIndex(pendingProgress.activeQuestionIndex || 0);
        setTimeLeft(pendingProgress.timeLeft || (exam?.duration ? exam.duration * 60 : 0));
        setFlaggedQuestions(new Set(pendingProgress.flaggedQuestions || []));
        setQuestionTimeSpent(pendingProgress.questionTimeSpent || {});
        setCodeRunCounts(pendingProgress.codeRunCounts || {});
        setLastSaved(pendingProgress.timestamp);

        toast.success(`Progress restored from ${pendingProgress.source === 'server' ? 'server' : 'local backup'}!`);
        setShowRestoreDialog(false);
        setPendingProgress(null);
    };

    // Track time since last save
    useEffect(() => {
        if (!lastSaved) return;

        const interval = setInterval(() => {
            setTimeSinceLastSave(Math.floor((Date.now() - lastSaved.getTime()) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [lastSaved]);

    // Tutorial completed check
    useEffect(() => {
        if (examId && session?.user?.email) {
            const tutorialKey = `tutorial_completed_${examId}_${session.user.email}`;
            const completed = localStorage.getItem(tutorialKey);
            if (completed === 'true') {
                setShowTutorial(false);
                setTutorialCompleted(true);
            }
        }
    }, [examId, session]);

    // Track time spent on current question
    useEffect(() => {
        if (!examStarted) return;

        const startTime = Date.now();
        questionTimeRef.current[activeQuestionIndex] = startTime;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setQuestionTimeSpent(prev => ({
                ...prev,
                [activeQuestionIndex]: elapsed
            }));
        }, 1000);

        return () => {
            clearInterval(interval);
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            if (timeSpent > 2) {
                toast.error(`⚠️ Question time spent. Warning`);
            }
        };
    }, [activeQuestionIndex, examStarted]);

    // Load code for current question
    useEffect(() => {
        if (!exam || !currentQuestion) return;

        // Get saved code for this question
        const savedCode = answers[activeQuestionIndex] || currentQuestion?.starterCode || "";
        setCode(savedCode);
    }, [activeQuestionIndex, currentQuestion]);

    // When exam loads, initialize answers array
    useEffect(() => {
        if (exam && answers.length === 0) {
            // Initialize empty answers array with starter code
            const initialAnswers = exam.questions.map((q) => {
                if (q.type === 'mcq') {
                    return ''; // MCQs don't use the answers array
                }
                return q.starterCode || ''; // Use starter code if available
            });
            setAnswers(initialAnswers);
        }
    }, [exam]);

    // Loading state
    if (examLoading || !exam) {
        return (
            <div className="h-screen w-screen bg-background flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 w-16 h-16 border-4 border-primary/10 border-b-primary rounded-full animate-spin"
                                    style={{ animationDelay: "150ms" }} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold">Loading Exam</h3>
                                <p className="text-muted-foreground">Preparing your assessment...</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (examError) {
        return (
            <div className="h-screen w-screen bg-background flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-full">
                                <X className="w-12 h-12 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Failed to Load Exam</h3>
                                <p className="text-muted-foreground mb-6">There was an error loading your exam. Please try again.</p>
                                <Button onClick={() => router.push('/attender')}>
                                    Return to Dashboard
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Add to handleCodeChange
    const handleCodeChange = (newCode: string) => {
        console.log('Code changed for question', activeQuestionIndex + 1, 'Length:', newCode.length);
        setCode(newCode);

        setAnswers(prev => {
            const updated = [...prev];
            updated[activeQuestionIndex] = newCode;
            console.log('Updated answers array:', updated.map((a, i) => `Q${i + 1}: ${a?.length || 0} chars`));
            return updated;
        });
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* NEW COMPACT HEADER */}
            <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                            <Code className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-foreground">{exam?.title}</h1>
                            <p className="text-xs text-muted-foreground">
                                {exam?.language.toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center - Progress */}
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                        Question {activeQuestionIndex + 1} / {exam?.questions.length}
                    </Badge>
                    <Separator orientation="vertical" className="h-6" />
                    <Badge variant="outline" className="gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        {answeredCount} Solved
                    </Badge>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    {exam?.isExamProctored && (
                        <Badge
                            variant={violations >= 2 ? "destructive" : "outline"}
                            className="gap-2"
                        >
                            <Shield className="w-3 h-3" />
                            {violations}/3
                        </Badge>
                    )}

                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${timeLeft <= 60
                            ? "bg-red-50 dark:bg-red-950 border-red-500 text-red-600 dark:text-red-400"
                            : timeLeft <= 300
                                ? "bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-600 dark:text-amber-400"
                                : "bg-primary/10 border-primary/20 text-primary"
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        {formatTime(timeLeft)}
                    </div>

                    <button
                        onClick={saveExamProgress}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                        title="Save progress"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save
                            </>
                        )}
                    </button>

                    {lastSaved && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
                        </div>
                    )}

                    <button
                        onClick={() => setShowSubmitSummary(true)}
                        disabled={isSubmitting}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                </div>
            </header>

            {/* Tutorial Modal - keep this if you have it */}
            {/* {showTutorial && !tutorialCompleted && (
                <ExamTutorial
                    onComplete={() => {
                        setShowTutorial(false);
                        setTutorialCompleted(true);
                    }}
                    examLanguage={exam?.language || ""}
                    isProctored={exam?.isExamProctored || false}
                />
            )} */}

            {/* MAIN CONTENT - RESIZABLE PANELS */}
            <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 overflow-hidden"
            >
                {/* LEFT PANEL - QUESTION */}
                <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                    <div className="h-full flex flex-col bg-card border-r border-border">
                        <Tabs defaultValue="description" className="flex-1 flex flex-col overflow-hidden">
                            {/* Tab Headers */}
                            <div className="border-b border-border px-4 flex-shrink-0">
                                <TabsList className="h-12 bg-transparent">
                                    <TabsTrigger value="description" className="gap-2">
                                        <FileText className="w-4 h-4" />
                                        Problem
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Description Tab */}
                            <TabsContent value="description" className="flex-1 overflow-auto m-0">
                                <div className="p-6 space-y-6">
                                    {/* Question Header */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-xl font-bold text-foreground">
                                                {activeQuestionIndex + 1}. Question
                                            </h2>
                                            <button
                                                onClick={() => toggleFlag(activeQuestionIndex)}
                                                className={`p-2 rounded-lg transition-colors ${flaggedQuestions.has(activeQuestionIndex)
                                                    ? "bg-amber-100 dark:bg-amber-950 text-amber-600"
                                                    : "hover:bg-muted"
                                                    }`}
                                            >
                                                <Flag
                                                    className={`w-4 h-4 ${flaggedQuestions.has(activeQuestionIndex)
                                                        ? "fill-current"
                                                        : ""
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className="gap-1">
                                                {currentQuestion?.type === "mcq" ? (
                                                    <FileText className="w-3 h-3" />
                                                ) : (
                                                    <Code className="w-3 h-3" />
                                                )}
                                                {currentQuestion?.type === "mcq" ? "MCQ" : "Coding"}
                                            </Badge>
                                            <Badge variant="secondary">
                                                {currentQuestion?.marks} points
                                            </Badge>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Question Content */}
                                    {currentQuestion?.type === "mcq" ? (
                                        // MCQ Options
                                        <div className="space-y-3">
                                            {/* Question text for MCQ */}
                                            <div
                                                className="prose prose-sm dark:prose-invert max-w-none mb-4"
                                                dangerouslySetInnerHTML={{ __html: currentQuestion?.question || "" }}
                                            />

                                            {currentQuestion.options?.map((option, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleMcqSelect(idx)}
                                                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${mcqAnswers[activeQuestionIndex] === idx
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${mcqAnswers[activeQuestionIndex] === idx
                                                                ? "border-primary bg-primary text-primary-foreground"
                                                                : "border-border"
                                                                }`}
                                                        >
                                                            {mcqAnswers[activeQuestionIndex] === idx && (
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div
                                                            className="text-sm text-foreground flex-1 prose prose-sm dark:prose-invert max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: option.text }}
                                                        />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        // Coding Question
                                        <div className="space-y-4">
                                            <div
                                                className="prose prose-sm dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{ __html: currentQuestion?.question || "" }}
                                            />

                                            {/* Test Cases if available */}
                                            {currentQuestion?.testCases && currentQuestion.testCases.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-semibold text-foreground">Sample Test Cases</h4>
                                                    {currentQuestion.testCases.slice(0, 2).map((testCase: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className="p-3 bg-muted/50 rounded-lg border border-border space-y-2"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground mb-1">Input:</p>
                                                                <code className="text-xs text-foreground font-mono">
                                                                    {JSON.stringify(testCase.input)}
                                                                </code>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground mb-1">Expected Output:</p>
                                                                <code className="text-xs text-foreground font-mono">
                                                                    {JSON.stringify(testCase.output)}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Hint if available */}
                                            {currentQuestion?.hint && (
                                                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">💡 Hint</p>
                                                    <p className="text-sm text-blue-900 dark:text-blue-300">{currentQuestion.hint}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* RIGHT PANEL - We'll add this in the next step */}
                <ResizablePanel defaultSize={65} minSize={50}>
                    <ResizablePanelGroup direction="vertical">
                        {/* CODE EDITOR - Using your existing component */}
                        <ResizablePanel defaultSize={60} minSize={30}>
                            <div className="h-full flex flex-col">
                                <CodeEditor
                                    code={code}
                                    setCode={setCode}
                                    language={exam?.language || "python"}
                                    editorTheme={editorTheme}
                                    onRun={handleRun}
                                    running={running}
                                    output={output}
                                    theme={theme}
                                    setTheme={setTheme}
                                    setEditorTheme={setEditorTheme}
                                    sqlResult={sqlResult}
                                    examLanguage={exam?.language || "python"}
                                    onCodeChange={handleCodeChange}
                                    schemaData={schemaData}
                                    onShowErDiagram={() => setShowErDiagram(true)}
                                    question={currentQuestion}
                                />
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* CONSOLE - Only if not already in CodeEditor */}
                        <ResizablePanel defaultSize={40} minSize={20}>
                            <div className="h-full flex flex-col bg-card border-t border-border">
                                <div className="h-12 px-4 border-b border-border flex items-center bg-muted/30">
                                    <Terminal className="w-4 h-4 text-muted-foreground mr-2" />
                                    <span className="text-sm font-medium">Console Output</span>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="p-4">
                                        {exam?.language === "sql" ? (
                                            sqlResult ? (
                                                <div className="space-y-4">
                                                    <span className="text-sm font-medium">
                                                        {sqlResult.rows.length} row
                                                        {sqlResult.rows.length !== 1 ? "s" : ""}
                                                    </span>
                                                    <div className="border border-border rounded-lg overflow-hidden">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-muted">
                                                                <tr>
                                                                    {sqlResult.columns.map((col, idx) => (
                                                                        <th
                                                                            key={idx}
                                                                            className="px-4 py-2 text-left font-semibold border-b border-border"
                                                                        >
                                                                            {col}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {sqlResult.rows.map((row, rowIdx) => (
                                                                    <tr key={rowIdx} className="hover:bg-muted/50">
                                                                        {sqlResult.columns.map((col, colIdx) => (
                                                                            <td
                                                                                key={colIdx}
                                                                                className="px-4 py-2 border-b border-border/50 font-mono text-xs"
                                                                            >
                                                                                {row[col] ?? "NULL"}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ) : output ? (
                                                <pre className="text-sm text-destructive font-mono whitespace-pre-wrap">
                                                    {output}
                                                </pre>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                    <Database className="w-12 h-12 mb-2 opacity-50" />
                                                    <p className="text-sm">Run your query to see results</p>
                                                </div>
                                            )
                                        ) : output ? (
                                            <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">
                                                {output}
                                            </pre>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                <Terminal className="w-12 h-12 mb-2 opacity-50" />
                                                <p className="text-sm">Run your code to see output</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* BOTTOM NAVIGATION BAR */}
            <footer className="h-16 border-t border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                    {/* Previous Button */}
                    <button
                        onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
                        disabled={activeQuestionIndex === 0}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    {/* Question Pills - Show first 10 */}
                    <div className="flex items-center gap-2">
                        {exam?.questions.slice(0, 10).map((_, idx) => {
                            const isAnswered = isQuestionAnswered(idx);
                            const isCurrent = idx === activeQuestionIndex;
                            const isFlagged = flaggedQuestions.has(idx);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveQuestionIndex(idx)}
                                    className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all relative ${isCurrent
                                        ? "bg-primary text-primary-foreground shadow-lg scale-110"
                                        : isAnswered
                                            ? "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        } ${isFlagged ? "ring-2 ring-amber-500" : ""}`}
                                >
                                    {idx + 1}
                                    {isFlagged && (
                                        <Flag className="w-3 h-3 absolute -top-1 -right-1 fill-amber-500 text-amber-500" />
                                    )}
                                </button>
                            );
                        })}
                        {exam && exam.questions.length > 10 && (
                            <span className="px-3 py-2 text-sm text-muted-foreground">
                                +{exam.questions.length - 10} more
                            </span>
                        )}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={() =>
                            setActiveQuestionIndex(
                                Math.min((exam?.questions.length || 1) - 1, activeQuestionIndex + 1)
                            )
                        }
                        disabled={activeQuestionIndex === (exam?.questions.length || 1) - 1}
                        className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg font-medium text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>

                {/* Right Side - Stats */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>
                            {answeredCount}/{exam?.questions.length} Answered
                        </span>
                    </div>
                    {flaggedQuestions.size > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Flag className="w-4 h-4 text-amber-600" />
                            <span>{flaggedQuestions.size} Flagged</span>
                        </div>
                    )}
                </div>
            </footer>

            {exam?.isExamProctored && (
                <ProctoringMonitor
                    isExamProctored={exam?.isExamProctored || false}
                    examStarted={examStarted}
                    examId={examId?.toString() || ""}
                    userEmail={session?.user?.email || ""}
                    onDisqualification={handleDisqualification}
                />
            )}

            {/* Submit Summary Modal */}
            {showSubmitSummary && (
                <SubmitSummary
                    exam={exam}
                    answers={answers}
                    mcqAnswers={mcqAnswers}
                    flaggedQuestions={flaggedQuestions}
                    isSubmitting={isSubmitting}
                    onClose={() => setShowSubmitSummary(false)}
                    onSubmit={handleSubmit}
                    setActiveQuestionIndex={setActiveQuestionIndex}
                    isQuestionAnswered={isQuestionAnswered}
                    timeLeft={timeLeft}
                />
            )}

            {/* Violation Warning Banner */}
            {violations > 0 && violations < 3 && !isDisqualified && (
                <div className={`px-6 py-3 flex items-center justify-between ${violations === 1
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                    } text-white`}>
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                            <p className="font-semibold">
                                {violations === 1 && "⚠️ Warning: Violation Detected!"}
                                {violations === 2 && "🚨 FINAL WARNING: One More Violation = Disqualification!"}
                            </p>
                            <p className="text-sm">
                                {violations === 1 && "You've exited fullscreen or switched tabs. Please stay focused on the exam."}
                                {violations === 2 && "Do NOT exit fullscreen, switch tabs, or use forbidden keys again!"}
                            </p>
                        </div>
                    </div>
                    <div className="text-3xl font-bold">{violations}/3</div>
                </div>
            )}

            {/* ER Diagram Modal - ADD THIS */}
            {showErDiagram && schemaData && (
                <ERDiagramModal
                    schemaData={schemaData}
                    onClose={() => setShowErDiagram(false)}
                />
            )}

            {isDisqualified && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-card border-2 border-destructive rounded-2xl p-8 max-w-md text-center">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-10 h-10 text-destructive" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Disqualified</h2>
                        <p className="text-muted-foreground mb-6">
                            You have been disqualified from this exam due to multiple violations.
                            Your exam has been automatically submitted.
                        </p>
                        <div className="space-y-2 text-sm bg-muted p-4 rounded-lg text-left">
                            <p className="font-semibold text-foreground mb-2">Violation Summary:</p>
                            <p className="text-muted-foreground">• Total violations: <span className="text-destructive font-bold">{violations}/3</span></p>
                            <p className="text-muted-foreground">• Tab switches: {tabSwitchViolations}</p>
                            <p className="text-muted-foreground">• Fullscreen exits: {screenChangeViolations}</p>
                            <p className="text-muted-foreground">• Forbidden keys: {keyViolations}</p>
                            {lastScreenChangeTime && (
                                <p className="text-muted-foreground text-xs mt-2">Last violation: {lastScreenChangeTime}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Progress Dialog */}
            <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Restore Previous Session?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                We found saved progress from{' '}
                                <span className="font-semibold text-foreground">
                                    {pendingProgress?.timestamp.toLocaleString()}
                                </span>
                            </p>
                            {pendingProgress && (
                                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Questions answered:</span>
                                        <span className="font-medium text-foreground">
                                            {pendingProgress.answers?.filter((a: string) => a?.trim()).length || 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Time remaining:</span>
                                        <span className="font-medium text-foreground">
                                            {Math.floor((pendingProgress.timeLeft || 0) / 60)} minutes
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Source:</span>
                                        <Badge variant="outline">
                                            {pendingProgress.source === 'server' ? 'Server' : 'Local Backup'}
                                        </Badge>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs">
                                Choose "Continue" to resume, or "Start Fresh" to begin a new attempt.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setShowRestoreDialog(false);
                            setPendingProgress(null);
                        }}>
                            Start Fresh
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestoreProgress}>
                            Continue Session
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}