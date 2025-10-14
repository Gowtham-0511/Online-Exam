import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import ProctoringMonitor from "@/components/exam/ProctoringMonitor";
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
} from "lucide-react";
import { Editor } from "@monaco-editor/react";

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
    const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: any[][] } | null>(null);
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
            updated[index] = code;
            return updated;
        });
    }, []);

    const isQuestionAnswered = useCallback((index: number) => {
        return !!(answers[index] && answers[index].trim() !== "");
    }, [answers]);

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
        }

        // if (exam && !examStarted) {
        //     document.documentElement.requestFullscreen()
        //         .then(() => {
        //             setExamStarted(true);
        //         })
        //         .catch(() => {
        //             alert("Please allow fullscreen mode.");
        //         });
        // }
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

        console.log(isDisqualified, "isDisqualified");

        const email = session.user?.email || "unknown";
        const userName = session.user?.name || "Anonymous";
        const examIdStr = examId?.toString() || "unknown";

        const answersWithQuestionIds = answers.map((answer, index) => ({
            questionId: shuffledQuestions[index]?.id || index,
            question: shuffledQuestions[index]?.question || '',
            answer: answer,
            marks: shuffledQuestions[index]?.marks || 0,
            originalIndex: index
        }));

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

            console.log(finalResult.submissionId, "submission result");

            fetch("http://localhost:5678/webhook/feedback", {
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
                body: JSON.stringify({ code }),
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

        try {
            const res = await fetch("/api/run-sql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: code, database: "SysRankDB" }),
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
            setOutput("❌ Server error.");
        }

        setRunning(false);
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
                        onClick={handleSubmit}
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

                        <div className="flex-1 overflow-y-auto p-2">
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
                        </div>

                        <div className="p-4 border-t border-border bg-muted/50">
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Answered</span>
                                    <span className="font-semibold text-primary">{answeredCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Unanswered</span>
                                    <span className="font-semibold text-muted-foreground">{exam.questions.length - answeredCount}</span>
                                </div>
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
                                </div>

                                <div className="flex items-center gap-2">
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

                    {/* Code Editor & Output */}
                    <div className="flex-1 flex flex-col overflow-hidden">
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
                                    <span className="ml-4 text-xs font-medium text-muted-foreground">Console</span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                                    {output ? (
                                        <pre className="text-foreground whitespace-pre-wrap">{output}</pre>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                            <Terminal className="w-12 h-12 mb-3 opacity-50" />
                                            <p className="text-sm">Run your code to see output</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
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
        </div>
    );
}