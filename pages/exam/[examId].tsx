import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import CodeEditor from "../../components/CodeEditor";
import { useSession } from "next-auth/react";
import { FilesetResolver, FaceDetector, ObjectDetector } from "@mediapipe/tasks-vision";
import { toast } from "react-hot-toast";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Clock,
    Code,
    Play,
    Send,
    ChevronLeft,
    ChevronRight,
    Eye,
    Mic,
    Camera,
    AlertTriangle,
    CheckCircle2,
    Circle,
    Terminal,
    FileCode,
    User,
    Monitor
} from "lucide-react";
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

    // Camera and detection states
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

    // Theme handling
    const { theme, setTheme } = useTheme();
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

    // Audio monitoring states
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
    const hasSubmittedRef = useRef(false);

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
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
        }

        if (audioContext) {
            audioContext.close();
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        faceDetector?.close?.();
        objectDetector?.close?.();
        microphone?.disconnect?.();
        analyser?.disconnect?.();

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
        handleContextMenuRef.current = null;
        handleVisibilityChangeRef.current = null;
        handleFsChangeRef.current = null;
        handleBlurRef.current = null;
        handleKeyDownRef.current = null;
        videoRef.current = null;
        canvasRef.current = null;
        setFaceDetector(null);
        setObjectDetector(null);
        setAudioContext(null);
        setMicrophone(null);
        setAnalyser(null);
        setVideoReady(false);
        setExamStarted(false);
        setDisqualified(false);
        setCameraError("");
        setSpeakingDetected(false);
        setVoiceConfidence(0);
        setAudioLevel(0);
        setViolations(0);
        setKeyViolations(0);
        setNoFaceDetectedCount(0);
        setMultipleFacesCount(0);
        setSuspiciousObjectCount(0);
        setDetectedObjects([]);
        setLastSuspiciousActivity("");
        setAudioViolations(0);
        setLastAudioViolation("");
        document.onkeydown = null;
        document.oncontextmenu = null;
    };

    // useEffect(() => {
    //     if (!examStarted) return;

    //     const handleBlur = (e: any) => {
    //         if (handleBlurRef.current) {
    //             handleBlurRef.current(e);
    //         }
    //     };

    //     const handleFsChange = (e: any) => {
    //         if (handleFsChangeRef.current) {
    //             handleFsChangeRef.current(e);
    //         }
    //     };

    //     const handleVisibilityChange = (e: any) => {
    //         if (handleVisibilityChangeRef.current) {
    //             handleVisibilityChangeRef.current(e);
    //         }
    //     };

    //     const handleContextMenu = (e: any) => {
    //         if (handleContextMenuRef.current) {
    //             handleContextMenuRef.current(e);
    //         }
    //     };


    //     const handleKeyDown = (e: any) => {
    //         if (handleKeyDownRef.current) {
    //             handleKeyDownRef.current(e);
    //         }
    //     };

    //     window.addEventListener("blur", handleBlur);
    //     document.addEventListener("fullscreenchange", handleFsChange);
    //     document.addEventListener('visibilitychange', handleVisibilityChange);
    //     document.addEventListener('contextmenu', handleContextMenu);
    //     document.addEventListener('keydown', handleKeyDown);

    //     return () => {
    //         window.removeEventListener("blur", handleBlur);
    //         document.removeEventListener("fullscreenchange", handleFsChange);
    //         document.removeEventListener('visibilitychange', handleVisibilityChange);
    //         document.removeEventListener('contextmenu', handleContextMenu);
    //         document.removeEventListener('keydown', handleKeyDown);
    //     };
    // }, [examStarted]);

    const formatTimeReadable = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    };

    const handleSubmit = async () => {

        if (hasSubmittedRef.current) return;

        hasSubmittedRef.current = true;

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

        await cleanupExamEnvironment(); // ✅
        router.push("/dashboard/attender");

    };

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
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
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

    const updateAnswer = (index: number, code: string) => {
        const updated = [...answers];
        updated[index] = code;
        setAnswers(updated);
    };

    const getTimeColor = () => {
        if (timeLeft > 300) return "text-primary";
        if (timeLeft > 60) return "text-amber-600 dark:text-amber-400";
        return "text-destructive";
    };

    const getProgressValue = () => {
        const totalTime = (exam?.duration || 0) * 60;
        return ((totalTime - timeLeft) / totalTime) * 100;
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

    const handleDisqualification = async (reason: string) => {
        setDisqualified(true);
        toast.error(`🚫 Disqualified: ${reason}`);

        const examIdStr = examId?.toString() || "unknown";

        let imageBase64 = "";
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                imageBase64 = canvas.toDataURL("image/png");
            }
        }

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

    if (!exam) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-card border-border">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 w-16 h-16 border-4 border-primary/10 border-b-primary rounded-full animate-spin"
                                    style={{ animationDelay: "150ms" }} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground">
                                    Loading Exam
                                </h3>
                                <p className="text-muted-foreground">Preparing your assessment...</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Floating Header */}
            <div className="fixed top-0 left-0 right-0 z-50 p-2">
                <div className="max-w-7xl mx-auto">
                    <Card className="bg-card/95 backdrop-blur-xl shadow-2xl border-border">
                        <CardContent className="px-4 py-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                                            <Code className="w-4 h-4 text-primary-foreground" />
                                        </div>
                                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border border-card animate-pulse"></div>
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-foreground">
                                            {exam.title}
                                        </h1>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs px-2 py-0">
                                                {exam.language}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{exam.questions?.length || 0} Questions</span>
                                            <Badge variant="outline" className="text-xs px-2 py-0">
                                                {getAnsweredCount()}/{exam.questions?.length || 0} Answered
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Enhanced Timer */}
                                    <Card className={`border ${timeLeft <= 60 ? 'border-destructive' : timeLeft <= 300 ? 'border-amber-500' : 'border-primary'}`}>
                                        <CardContent className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Clock className={`w-4 h-4 ${getTimeColor()}`} />
                                                <div>
                                                    <div className={`text-sm font-semibold ${getTimeColor()}`}>
                                                        {formatTimeReadable(timeLeft)}
                                                    </div>
                                                    <Progress
                                                        value={100 - getProgressWidth()}
                                                        className="w-32 h-1.5"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Submit Button */}
                                    <Button
                                        onClick={handleSubmit}
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit Exam
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-32 pb-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
                        {/* Question Panel with Tabs */}
                        <Card className="bg-card/95 backdrop-blur-xl shadow-2xl border-border overflow-hidden flex flex-col">
                            {/* Question Tabs */}
                            <CardHeader className="bg-muted/50 px-6 py-4 border-b border-border">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                                            <FileCode className="w-5 h-5 text-primary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl text-foreground">
                                                Question {activeQuestionIndex + 1} of {exam.questions?.length || 0}
                                            </CardTitle>
                                            <p className="text-muted-foreground text-sm mt-1">Select a question to solve</p>
                                        </div>
                                    </div>

                                    {/* Navigation arrows */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigateQuestion('prev')}
                                            disabled={activeQuestionIndex === 0}
                                            className="h-9 w-9 p-0"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigateQuestion('next')}
                                            disabled={activeQuestionIndex === exam.questions.length - 1}
                                            className="h-9 w-9 p-0"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Tab Navigation */}
                                <ScrollArea className="max-h-20">
                                    <div className="flex flex-wrap gap-2">
                                        {(exam.questions as ExamQuestion[]).map((_, index) => (
                                            <Button
                                                key={index}
                                                variant={activeQuestionIndex === index ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setActiveQuestionIndex(index)}
                                                className={`relative flex items-center gap-2 transition-all duration-200 ${activeQuestionIndex === index ? 'shadow-lg scale-105' : ''
                                                    }`}
                                            >
                                                <span className="font-bold">{index + 1}</span>
                                                {isQuestionAnswered(index) && (
                                                    <CheckCircle2 className="w-3 h-3" />
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardHeader>

                            {/* Current Question Content */}
                            <CardContent className="flex-1 p-8 overflow-y-auto">
                                {exam.questions && exam.questions[activeQuestionIndex] && (
                                    <div className="space-y-6">
                                        {/* Question Statement */}
                                        <Alert className="border-primary/20 bg-primary/5">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                                    {activeQuestionIndex + 1}
                                                </div>
                                                <AlertDescription className="text-lg font-semibold text-foreground leading-relaxed">
                                                    {exam.questions[activeQuestionIndex].question}
                                                </AlertDescription>
                                            </div>
                                        </Alert>

                                        {/* Answer Input */}
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-foreground mb-3">
                                                Your Solution:
                                            </label>
                                            <Textarea
                                                value={answers[activeQuestionIndex] || ""}
                                                onChange={(e) => {
                                                    updateAnswer(activeQuestionIndex, e.target.value);
                                                    setCode(e.target.value);
                                                }}
                                                className="min-h-64 font-mono text-sm bg-muted/30 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 resize-none backdrop-blur-sm"
                                                placeholder="Write your code here..."
                                            />
                                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                                {isQuestionAnswered(activeQuestionIndex) && (
                                                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Answered
                                                    </Badge>
                                                )}
                                                <Badge variant="secondary" className="text-xs">
                                                    {(answers[activeQuestionIndex] || "").length} chars
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Code Editor Panel */}
                        <Card className="bg-card/95 backdrop-blur-xl shadow-2xl border-border overflow-hidden flex flex-col">
                            {/* Header Section */}
                            <CardHeader className="bg-muted/50 px-4 sm:px-6 lg:px-8 py-4 lg:py-6 border-b border-border">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                                            <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <CardTitle className="text-lg sm:text-xl lg:text-2xl text-foreground">
                                                Code Editor
                                            </CardTitle>
                                            <p className="text-muted-foreground text-xs sm:text-sm mt-1 hidden sm:block">Write and test your solution</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            onClick={handleRun}
                                            disabled={running}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                                        >
                                            {running ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                                                    Running...
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Run Code
                                                </>
                                            )}
                                        </Button>

                                        <div className="flex items-center space-x-2">
                                            <label htmlFor="theme-switch" className="text-sm font-medium text-foreground">
                                                Dark
                                            </label>
                                            <Switch
                                                id="theme-switch"
                                                checked={editorTheme === 'dark'}
                                                onCheckedChange={() => setEditorTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Code Editor Section */}
                            <div className="h-48 sm:h-64 md:h-80 overflow-hidden bg-muted/20">
                                <CodeEditor
                                    language={exam.language}
                                    value={code}
                                    onChange={(newCode) => {
                                        setCode(newCode);
                                        updateAnswer(activeQuestionIndex, newCode);
                                    }}
                                    theme={editorTheme === "dark" ? "vs-dark" : "light"}
                                />
                            </div>

                            {/* Enhanced Output Panel */}
                            <div className="bg-card border-t border-border">
                                <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-border bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                                <div className="w-2 h-2 bg-accent rounded-full"></div>
                                                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                                            </div>
                                            <span className="text-xs sm:text-sm font-medium text-foreground">Console Output</span>
                                        </div>
                                        {output && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setOutput("")}
                                                className="h-6 w-6 p-0 hover:bg-muted"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Console Output */}
                                <ScrollArea className="h-32 sm:h-40 md:h-48 p-3 sm:p-4 md:p-6 bg-muted/10">
                                    {sqlResult ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse border border-border rounded-lg overflow-hidden">
                                                <thead className="bg-muted">
                                                    <tr>
                                                        {sqlResult.columns.map((col, index) => (
                                                            <th key={index} className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sqlResult.rows.map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-muted/50 transition-colors duration-150">
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="border border-border px-3 py-2 text-muted-foreground">
                                                                    {String(cell)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <pre className="text-sm text-muted-foreground font-mono whitespace-pre-wrap break-words">
                                            {output || (
                                                <span className="text-muted-foreground/70 italic text-xs sm:text-sm">
                                                    Click 'Run Code' to see output here...
                                                </span>
                                            )}
                                        </pre>
                                    )}
                                </ScrollArea>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Proctoring Panel (if active) */}
            {exam?.isExamProctored && (
                <Card className="fixed bottom-4 right-4 z-50 w-64 bg-card/95 backdrop-blur-xl border-border shadow-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-foreground flex items-center gap-2">
                            <Camera className="w-3 h-3" />
                            AI Proctoring Active
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        <div className="relative">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                width={160}
                                height={120}
                                className="rounded-lg border border-border bg-muted"
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
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Audio Level:</span>
                                <Progress
                                    value={Math.min(audioLevel * 2, 100)}
                                    className="w-16 h-2"
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Voice:</span>
                                <div className="flex items-center gap-1">
                                    <Progress
                                        value={voiceConfidence * 100}
                                        className="w-16 h-2"
                                    />
                                    <span className={`text-xs ${speakingDetected ? 'text-destructive' : 'text-primary'}`}>
                                        {speakingDetected ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="text-xs space-y-1">
                            <div className={`flex items-center gap-2 ${noFaceDetectedCount > 5 ? 'text-destructive' : 'text-primary'}`}>
                                <Circle className="w-2 h-2 fill-current" />
                                Face: {noFaceDetectedCount > 0 ? 'Not Detected' : 'Detected'}
                            </div>
                            {multipleFacesCount > 0 && (
                                <Alert variant="destructive" className="py-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <AlertDescription className="text-xs">Multiple faces detected!</AlertDescription>
                                </Alert>
                            )}
                            {audioViolations > 0 && (
                                <Alert variant="destructive" className="py-1">
                                    <Mic className="w-3 h-3" />
                                    <AlertDescription className="text-xs">Voice: {audioViolations}/3</AlertDescription>
                                </Alert>
                            )}
                            {suspiciousObjectCount > 0 && (
                                <Alert variant="destructive" className="py-1">
                                    <Monitor className="w-3 h-3" />
                                    <AlertDescription className="text-xs">Object: {lastSuspiciousActivity}</AlertDescription>
                                </Alert>
                            )}
                        </div>

                        {cameraError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="w-4 h-4" />
                                <AlertDescription className="text-xs">{cameraError}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}