import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import CodeEditor from "../../components/CodeEditor";
import { useSession } from "next-auth/react";
import { FilesetResolver, FaceDetector, ObjectDetector } from "@mediapipe/tasks-vision";
import { toast } from "react-hot-toast";

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
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [cameraError, setCameraError] = useState("");

    const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
    const [faceDetectionActive, setFaceDetectionActive] = useState(false);
    const [noFaceDetectedCount, setNoFaceDetectedCount] = useState(0);
    const [multipleFacesCount, setMultipleFacesCount] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [videoReady, setVideoReady] = useState(false);

    const [objectDetector, setObjectDetector] = useState<ObjectDetector | null>(null);
    const [suspiciousObjectCount, setSuspiciousObjectCount] = useState(0);
    const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
    const [lastSuspiciousActivity, setLastSuspiciousActivity] = useState<string>("");

    const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('dark');

    const [violations, setViolations] = useState(0);
    const [keyViolations, setKeyViolations] = useState(0);

    const violationsRef = useRef(0);
    const keyViolationsRef = useRef(0);
    const handleContextMenuRef = useRef<((e: any) => void) | null>(null);
    const handleKeyDownRef = useRef<((e: any) => void) | null>(null);

    const handleBlurRef = useRef<((e: any) => void) | null>(null);
    const handleFsChangeRef = useRef<((e: any) => void) | null>(null);
    const handleVisibilityChangeRef = useRef<((e: any) => void) | null>(null);

    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const [speakingDetected, setSpeakingDetected] = useState(false);
    const [audioViolations, setAudioViolations] = useState(0);
    const [lastAudioViolation, setLastAudioViolation] = useState<string>("");
    const [voiceDetectionBuffer, setVoiceDetectionBuffer] = useState<number[]>([]);
    const [voiceConfidence, setVoiceConfidence] = useState(0);

    const audioViolationsRef = useRef(0);

    type ExamQuestion = {
        id: string;
        question: string;
        expectedOutput: string;
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

            const response = await fetch(`/api/exams/${examId}`);
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
                if (data.isExamProctored) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                width: { ideal: 640 },
                                height: { ideal: 480 }
                            }
                        });
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;

                            // Wait for video to load before starting face detection
                            videoRef.current.onloadedmetadata = () => {
                                console.log("Video metadata loaded, dimensions:",
                                    videoRef.current?.videoWidth,
                                    videoRef.current?.videoHeight
                                );
                            };
                        }
                    } catch (err) {
                        console.error("Camera access denied:", err);
                        setCameraError("Camera permission denied. You may be disqualified.");
                        alert("Camera permission denied. You may be disqualified.");
                    }
                }
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
        if (!exam || !session?.user?.email) return;

        const now = new Date();
        const start = exam.startTime ? new Date(exam.startTime) : null;
        const end = exam.endTime ? new Date(exam.endTime) : null;

        // Time validation
        // if (start) {
        //     alert("⏳ This exam has not started yet.");
        //     router.push("/dashboard/attender");
        //     return;
        // }

        // if (end && now > end) {
        //     alert("❌ This exam has expired.");
        //     router.push("/dashboard/attender");
        //     return;
        // }

        // Allowed user validation
        const allowedUsers: string[] = Array.isArray(exam.allowedUsers)
            ? exam.allowedUsers
            : exam.allowedUsers
                ? JSON.parse(exam.allowedUsers)
                : [];

        if (allowedUsers.length > 0 && !allowedUsers.includes(session.user.email)) {
            alert("🚫 You are not allowed to access this exam.");
            router.push("/dashboard");
            return;
        }
    }, [exam, session]);

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
        const initializeDetection = async () => {
            if (!exam?.isExamProctored) return;

            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );

                // Initialize Face Detector
                const faceDetector = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO"
                });

                // Initialize Object Detector
                const objectDetector = await ObjectDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    scoreThreshold: 0.3,
                    maxResults: 10
                });

                setFaceDetector(faceDetector);
                setObjectDetector(objectDetector);
                setFaceDetectionActive(true);
            } catch (error) {
                console.error("Failed to initialize detection:", error);
            }
        };

        initializeDetection();
    }, [exam?.isExamProctored]);

    useEffect(() => {
        const initializeAudioMonitoring = async () => {
            if (!exam?.isExamProctored) return;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: false,
                        sampleRate: 44100,
                        channelCount: 1
                    }
                });

                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = audioCtx.createMediaStreamSource(stream);
                const analyserNode = audioCtx.createAnalyser();

                // Optimized settings for voice detection
                analyserNode.fftSize = 2048;
                analyserNode.smoothingTimeConstant = 0.3;
                analyserNode.minDecibels = -90;
                analyserNode.maxDecibels = -10;

                source.connect(analyserNode);

                setAudioContext(audioCtx);
                setMicrophone(source);
                setAnalyser(analyserNode);

            } catch (error) {
                console.error("Audio monitoring initialization failed:", error);
                setLastAudioViolation("Microphone access denied");
            }
        };

        initializeAudioMonitoring();

        return () => {
            if (audioContext) {
                audioContext.close();
            }
        };
    }, [exam?.isExamProctored]);

    useEffect(() => {
        let animationFrame: number;
        const confidenceBuffer: number[] = [];
        const bufferSize = 10;

        const monitorAudio = () => {
            if (!analyser || !examStarted || !audioContext) return;

            const bufferLength = analyser.frequencyBinCount;
            const frequencyData = new Uint8Array(bufferLength);
            const timeData = new Uint8Array(bufferLength);

            analyser.getByteFrequencyData(frequencyData);
            analyser.getByteTimeDomainData(timeData);

            const average = frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
            setAudioLevel(average);

            const hasVoiceActivity = detectVoiceActivity(frequencyData, timeData);

            if (hasVoiceActivity) {
                const voiceScore = analyzeVoicePattern(frequencyData, audioContext.sampleRate);

                confidenceBuffer.push(voiceScore);
                if (confidenceBuffer.length > bufferSize) {
                    confidenceBuffer.shift();
                }

                const avgConfidence = confidenceBuffer.reduce((sum, val) => sum + val, 0) / confidenceBuffer.length;
                setVoiceConfidence(avgConfidence);

                const voiceThreshold = 0.6;
                const minConfidenceFrames = 5;

                if (avgConfidence > voiceThreshold && confidenceBuffer.length >= minConfidenceFrames && !speakingDetected) {
                    setSpeakingDetected(true);
                    audioViolationsRef.current += 1;
                    const newCount = audioViolationsRef.current;
                    setAudioViolations(newCount);
                    setLastAudioViolation("Human voice detected");

                    console.log(`Voice violation detected. Confidence: ${avgConfidence.toFixed(2)}, Count: ${newCount}/3`);

                    if (newCount >= 3) {
                        handleDisqualification("Multiple voice violations - speaking detected");
                    } else {
                        toast.error(`🗣️ Human voice detected. Warning ${newCount}/3`);
                    }

                    setTimeout(() => {
                        setSpeakingDetected(false);
                        confidenceBuffer.length = 0;
                    }, 3000);
                }
            } else {
                if (confidenceBuffer.length > 0) {
                    confidenceBuffer.push(0);
                    if (confidenceBuffer.length > bufferSize) {
                        confidenceBuffer.shift();
                    }
                }
            }

            animationFrame = requestAnimationFrame(monitorAudio);
        };

        if (analyser && examStarted) {
            monitorAudio();
        }

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [analyser, examStarted, speakingDetected, audioContext]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (faceDetectionActive && faceDetector && objectDetector && examStarted && videoReady) {
            setTimeout(() => {
                intervalId = setInterval(() => {
                    detectFaces();
                    detectObjects();
                }, 1000);
            }, 1000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [faceDetectionActive, faceDetector, objectDetector, examStarted, videoReady]);

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
            (e.ctrlKey && ['u', 'U', 'a', 'A', 'c', 'C', 'v', 'V', 'p', 'P'].includes(e.key)) ||
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
                toast.error(`🚫 Invalid key. Warning ${newCount}/3`);
            }
        }
    };

    handleBlurRef.current = () => {
        if (document.fullscreenElement) {
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
            router.push("/dashboard/attender");
        }
    };

    handleFsChangeRef.current = () => {
        if (!document.fullscreenElement) {
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
            router.push("/dashboard/attender");
        }
    };

    handleVisibilityChangeRef.current = () => {
        if (document.hidden) {
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
            router.push("/dashboard/attender");
        }
    };

    const cleanupExamEnvironment = async () => {
        // Exit fullscreen
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch((err) =>
                console.warn("Fullscreen exit failed:", err)
            );
        }

        // Remove blocked keyboard and contextmenu events
        if (handleKeyDownRef.current) {
            document.removeEventListener('keydown', handleKeyDownRef.current);
        }
        if (handleContextMenuRef.current) {
            document.removeEventListener('contextmenu', handleContextMenuRef.current);
        }
        if (handleVisibilityChangeRef.current) {
            document.removeEventListener('visibilitychange', handleVisibilityChangeRef.current);
        }
        if (handleFsChangeRef.current) {
            document.removeEventListener('fullscreenchange', handleFsChangeRef.current);
        }
        if (handleBlurRef.current) {
            window.removeEventListener('blur', handleBlurRef.current);
        }

        (document.activeElement as HTMLElement | null)?.blur();

        router.push("/dashboard/attender");
    };

    useEffect(() => {
        if (!examStarted) return;

        const handleBlur = (e: any) => {
            if (handleBlurRef.current) {
                handleBlurRef.current(e);
            }
        };

        const handleFsChange = (e: any) => {
            if (handleFsChangeRef.current) {
                handleFsChangeRef.current(e);
            }
        };

        const handleVisibilityChange = (e: any) => {
            if (handleVisibilityChangeRef.current) {
                handleVisibilityChangeRef.current(e);
            }
        };

        const detectDevTools = () => {
            const threshold = 160;
            setInterval(() => {
                if (window.outerHeight - window.innerHeight > threshold ||
                    window.outerWidth - window.innerWidth > threshold) {
                    setDisqualified(true);
                    handleSubmitWithDisqualification(true);
                    router.push("/dashboard/attender");
                }
            }, 1000);
        };

        const handleContextMenu = (e: any) => {
            if (handleContextMenuRef.current) {
                handleContextMenuRef.current(e);
            }
        };


        const handleKeyDown = (e: any) => {
            if (handleKeyDownRef.current) {
                handleKeyDownRef.current(e);
            }
        };

        window.addEventListener("blur", handleBlur);
        document.addEventListener("fullscreenchange", handleFsChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("fullscreenchange", handleFsChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [examStarted]);

    const formatTimeReadable = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours} hr ${minutes} min ${remainingSeconds} sec left`;
        } else if (minutes > 0) {
            return `${minutes} min ${remainingSeconds} sec left`;
        } else {
            return `${remainingSeconds} sec left`;
        }
    };

    const handleSubmit = async () => {
        if (!exam || !session) return;

        console.log(isDisqualified, "isDisqualified");

        const email = session.user?.email || "unknown";
        const userName = session.user?.name || "Anonymous";
        const examIdStr = examId?.toString() || "unknown";

        const answersWithQuestionIds = answers.map((answer, index) => ({
            questionId: shuffledQuestions[index]?.id || index,
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
                disqualified: isDisqualified,
                code,
            }),
        });

        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }
        if (audioContext) {
            audioContext.close();
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (faceDetector) {
            faceDetector.close();
        }
        if (objectDetector) {
            objectDetector.close();
        }
        if (microphone) {
            microphone.disconnect();
        }
        if (analyser) {
            analyser.disconnect();
        }
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
        // const questionsAndAnswers = answersWithQuestionIds.map(item => ({
        //     question: shuffledQuestions.find(q => q.id === item.questionId)?.question || `Question ${item.originalIndex + 1}`,
        //     answer: item.answer,
        //     questionId: item.questionId
        // }));

        // const pdfBytes = await generateAnswerPdf({
        //     studentName: userName,
        //     examTitle: exam.title,
        //     codeAnswer: code,
        //     questionsAndAnswers: questionsAndAnswers,
        //     submissionTime: new Date().toLocaleString(),
        //     examId: examIdStr
        // });

        // const blob = new Blob([pdfBytes], { type: "application/pdf" });
        // const url = URL.createObjectURL(blob);

        // const downloadLink = document.createElement('a');
        // downloadLink.href = url;
        // downloadLink.download = `${exam.title}_${userName}_answers.pdf`;
        // document.body.appendChild(downloadLink);

        // downloadLink.click();

        // document.body.removeChild(downloadLink);
        // URL.revokeObjectURL(url);

        // alert("✅ PDF downloaded.");
        await cleanupExamEnvironment();
        router.push("/dashboard/attender");

    };

    const handleSubmitWithDisqualification = async (disqualifiedFlag = isDisqualified) => {
        if (!exam || !session) return;

        console.log(disqualifiedFlag, "disqualifiedFlag");

        const email = session.user?.email || "unknown";
        const userName = session.user?.name || "Anonymous";
        const examIdStr = examId?.toString() || "unknown";

        const answersWithQuestionIds = answers.map((answer, index) => ({
            questionId: shuffledQuestions[index]?.id || index,
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

        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }
        if (audioContext) {
            audioContext.close();
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (faceDetector) {
            faceDetector.close();
        }
        if (objectDetector) {
            objectDetector.close();
        }
        if (microphone) {
            microphone.disconnect();
        }
        if (analyser) {
            analyser.disconnect();
        }
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }

        await cleanupExamEnvironment();
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
        if (timeLeft > 300) return "text-emerald-600";
        if (timeLeft > 60) return "text-amber-600";
        return "text-rose-600";
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

    const detectFaces = async () => {
        if (!videoRef.current || !faceDetector || !canvasRef.current) return;

        const video = videoRef.current;

        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
            console.log("Video not ready yet, skipping detection");
            return;
        }

        try {
            const detections = faceDetector.detectForVideo(video, performance.now());

            if (detections.detections.length === 0) {
                setNoFaceDetectedCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 10) {
                        handleDisqualification("No face detected for extended period");
                    }
                    return newCount;
                });
                setMultipleFacesCount(0);
            } else if (detections.detections.length > 1) {
                setMultipleFacesCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 5) {
                        handleDisqualification("Multiple faces detected");
                    }
                    return newCount;
                });
                setNoFaceDetectedCount(0);
            } else {
                setNoFaceDetectedCount(0);
                setMultipleFacesCount(0);
            }

            drawDetections(detections.detections);
        } catch (error) {
            console.error("Face detection error:", error);
        }
    };

    const detectObjects = async () => {
        if (!videoRef.current || !objectDetector || !canvasRef.current) return;

        const video = videoRef.current;

        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
            return;
        }

        try {
            const detections = objectDetector.detectForVideo(video, performance.now());

            // Suspicious objects to look for
            const suspiciousObjects = [
                'cell phone', 'mobile phone', 'phone', 'smartphone',
                'book', 'laptop', 'computer', 'tablet',
                'paper', 'notebook', 'calculator',
                'headphones', 'earbuds'
            ];

            const currentDetections: string[] = [];
            let foundSuspicious = false;

            detections.detections.forEach(detection => {
                detection.categories.forEach(category => {
                    const objectName = category.categoryName.toLowerCase();
                    currentDetections.push(objectName);

                    if (suspiciousObjects.some(suspicious =>
                        objectName.includes(suspicious) || suspicious.includes(objectName)
                    )) {
                        foundSuspicious = true;
                        setLastSuspiciousActivity(objectName);
                    }
                });
            });

            setDetectedObjects(currentDetections);

            if (foundSuspicious) {
                setSuspiciousObjectCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 3) { // 3 seconds of suspicious object
                        handleDisqualification(`Suspicious object detected: ${lastSuspiciousActivity}`);
                    }
                    return newCount;
                });
            } else {
                setSuspiciousObjectCount(0);
            }

            // Draw object detection boxes
            drawObjectDetections(detections.detections);

        } catch (error) {
            console.error("Object detection error:", error);
        }
    };

    const handleDisqualification = (reason: string) => {
        setDisqualified(true);
        toast.error(`🚫 Disqualified: ${reason}`);

        // Stop all monitoring
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }

        if (audioContext) {
            audioContext.close();
        }

        handleSubmitWithDisqualification(true);
    };

    const drawDetections = (detections: any[]) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = detections.length === 1 ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;

        detections.forEach(detection => {
            const bbox = detection.boundingBox;
            ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
        });
    };

    const drawObjectDetections = (detections: any[]) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        detections.forEach(detection => {
            const bbox = detection.boundingBox;
            const category = detection.categories[0];

            if (category.score > 0.3) {
                // Draw bounding box
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 2;
                ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);

                // Draw label
                ctx.fillStyle = '#ff6b6b';
                ctx.font = '12px Arial';
                const label = `${category.categoryName} (${(category.score * 100).toFixed(0)}%)`;
                ctx.fillText(label, bbox.originX, bbox.originY - 5);
            }
        });
    };

    const analyzeVoicePattern = (frequencyData: Uint8Array, sampleRate: number) => {
        const binSize = sampleRate / frequencyData.length;

        // Human voice frequency ranges (in Hz)
        const fundamentalRange = { min: 85, max: 300 };    // Fundamental frequency
        const formantF1Range = { min: 300, max: 1000 };    // First formant
        const formantF2Range = { min: 1000, max: 3000 };   // Second formant
        const harmonicRange = { min: 300, max: 4000 };     // Harmonic content

        // Convert frequency ranges to bin indices
        const fundamentalBins = {
            start: Math.floor(fundamentalRange.min / binSize),
            end: Math.floor(fundamentalRange.max / binSize)
        };

        const formantF1Bins = {
            start: Math.floor(formantF1Range.min / binSize),
            end: Math.floor(formantF1Range.max / binSize)
        };

        const formantF2Bins = {
            start: Math.floor(formantF2Range.min / binSize),
            end: Math.floor(formantF2Range.max / binSize)
        };

        const harmonicBins = {
            start: Math.floor(harmonicRange.min / binSize),
            end: Math.floor(harmonicRange.max / binSize)
        };

        // Calculate energy in each frequency band
        const fundamentalEnergy = frequencyData
            .slice(fundamentalBins.start, fundamentalBins.end)
            .reduce((sum, val) => sum + val * val, 0);

        const formantF1Energy = frequencyData
            .slice(formantF1Bins.start, formantF1Bins.end)
            .reduce((sum, val) => sum + val * val, 0);

        const formantF2Energy = frequencyData
            .slice(formantF2Bins.start, formantF2Bins.end)
            .reduce((sum, val) => sum + val * val, 0);

        const harmonicEnergy = frequencyData
            .slice(harmonicBins.start, harmonicBins.end)
            .reduce((sum, val) => sum + val * val, 0);

        // Calculate total energy for normalization
        const totalEnergy = frequencyData.reduce((sum, val) => sum + val * val, 0);

        if (totalEnergy === 0) return 0;

        // Voice characteristics scoring
        let voiceScore = 0;

        // 1. Fundamental frequency presence (20% weight)
        const fundamentalRatio = fundamentalEnergy / totalEnergy;
        if (fundamentalRatio > 0.05) voiceScore += 0.2;

        // 2. Formant structure (40% weight)
        const formantRatio = (formantF1Energy + formantF2Energy) / totalEnergy;
        if (formantRatio > 0.15) voiceScore += 0.4;

        // 3. Harmonic structure (30% weight)
        const harmonicRatio = harmonicEnergy / totalEnergy;
        if (harmonicRatio > 0.3 && harmonicRatio < 0.8) voiceScore += 0.3;

        // 4. Spectral rolloff (10% weight) - voices have energy concentrated in lower frequencies
        let cumulativeEnergy = 0;
        let rolloffBin = 0;
        const threshold = totalEnergy * 0.85;

        for (let i = 0; i < frequencyData.length; i++) {
            cumulativeEnergy += frequencyData[i] * frequencyData[i];
            if (cumulativeEnergy >= threshold) {
                rolloffBin = i;
                break;
            }
        }

        const rolloffFreq = rolloffBin * binSize;
        if (rolloffFreq < 4000) voiceScore += 0.1;

        return voiceScore;
    };

    const detectVoiceActivity = (frequencyData: Uint8Array, timeData: Uint8Array) => {
        // Zero Crossing Rate - voices have moderate ZCR
        let zeroCrossings = 0;
        for (let i = 1; i < timeData.length; i++) {
            if ((timeData[i - 1] >= 128) !== (timeData[i] >= 128)) {
                zeroCrossings++;
            }
        }
        const zcr = zeroCrossings / timeData.length;

        // Energy threshold
        const energy = timeData.reduce((sum, val) => sum + Math.pow((val - 128) / 128, 2), 0) / timeData.length;

        // Voice activity detection
        const energyThreshold = 0.01;    // Minimum energy for voice
        const zcrMin = 0.1;              // Minimum ZCR for voice
        const zcrMax = 0.4;              // Maximum ZCR for voice

        return energy > energyThreshold && zcr >= zcrMin && zcr <= zcrMax;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
            {/* Floating Header */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-sky-400 rounded-full border-2 border-white"></div>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-700">
                                        {exam.title}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                                            {exam.language}
                                        </span>
                                        <span className="text-sm text-gray-500">•</span>
                                        <span className="text-sm text-gray-500">{exam.questions?.length || 0} Questions</span>
                                        <span className="text-sm text-gray-500">•</span>
                                        <span className="text-sm font-medium text-sky-600">
                                            {getAnsweredCount()}/{exam.questions?.length || 0} Answered
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Enhanced Timer */}
                                <div className={`bg-gradient-to-r ${getTimerBgColor()} rounded-2xl px-6 py-3 border border-gray-200 shadow-lg`}>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                                                <polyline points="12,6 12,12 16,14" strokeWidth={2} />
                                            </svg>
                                            {timeLeft <= 60 && (
                                                <div className="absolute inset-0 w-6 h-6 bg-red-400 rounded-full animate-ping opacity-20"></div>
                                            )}
                                        </div>
                                        <div>
                                            <div className={`text-base font-semibold ${getTimeColor()}`}>
                                                {formatTimeReadable(timeLeft)}
                                            </div>
                                            <div className="w-40 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 rounded-full ${timeLeft > 300 ? 'bg-gradient-to-r from-sky-400 to-blue-500' :
                                                        timeLeft > 60 ? 'bg-gradient-to-r from-blue-400 to-sky-500' :
                                                            'bg-gradient-to-r from-red-400 to-red-500'}`}
                                                    style={{ width: `${100 - getProgressWidth()}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    className="group relative overflow-hidden bg-gradient-to-r from-sky-500 to-blue-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                            {/* Question Tabs */}
                            <div className="bg-gradient-to-r from-blue-50 to-sky-100 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-700">
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
                                            className="p-2 rounded-xl bg-white/80 border border-gray-200 shadow-sm hover:bg-white hover:border-sky-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => navigateQuestion('next')}
                                            disabled={activeQuestionIndex === exam.questions.length - 1}
                                            className="p-2 rounded-xl bg-white/80 border border-gray-200 shadow-sm hover:bg-white hover:border-sky-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg scale-105'
                                                : 'bg-white/80 text-gray-700 hover:bg-white hover:border-sky-200 border border-gray-200'
                                                }`}
                                        >
                                            <span className="font-bold">{index + 1}</span>
                                            {isQuestionAnswered(index) && (
                                                <div className="w-2 h-2 bg-sky-200 rounded-full shadow-lg animate-pulse"></div>
                                            )}
                                            {activeQuestionIndex === index && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl opacity-0 hover:opacity-20 transition-opacity duration-200"></div>
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
                                        <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-6 shadow-sm">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {activeQuestionIndex + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-700 mb-3 leading-relaxed">
                                                        {exam.questions[activeQuestionIndex].question}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Answer Input */}
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-600 mb-3">
                                                Your Solution:
                                            </label>
                                            <textarea
                                                value={answers[activeQuestionIndex] || ""}
                                                onChange={(e) => {
                                                    updateAnswer(activeQuestionIndex, e.target.value);
                                                    setCode(e.target.value);
                                                }}
                                                className="w-full h-64 p-4 font-mono text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all duration-300 resize-none backdrop-blur-sm shadow-inner"
                                                placeholder="Write your code here..."
                                            />
                                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                                {isQuestionAnswered(activeQuestionIndex) && (
                                                    <div className="flex items-center gap-1 text-sky-600 text-xs font-medium bg-sky-50 px-2 py-1 rounded-full border border-sky-200">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Answered
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-500">
                                                    {(answers[activeQuestionIndex] || "").length} characters
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Code Editor Panel */}
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                            {/* Header Section */}
                            <div className="bg-gradient-to-r from-blue-50 to-sky-100 px-4 sm:px-6 lg:px-8 py-4 lg:py-6 border-b border-gray-200">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700 truncate">
                                                Code Editor
                                            </h2>
                                            <p className="text-gray-500 text-xs sm:text-sm mt-1 hidden sm:block">Write and test your solution</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRun}
                                        disabled={running}
                                        className="group relative overflow-hidden bg-gradient-to-r from-sky-400 to-blue-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto text-sm sm:text-base"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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

                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={editorTheme === 'dark'}
                                            onChange={() => setEditorTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                                        />
                                        <div className={`
                                            w-11 h-6 rounded-full transition-colors duration-200 ease-in-out
                                            ${editorTheme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}
                                        `}>
                                            <div className={`
                                                w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-200 ease-in-out
                                                ${editorTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
                                                mt-1
                                            `} />
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Code Editor Section */}
                            <div className="h-48 sm:h-64 md:h-80 overflow-hidden bg-gray-50">
                                <CodeEditor
                                    language={exam.language}
                                    value={code}
                                    onChange={(newCode) => {
                                        setCode(newCode);
                                        updateAnswer(activeQuestionIndex, newCode);
                                    }}
                                    theme={editorTheme === "dark" ? "vs-dark" : "light"} // 🔁 Add this line
                                />
                            </div>

                            {/* Enhanced Output Panel */}
                            <div className="bg-white border-t border-gray-200">
                                <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-sky-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sky-400 rounded-full"></div>
                                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full"></div>
                                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sky-300 rounded-full"></div>
                                            </div>
                                            <span className="text-xs sm:text-sm font-medium text-gray-700">Console Output</span>
                                        </div>
                                        {output && (
                                            <button
                                                onClick={() => setOutput("")}
                                                className="text-gray-500 hover:text-gray-700 transition-colors duration-200 p-1 rounded-md hover:bg-gray-100"
                                                aria-label="Clear output"
                                            >
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Console Output */}
                                <div className="p-3 sm:p-4 md:p-6 bg-gray-50 h-32 sm:h-40 md:h-48 overflow-auto">
                                    {sqlResult ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse border border-gray-200 rounded-lg overflow-hidden">
                                                <thead className="bg-gradient-to-r from-sky-100 to-blue-100">
                                                    <tr>
                                                        {sqlResult.columns.map((col, index) => (
                                                            <th key={index} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 bg-sky-50">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sqlResult.rows.map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-blue-50 transition-colors duration-150">
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="border border-gray-200 px-3 py-2 text-gray-600">
                                                                    {String(cell)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <pre className="text-sm text-gray-600 font-mono whitespace-pre-wrap break-words">
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

            {exam?.isExamProctored && (
                <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-xl p-2 border border-gray-300 w-64">
                    <p className="text-xs font-medium text-gray-700 mb-1">AI Proctoring Active</p>
                    <div className="relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            width={160}
                            height={120}
                            className="rounded-lg border border-gray-200"
                            onLoadedMetadata={() => {
                                console.log("Video ready with dimensions:",
                                    videoRef.current?.videoWidth,
                                    videoRef.current?.videoHeight
                                );
                                setVideoReady(true);
                            }}
                            onError={(e) => {
                                console.error("Video error:", e);
                                setCameraError("Video stream error");
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 rounded-lg pointer-events-none"
                            style={{ width: '160px', height: '120px' }}
                        />
                    </div>

                    {/* Enhanced Voice Detection Indicator */}
                    <div className="mt-2 mb-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600">Audio Level:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-200 ${audioLevel > 25 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                    style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600">Voice Confidence:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-200 ${voiceConfidence > 0.6 ? 'bg-red-500' : voiceConfidence > 0.3 ? 'bg-orange-500' : 'bg-green-500'
                                        }`}
                                    style={{ width: `${voiceConfidence * 100}%` }}
                                />
                            </div>
                            <span className={`text-xs font-medium ${speakingDetected ? 'text-red-600' : 'text-green-600'}`}>
                                {speakingDetected ? '🗣️' : '🤫'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 text-xs space-y-1">
                        <div className={`flex items-center gap-1 ${noFaceDetectedCount > 5 ? 'text-red-600' : 'text-green-600'}`}>
                            <div className="w-2 h-2 rounded-full bg-current"></div>
                            Face: {noFaceDetectedCount > 0 ? 'Not Detected' : 'Detected'}
                        </div>
                        {multipleFacesCount > 0 && (
                            <div className="text-red-600 text-xs">⚠️ Multiple faces!</div>
                        )}
                        {audioViolations > 0 && (
                            <div className="text-red-600 text-xs">
                                🗣️ Voice: {audioViolations}/3
                            </div>
                        )}
                        {suspiciousObjectCount > 0 && (
                            <div className="text-red-600 text-xs">
                                📱 Object: {lastSuspiciousActivity}
                            </div>
                        )}
                        {detectedObjects.length > 0 && (
                            <div className="text-gray-500 text-xs max-h-12 overflow-y-auto">
                                Objects: {detectedObjects.slice(0, 2).join(', ')}
                                {detectedObjects.length > 2 && '...'}
                            </div>
                        )}
                    </div>
                    {cameraError && (
                        <p className="text-xs text-red-600 mt-1">{cameraError}</p>
                    )}
                </div>
            )}

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