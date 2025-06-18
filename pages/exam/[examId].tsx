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
                handleSubmit();
            }
        };

        const handleFsChange = () => {
            if (!document.fullscreenElement) {
                alert("Fullscreen exited. Disqualified.");
                setDisqualified(true);
                handleSubmit();
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
            disqualified: disqualifiedFlag,
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

    const handleRunCode = async () => {
        setRunning(true);
        setOutput("Running...");

        try {
            const result = await runCode(exam.language, code);
            setOutput(result || "No output");
        } catch (err: any) {
            setOutput("Error running code.");
        }

        setRunning(false);
    };

    if (!exam) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-lg font-medium text-slate-700">Loading exam...</span>
                    </div>
                </div>
            </div>
        );
    }

    const getTimeColor = () => {
        if (timeLeft > 300) return "text-green-600"; // > 5 minutes
        if (timeLeft > 60) return "text-yellow-600"; // > 1 minute
        return "text-red-600"; // < 1 minute
    };

    const getProgressWidth = () => {
        const totalTime = exam.duration * 60;
        return ((totalTime - timeLeft) / totalTime) * 100;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold">💻</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">{exam.title}</h1>
                                <p className="text-sm text-slate-600">Language: {exam.language}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* Timer */}
                            <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className={`font-mono text-lg font-bold ${getTimeColor()}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="w-24 h-1 bg-slate-200 rounded-full mt-2">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${getProgressWidth()}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2 rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                            >
                                Submit Exam
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
                    {/* Question Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">?</span>
                                Problem Statement
                            </h2>
                        </div>
                        <div className="p-6 overflow-y-auto h-full">
                            <div className="prose prose-slate max-w-none">
                                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 text-slate-700 whitespace-pre-wrap">
                                    {exam.question}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Code Editor Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm">{"</>"}</span>
                                    Code Editor
                                </h2>
                                <button
                                    onClick={handleRunCode}
                                    disabled={running}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {running ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                                            </svg>
                                            Run Code
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <CodeEditor language={exam.language} value={code} onChange={setCode} />
                        </div>

                        {/* Output Panel */}
                        <div className="border-t border-slate-200 bg-slate-900">
                            <div className="px-4 py-2 bg-slate-800 flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="text-slate-300 text-sm font-medium ml-2">Output</span>
                            </div>
                            <div className="p-4 h-32 overflow-y-auto">
                                <pre className="text-green-300 font-mono text-sm whitespace-pre-wrap">
                                    {output || "Click 'Run Code' to see output here..."}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}