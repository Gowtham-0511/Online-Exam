import { memo, useEffect, useRef, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Clock,
    Code,
    Play,
    Send,
    ChevronLeft,
    ChevronRight,
    Mic,
    Camera,
    AlertTriangle,
    CheckCircle2,
    Circle,
    Terminal,
    FileCode,
    User,
    Monitor,
    Moon,
    Sun,
    Laptop,
    Database,
    Table,
    Columns,
    Settings,
    Maximize2,
    Minimize2

} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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


    const [databases, setDatabases] = useState<any[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>("");
    const [schemaLoading, setSchemaLoading] = useState(false);

    const { theme, setTheme } = useTheme();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    const onFullscreenChange = () => {
        if (!document.fullscreenElement && examStarted && !hasSubmittedRef.current) {
            console.log("Fullscreen exited - disqualifying");
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
        }
    };

    ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange"].forEach(evt =>
        document.addEventListener(evt, onFullscreenChange)
    );

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

    useEffect(() => {
        const fetchDatabaseSchema = async () => {
            if (exam?.language !== "sql") return;

            setSchemaLoading(true);
            try {
                const response = await fetch("/api/database-schema");
                if (response.ok) {
                    const schema = await response.json();
                    setDatabases(schema.databases || []);
                    if (schema.databases?.length > 0) {
                        setSelectedDatabase(schema.databases[0].name);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch database schema:", error);
            } finally {
                setSchemaLoading(false);
            }
        };

        fetchDatabaseSchema();
    }, [exam?.language]);

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
                body: JSON.stringify({ query: code, database: selectedDatabase }),
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
                                                        transform: `translateY(${100 - (getAnsweredCount() / exam.questions?.length * 100)}%)`
                                                    }}
                                                />
                                                <span className="text-xs font-bold text-foreground relative z-10">
                                                    {getAnsweredCount()}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground">
                                                / {exam.questions?.length}
                                            </span>
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={`px-3 py-1.5 rounded-xl border-2 transition-all duration-500 ${getAnsweredCount() === exam.questions?.length
                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-700 shadow-green-100 shadow-md dark:from-green-950/50 dark:to-emerald-950/50 dark:border-green-700 dark:text-green-300'
                                                : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-700 shadow-amber-100 shadow-md dark:from-amber-950/50 dark:to-orange-950/50 dark:border-amber-700 dark:text-amber-300'
                                                }`}
                                        >
                                            {getAnsweredCount() === exam.questions?.length ? (
                                                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                            ) : (
                                                <Clock className="w-3 h-3 mr-1.5" />
                                            )}
                                            {getAnsweredCount() === exam.questions?.length ? 'Complete' : 'In Progress'}
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
                                        <Clock className={`w-6 h-6 relative z-10 ${getTimeColor()} ${timeLeft <= 60 ? 'animate-bounce' : timeLeft <= 300 ? 'animate-pulse' : ''
                                            }`} />
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-2xl font-mono font-bold tracking-wider ${getTimeColor()} ${timeLeft <= 60 ? 'animate-pulse' : ''
                                            }`}>
                                            {formatTimeReadable(timeLeft)}
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
                                                    style={{ width: `${100 - getProgressWidth()}%` }}
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
                            className="relative px-10 py-4 bg-gradient-to-r from-primary via-primary/90 to-primary text-white font-bold text-lg rounded-2xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 group overflow-hidden border border-primary/20"
                        >
                            {/* Animated background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                            {/* Button content */}
                            <div className="relative flex items-center gap-3">
                                <Send className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                                <span>Submit Exam</span>
                            </div>

                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-lg scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-32 pb-8 px-4">
                <div className="max-w-full mx-auto">
                    <div className={`grid gap-6 h-[calc(100vh-180px)] ${exam.language === 'sql'
                        ? 'grid-cols-1 xl:grid-cols-4'
                        : 'grid-cols-1 xl:grid-cols-2'
                        }`}>
                        {/* Question Panel */}
                        <Card className={`relative overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-2xl border-border/50 backdrop-blur-xl ${exam.language === 'sql' ? 'xl:col-span-2' : ''}`}>
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
                                                        Completed: {getAnsweredCount()}
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
                            <CardContent className="relative z-10 flex-1 p-8 overflow-y-auto">
                                {exam.questions && exam.questions[activeQuestionIndex] && (
                                    <div className="space-y-8">
                                        {/* Enhanced Question Statement */}
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-accent/[0.02] rounded-2xl blur-sm" />
                                            <Alert className="relative border-2 border-primary/20 bg-gradient-to-br from-card/95 via-card/98 to-card/95 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                                {/* Decorative elements */}
                                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

                                                <div className="flex items-start gap-6 p-6">
                                                    {/* Question number badge */}
                                                    <div className="relative group flex-shrink-0">
                                                        <div className="absolute inset-0 bg-systech-gradient rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                                                        <div className="relative w-12 h-12 bg-systech-gradient rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                            {activeQuestionIndex + 1}
                                                        </div>
                                                    </div>

                                                    {/* Question text */}
                                                    <div className="flex-1">
                                                        <AlertDescription
                                                            className="text-lg leading-relaxed text-foreground/90 font-medium [&>img]:max-w-md [&>img]:w-full [&>img]:h-auto [&>img]:rounded-xl [&>img]:shadow-md [&>img]:mt-4 [&>img]:border [&>img]:border-border/30"
                                                            dangerouslySetInnerHTML={{ __html: exam.questions[activeQuestionIndex].question }}
                                                        />
                                                    </div>
                                                </div>
                                            </Alert>
                                        </div>

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
                                                    style={{ width: `${(getAnsweredCount() / exam.questions?.length) * 100}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse" />
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-foreground">
                                                {Math.round((getAnsweredCount() / exam.questions?.length) * 100)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick navigation */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Quick jump:</span>
                                        <div className="flex gap-1">
                                            {Array.from({ length: Math.min(5, exam.questions?.length || 0) }, (_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setActiveQuestionIndex(i)}
                                                    className={`w-2 h-2 rounded-full transition-all duration-200 ${i === activeQuestionIndex
                                                        ? 'bg-primary scale-125'
                                                        : isQuestionAnswered(i)
                                                            ? 'bg-primary/60 hover:bg-primary/80'
                                                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                                        }`}
                                                />
                                            ))}
                                            {exam.questions?.length > 5 && (
                                                <span className="text-xs text-muted-foreground ml-1">...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* SQL Schema Side Panel - Only for SQL exams */}
                        {exam.language === 'sql' && (
                            <Card className="relative overflow-hidden flex flex-col group backdrop-blur-xl border-border/50 hover:shadow-2xl transition-all duration-500">
                                {/* Dynamic background layers */}
                                <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/98 to-card/95" />
                                <div className="absolute inset-0 bg-gradient-to-bl from-blue-500/[0.02] via-transparent to-cyan-500/[0.02]" />
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

                                {/* Floating database icons */}
                                <div className="absolute top-6 right-6 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-full blur-2xl opacity-60 animate-pulse" />
                                <div className="absolute bottom-12 left-4 w-16 h-16 bg-gradient-to-tl from-cyan-500/5 to-blue-500/5 rounded-full blur-xl opacity-40 animate-pulse delay-1000" />

                                {/* Enhanced Header */}
                                <CardHeader className="relative z-10 bg-gradient-to-r from-blue-50/80 via-cyan-50/60 to-blue-50/80 dark:from-blue-950/60 dark:via-cyan-950/40 dark:to-blue-950/60 backdrop-blur-xl px-6 py-5 border-b border-border/30">
                                    <div className="flex items-center gap-4">
                                        {/* Database icon with animations */}
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                                            <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                                                <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H4V7z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v10c0 2.21-1.79 4-4 4" />
                                                </svg>
                                                {/* Connection indicator dots */}
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-sm" />
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <CardTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-cyan-400 dark:to-blue-400">
                                                Database Schema
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground font-medium mt-1 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                Connected & Ready
                                            </p>
                                        </div>

                                        {/* Schema stats */}
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="px-2 py-1 text-xs bg-blue-50/80 dark:bg-blue-950/50 border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-300">
                                                <Database className="w-3 h-3 mr-1" />
                                                {databases.length}
                                            </Badge>
                                            <Badge variant="outline" className="px-2 py-1 text-xs bg-cyan-50/80 dark:bg-cyan-950/50 border-cyan-200/50 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-300">
                                                <Table className="w-3 h-3 mr-1" />
                                                {databases.find(db => db.name === selectedDatabase)?.tables?.length || 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="relative z-10 flex-1 p-0 overflow-hidden">
                                    {schemaLoading ? (
                                        <div className="flex flex-col items-center justify-center h-48 space-y-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
                                                <div className="absolute inset-0 w-12 h-12 border-4 border-cyan-200/50 dark:border-cyan-800/50 border-b-cyan-500 dark:border-b-cyan-400 rounded-full animate-spin reverse-spin" />
                                            </div>
                                            <p className="text-sm text-muted-foreground animate-pulse">Loading schema...</p>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col">
                                            {/* Enhanced Database Selector */}
                                            <div className="p-4 border-b border-border/30 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 backdrop-blur-sm">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                                        <Settings className="w-3 h-3" />
                                                        Active Database
                                                    </label>
                                                    <div className="relative group">
                                                        <select
                                                            value={selectedDatabase}
                                                            onChange={(e) => setSelectedDatabase(e.target.value)}
                                                            className="w-full px-4 py-3 text-sm border-2 border-border/50 rounded-xl bg-gradient-to-r from-background/80 to-background/60 text-foreground focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer backdrop-blur-sm"
                                                        >
                                                            {databases.map(db => (
                                                                <option key={db.name} value={db.name} className="bg-background">
                                                                    {db.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                                            <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Enhanced Schema Explorer */}
                                            <ScrollArea className="flex-1 overflow-y-auto">
                                                <div className="p-4 space-y-4">
                                                    {databases.find(db => db.name === selectedDatabase)?.tables?.map((table: any, tableIndex: number) => (
                                                        <div
                                                            key={table.name}
                                                            className="relative group border-2 border-border/30 rounded-2xl overflow-hidden bg-gradient-to-br from-card/90 via-card/95 to-card/90 backdrop-blur-sm hover:shadow-lg hover:border-blue-300/50 dark:hover:border-blue-700/50 transition-all duration-300"
                                                        >
                                                            {/* Table header with enhanced styling */}
                                                            <div className="bg-gradient-to-r from-blue-50/60 via-cyan-50/40 to-blue-50/60 dark:from-blue-950/40 dark:via-cyan-950/20 dark:to-blue-950/40 px-4 py-3 border-b border-border/30 backdrop-blur-sm">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        {/* Table icon with index indicator */}
                                                                        <div className="relative">
                                                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                                                                                <Table className="w-4 h-4 text-white" />
                                                                            </div>
                                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center">
                                                                                <span className="text-xs font-bold text-white">{tableIndex + 1}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <h4 className="font-bold text-base text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                                                                {table.name}
                                                                            </h4>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {table.columns?.length} columns • Click to explore
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <Badge variant="secondary" className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-secondary to-secondary/80 border border-border/50 rounded-full">
                                                                        <Columns className="w-3 h-3 mr-1" />
                                                                        {table.columns?.length}
                                                                    </Badge>
                                                                </div>
                                                            </div>

                                                            {/* Enhanced columns list */}
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {table.columns?.map((column: any, colIndex: number) => (
                                                                    <div
                                                                        key={column.name}
                                                                        className="group/column px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/30 dark:hover:to-cyan-950/20 cursor-pointer transition-all duration-200 border-b border-border/20 last:border-b-0"
                                                                        onClick={() => {
                                                                            const columnRef = `${table.name}.${column.name}`;
                                                                            const newCode = code ? `${code}\n-- ${columnRef}` : `-- ${columnRef}`;
                                                                            setCode(newCode);
                                                                            updateAnswer(activeQuestionIndex, newCode);
                                                                        }}
                                                                        title={`Click to add ${table.name}.${column.name} to your query`}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                                {/* Column type indicator */}
                                                                                <div className="relative">
                                                                                    <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                                                                                        <div className="w-2 h-2 bg-white rounded-full" />
                                                                                    </div>
                                                                                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center">
                                                                                        <span className="text-xs font-bold text-white">{colIndex + 1}</span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-sm font-mono font-semibold text-foreground truncate group-hover/column:text-blue-600 dark:group-hover/column:text-blue-400 transition-colors duration-200">
                                                                                            {column.name}
                                                                                        </span>
                                                                                        <div className="w-1 h-1 bg-muted-foreground/40 rounded-full" />
                                                                                    </div>
                                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                                        Click to insert into query
                                                                                    </p>
                                                                                </div>
                                                                            </div>

                                                                            <Badge
                                                                                variant="outline"
                                                                                className="px-2 py-1 text-xs font-mono bg-gradient-to-r from-muted/60 to-muted/40 border-border/50 rounded-lg group-hover/column:border-blue-300/50 dark:group-hover/column:border-blue-700/50 transition-all duration-200 flex-shrink-0 ml-2"
                                                                            >
                                                                                {column.type}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Enhanced Quick Actions */}
                                                            <div className="p-3 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 border-t border-border/30 backdrop-blur-sm">
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            const selectQuery = `SELECT * FROM ${table.name};`;
                                                                            setCode(selectQuery);
                                                                            updateAnswer(activeQuestionIndex, selectQuery);
                                                                        }}
                                                                        className="text-xs px-3 py-2 h-8 rounded-lg border-border/50 hover:border-blue-300/50 dark:hover:border-blue-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-200 group/btn"
                                                                    >
                                                                        <svg className="w-3 h-3 mr-1.5 group-hover/btn:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                        </svg>
                                                                        SELECT *
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            const describeQuery = `DESCRIBE ${table.name};`;
                                                                            setCode(describeQuery);
                                                                            updateAnswer(activeQuestionIndex, describeQuery);
                                                                        }}
                                                                        className="text-xs px-3 py-2 h-8 rounded-lg border-border/50 hover:border-cyan-300/50 dark:hover:border-cyan-700/50 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition-all duration-200 group/btn"
                                                                    >
                                                                        <svg className="w-3 h-3 mr-1.5 group-hover/btn:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                        DESCRIBE
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    )}
                                </CardContent>

                                {/* Enhanced Footer with connection status */}
                                <div className="relative z-10 px-4 py-3 border-t border-border/30 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 backdrop-blur-sm">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            <span className="text-muted-foreground font-medium">Database Connected</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground">
                                                Total Tables: {databases.find(db => db.name === selectedDatabase)?.tables?.length || 0}
                                            </span>
                                            <div className="w-px h-3 bg-border" />
                                            <span className="text-muted-foreground">
                                                Active: {selectedDatabase}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

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
                                        <div className="overflow-x-scroll">
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
                                                            {sqlResult.columns.map((col, colIndex) => (
                                                                <td key={colIndex} className="border border-border px-3 py-2 text-muted-foreground">
                                                                    {String((row as Record<string, any>)[col])}
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