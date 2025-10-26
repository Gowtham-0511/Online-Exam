import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import ProctoringMonitor from "@/components/exam/ProctoringMonitor";
import ExamTutorial from "@/components/exam/ExamTutorial";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import {
    Clock,
    Code,
    Play,
    Send,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Terminal,
    Moon,
    Sun,
    X,
    Menu,
    Database,
    FileText,
    HelpCircle,
} from "lucide-react";
import { Editor } from "@monaco-editor/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

declare global {
    interface Window {
        initialScreenInfo?: {
            width: number;
            height: number;
            availWidth: number;
            availHeight: number;
        };
    }
}

export default function ExamPage() {
    const [exam, setExam] = useState<any>(null);
    const [code, setCode] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);
    const [isDisqualified, setDisqualified] = useState(false);
    const router = useRouter();
    const { examId } = router.query;
    const [examStarted, setExamStarted] = useState(false);
    const { data: session } = useSession();
    const [output, setOutput] = useState("");
    const [running, setRunning] = useState(false);
    const [answers, setAnswers] = useState<string[]>([]);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: Record<string, any>[] } | null>(null);
    const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [editorTheme, setEditorTheme] = useState<"light" | "dark">("dark");

    const [theme, setTheme] = useState<"light" | "dark">("dark");

    const [violations, setViolations] = useState(0);
    const [keyViolations, setKeyViolations] = useState(0);

    const violationsRef = useRef(0);
    const keyViolationsRef = useRef(0);
    const handleContextMenuRef = useRef<((e: any) => void) | null>(null);
    const handleKeyDownRef = useRef<((e: any) => void) | null>(null);

    const handleBlurRef = useRef<((e: any) => void) | null>(null);
    const handleFsChangeRef = useRef<((e: any) => void) | null>(null);
    const handleVisibilityChangeRef = useRef<((e: any) => void) | null>(null);

    const hasSubmittedRef = useRef(false);

    const [tabSwitchViolations, setTabSwitchViolations] = useState(0);
    const [lastTabSwitchTime, setLastTabSwitchTime] = useState<string>("");
    const [isTabVisible, setIsTabVisible] = useState(true);
    const [screenChangeViolations, setScreenChangeViolations] = useState(0);
    const [lastScreenChangeTime, setLastScreenChangeTime] = useState<string>("");

    const tabSwitchViolationsRef = useRef(0);
    const screenChangeViolationsRef = useRef(0);
    const lastVisibilityChangeRef = useRef(Date.now());
    const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [examFiles, setExamFiles] = useState<any[]>([]);

    const [erDiagramUrl, setErDiagramUrl] = useState<string | { schemaData: any[], serverType: string } | null>(null);
    const [schemaData, setSchemaData] = useState<{
        schemaData: any[];
        relationships: any[];
        serverType: string;
    } | null>(null);
    const [showErDiagram, setShowErDiagram] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [mcqAnswers, setMcqAnswers] = useState<{ [key: number]: number }>({});

    const [questionFilter, setQuestionFilter] = useState<'all' | 'coding' | 'mcq'>('all');

    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
    const [showSubmitSummary, setShowSubmitSummary] = useState(false);

    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [timeSinceLastSave, setTimeSinceLastSave] = useState(0);

    const [showTutorial, setShowTutorial] = useState(true);
    const [tutorialCompleted, setTutorialCompleted] = useState(false);

    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
    const [questionTimeSpent, setQuestionTimeSpent] = useState<{ [key: number]: number }>({});
    const [codeRunCounts, setCodeRunCounts] = useState<{ [key: number]: number }>({});
    const questionTimeRef = useRef<{ [key: number]: number }>({});

    const trackAction = useCallback(async (
        actionType: string,
        metadata?: any
    ) => {
        if (!exam || !session?.user?.email || !examId) return;

        const currentQuestion = shuffledQuestions[activeQuestionIndex];
        if (!currentQuestion) return;

        try {
            await fetch('/api/monioting/track-exam-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: examId.toString(),
                    userEmail: session.user.email,
                    questionId: currentQuestion.id || activeQuestionIndex,
                    questionIndex: activeQuestionIndex,
                    actionType,
                    timeSpent: questionTimeSpent[activeQuestionIndex] || 0,
                    metadata: {
                        ...metadata,
                        questionType: currentQuestion.type || 'coding',
                        marks: currentQuestion.marks,
                        codeRunCount: codeRunCounts[activeQuestionIndex] || 0
                    }
                })
            });
        } catch (error) {
            console.error('Failed to track action:', error);
        }
    }, [exam, session, examId, shuffledQuestions, activeQuestionIndex, questionTimeSpent, codeRunCounts]);

    const saveToLocalStorage = useCallback(() => {
        if (!exam || !examId) return;

        const examState = {
            examId: examId.toString(),
            answers,
            mcqAnswers: Object.entries(mcqAnswers || {}),
            flaggedQuestions: Array.from(flaggedQuestions),
            activeQuestionIndex,
            timeLeft,
            lastSaved: new Date().toISOString(),
            userEmail: session?.user?.email
        };

        try {
            localStorage.setItem(`exam_${examId}_${session?.user?.email}`, JSON.stringify(examState));
            setLastSaved(new Date());
            console.log('Exam state saved to localStorage');
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }, [exam, examId, answers, mcqAnswers, flaggedQuestions, activeQuestionIndex, timeLeft, session]);

    const autoSaveToServer = useCallback(async () => {
        if (!exam || !examId || !session?.user?.email || !isOnline) return;

        setIsSaving(true);

        try {
            const answersWithQuestionIds = answers.map((answer, index) => {
                const question = shuffledQuestions[index];
                return {
                    questionId: question?.id || index,
                    question: question?.question || '',
                    answer: question?.type === 'mcq' ? mcqAnswers[index]?.toString() || '' : answer,
                    marks: question?.marks || 0,
                    originalIndex: index,
                    type: question?.type || 'coding',
                    selectedOption: question?.type === 'mcq' ? mcqAnswers[index] : undefined
                };
            });

            await fetch('/api/submissions/auto-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: examId.toString(),
                    email: session.user.email,
                    answers: answersWithQuestionIds,
                    flaggedQuestions: Array.from(flaggedQuestions),
                    timeLeft,
                    lastUpdated: new Date().toISOString()
                })
            });

            setLastSaved(new Date());
            console.log('Auto-saved to server');
        } catch (error) {
            console.error('Auto-save failed:', error);
            // Fallback to localStorage if server save fails
            saveToLocalStorage();
        } finally {
            setIsSaving(false);
        }
    }, [exam, examId, session, answers, mcqAnswers, shuffledQuestions, flaggedQuestions, timeLeft, isOnline, saveToLocalStorage]);

    const loadSavedState = useCallback(() => {
        if (!examId || !session?.user?.email) return false;

        try {
            const savedState = localStorage.getItem(`exam_${examId}_${session.user.email}`);
            if (savedState) {
                const state = JSON.parse(savedState);

                // Verify it's the same exam and user
                if (state.examId === examId.toString() && state.userEmail === session.user.email) {
                    setAnswers(state.answers || []);
                    setMcqAnswers(Object.fromEntries(state.mcqAnswers || []));
                    setFlaggedQuestions(new Set(state.flaggedQuestions || []));
                    setActiveQuestionIndex(state.activeQuestionIndex || 0);
                    setTimeLeft(state.timeLeft || exam?.duration * 60 || 0);
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

            trackAction(action, { questionNumber: index + 1 });

            return newSet;
        });
    }, [trackAction]);

    const timeColor = useMemo(() => {
        if (timeLeft > 300) return "text-primary";
        if (timeLeft > 60) return "text-amber-600 dark:text-amber-400";
        return "text-destructive";
    }, [timeLeft]);

    const answeredCount = useMemo(() => {
        return answers.filter(answer => answer && answer.trim() !== "").length;
    }, [answers]);

    const formattedTime = useMemo(() => {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const remainingSeconds = timeLeft % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }, [timeLeft]);

    const updateAnswer = useCallback((index: number, code: string) => {
        setAnswers(prev => {
            const updated = [...prev];
            const hadAnswer = updated[index] && updated[index].trim() !== "";
            updated[index] = code;

            // Track answer update if significant change
            if (!hadAnswer && code.trim() !== "") {
                trackAction('answer_update', {
                    answerLength: code.length,
                    firstAnswer: true
                });
            } else if (code.trim() !== "" && Math.abs(code.length - (updated[index]?.length || 0)) > 10) {
                trackAction('answer_update', {
                    answerLength: code.length,
                    firstAnswer: false
                });
            }

            return updated;
        });
    }, [trackAction]);

    const handleMcqAnswer = useCallback((questionIndex: number, optionIndex: number) => {
        setMcqAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));

        updateAnswer(questionIndex, optionIndex.toString());
    }, [updateAnswer]);

    const isQuestionAnswered = useCallback((index: number) => {
        const question = exam?.questions[index];
        if (question?.type === 'mcq') {
            return mcqAnswers[index] !== undefined;
        }
        return !!(answers[index] && answers[index].trim() !== "");
    }, [answers, mcqAnswers, exam]);

    const shuffleArrayWithSeed = (array: any, seed: any) => {
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        const shuffled = [...array];
        let currentSeed = seed;

        for (let i = shuffled.length - 1; i > 0; i--) {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            const j = Math.floor(seededRandom(currentSeed) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    };

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    useEffect(() => {
        const fetchExam = async () => {
            if (!examId) return;

            const response = await fetch(`/api/assessment/${examId}`);
            if (!response.ok) {
                alert("Exam not found");
                router.push("/dashboard/attender");
                return;
            }
            const data = await response.json();

            if (data && data.language === 'python') {
                const filesResponse = await fetch(`/api/exam-files/${examId}`);
                if (filesResponse.ok) {
                    const filesData = await filesResponse.json();
                    setExamFiles(filesData.files || []);
                }
            }

            if (data && data.language === 'sql') {
                try {
                    const schemaResponse = await fetch(`/api/sql/er-diagram?examId=${examId}`);
                    if (schemaResponse.ok) {
                        const schemaResult = await schemaResponse.json();
                        setSchemaData(schemaResult);
                    }
                } catch (error) {
                    console.error('Failed to fetch schema:', error);
                }
            }


            if (data) {
                const seed = examId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const shuffled = shuffleArrayWithSeed(data.questions || [], seed);
                setExam({ ...data, questions: shuffled });
                setShuffledQuestions(shuffled);
                setTimeLeft(data.duration * 60);
            } else {
                alert("Exam not found");
                router.push("/dashboard/attender");
            }
        };

        fetchExam();
    }, [examId]);

    useEffect(() => {
        if (exam?.questions) {
            setAnswers(new Array(exam.questions.length).fill(""));
            setMcqAnswers({});
        }
    }, [exam]);

    useEffect(() => {
        const onFsChange = () => {
            if (!document.fullscreenElement && examStarted && !hasSubmittedRef.current) {
                console.log("Fullscreen exited - disqualifying");
                setDisqualified(true);
                handleSubmitWithDisqualification(true);
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

                console.log(`Window blur violation detected. Count: ${newCount}/3 at ${timestamp}`);

                if (newCount >= 3) {
                    handleDisqualification(`Window focus violations - lost focus ${newCount} times`);
                } else {
                    toast.error(`⚠️ Window focus lost. Warning ${newCount}/3`);
                }
            }
        };

        const handleScreenChange = () => {
            if (!examStarted || hasSubmittedRef.current) return;

            screenChangeViolationsRef.current += 1;
            const newCount = screenChangeViolationsRef.current;
            const timestamp = new Date().toLocaleTimeString();

            setScreenChangeViolations(newCount);
            setLastScreenChangeTime(timestamp);

            console.log(`Screen change violation detected. Count: ${newCount}/3 at ${timestamp}`);

            if (newCount >= 3) {
                handleDisqualification(`Screen configuration changes - detected ${newCount} screen changes`);
            } else {
                toast.error(`⚠️ Screen configuration changed. Warning ${newCount}/3`);
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && examStarted && !hasSubmittedRef.current) {
                console.log("Fullscreen exited - registering violation");

                tabSwitchViolationsRef.current += 1;
                const newCount = tabSwitchViolationsRef.current;
                const timestamp = new Date().toLocaleTimeString();

                setTabSwitchViolations(newCount);
                setLastTabSwitchTime(timestamp);

                if (newCount >= 3) {
                    handleDisqualification(`Fullscreen violations - exited fullscreen ${newCount} times`);
                } else {
                    toast.error(`⚠️ Fullscreen exited. Warning ${newCount}/3`);

                    setTimeout(() => {
                        if (!hasSubmittedRef.current) {
                            document.documentElement.requestFullscreen().catch(() => {
                                console.log("Failed to re-enter fullscreen");
                            });
                        }
                    }, 1000);
                }
            }
        };

        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 || e.clientX <= 0 ||
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {

                if (examStarted && !hasSubmittedRef.current) {
                    console.log("Mouse left window boundaries - potential screen switch");

                    setTimeout(() => {
                        if (!document.hasFocus() && !hasSubmittedRef.current) {
                            screenChangeViolationsRef.current += 1;
                            const newCount = screenChangeViolationsRef.current;
                            const timestamp = new Date().toLocaleTimeString();

                            setScreenChangeViolations(newCount);
                            setLastScreenChangeTime(timestamp);

                            if (newCount >= 3) {
                                handleDisqualification(`Multiple screen usage - mouse left window ${newCount} times`);
                            } else {
                                toast.error(`⚠️ Multiple screen usage detected. Warning ${newCount}/3`);
                            }
                        }
                    }, 500);
                }
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const isAltTab = e.altKey && e.key === 'Tab';
            const isCmdTab = e.metaKey && e.key === 'Tab';
            const isWindowsKey = e.key === 'Meta' || e.key === 'Super';

            if (isAltTab || isCmdTab || isWindowsKey) {
                e.preventDefault();

                if (examStarted && !hasSubmittedRef.current) {
                    tabSwitchViolationsRef.current += 1;
                    const newCount = tabSwitchViolationsRef.current;
                    const timestamp = new Date().toLocaleTimeString();

                    setTabSwitchViolations(newCount);
                    setLastTabSwitchTime(timestamp);

                    console.log(`Task switching key combination detected. Count: ${newCount}/3`);

                    if (newCount >= 3) {
                        handleDisqualification(`Task switching violations - used shortcuts ${newCount} times`);
                    } else {
                        toast.error(`⚠️ Task switching prevented. Warning ${newCount}/3`);
                    }
                }
            }
        };

        const handleResize = () => {
            if (examStarted && !hasSubmittedRef.current) {
                setTimeout(() => {
                    const currentScreen = {
                        width: window.screen.width,
                        height: window.screen.height,
                        availWidth: window.screen.availWidth,
                        availHeight: window.screen.availHeight
                    };

                    if (!window.initialScreenInfo) {
                        window.initialScreenInfo = currentScreen;
                        return;
                    }

                    const screenChanged =
                        Math.abs(currentScreen.width - window.initialScreenInfo.width) > 100 ||
                        Math.abs(currentScreen.height - window.initialScreenInfo.height) > 100 ||
                        Math.abs(currentScreen.availWidth - window.initialScreenInfo.availWidth) > 100 ||
                        Math.abs(currentScreen.availHeight - window.initialScreenInfo.availHeight) > 100;

                    if (screenChanged) {
                        handleScreenChange();
                        window.initialScreenInfo = currentScreen;
                    }
                }, 1000);
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

        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleScreenChange);
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

            if (screen.orientation) {
                screen.orientation.removeEventListener('change', handleScreenChange);
            }

            if (visibilityTimeoutRef.current) {
                clearTimeout(visibilityTimeoutRef.current);
            }
        };
    }, [examStarted]);

    useEffect(() => {
        if (timeLeft <= 0 && exam) {
            handleSubmit();
            return;
        }

        const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    useEffect(() => {
        if (exam?.questions && answers[activeQuestionIndex] !== undefined) {
            setCode(answers[activeQuestionIndex] || "");
        }
    }, [activeQuestionIndex, answers]);

    useEffect(() => {
        if (exam?.questions && answers.length > 0 && !examStarted) {
            console.log("Auto-starting exam - proctoring will begin");
            setExamStarted(true);
        }
    }, [exam, answers, examStarted]);

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

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Connection restored! Auto-saving...');
            autoSaveToServer();
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.error('Connection lost! Your work is being saved locally.');
            saveToLocalStorage();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check initial state
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [autoSaveToServer, saveToLocalStorage]);

    useEffect(() => {
        if (!examStarted || hasSubmittedRef.current) return;

        autoSaveIntervalRef.current = setInterval(() => {
            saveToLocalStorage();
            autoSaveToServer();
        }, 30000);

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [examStarted, saveToLocalStorage, autoSaveToServer, isOnline]);

    useEffect(() => {
        if (examStarted && !hasSubmittedRef.current) {
            saveToLocalStorage();
        }
    }, [answers, mcqAnswers, flaggedQuestions, saveToLocalStorage, examStarted]);

    useEffect(() => {
        if (exam && session?.user?.email) {
            const restored = loadSavedState();
            if (restored) {
                console.log('Exam state restored from previous session');
            }
        }
    }, [exam, session, loadSavedState]);

    useEffect(() => {
        if (!lastSaved) return;

        const interval = setInterval(() => {
            setTimeSinceLastSave(Math.floor((Date.now() - lastSaved.getTime()) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [lastSaved]);

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
            // Track question view when leaving
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            if (timeSpent > 2) { // Only track if spent more than 2 seconds
                trackAction('question_view', { timeSpent });
            }
        };
    }, [activeQuestionIndex, examStarted, trackAction]);

    handleContextMenuRef.current = (e) => {
        e.preventDefault();
        violationsRef.current += 1;
        const newCount = violationsRef.current;

        setViolations(newCount);
        console.log(`Right-click detected. Violation count: ${newCount}/3`);

        if (newCount >= 3) {
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
            router.push("/dashboard/attender");
        } else {
            toast.error(`⚠️ Right-click is disabled. Warning ${newCount}/3`);
        }
    };

    handleKeyDownRef.current = (e: {
        key: string;
        ctrlKey: any;
        shiftKey: any;
        preventDefault: () => void;
        timeStamp: number;
    }) => {

        const isForbiddenKey =
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
            (e.ctrlKey && ['u', 'U', 'a', 'A', 'c', 'C', 'v', 'V', 'p', 'P', 'x', 'X', 'z', 'Z', 'y', 'Y'].includes(e.key)) ||
            e.key === 'PrintScreen';

        if (isForbiddenKey) {
            e.preventDefault();
            keyViolationsRef.current += 1;
            const newCount = keyViolationsRef.current;

            setKeyViolations(newCount);

            if (newCount >= 3) {
                setDisqualified(true);
                handleSubmitWithDisqualification(true);
                router.push("/dashboard/attender");
            } else {
                toast.error(`🚫 Invalid key combination. Warning ${newCount}/3`);
            }
        }
    };

    handleBlurRef.current = () => {
        if (examStarted && !hasSubmittedRef.current) {
            console.log("Window blur detected - disqualifying");
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
        }
    };

    handleFsChangeRef.current = () => {
        if (!document.fullscreenElement && examStarted && !hasSubmittedRef.current) {
            console.log("Fullscreen exited - disqualifying");
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
        }
    };

    handleVisibilityChangeRef.current = () => {
        if (document.hidden && examStarted && !hasSubmittedRef.current) {
            console.log("Tab hidden - disqualifying");
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
        }
    };

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
        document.onkeydown = null;
        document.oncontextmenu = null;
        tabSwitchViolationsRef.current = 0;
        screenChangeViolationsRef.current = 0;
        setTabSwitchViolations(0);
        setScreenChangeViolations(0);
        setLastTabSwitchTime("");
        setLastScreenChangeTime("");
        setIsTabVisible(true);
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

        const answersWithQuestionIds = answers.map((answer, index) => {
            const question = shuffledQuestions[index];
            const isMcq = question?.type === 'mcq';

            // Get the actual option text for MCQ
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
            const result = await fetch("/api/submissions", {
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

            const finalResult = await result.json();

            // Clear saved state after successful submission
            clearSavedState();

            fetch("https://wizard-aiautomate.dopplr.ai/webhook/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    output: answersWithQuestionIds,
                    id: finalResult.submissionId
                })
            });

            await cleanupExamEnvironment();
            setIsSubmitting(false);
            router.push("/dashboard/attender");

        } catch (error) {
            console.error("Submission failed:", error);
            toast.error('Submission failed. Your answers are saved locally.');
            hasSubmittedRef.current = false;
            setIsSubmitting(false);
        }
    };

    interface Question {
        id: string;
        question: string;
        expectedOutput?: string;
        marks: number;
        [key: string]: any;
    }

    const handleSubmitWithDisqualification = async (disqualifiedFlag = isDisqualified) => {

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

        await fetch("/api/submissions", {
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
        router.push("/dashboard/attender");
    };

    const handleRun = async () => {
        setRunning(true);
        setOutput("Running...");

        setCodeRunCounts(prev => ({
            ...prev,
            [activeQuestionIndex]: (prev[activeQuestionIndex] || 0) + 1
        }));

        await trackAction('code_run', {
            codeLength: code.length,
            language: exam.language,
            runNumber: (codeRunCounts[activeQuestionIndex] || 0) + 1
        });

        try {
            if (exam.language === "sql") handleRunSql();
            else if (exam.language === "python") handleRunPython();
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
            const res = await fetch("/api/run-python", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    examId: examId?.toString()
                }),
            });

            const data = await res.json();
            setOutput(data.output || "No output.");
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
            const res = await fetch("/api/run-sql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: code, examId: examId }),
            });

            const data = await res.json();

            console.log(data.rows);

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

    const handleTutorialComplete = () => {
        if (examId && session?.user?.email) {
            const tutorialKey = `tutorial_completed_${examId}_${session.user.email}`;
            localStorage.setItem(tutorialKey, 'true');
            setShowTutorial(false);
            setTutorialCompleted(true);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    if (!exam) {
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

    const handleDisqualification = async (reason: string) => {
        setDisqualified(true);
        toast.error(`🚫 Disqualified: ${reason}`);

        const examIdStr = examId?.toString() || "unknown";

        let imageBase64 = "";

        await fetch("/api/store-violation-image", {
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

    return (
        <>
            {showTutorial && !tutorialCompleted && (
                <ExamTutorial
                    onComplete={handleTutorialComplete}
                    examLanguage={exam.language}
                    isProctored={exam.isExamProctored}
                />
            )}
            <div className="h-screen flex flex-col bg-background">
                {/* Top Header */}
                <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                                <Code className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold text-foreground">{exam.title}</h1>
                                <p className="text-xs text-muted-foreground">{exam.language.toUpperCase()} • {exam.questions.length} Questions</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${timeLeft <= 60 ? 'bg-destructive/10 border-destructive' :
                            timeLeft <= 300 ? 'bg-amber-500/10 border-amber-500' :
                                'bg-primary/10 border-primary'
                            }`}>
                            <Clock className={`w-4 h-4 ${timeColor}`} />
                            <span className={`font-mono font-bold ${timeColor}`}>{formattedTime}</span>
                        </div>

                        <button
                            onClick={() => setShowTutorial(true)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="View tutorial again"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setShowSubmitSummary(true)}
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar - Question Navigation */}
                    <aside className={`${sidebarOpen ? 'w-64' : 'w-0'
                        } lg:w-64 border-r border-border bg-card flex-shrink-0 overflow-hidden transition-all duration-300`}>
                        <div className="h-full flex flex-col">
                            <div className="p-4 border-b border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-semibold text-foreground">Questions</h2>
                                    <span className="text-xs text-muted-foreground">{answeredCount}/{exam.questions.length}</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* <div className="flex-1 overflow-y-auto p-2">
                            <div className="space-y-1">

                                {(exam.questions as Question[]).map((q: Question, index: number) => {
                                    const isActive: boolean = activeQuestionIndex === index;
                                    const isAnswered: boolean = isQuestionAnswered(index);

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setActiveQuestionIndex(index)}
                                            className={`w-full p-3 rounded-lg text-left transition-all ${isActive
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'hover:bg-muted'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-semibold ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                                                        Q{index + 1}
                                                    </span>
                                                    {isAnswered && (
                                                        <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-primary'
                                                            }`} />
                                                    )}
                                                </div>
                                                <span className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                                    }`}>
                                                    {q.marks}pts
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div> */}

                            <div className="flex-1 overflow-y-auto p-2">
                                {/* Search/Filter */}
                                <div className="px-2 mb-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search questions..."
                                            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Question Type Filter */}
                                <div className="px-2 mb-3 flex gap-2">
                                    <button
                                        onClick={() => setQuestionFilter('all')}
                                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${questionFilter === 'all'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        All ({exam.questions.length})
                                    </button>
                                    <button
                                        onClick={() => setQuestionFilter('coding')}
                                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${questionFilter === 'coding'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        Code ({exam.questions.filter((q: Question) => q.type !== 'mcq').length})
                                    </button>
                                    <button
                                        onClick={() => setQuestionFilter('mcq')}
                                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${questionFilter === 'mcq'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        MCQ ({exam.questions.filter((q: Question) => q.type === 'mcq').length})
                                    </button>
                                </div>

                                {/* Compact Grid View */}
                                <div className="grid grid-cols-5 gap-1.5 px-2">
                                    {(exam.questions as Question[])
                                        .map((q: Question, index: number) => ({ q, index }))
                                        .filter(({ q, index }) => {
                                            if (questionFilter === 'coding' && q.type === 'mcq') return false;
                                            if (questionFilter === 'mcq' && q.type !== 'mcq') return false;
                                            if (searchTerm && !`Q${index + 1}`.toLowerCase().includes(searchTerm.toLowerCase())) {
                                                return false;
                                            }
                                            return true;
                                        })
                                        .map(({ q, index }) => {
                                            const isActive: boolean = activeQuestionIndex === index;
                                            const isAnswered: boolean = isQuestionAnswered(index);
                                            const isFlagged: boolean = flaggedQuestions.has(index);
                                            const isMcq = q.type === 'mcq';

                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => setActiveQuestionIndex(index)}
                                                    className={`aspect-square p-2 rounded-lg text-xs font-semibold transition-all relative ${isActive
                                                        ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                                                        : isAnswered
                                                            ? 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30'
                                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        } ${isFlagged ? 'ring-2 ring-amber-500' : ''}`}
                                                    title={`Question ${index + 1} - ${isMcq ? 'MCQ' : 'Coding'} - ${q.marks}pts${isFlagged ? ' (Flagged)' : ''}`}
                                                >
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <span>{index + 1}</span>
                                                        {isAnswered && (
                                                            <CheckCircle2 className="w-3 h-3 absolute top-0.5 right-0.5" />
                                                        )}
                                                        {isFlagged && (
                                                            <span className="absolute top-0.5 left-0.5 text-xs">🚩</span>
                                                        )}
                                                        {isMcq && (
                                                            <FileText className="w-2.5 h-2.5 absolute bottom-0.5 left-0.5 opacity-50" />
                                                        )}
                                                        {!isMcq && (
                                                            <Code className="w-2.5 h-2.5 absolute bottom-0.5 left-0.5 opacity-50" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            <div className="p-4 border-t border-border bg-muted/50">
                                <div className="space-y-2">
                                    {/* Connection Status */}
                                    {!isOnline && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Offline Mode</span>
                                        </div>
                                    )}

                                    {/* Auto-save Status */}
                                    {/* {lastSaved && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border">
                                        {isSaving ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs text-muted-foreground">Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                <span className="text-xs text-muted-foreground">
                                                    Saved {timeSinceLastSave < 60
                                                        ? `${timeSinceLastSave}s ago`
                                                        : `${Math.floor(timeSinceLastSave / 60)}m ago`
                                                    }
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )} */}
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Answered</span>
                                        <span className="font-semibold text-primary">{answeredCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Unanswered</span>
                                        <span className="font-semibold text-muted-foreground">{exam.questions.length - answeredCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-muted-foreground mb-0.5">Flagged</div>
                                        <div className="font-semibold text-muted-foreground">{flaggedQuestions.size}</div>
                                    </div>

                                    {/* Add this Dialog */}
                                    {exam.language === 'sql' && schemaData && (
                                        <>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full mt-3 text-xs"
                                                onClick={() => setShowErDiagram(true)}
                                            >
                                                <Database className="w-3 h-3 mr-2" />
                                                View Database Schema ({schemaData.schemaData.length} tables)
                                            </Button>

                                            {showErDiagram && (
                                                <div
                                                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                                    onClick={() => setShowErDiagram(false)}
                                                >
                                                    <div
                                                        className="bg-card border border-border rounded-lg w-[95vw] max-w-[1600px] h-[95vh] flex flex-col shadow-2xl"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {/* Header */}
                                                        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border flex-shrink-0">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-foreground">
                                                                        <Database className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                                                        <span className="truncate">Database Schema - {schemaData.serverType.toUpperCase()}</span>
                                                                    </div>
                                                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                                                        Interactive database schema with {schemaData.schemaData.length} tables and {schemaData.relationships.length} relationships
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => setShowErDiagram(false)}
                                                                    className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                                                                >
                                                                    <X className="w-5 h-5 text-foreground" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 overflow-auto p-4 sm:p-6">
                                                            <div className="space-y-4">
                                                                {schemaData.schemaData
                                                                    .filter(table => {
                                                                        if (!searchTerm) return true;
                                                                        const searchLower = searchTerm.toLowerCase();
                                                                        return table.table_name.toLowerCase().includes(searchLower) ||
                                                                            table.columns.some((col: any) =>
                                                                                col.column_name.toLowerCase().includes(searchLower)
                                                                            );
                                                                    })
                                                                    .map((table: any, idx: number) => {
                                                                        const isSelected = selectedTable === table.table_name;

                                                                        // Find relationships for this table
                                                                        const outgoingRelationships = schemaData.relationships.filter(
                                                                            (rel: any) => rel.from_table === table.table_name
                                                                        );
                                                                        const incomingRelationships = schemaData.relationships.filter(
                                                                            (rel: any) => rel.to_table === table.table_name
                                                                        );

                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                className={`border rounded-lg overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary shadow-lg bg-primary/5' : 'border-border hover:border-primary/50'
                                                                                    }`}
                                                                            >
                                                                                <div className="bg-muted/50 px-4 py-3 border-b border-border">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                                                                            <Database className="w-4 h-4 text-primary" />
                                                                                            {table.table_name}
                                                                                        </h3>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                copyToClipboard(table.table_name, 'Table name');
                                                                                            }}
                                                                                            className="h-7 text-xs"
                                                                                        >
                                                                                            Copy Name
                                                                                        </Button>
                                                                                    </div>

                                                                                    {/* Show relationship counts */}
                                                                                    {(outgoingRelationships.length > 0 || incomingRelationships.length > 0) && (
                                                                                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                                                                            {outgoingRelationships.length > 0 && (
                                                                                                <span className="flex items-center gap-1">
                                                                                                    <span className="text-blue-500">→</span>
                                                                                                    {outgoingRelationships.length} Foreign Key{outgoingRelationships.length > 1 ? 's' : ''}
                                                                                                </span>
                                                                                            )}
                                                                                            {incomingRelationships.length > 0 && (
                                                                                                <span className="flex items-center gap-1">
                                                                                                    <span className="text-green-500">←</span>
                                                                                                    {incomingRelationships.length} Reference{incomingRelationships.length > 1 ? 's' : ''}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="bg-card overflow-x-auto">
                                                                                    <table className="w-full text-sm">
                                                                                        <thead className="bg-muted/50 sticky top-0 z-10">
                                                                                            <tr>
                                                                                                <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">Column Name</th>
                                                                                                <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">Data Type</th>
                                                                                                <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">Constraints</th>
                                                                                                <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">Nullable</th>
                                                                                                <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">Actions</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-border">
                                                                                            {table.columns.map((col: any, colIdx: number) => {
                                                                                                const matchesSearch = !searchTerm ||
                                                                                                    col.column_name.toLowerCase().includes(searchTerm.toLowerCase());

                                                                                                // Check if this column is a foreign key
                                                                                                const fkRelation = outgoingRelationships.find(
                                                                                                    (rel: any) => rel.from_column === col.column_name
                                                                                                );

                                                                                                return (
                                                                                                    <tr
                                                                                                        key={colIdx}
                                                                                                        className={`hover:bg-muted/50 transition-colors ${matchesSearch && searchTerm ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                                                                                                            }`}
                                                                                                    >
                                                                                                        <td className="px-4 py-3 font-mono text-sm text-foreground">
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <span className="truncate" title={col.column_name}>
                                                                                                                    {col.column_name}
                                                                                                                </span>
                                                                                                                {fkRelation && (
                                                                                                                    <span
                                                                                                                        className="text-xs text-blue-500 cursor-help"
                                                                                                                        title={`References ${fkRelation.to_table}.${fkRelation.to_column}`}
                                                                                                                    >
                                                                                                                        → {fkRelation.to_table}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                        <td className="px-4 py-3 text-muted-foreground">
                                                                                                            <code className="bg-muted px-2 py-1 rounded text-xs">
                                                                                                                {col.data_type}
                                                                                                            </code>
                                                                                                        </td>
                                                                                                        <td className="px-4 py-3 text-center">
                                                                                                            <div className="flex items-center justify-center gap-2">
                                                                                                                {col.constraint_type === 'PRIMARY KEY' && (
                                                                                                                    <span className="text-primary text-base" title="Primary Key">🔑</span>
                                                                                                                )}
                                                                                                                {col.constraint_type === 'FOREIGN KEY' && (
                                                                                                                    <span className="text-blue-500 text-base" title={`Foreign Key → ${fkRelation?.to_table}.${fkRelation?.to_column}`}>🔗</span>
                                                                                                                )}
                                                                                                                {!col.constraint_type && <span className="text-muted-foreground">—</span>}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                        <td className="px-4 py-3 text-center">
                                                                                                            {col.is_nullable ? (
                                                                                                                <span className="text-green-500 text-base">✓</span>
                                                                                                            ) : (
                                                                                                                <span className="text-red-500 text-base">✗</span>
                                                                                                            )}
                                                                                                        </td>
                                                                                                        <td className="px-4 py-3 text-center">
                                                                                                            <Button
                                                                                                                variant="ghost"
                                                                                                                size="sm"
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    copyToClipboard(col.column_name, 'Column name');
                                                                                                                }}
                                                                                                                className="h-7 w-7 p-0"
                                                                                                            >
                                                                                                                <span className="text-xs">📋</span>
                                                                                                            </Button>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                );
                                                                                            })}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>

                                                                                {/* Relationships Section */}
                                                                                {(outgoingRelationships.length > 0 || incomingRelationships.length > 0) && (
                                                                                    <div className="p-4 bg-muted/30 border-t border-border">
                                                                                        <h4 className="text-sm font-semibold text-foreground mb-2">Relationships</h4>
                                                                                        <div className="space-y-2">
                                                                                            {outgoingRelationships.map((rel: any, relIdx: number) => (
                                                                                                <div key={`out-${relIdx}`} className="text-xs p-2 bg-blue-500/10 border border-blue-500/20 rounded flex items-center gap-2">
                                                                                                    <span className="text-blue-500 font-mono">→</span>
                                                                                                    <code className="text-foreground">
                                                                                                        {rel.from_column}
                                                                                                    </code>
                                                                                                    <span className="text-muted-foreground">references</span>
                                                                                                    <code className="text-primary font-semibold">
                                                                                                        {rel.to_table}.{rel.to_column}
                                                                                                    </code>
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => copyToClipboard(`${rel.to_table}.${rel.to_column}`, 'Reference')}
                                                                                                        className="h-6 w-6 p-0 ml-auto"
                                                                                                    >
                                                                                                        📋
                                                                                                    </Button>
                                                                                                </div>
                                                                                            ))}
                                                                                            {incomingRelationships.map((rel: any, relIdx: number) => (
                                                                                                <div key={`in-${relIdx}`} className="text-xs p-2 bg-green-500/10 border border-green-500/20 rounded flex items-center gap-2">
                                                                                                    <span className="text-green-500 font-mono">←</span>
                                                                                                    <span className="text-muted-foreground">Referenced by</span>
                                                                                                    <code className="text-primary font-semibold">
                                                                                                        {rel.from_table}.{rel.from_column}
                                                                                                    </code>
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => copyToClipboard(`${rel.from_table}.${rel.from_column}`, 'Reference')}
                                                                                                        className="h-6 w-6 p-0 ml-auto"
                                                                                                    >
                                                                                                        📋
                                                                                                    </Button>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {exam.language === 'python' && examFiles.length > 0 && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="w-full mt-3 text-xs"
                                                >
                                                    <Terminal className="w-3 h-3 mr-2" />
                                                    View Files ({examFiles.length})
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle className="flex items-center gap-2">
                                                        <Terminal className="w-5 h-5 text-primary" />
                                                        Available Files
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Files you can use in your Python code
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-3 max-h-96 overflow-y-auto py-4">
                                                    {examFiles.map((file, idx) => (
                                                        <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <code className="text-sm font-mono text-primary font-semibold">
                                                                    {file.file_name}
                                                                </code>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(file.file_name);
                                                                        toast.success('Filename copied!');
                                                                    }}
                                                                >
                                                                    Copy
                                                                </Button>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Size: {(file.file_size / 1024).toFixed(2)} KB
                                                            </p>
                                                        </div>
                                                    ))}

                                                    {/* Usage Hint */}
                                                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                                        <p className="text-xs font-semibold text-foreground mb-2">💡 Usage Example:</p>
                                                        <code className="text-xs bg-background px-2 py-1 rounded border border-border font-mono text-primary block">
                                                            import pandas as pd{'\n'}
                                                            df = pd.read_csv('filename.csv')
                                                        </code>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {/* Question Display */}
                        <div className="h-1/3 border-b border-border overflow-y-auto bg-card">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">
                                            {activeQuestionIndex + 1}
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">
                                            Question {activeQuestionIndex + 1}
                                        </h2>
                                        <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                                            {exam.questions[activeQuestionIndex].marks} points
                                        </span>
                                        {flaggedQuestions.has(activeQuestionIndex) && (
                                            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium rounded-full flex items-center gap-1">
                                                <span>🚩</span> Flagged
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleFlag(activeQuestionIndex)}
                                            className={`p-2 rounded-lg transition-all ${flaggedQuestions.has(activeQuestionIndex)
                                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30'
                                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                                }`}
                                            title={flaggedQuestions.has(activeQuestionIndex) ? 'Remove flag' : 'Flag for review'}
                                        >
                                            <span className="text-lg">🚩</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
                                            disabled={activeQuestionIndex === 0}
                                            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-40"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setActiveQuestionIndex(Math.min(exam.questions.length - 1, activeQuestionIndex + 1))}
                                            disabled={activeQuestionIndex === exam.questions.length - 1}
                                            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-40"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                                    dangerouslySetInnerHTML={{ __html: exam.questions[activeQuestionIndex].question }}
                                />
                            </div>
                        </div>

                        {/* Code Editor & Output OR MCQ Options */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {exam.questions[activeQuestionIndex]?.type === 'mcq' ? (
                                // MCQ Options View
                                <div className="flex-1 overflow-y-auto bg-card p-6">
                                    <div className="max-w-3xl mx-auto space-y-4">
                                        <div className="mb-6">
                                            <h3 className="text-lg font-semibold text-foreground mb-2">Select your answer:</h3>
                                            <p className="text-sm text-muted-foreground">Choose one option from the following</p>
                                        </div>

                                        <div className="space-y-3">
                                            {exam.questions[activeQuestionIndex]?.options?.map((option: any, optionIndex: number) => {
                                                const isSelected = mcqAnswers[activeQuestionIndex] === optionIndex;

                                                return (
                                                    <button
                                                        key={option.id || optionIndex}
                                                        onClick={() => handleMcqAnswer(activeQuestionIndex, optionIndex)}
                                                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${isSelected
                                                            ? 'border-primary bg-primary/10 shadow-md'
                                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${isSelected
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted text-muted-foreground'
                                                                }`}>
                                                                {String.fromCharCode(65 + optionIndex)}
                                                            </div>
                                                            <div className="flex-1 pt-1">
                                                                <p className="text-sm text-foreground leading-relaxed">{option.text}</p>
                                                            </div>
                                                            {isSelected && (
                                                                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {mcqAnswers[activeQuestionIndex] !== undefined && (
                                            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                                                <div className="flex items-center gap-2 text-sm text-primary">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="font-medium">
                                                        Answer selected: Option {String.fromCharCode(65 + mcqAnswers[activeQuestionIndex])}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Coding Questions - Editor & Console
                                <>
                                    {/* Editor Header */}
                                    <div className="h-14 border-b border-border bg-muted/30 flex items-center justify-between px-4">
                                        <div className="flex items-center gap-3">
                                            <Terminal className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-medium text-foreground">Code Editor</span>
                                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                                                {exam.language.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg">
                                                <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                                <button
                                                    onClick={() => {
                                                        const newTheme = theme === 'dark' ? 'light' : 'dark';
                                                        setTheme(newTheme);
                                                        setEditorTheme(newTheme);
                                                    }}
                                                    className="relative w-10 h-5 bg-muted rounded-full transition-colors"
                                                >
                                                    <div className={`absolute top-0.5 ${theme === 'dark' ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-primary rounded-full transition-all`} />
                                                </button>
                                                <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-muted-foreground'}`} />
                                            </div>

                                            <button
                                                onClick={handleRun}
                                                disabled={running}
                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {running ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        Running
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4" />
                                                        Run Code
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Editor & Console Split */}
                                    <div className="flex-1 flex overflow-hidden">
                                        {/* Code Editor */}
                                        <div className="flex-1 overflow-hidden bg-background">
                                            <Editor
                                                height="100%"
                                                language={exam.language === 'sql' ? 'sql' : exam.language}
                                                value={code}
                                                onChange={(value) => {
                                                    const newCode = value || "";
                                                    setCode(newCode);
                                                    updateAnswer(activeQuestionIndex, newCode);
                                                }}
                                                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                                options={{
                                                    minimap: { enabled: true },
                                                    fontSize: 14,
                                                    lineNumbers: 'on',
                                                    roundedSelection: false,
                                                    scrollBeyondLastLine: false,
                                                    automaticLayout: true,
                                                    tabSize: 4,
                                                    wordWrap: 'on',
                                                    formatOnPaste: true,
                                                    formatOnType: true,
                                                    suggestOnTriggerCharacters: true,
                                                    quickSuggestions: true,
                                                    folding: true,
                                                    bracketPairColorization: { enabled: true },
                                                }}
                                            />
                                        </div>

                                        {/* Console Output */}
                                        <div className="w-2/5 border-l border-border bg-card flex flex-col">
                                            <div className="h-10 border-b border-border bg-muted/30 flex items-center px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                                </div>
                                                <span className="ml-4 text-xs font-medium text-muted-foreground">
                                                    {exam.language === 'sql' ? 'Query Results' : 'Console'}
                                                </span>
                                            </div>

                                            <div className="flex-1 overflow-auto p-4">
                                                {exam.language === 'sql' ? (
                                                    // SQL Results Table
                                                    sqlResult ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium text-foreground">
                                                                    {sqlResult.rows.length} row{sqlResult.rows.length !== 1 ? 's' : ''} returned
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {sqlResult.columns.length} column{sqlResult.columns.length !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>

                                                            <div className="border border-border rounded-lg overflow-hidden">
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm">
                                                                        <thead className="bg-muted">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left font-semibold text-foreground border-b border-border w-12">
                                                                                    #
                                                                                </th>
                                                                                {sqlResult.columns.map((col, idx) => (
                                                                                    <th
                                                                                        key={idx}
                                                                                        className="px-4 py-2 text-left font-semibold text-foreground border-b border-border whitespace-nowrap"
                                                                                    >
                                                                                        {col}
                                                                                    </th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {sqlResult.rows.length > 0 ? (
                                                                                sqlResult.rows.map((row, rowIdx) => (
                                                                                    <tr
                                                                                        key={rowIdx}
                                                                                        className="hover:bg-muted/50 transition-colors"
                                                                                    >
                                                                                        <td className="px-4 py-2 text-muted-foreground border-b border-border/50 font-mono text-xs">
                                                                                            {rowIdx + 1}
                                                                                        </td>
                                                                                        {sqlResult.columns.map((col, colIdx) => (
                                                                                            <td
                                                                                                key={colIdx}
                                                                                                className="px-4 py-2 border-b border-border/50 font-mono text-xs text-foreground"
                                                                                            >
                                                                                                {row[col] === null ? (
                                                                                                    <span className="text-muted-foreground italic">NULL</span>
                                                                                                ) : row[col] === undefined ? (
                                                                                                    <span className="text-muted-foreground italic">-</span>
                                                                                                ) : typeof row[col] === 'object' ? (
                                                                                                    <span className="text-blue-500">{JSON.stringify(row[col])}</span>
                                                                                                ) : (
                                                                                                    String(row[col])
                                                                                                )}
                                                                                            </td>
                                                                                        ))}
                                                                                    </tr>
                                                                                ))
                                                                            ) : (
                                                                                <tr>
                                                                                    <td
                                                                                        colSpan={sqlResult.columns.length + 1}
                                                                                        className="px-4 py-8 text-center text-muted-foreground"
                                                                                    >
                                                                                        No rows returned
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>

                                                            {output && (
                                                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="text-xs font-semibold text-muted-foreground">Info:</span>
                                                                        <pre className="text-xs text-foreground whitespace-pre-wrap flex-1">{output}</pre>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : output ? (
                                                        // Error or info message
                                                        <div className="space-y-2">
                                                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                                                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{output}</pre>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Empty state
                                                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                                            <Terminal className="w-12 h-12 mb-3 opacity-50" />
                                                            <p className="text-sm font-medium mb-1">No Results</p>
                                                            <p className="text-xs">Run your SQL query to see results</p>
                                                        </div>
                                                    )
                                                ) : (
                                                    // Non-SQL Console Output
                                                    output ? (
                                                        <pre className="text-foreground whitespace-pre-wrap font-mono text-sm">{output}</pre>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                                            <Terminal className="w-12 h-12 mb-3 opacity-50" />
                                                            <p className="text-sm">Run your code to see output</p>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </main>
                </div>

                {exam?.isExamProctored && (
                    <ProctoringMonitor
                        isExamProctored={exam?.isExamProctored || false}
                        examStarted={examStarted}
                        examId={examId?.toString() || ""}
                        userEmail={session?.user?.email || ""}
                        onDisqualification={handleDisqualification}
                    />
                )}

                {/* Loading Overlay */}
                {isSubmitting && (
                    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Send className="w-6 h-6 text-primary" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-foreground mb-2">Submitting Your Exam</h3>
                                    <p className="text-sm text-muted-foreground">Please wait while we process your submission...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Summary Modal */}
                {showSubmitSummary && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                            {/* Header */}
                            <div className="p-6 border-b border-border flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground mb-1">Exam Summary</h2>
                                        <p className="text-sm text-muted-foreground">Review your answers before final submission</p>
                                    </div>
                                    <button
                                        onClick={() => setShowSubmitSummary(false)}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Summary Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                            <div className="text-sm text-muted-foreground mb-1">Total Questions</div>
                                            <div className="text-2xl font-bold text-foreground">{exam.questions.length}</div>
                                        </div>
                                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <div className="text-sm text-muted-foreground mb-1">Answered</div>
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{answeredCount}</div>
                                        </div>
                                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <div className="text-sm text-muted-foreground mb-1">Unanswered</div>
                                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                {exam.questions.length - answeredCount}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            <div className="text-sm text-muted-foreground mb-1">Flagged</div>
                                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                                {flaggedQuestions.size}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Time Remaining */}
                                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-5 h-5 text-primary" />
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Time Remaining</div>
                                                    <div className="text-lg font-bold text-foreground">{formattedTime}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Unanswered Questions Warning */}
                                    {exam.questions.length - answeredCount > 0 && (
                                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0">⚠️</div>
                                                <div>
                                                    <div className="font-semibold text-red-600 dark:text-red-400 mb-1">
                                                        You have {exam.questions.length - answeredCount} unanswered question{exam.questions.length - answeredCount > 1 ? 's' : ''}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Questions: {exam.questions
                                                            .map((_: any, idx: any) => idx)
                                                            .filter((idx: number) => !isQuestionAnswered(idx))
                                                            .map((idx: number) => `Q${idx + 1}`)
                                                            .join(', ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Flagged Questions */}
                                    {flaggedQuestions.size > 0 && (
                                        <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            <div className="flex items-start gap-3">
                                                <span className="text-lg flex-shrink-0">🚩</span>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                                        {flaggedQuestions.size} question{flaggedQuestions.size > 1 ? 's' : ''} flagged for review
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Questions: {Array.from(flaggedQuestions)
                                                            .sort((a, b) => a - b)
                                                            .map(idx => `Q${idx + 1}`)
                                                            .join(', ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Question Breakdown */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground mb-3">Question Breakdown</h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {exam.questions.map((q: Question, index: number) => {
                                                const isAnswered = isQuestionAnswered(index);
                                                const isFlagged = flaggedQuestions.has(index);

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`p-3 rounded-lg border flex items-center justify-between ${isAnswered
                                                            ? 'bg-green-500/10 border-green-500/20'
                                                            : 'bg-red-500/10 border-red-500/20'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isAnswered
                                                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                                                                }`}>
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-foreground">
                                                                        Question {index + 1}
                                                                    </span>
                                                                    {q.type === 'mcq' && (
                                                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs rounded">
                                                                            MCQ
                                                                        </span>
                                                                    )}
                                                                    {q.type !== 'mcq' && (
                                                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded">
                                                                            Coding
                                                                        </span>
                                                                    )}
                                                                    {isFlagged && <span>🚩</span>}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">{q.marks} points</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isAnswered ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                            ) : (
                                                                <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    setShowSubmitSummary(false);
                                                                    setActiveQuestionIndex(index);
                                                                }}
                                                                className="px-3 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                                            >
                                                                Review
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/30">
                                <button
                                    onClick={() => setShowSubmitSummary(false)}
                                    className="px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors"
                                >
                                    Continue Exam
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSubmitSummary(false);
                                        handleSubmit();
                                    }}
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Confirm & Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}