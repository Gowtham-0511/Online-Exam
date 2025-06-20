import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import CodeEditor from "../../components/CodeEditor";
import { useSession } from "next-auth/react";
import { generateAnswerPdf } from "@/lib/exportPdf";
import { runCode } from "@/lib/judge";

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

    type ExamQuestion = {
        id: string;
        question: string;
        expectedOutput: string;
    };

    // Load exam from Firestore
    useEffect(() => {
        const fetchExam = async () => {
            if (!examId) return;
            const ref = doc(db, "exams", examId as string);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                setExam(data);
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
    }, [exam]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0 && exam) {
            handleSubmit();
            return;
        }

        const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Fullscreen and focus detection
    useEffect(() => {
        if (exam && !examStarted) {
            document.documentElement.requestFullscreen()
                .then(() => {
                    setExamStarted(true);
                })
                .catch(() => {
                    alert("Please allow fullscreen mode.");
                });
        }
    }, [exam]);

    useEffect(() => {
        if (!examStarted) return;

        const handleBlur = () => {
            if (document.fullscreenElement) {
                alert("You switched tabs. You're disqualified.");
                setDisqualified(true);

                if (examId && session?.user?.email) {
                    const submissionRef = doc(db, "submissions", `${examId}_${session.user.email}`);
                    setDoc(submissionRef, { disqualified: true }, { merge: true });
                }
                setOutput("You have been disqualified for switching tabs.");
                setTimeLeft(0);
                setRunning(false);

                handleSubmitWithDisqualification(true);
                router.push("/dashboard/attender");
            }
        };

        const handleFsChange = () => {
            if (!document.fullscreenElement) {
                alert("Fullscreen exited. Disqualified.");
                setDisqualified(true);

                handleSubmitWithDisqualification(true);
            }
        };

        window.addEventListener("blur", handleBlur);
        document.addEventListener("fullscreenchange", handleFsChange);

        return () => {
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("fullscreenchange", handleFsChange);
        };
    }, [examStarted]);

    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    const handleSubmit = async () => {
        if (!exam || !session) return;

        console.log(isDisqualified, "isDisqualified");

        const email = session.user?.email || "unknown";
        const userName = session.user?.name || "Anonymous";
        const examIdStr = examId?.toString() || "unknown";
        const disqualifiedFlag = isDisqualified;
        const timestamp = new Date().toISOString();
        router.push("/dashboard/attender");

        await setDoc(doc(db, "submissions", `${examIdStr}_${email}`), {
            email,
            examId: examIdStr,
            answer: code,
            submittedAt: serverTimestamp(),
            disqualified: isDisqualified,
            answers: answers,
        });

        const pdfBytes = await generateAnswerPdf({
            studentName: userName,
            examTitle: exam.title,
            codeAnswer: code,
        });
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        alert("✅ Exam submitted and emailed.");
        router.push("/dashboard/attender");
    };

    const handleSubmitWithDisqualification = async (disqualifiedFlag = isDisqualified) => {
        if (!exam || !session) return;

        console.log(disqualifiedFlag, "disqualifiedFlag");

        const email = session.user?.email || "unknown";
        const userName = session.user?.name || "Anonymous";
        const examIdStr = examId?.toString() || "unknown";
        const timestamp = new Date().toISOString();

        await setDoc(doc(db, "submissions", `${examIdStr}_${email}`), {
            email,
            examId: examIdStr,
            answer: code,
            submittedAt: serverTimestamp(),
            disqualified: disqualifiedFlag,
            answers: answers,
        });

        const pdfBytes = await generateAnswerPdf({
            studentName: userName,
            examTitle: exam.title,
            codeAnswer: code,
        });
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        alert("✅ Exam submitted and emailed.");
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
                body: JSON.stringify({ query: code }),
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
            setOutput("❌ Server error.");
        }

        setRunning(false);
    };


    if (!exam) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-12 max-w-md w-full">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 border-b-purple-500 rounded-full animate-spin animation-delay-150"></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Loading Exam
                            </h3>
                            <p className="text-gray-500 mt-2">Preparing your assessment...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const updateAnswer = (index: number, code: string) => {
        const updated = [...answers];
        updated[index] = code;
        setAnswers(updated);
    };

    const getTimeColor = () => {
        if (timeLeft > 300) return "text-emerald-600"; // > 5 minutes
        if (timeLeft > 60) return "text-amber-600"; // > 1 minute
        return "text-rose-600"; // < 1 minute
    };

    const getProgressWidth = () => {
        const totalTime = exam.duration * 60;
        return ((totalTime - timeLeft) / totalTime) * 100;
    };

    const getTimerBgColor = () => {
        if (timeLeft > 300) return "from-emerald-50 to-green-50 border-emerald-200";
        if (timeLeft > 60) return "from-amber-50 to-yellow-50 border-amber-200";
        return "from-rose-50 to-red-50 border-rose-200";
    };

    const isQuestionAnswered = (index: number) => {
        return answers[index] && answers[index].trim() !== "";
    };

    const getAnsweredCount = () => {
        return answers.filter(answer => answer && answer.trim() !== "").length;
    };

    const navigateQuestion = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && activeQuestionIndex > 0) {
            setActiveQuestionIndex(activeQuestionIndex - 1);
        } else if (direction === 'next' && activeQuestionIndex < exam.questions.length - 1) {
            setActiveQuestionIndex(activeQuestionIndex + 1);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
            {/* Floating Header */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                        {exam.title}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {exam.language}
                                        </span>
                                        <span className="text-sm text-gray-500">•</span>
                                        <span className="text-sm text-gray-500">{exam.questions?.length || 0} Questions</span>
                                        <span className="text-sm text-gray-500">•</span>
                                        <span className="text-sm font-medium text-green-600">
                                            {getAnsweredCount()}/{exam.questions?.length || 0} Answered
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Enhanced Timer */}
                                <div className={`bg-gradient-to-r ${getTimerBgColor()} rounded-2xl px-6 py-3 border shadow-lg`}>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                                <polyline points="12,6 12,12 16,14" strokeWidth={2} />
                                            </svg>
                                            {timeLeft <= 60 && (
                                                <div className="absolute inset-0 w-6 h-6 bg-rose-500 rounded-full animate-ping opacity-20"></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className={`font-mono text-2xl font-bold ${getTimeColor()}`}>
                                                {formatTime(timeLeft)}
                                            </div>
                                            <div className="w-20 h-2 bg-white/50 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 rounded-full ${timeLeft > 300 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                                                        timeLeft > 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                                            'bg-gradient-to-r from-rose-400 to-red-500'}`}
                                                    style={{ width: `${100 - getProgressWidth()}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Submit Exam
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-32 pb-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
                        {/* Question Panel with Tabs */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col">
                            {/* Question Tabs */}
                            <div className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 px-6 py-4 border-b border-gray-200/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                                Question {activeQuestionIndex + 1} of {exam.questions?.length || 0}
                                            </h2>
                                            <p className="text-gray-500 text-sm mt-1">Select a question to solve</p>
                                        </div>
                                    </div>

                                    {/* Navigation arrows */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigateQuestion('prev')}
                                            disabled={activeQuestionIndex === 0}
                                            className="p-2 rounded-xl bg-white/60 border border-gray-200/50 shadow-sm hover:bg-white/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => navigateQuestion('next')}
                                            disabled={activeQuestionIndex === exam.questions.length - 1}
                                            className="p-2 rounded-xl bg-white/60 border border-gray-200/50 shadow-sm hover:bg-white/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Tab Navigation */}
                                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar">
                                    {(exam.questions as ExamQuestion[]).map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveQuestionIndex(index)}
                                            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${activeQuestionIndex === index
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                                                : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200/50'
                                                }`}
                                        >
                                            <span className="font-bold">{index + 1}</span>
                                            {isQuestionAnswered(index) && (
                                                <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
                                            )}
                                            {activeQuestionIndex === index && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl opacity-0 hover:opacity-20 transition-opacity duration-200"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Current Question Content */}
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                {exam.questions && exam.questions[activeQuestionIndex] && (
                                    <div className="space-y-6">
                                        {/* Question Statement */}
                                        <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/50 rounded-2xl p-6 shadow-sm">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {activeQuestionIndex + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 leading-relaxed">
                                                        {exam.questions[activeQuestionIndex].question}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Answer Input */}
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                                Your Solution:
                                            </label>
                                            <textarea
                                                value={answers[activeQuestionIndex] || ""}
                                                onChange={(e) => updateAnswer(activeQuestionIndex, e.target.value)}
                                                className="w-full h-64 p-4 font-mono text-sm bg-gray-50/80 border border-gray-200/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-300 resize-none backdrop-blur-sm shadow-inner"
                                                placeholder="Write your code here..."
                                            />
                                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                                {isQuestionAnswered(activeQuestionIndex) && (
                                                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Answered
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-400">
                                                    {(answers[activeQuestionIndex] || "").length} characters
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Code Editor Panel */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col w-full max-w-full mx-auto">
                            {/* Header Section */}
                            <div className="bg-gradient-to-r from-purple-50/80 to-blue-50/80 px-4 sm:px-6 lg:px-8 py-4 lg:py-6 border-b border-gray-200/50">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    {/* Title Section */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent truncate">
                                                Code Editor
                                            </h2>
                                            <p className="text-gray-500 text-xs sm:text-sm mt-1 hidden sm:block">Write and test your solution</p>
                                        </div>
                                    </div>

                                    {/* Run Button */}
                                    <button
                                        onClick={handleRun}
                                        disabled={running}
                                        className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto text-sm sm:text-base"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center justify-center gap-2">
                                            {running ? (
                                                <>
                                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Running...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <polygon points="5,3 19,12 5,21" strokeWidth={2} />
                                                    </svg>
                                                    <span>Run Code</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Code Editor Section */}
                            <div className="flex-1 overflow-hidden bg-gray-50/30 min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]">
                                <CodeEditor language={exam.language} value={code} onChange={setCode} />
                            </div>

                            {/* Enhanced Output Panel */}
                            <div className="border-t border-gray-200/50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 flex-shrink-0">
                                {/* Console Header */}
                                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-800/90 backdrop-blur-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="flex gap-1.5 sm:gap-2">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 shadow-lg"></div>
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500 shadow-lg"></div>
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 shadow-lg"></div>
                                        </div>
                                        <span className="text-gray-300 font-semibold text-sm sm:text-base">Console Output</span>
                                    </div>
                                    {output && (
                                        <button
                                            onClick={() => setOutput("")}
                                            className="text-gray-400 hover:text-white transition-colors p-1 rounded touch-manipulation"
                                            aria-label="Clear output"
                                        >
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Console Output */}
                                <div className="p-3 sm:p-4 lg:p-6 h-24 sm:h-28 lg:h-32 overflow-y-auto custom-scrollbar">
                                    {sqlResult ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full border border-gray-600 text-green-300 text-xs sm:text-sm font-mono">
                                                <thead className="bg-gray-800 text-gray-300">
                                                    <tr>
                                                        {sqlResult.columns.map((col, index) => (
                                                            <th key={index} className="border border-gray-600 p-2 text-left font-semibold">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sqlResult.rows.map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-gray-700/50">
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="border border-gray-700 p-2">
                                                                    {String(cell)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <pre className="text-green-300 font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                                            {output || (
                                                <span className="text-gray-500 italic text-xs sm:text-sm">
                                                    Click 'Run Code' to see output here...
                                                </span>
                                            )}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.8);
                }
                .animation-delay-150 {
                    animation-delay: 150ms;
                }
            `}</style>
        </div>
    );
}