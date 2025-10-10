import { memo, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import ProctoringMonitor from "@/components/exam/ProctoringMonitor";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Clock,
    Code,
    Play,
    Send,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Terminal,
    FileCode,
    Monitor,
    Moon,
    Sun,
} from "lucide-react";
import dynamic from "next/dynamic";

const CodeEditor = dynamic(() => import("../../components/CodeEditor"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    ),
});

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

    const [editorTheme, setEditorTheme] = useState<"light" | "dark">("light");

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

    // Memoize time-related calculations
    const timeColor = useMemo(() => {
        if (timeLeft > 300) return "text-primary";
        if (timeLeft > 60) return "text-amber-600 dark:text-amber-400";
        return "text-destructive";
    }, [timeLeft]);

    const progressWidth = useMemo(() => {
        const totalTime = exam?.duration ? exam.duration * 60 : 0;
        return totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    }, [timeLeft, exam?.duration]);

    // Memoize answered count
    const answeredCount = useMemo(() => {
        return answers.filter(answer => answer && answer.trim() !== "").length;
    }, [answers]);

    // Memoize formatted time
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
        return answers[index] && answers[index].trim() !== "";
    }, [answers]);

    const navigateQuestion = useCallback((direction: 'prev' | 'next') => {
        setActiveQuestionIndex(prev => {
            if (direction === 'prev' && prev > 0) {
                return prev - 1;
            } else if (direction === 'next' && exam?.questions && prev < exam.questions.length - 1) {
                return prev + 1;
            }
            return prev;
        });
    }, [exam?.questions]);

    type ExamQuestion = {
        id: string;
        question: string;
        expectedOutput: string;
    };

    type SqlResult = {
        columns: string[];
        rows: Record<string, any>[];
    };

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

    // useEffect(() => {
    //     const fetchDatabaseSchema = async () => {
    //         if (exam?.language !== "sql") return;

    //         setSchemaLoading(true);
    //         try {
    //             const response = await fetch("/api/database-schema");
    //             if (response.ok) {
    //                 const schema = await response.json();
    //                 setDatabases(schema.databases || []);
    //                 if (schema.databases?.length > 0) {
    //                     setSelectedDatabase(schema.databases[0].name);
    //                 }
    //             }
    //         } catch (error) {
    //             console.error("Failed to fetch database schema:", error);
    //         } finally {
    //             setSchemaLoading(false);
    //         }
    //     };

    //     fetchDatabaseSchema();
    // }, [exam?.language]);

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
        const currentTime = Date.now();

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
            // let evaluationResult = null;
            // try {
            //     const response = await fetch("http://localhost:5678/webhook/evaluate", {
            //         method: "POST",
            //         headers: { "Content-Type": "application/json" },
            //         body: JSON.stringify({ answersWithQuestionIds })
            //     });
            //     evaluationResult = await response.text();
            //     console.log(evaluationResult);
            // } catch (error) {
            //     console.error("Evaluation failed:", error);
            // }

            await fetch("/api/submissions", {
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

            await cleanupExamEnvironment();
            setIsSubmitting(false);
            router.push("/dashboard/attender");

        } catch (error) {
            console.error("Submission failed:", error);
            setIsSubmitting(false);
        }
    };

    // const handleSubmit = async () => {

    //     if (hasSubmittedRef.current) return;

    //     hasSubmittedRef.current = true;
    //     setIsSubmitting(true);

    //     if (!exam || !session) return;

    //     console.log(isDisqualified, "isDisqualified");

    //     const email = session.user?.email || "unknown";
    //     const userName = session.user?.name || "Anonymous";
    //     const examIdStr = examId?.toString() || "unknown";

    //     const answersWithQuestionIds = answers.map((answer, index) => ({
    //         questionId: shuffledQuestions[index]?.id || index,
    //         question: shuffledQuestions[index]?.question || '',
    //         answer: answer,
    //         marks: shuffledQuestions[index]?.marks || 0,
    //         originalIndex: index
    //     }));

    //     let evaluationResult = null;
    //     try {
    //         const response = await fetch("http://localhost:5678/webhook/evaluate", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({ answersWithQuestionIds })
    //         });
    //         evaluationResult = await response.text();
    //         console.log(evaluationResult);
    //     } catch (error) {
    //         console.error(error);
    //     }

    //     await fetch("/api/submissions", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({
    //             examId: examIdStr,
    //             email,
    //             userName,
    //             answers,
    //             evaluationResult,
    //             disqualified: isDisqualified,
    //             code,
    //         }),
    //     });

    //     await cleanupExamEnvironment();
    //     setIsSubmitting(false);
    //     router.push("/dashboard/attender");

    // };

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
        <div className="min-h-screen bg-background">
            <div className="fixed top-0 left-0 right-0 z-50 h-24">
                {/* Glassmorphism background with subtle gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/98 to-background/95 backdrop-blur-2xl border-b border-border/30 shadow-lg shadow-black/5" />

                {/* Animated accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                <div className="relative h-full flex items-center justify-between px-8 lg:px-12">
                    {/* Left Section - Logo & Exam Info */}
                    <div className="flex items-center gap-8">
                        {/* Enhanced Logo with floating effect */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl group-hover:bg-primary/30 transition-all duration-500" />
                            <div className="relative w-16 h-16 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 hover:rotate-6 transition-all duration-500 group-hover:shadow-primary/25">
                                <Code className="w-8 h-8 text-white transform group-hover:scale-110 transition-transform duration-300" />
                                {/* Orbiting dots */}
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse shadow-lg" />
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-secondary rounded-full animate-pulse delay-300 shadow-md" />
                            </div>
                        </div>

                        {/* Exam Information with enhanced typography */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                                    {exam.title}
                                </h1>
                                {/* Live status indicator */}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs font-medium text-green-700 dark:text-green-300">LIVE</span>
                                </div>
                            </div>

                            {/* Enhanced metadata badges */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <Badge
                                        variant="secondary"
                                        className="px-4 py-2 text-sm font-semibold rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-all duration-300 shadow-sm"
                                    >
                                        <Terminal className="w-4 h-4 mr-2" />
                                        {exam.language?.toUpperCase()}
                                    </Badge>

                                    <div className="h-6 w-px bg-border/50" />

                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <FileCode className="w-4 h-4" />
                                        <span className="font-medium">{exam.questions?.length} Questions</span>
                                    </div>

                                    <div className="h-6 w-px bg-border/50" />

                                    {/* Progress indicator */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full border-2 border-primary/20 flex items-center justify-center relative overflow-hidden">
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-t from-primary to-primary/80 transition-all duration-700 ease-out"
                                                    style={{
                                                        transform: `translateY(${100 - (answeredCount / exam.questions?.length * 100)}%)`
                                                    }}
                                                />
                                                <span className="text-xs font-bold text-foreground relative z-10">
                                                    {answeredCount}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground">
                                                / {exam.questions?.length}
                                            </span>
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={`px-3 py-1.5 rounded-xl border-2 transition-all duration-500 ${answeredCount === exam.questions?.length
                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-700 shadow-green-100 shadow-md dark:from-green-950/50 dark:to-emerald-950/50 dark:border-green-700 dark:text-green-300'
                                                : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-700 shadow-amber-100 shadow-md dark:from-amber-950/50 dark:to-orange-950/50 dark:border-amber-700 dark:text-amber-300'
                                                }`}
                                        >
                                            {answeredCount === exam.questions?.length ? (
                                                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                            ) : (
                                                <Clock className="w-3 h-3 mr-1.5" />
                                            )}
                                            {answeredCount === exam.questions?.length ? 'Complete' : 'In Progress'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Section - Timer & Actions */}
                    <div className="flex items-center gap-6">
                        {/* Enhanced Timer with breathing animation */}
                        <Card className={`relative overflow-hidden transition-all duration-700 shadow-2xl ${timeLeft <= 60
                            ? 'border-red-400/60 shadow-red-500/30 bg-gradient-to-br from-red-50/80 to-rose-50/60 dark:from-red-950/40 dark:to-rose-950/20'
                            : timeLeft <= 300
                                ? 'border-amber-400/60 shadow-amber-500/30 bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/20'
                                : 'border-green-400/60 shadow-green-500/30 bg-gradient-to-br from-green-50/80 to-emerald-50/60 dark:from-green-950/40 dark:to-emerald-950/20'
                            }`}>
                            {/* Animated border */}
                            <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${timeLeft <= 60 ? 'from-red-500/20 via-rose-500/20 to-red-500/20' :
                                timeLeft <= 300 ? 'from-amber-500/20 via-orange-500/20 to-amber-500/20' :
                                    'from-green-500/20 via-emerald-500/20 to-green-500/20'
                                } opacity-50 animate-pulse`} />

                            <CardContent className="relative px-8 py-4">
                                <div className="flex items-center gap-4">
                                    {/* Animated clock icon */}
                                    <div className="relative">
                                        <div className={`absolute inset-0 rounded-full blur-sm ${timeLeft <= 300 ? 'bg-current animate-ping opacity-30' : ''
                                            }`} />
                                        <Clock className={`w-6 h-6 relative z-10 ${timeColor} ${timeLeft <= 60 ? 'animate-bounce' : timeLeft <= 300 ? 'animate-pulse' : ''
                                            }`} />
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-2xl font-mono font-bold tracking-wider ${timeColor} ${timeLeft <= 60 ? 'animate-pulse' : ''
                                            }`}>
                                            {formattedTime}
                                        </div>
                                        <div className="mt-2 relative">
                                            {/* Enhanced progress bar with gradient */}
                                            <div className="w-40 h-2.5 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                                                <div
                                                    className={`h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden ${timeLeft <= 60
                                                        ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600'
                                                        : timeLeft <= 300
                                                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
                                                            : 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600'
                                                        }`}
                                                    style={{ width: `${100 - progressWidth}%` }}
                                                >
                                                    {/* Shimmer effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] animate-pulse"
                                                        style={{ animation: 'shimmer 2s infinite' }} />
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 text-center">
                                                Time Remaining
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Enhanced Submit Button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="relative px-10 py-4 bg-gradient-to-r from-primary via-primary/90 to-primary text-white font-bold text-lg rounded-2xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 group overflow-hidden border border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                            <div className="relative flex items-center gap-3">
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                                        <span>Submit Exam</span>
                                    </>
                                )}
                            </div>

                            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-lg scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-32 pb-8 px-4">
                <div className="max-w-full mx-auto">
                    <div className={`grid gap-6 h-[calc(100vh-180px)] ${exam.language === 'sqla'
                        ? 'grid-cols-1 xl:grid-cols-4'
                        : 'grid-cols-1 xl:grid-cols-2'
                        }`}>
                        {/* Question Panel */}
                        <Card className={`relative overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-2xl border-border/50 backdrop-blur-xl`}>
                            {/* Animated background layers */}
                            <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/98 to-card/95" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/[0.02] via-transparent to-accent/[0.02]" />
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                            {/* Floating geometric decorations */}
                            <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl opacity-50 animate-pulse" />
                            <div className="absolute bottom-8 left-8 w-24 h-24 bg-gradient-to-tl from-accent/5 to-primary/5 rounded-full blur-2xl opacity-40 animate-pulse delay-1000" />

                            {/* Question Header */}
                            <CardHeader className="relative z-10 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 backdrop-blur-xl px-8 py-6 border-b border-border/30">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        {/* Enhanced question icon */}
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-systech-gradient rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                                            <div className="relative w-14 h-14 bg-systech-gradient rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300">
                                                <FileCode className="w-7 h-7 text-white group-hover:rotate-12 transition-transform duration-300" />
                                                {/* Orbiting indicator */}
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-accent to-accent/80 rounded-full shadow-lg animate-bounce" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                                                    Question {activeQuestionIndex + 1}
                                                </CardTitle>
                                                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-muted to-muted/80 border border-border/50">
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        of {exam.questions?.length || 0}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground font-medium">Select and solve your questions</p>

                                            {/* Progress indicators */}
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-sm" />
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        Current: {activeQuestionIndex + 1}
                                                    </span>
                                                </div>
                                                <div className="w-px h-4 bg-border" />
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-3 h-3 text-primary" />
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        Completed: {answeredCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enhanced navigation controls */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/50 border border-border/50 backdrop-blur-sm">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigateQuestion('prev')}
                                                disabled={activeQuestionIndex === 0}
                                                className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary disabled:opacity-40 transition-all duration-200 rounded-lg"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </Button>
                                            <div className="w-px h-6 bg-border/50" />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigateQuestion('next')}
                                                disabled={activeQuestionIndex === exam.questions.length - 1}
                                                className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary disabled:opacity-40 transition-all duration-200 rounded-lg"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Question Tabs Navigation */}
                                <div className="relative">
                                    <ScrollArea className="max-h-20">
                                        <div className="flex flex-wrap gap-3 pb-2">
                                            {(exam.questions as ExamQuestion[]).map((_, index) => {
                                                const isActive = activeQuestionIndex === index;
                                                const isAnswered = isQuestionAnswered(index);

                                                return (
                                                    <Button
                                                        key={index}
                                                        variant={isActive ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setActiveQuestionIndex(index)}
                                                        className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 group overflow-hidden ${isActive
                                                            ? 'bg-systech-gradient text-white shadow-lg shadow-primary/25 scale-105 border-0'
                                                            : 'hover:bg-muted/60 hover:border-primary/30 hover:scale-105 hover:shadow-md border-border/50'
                                                            }`}
                                                    >
                                                        {/* Background animations for active state */}
                                                        {isActive && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                                        )}

                                                        <span className="relative z-10 font-bold text-base">
                                                            {index + 1}
                                                        </span>

                                                        {isAnswered && (
                                                            <div className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-primary/10'
                                                                }`}>
                                                                <CheckCircle2 className={`w-3 h-3 ${isActive ? 'text-white' : 'text-primary'}`} />
                                                            </div>
                                                        )}

                                                        {/* Completion indicator dot */}
                                                        {isAnswered && !isActive && (
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-primary to-primary/80 rounded-full border-2 border-background shadow-sm" />
                                                        )}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>

                                    {/* Scroll indicators */}
                                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-muted/60 to-transparent pointer-events-none" />
                                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-muted/60 to-transparent pointer-events-none" />
                                </div>
                            </CardHeader>

                            {/* Question Content Area */}
                            <CardContent className="relative z-10 flex-1 p-8 overflow-y-auto w-full">
                                {exam.questions && exam.questions[activeQuestionIndex] && (
                                    <div className="space-y-8">
                                        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-background via-muted/20 to-primary/5 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                            <CardContent className="relative p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="relative flex-shrink-0">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl blur-sm opacity-60 group-hover:opacity-100 transition-all duration-300" />
                                                        <Badge
                                                            variant="secondary"
                                                            className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground font-bold text-lg border-0 shadow-lg hover:scale-105 transition-transform duration-300 flex items-center justify-center"
                                                        >
                                                            {activeQuestionIndex + 1}
                                                        </Badge>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                    </div>

                                                    {/* Question content */}
                                                    <div className="flex-1 space-y-2">
                                                        <div className="prose prose-neutral dark:prose-invert max-w-none">
                                                            <div
                                                                className="text-lg leading-relaxed text-foreground/95 font-medium break-words [&>img]:max-w-md [&>img]:w-full [&>img]:h-auto [&>img]:rounded-xl [&>img]:shadow-md [&>img]:mt-4 [&>img]:border [&>img]:border-border/30 [&>p]:mb-4 [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4"
                                                                dangerouslySetInnerHTML={{ __html: exam.questions[activeQuestionIndex].question }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </CardContent>
                                        </Card>

                                        {/* Enhanced Answer Input Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-lg font-semibold text-foreground flex items-center gap-3">
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                                    Your Solution
                                                </label>

                                                {/* Input metadata */}
                                                <div className="flex items-center gap-3">
                                                    {isQuestionAnswered(activeQuestionIndex) && (
                                                        <Badge variant="outline" className="px-3 py-1.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-primary/30 rounded-xl">
                                                            <CheckCircle2 className="w-3 h-3 mr-2" />
                                                            Answered
                                                        </Badge>
                                                    )}
                                                    <Badge variant="secondary" className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50">
                                                        {(answers[activeQuestionIndex] || "").length} characters
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Enhanced textarea with modern styling */}
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                <div className="relative">
                                                    <Textarea
                                                        value={answers[activeQuestionIndex] || ""}
                                                        onChange={(e) => {
                                                            updateAnswer(activeQuestionIndex, e.target.value);
                                                            setCode(e.target.value);
                                                        }}
                                                        className="min-h-80 font-mono text-base bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 backdrop-blur-sm border-2 border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-300 resize-none rounded-2xl p-6 shadow-inner hover:shadow-lg"
                                                        placeholder={`// Write your ${exam.language} code here...\n// Be creative and solve step by step`}
                                                    />

                                                    {/* Floating action indicators */}
                                                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                                        {/* Save indicator */}
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${answers[activeQuestionIndex] && answers[activeQuestionIndex].length > 0
                                                            ? 'bg-primary/10 border border-primary/20 text-primary'
                                                            : 'bg-muted/50 border border-border/30 text-muted-foreground'
                                                            }`}>
                                                            <div className={`w-2 h-2 rounded-full ${answers[activeQuestionIndex] && answers[activeQuestionIndex].length > 0
                                                                ? 'bg-primary animate-pulse'
                                                                : 'bg-muted-foreground/50'
                                                                }`} />
                                                            <span className="text-xs font-medium">
                                                                {answers[activeQuestionIndex] && answers[activeQuestionIndex].length > 0 ? 'Saved' : 'Empty'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Syntax highlighting hint */}
                                                    <div className="absolute top-4 right-4">
                                                        <Badge variant="outline" className="px-2 py-1 text-xs bg-card/80 backdrop-blur-sm border-border/40">
                                                            {exam.language?.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            {/* Enhanced Footer with progress indicator */}
                            <div className="relative z-10 px-8 py-4 border-t border-border/30 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    {/* Progress visualization */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-muted-foreground">Progress:</span>
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-systech-gradient transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                                                    style={{ width: `${(answeredCount / exam.questions?.length) * 100}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse" />
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-foreground">
                                                {Math.round((answeredCount / exam.questions?.length) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>


                        {/* Code Editor Panel */}
                        <Card className="relative overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-2xl border-border/50 backdrop-blur-xl">
                            {/* Animated background layers */}
                            <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/98 to-card/95" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/[0.02] via-transparent to-accent/[0.02]" />
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                            {/* Floating geometric decorations */}
                            <div className="absolute top-6 right-6 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl opacity-50 animate-pulse" />
                            <div className="absolute bottom-8 left-8 w-24 h-24 bg-gradient-to-tl from-accent/5 to-primary/5 rounded-full blur-2xl opacity-40 animate-pulse delay-1000" />

                            {/* Enhanced Header Section */}
                            <CardHeader className="relative z-10 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 backdrop-blur-xl px-8 py-6 border-b border-border/30">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        {/* Enhanced Terminal Icon */}
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-systech-gradient rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                                            <div className="relative w-14 h-14 bg-systech-gradient rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                                                <Terminal className="w-7 h-7 text-white group-hover:rotate-12 transition-transform duration-300" />
                                                {/* Code indicator dots */}
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-accent to-accent/80 rounded-full shadow-lg flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                                                    Code Editor
                                                </CardTitle>
                                                {/* Live coding indicator */}
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                    <span className="text-xs font-medium text-green-700 dark:text-green-300">ACTIVE</span>
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground font-medium">Write and test your solution with real-time execution</p>

                                            {/* Code stats */}
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-sm" />
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        Lines: {code.split('\n').length}
                                                    </span>
                                                </div>
                                                <div className="w-px h-3 bg-border" />
                                                <div className="flex items-center gap-2">
                                                    <Code className="w-3 h-3 text-primary" />
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        Characters: {code.length}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enhanced Action Controls */}
                                    <div className="flex items-center gap-4">
                                        {/* Run Button with enhanced styling */}
                                        <Button
                                            onClick={handleRun}
                                            disabled={running}
                                            className="relative px-8 py-3 bg-systech-gradient text-white font-bold text-lg rounded-2xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 group overflow-hidden border border-primary/20 disabled:opacity-50 disabled:transform-none"
                                        >
                                            {/* Animated background shimmer */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                                            {/* Button content */}
                                            <div className="relative flex items-center gap-3">
                                                {running ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Executing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                                                        <span>Run Code</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Glow effect */}
                                            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-lg scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                                        </Button>

                                        {/* Theme Toggle with enhanced styling */}
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-muted/60 to-muted/40 border border-border/50 backdrop-blur-sm">
                                            <div className="flex items-center gap-2">
                                                <Sun className={`w-4 h-4 transition-all duration-300 ${editorTheme === 'light' ? 'text-amber-500 scale-110' : 'text-muted-foreground scale-90'}`} />
                                                <Switch
                                                    id="theme-switch"
                                                    checked={editorTheme === 'dark'}
                                                    onCheckedChange={() => setEditorTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                                                    className="data-[state=checked]:bg-systech-gradient"
                                                />
                                                <Moon className={`w-4 h-4 transition-all duration-300 ${editorTheme === 'dark' ? 'text-blue-400 scale-110' : 'text-muted-foreground scale-90'}`} />
                                            </div>
                                            <div className="w-px h-4 bg-border" />
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {editorTheme === 'dark' ? 'Dark' : 'Light'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Language Badge and Status */}
                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-4">
                                        <Badge className="px-4 py-2 text-sm font-bold bg-systech-gradient text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                                            <FileCode className="w-4 h-4 mr-2" />
                                            {exam.language?.toUpperCase()}
                                        </Badge>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
                                                <div className={`w-2 h-2 rounded-full ${code.length > 0 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`} />
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {code.length > 0 ? 'Modified' : 'Empty'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Enhanced Code Editor Section */}
                            <div className="relative z-10 h-80 overflow-hidden">
                                {/* Editor border glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                                <div className="h-full bg-gradient-to-br from-muted/30 via-muted/10 to-muted/30 backdrop-blur-sm relative">
                                    <CodeEditor
                                        language={exam.language}
                                        value={code}
                                        onChange={(newCode) => {
                                            setCode(newCode);
                                            updateAnswer(activeQuestionIndex, newCode);
                                        }}
                                        theme={editorTheme === "dark" ? "vs-dark" : "light"}
                                    />

                                    {/* Floating editor overlay */}
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        <Badge variant="outline" className="px-2 py-1 text-xs bg-card/80 backdrop-blur-sm border-border/40">
                                            <Monitor className="w-3 h-3 mr-1" />
                                            {editorTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Console Output Section */}
                            <div className="relative z-10 bg-gradient-to-br from-card/90 via-card/95 to-card/90 border-t border-border/30">
                                {/* Console Header */}
                                <div className="px-6 py-4 border-b border-border/30 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Terminal dots with animation */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm animate-pulse"></div>
                                                <div className="w-3 h-3 bg-amber-500 rounded-full shadow-sm animate-pulse delay-100"></div>
                                                <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm animate-pulse delay-200"></div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-md">
                                                    <Terminal className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-foreground">Console Output</span>
                                                    <p className="text-xs text-muted-foreground">Real-time execution results</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Output status indicator */}
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${output
                                                ? 'bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                                : 'bg-muted/50 border border-border/30 text-muted-foreground'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${output ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'
                                                    }`} />
                                                <span className="text-xs font-medium">
                                                    {output ? 'Output Ready' : 'Awaiting Execution'}
                                                </span>
                                            </div>

                                            {output && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setOutput("")}
                                                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all duration-200"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Console Content */}
                                <ScrollArea className="h-48 relative">
                                    <div className="p-6 bg-gradient-to-br from-muted/20 via-muted/10 to-muted/20">
                                        {sqlResult ? (
                                            <div className="relative overflow-hidden rounded-2xl border-2 border-border/30 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm shadow-lg">
                                                {/* Table header glow */}
                                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 backdrop-blur-sm">
                                                            <tr>
                                                                {sqlResult.columns.map((col, index) => (
                                                                    <th key={index} className="px-4 py-3 text-left font-bold text-foreground border-r border-border/30 last:border-r-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 bg-primary rounded-full" />
                                                                            {col}
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sqlResult.rows.map((row, rowIndex) => (
                                                                <tr key={rowIndex} className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-200 border-b border-border/20 last:border-b-0">
                                                                    {sqlResult.columns.map((col, colIndex) => (
                                                                        <td key={colIndex} className="px-4 py-3 text-muted-foreground border-r border-border/20 last:border-r-0">
                                                                            <div className="font-mono text-sm">
                                                                                {String((row as Record<string, any>)[col]) || <span className="italic text-muted-foreground/60">null</span>}
                                                                            </div>
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative min-h-32 rounded-2xl border-2 border-dashed border-border/30 bg-gradient-to-br from-muted/20 via-muted/10 to-muted/20 backdrop-blur-sm flex items-center justify-center">
                                                <div className="text-center space-y-3">
                                                    {output ? (
                                                        <div className="space-y-2">
                                                            {/* <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                                                                <Terminal className="w-6 h-6 text-white" />
                                                            </div> */}
                                                            <pre className="text-sm text-muted-foreground font-mono whitespace-pre-wrap break-words text-left max-w-full">
                                                                {output}
                                                            </pre>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="w-16 h-16 bg-gradient-to-br from-muted/60 to-muted/40 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                                                <Play className="w-8 h-8 text-muted-foreground/60" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-muted-foreground/70 italic text-sm font-medium">
                                                                    Ready for code execution
                                                                </p>
                                                                <p className="text-muted-foreground/50 text-xs">
                                                                    Click 'Run Code' to see your results here
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Floating particles */}
                                                <div className="absolute top-4 right-4 w-2 h-2 bg-primary/30 rounded-full animate-ping" />
                                                <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse delay-500" />
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
            {/* Proctoring Panel (if active) */}
            {exam?.isExamProctored && (
                <ProctoringMonitor
                    isExamProctored={exam?.isExamProctored || false}
                    examStarted={examStarted}
                    examId={examId?.toString() || ""}
                    userEmail={session?.user?.email || ""}
                    onDisqualification={handleDisqualification}
                />
            )}

            {isSubmitting && (
                <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex items-center justify-center">
                    <Card className="w-full max-w-md mx-4 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 animate-pulse" />

                        <CardContent className="relative p-8">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <div className="absolute inset-0 w-20 h-20 border-4 border-accent/20 border-b-accent rounded-full animate-spin reverse"
                                        style={{ animationDelay: "300ms", animationDirection: "reverse" }} />

                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-10 h-10 bg-systech-gradient rounded-xl flex items-center justify-center shadow-lg">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-bounce" />
                                    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-primary rounded-full animate-bounce delay-500" />
                                </div>

                                <div className="text-center space-y-3">
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                                        SysRank Evaluating Your Exam
                                    </h3>
                                    <p className="text-muted-foreground font-medium">
                                        Our advanced AI is carefully analyzing your responses...
                                    </p>

                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                                    </div>

                                    <p className="text-xs text-muted-foreground mt-2">
                                        Please wait while we process your submission
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}