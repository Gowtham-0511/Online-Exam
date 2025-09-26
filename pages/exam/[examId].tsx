import { memo, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import CodeEditor from "../../components/CodeEditor";
import { useSession } from "next-auth/react";
import { FilesetResolver, FaceDetector, ObjectDetector } from "@mediapipe/tasks-vision";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    AlertTriangle,
    CheckCircle2,
    Terminal,
    FileCode,
    Monitor,
    Moon,
    Sun,
} from "lucide-react";

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

        // Enhanced visibility change handler with debouncing
        const handleVisibilityChange = () => {
            const now = Date.now();
            const timeSinceLastChange = now - lastVisibilityChangeRef.current;

            // Debounce rapid visibility changes (ignore if < 500ms apart)
            if (timeSinceLastChange < 500) return;

            lastVisibilityChangeRef.current = now;

            if (document.hidden) {
                setIsTabVisible(false);

                // Clear any existing timeout
                if (visibilityTimeoutRef.current) {
                    clearTimeout(visibilityTimeoutRef.current);
                }

                // Set a timeout to register violation after 1 second of being hidden
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

                // Clear timeout if user returns quickly
                if (visibilityTimeoutRef.current) {
                    clearTimeout(visibilityTimeoutRef.current);
                    visibilityTimeoutRef.current = null;
                }
            }
        };

        // Enhanced blur handler for window focus detection
        const handleBlur = (e: FocusEvent) => {
            // Ignore blur events from within the same page (e.g., clicking on inputs)
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

        // Enhanced screen change detection
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

        // Enhanced fullscreen change handler
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

                    // Try to re-enter fullscreen after a brief delay
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

        // Mouse leave detection (indicates potential screen switching)
        const handleMouseLeave = (e: MouseEvent) => {
            // Only trigger if mouse leaves through the edges (not just moving within page)
            if (e.clientY <= 0 || e.clientX <= 0 ||
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {

                if (examStarted && !hasSubmittedRef.current) {
                    console.log("Mouse left window boundaries - potential screen switch");

                    // Add a small delay to avoid false positives from quick mouse movements
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

        // Keyboard shortcuts detection for Alt+Tab, Cmd+Tab, etc.
        const handleKeyDown = (e: KeyboardEvent) => {
            // Detect Alt+Tab (Windows) or Cmd+Tab (Mac) combinations
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

        // Monitor screen resolution changes
        const handleResize = () => {
            if (examStarted && !hasSubmittedRef.current) {
                // Debounce resize events
                setTimeout(() => {
                    const currentScreen = {
                        width: window.screen.width,
                        height: window.screen.height,
                        availWidth: window.screen.availWidth,
                        availHeight: window.screen.availHeight
                    };

                    // Store initial screen info if not exists
                    if (!window.initialScreenInfo) {
                        window.initialScreenInfo = currentScreen;
                        return;
                    }

                    // Check if screen configuration changed significantly
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

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', () => setIsTabVisible(true));
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);

        // Screen configuration monitoring
        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleScreenChange);
        }

        // Cleanup function
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

    const onFullscreenChange = () => {
        if (!document.fullscreenElement && examStarted && !hasSubmittedRef.current) {
            console.log("Fullscreen exited - disqualifying");
            setDisqualified(true);
            handleSubmitWithDisqualification(true);
        }
    };

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
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const faceDetector = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    minDetectionConfidence: 0.5,
                    minSuppressionThreshold: 0.3
                });

                const objectDetector = await ObjectDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    scoreThreshold: 0.5,
                    maxResults: 5
                });

                setFaceDetector(faceDetector);
                setObjectDetector(objectDetector);
                setFaceDetectionActive(true);

                console.log("MediaPipe detectors initialized successfully");
            } catch (error) {
                console.error("Failed to initialize MediaPipe detection:", error);
                setFaceDetectionActive(false);
                setCameraError("AI detection unavailable - continuing with basic monitoring");
            }
        };

        if (exam?.isExamProctored && videoReady) {
            setTimeout(initializeDetection, 2000);
        }
    }, [exam?.isExamProctored, videoReady]);

    useEffect(() => {
        const initializeAudioMonitoring = async () => {
            if (!exam?.isExamProctored) return;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        sampleRate: 44100,
                        channelCount: 1
                    }
                });

                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }

                const source = audioCtx.createMediaStreamSource(stream);
                const analyserNode = audioCtx.createAnalyser();

                analyserNode.fftSize = 2048;
                analyserNode.smoothingTimeConstant = 0.8;
                analyserNode.minDecibels = -90;
                analyserNode.maxDecibels = -10;

                source.connect(analyserNode);

                setAudioContext(audioCtx);
                setMicrophone(source);
                setAnalyser(analyserNode);

                console.log("Audio monitoring initialized successfully");
            } catch (error) {
                console.error("Audio monitoring initialization failed:", error);
                setLastAudioViolation("Microphone access denied or unavailable");
            }
        };

        if (exam?.isExamProctored) {
            setTimeout(initializeAudioMonitoring, 1000);
        }

        return () => {
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close();
            }
        };
    }, [exam?.isExamProctored]);


    useEffect(() => {
        if (exam?.questions && answers.length > 0 && !examStarted) {
            console.log("Auto-starting exam - proctoring will begin");
            setExamStarted(true);
        }
    }, [exam, answers, examStarted]);

    useEffect(() => {
        let animationFrame: number;
        const confidenceBuffer: number[] = [];
        const bufferSize = 20;

        const monitorAudio = () => {
            if (!analyser || !examStarted || !audioContext) {
                console.log("Audio monitoring skipped - missing analyser or context");
                return;
            }

            const bufferLength = analyser.frequencyBinCount;
            const frequencyData = new Uint8Array(bufferLength);
            const timeData = new Uint8Array(bufferLength);

            analyser.getByteFrequencyData(frequencyData);
            analyser.getByteTimeDomainData(timeData);

            const average = frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
            setAudioLevel(average);

            const hasVoiceActivity = detectVoiceActivity(frequencyData, timeData);

            if (hasVoiceActivity && average > 10) {
                const voiceScore = analyzeVoicePattern(frequencyData, audioContext.sampleRate);

                confidenceBuffer.push(voiceScore);
                if (confidenceBuffer.length > bufferSize) {
                    confidenceBuffer.shift();
                }

                const avgConfidence = confidenceBuffer.reduce((sum, val) => sum + val, 0) / confidenceBuffer.length;
                setVoiceConfidence(avgConfidence);

                console.log(`Voice analysis - Level: ${average.toFixed(1)}, Confidence: ${avgConfidence.toFixed(2)}`);

                const voiceThreshold = 0.7;
                const minConfidenceFrames = 8;

                if (avgConfidence > voiceThreshold &&
                    confidenceBuffer.length >= minConfidenceFrames &&
                    !speakingDetected) {

                    setSpeakingDetected(true);
                    audioViolationsRef.current += 1;
                    const newCount = audioViolationsRef.current;
                    setAudioViolations(newCount);
                    setLastAudioViolation("Human voice detected");

                    console.log(`Voice violation detected. Confidence: ${avgConfidence.toFixed(2)}, Count: ${newCount}/3`);

                    if (newCount >= 3) {
                        handleDisqualification("Multiple voice violations - speaking detected");
                    } else {
                        if (typeof toast !== 'undefined') {
                            toast.error(`Voice detected. Warning ${newCount}/3`);
                        }
                    }

                    setTimeout(() => {
                        setSpeakingDetected(false);
                        confidenceBuffer.length = 0;
                    }, 5000);
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
            console.log("Starting audio monitoring loop");
            monitorAudio();
        }

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [analyser, examStarted, speakingDetected, audioContext]);

    useEffect(() => {
        let detectionInterval: NodeJS.Timeout;

        if (faceDetectionActive && faceDetector && objectDetector && examStarted && videoReady) {
            console.log("Starting detection loops");

            setTimeout(() => {
                detectionInterval = setInterval(() => {
                    detectFaces();
                    detectObjects();
                }, 1000);
            }, 2000);
        } else {
            console.log("Detection not started - missing requirements:", {
                faceDetectionActive,
                hasFaceDetector: !!faceDetector,
                hasObjectDetector: !!objectDetector,
                examStarted,
                videoReady
            });
        }

        return () => {
            if (detectionInterval) {
                console.log("Stopping detection interval");
                clearInterval(detectionInterval);
            }
        };
    }, [faceDetectionActive, faceDetector, objectDetector, examStarted, videoReady]);

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

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleVideoReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
                console.log("Video ready:", video.videoWidth, "x", video.videoHeight);
                setVideoReady(true);
            }
        };

        video.addEventListener('loadedmetadata', handleVideoReady);
        video.addEventListener('loadeddata', handleVideoReady);
        video.addEventListener('canplay', handleVideoReady);

        const checkVideoReady = setInterval(() => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                handleVideoReady();
                clearInterval(checkVideoReady);
            }
        }, 500);

        return () => {
            clearInterval(checkVideoReady);
            video.removeEventListener('loadedmetadata', handleVideoReady);
            video.removeEventListener('loadeddata', handleVideoReady);
            video.removeEventListener('canplay', handleVideoReady);
        };
    }, []);

    useEffect(() => {
        const logStatus = () => {
            console.log("Proctoring Status:", {
                examProctored: exam?.isExamProctored,
                examStarted,
                videoReady,
                faceDetectionActive,
                hasFaceDetector: !!faceDetector,
                hasObjectDetector: !!objectDetector,
                hasAudioContext: !!audioContext,
                hasAnalyser: !!analyser,
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                videoReadyState: videoRef.current?.readyState
            });
        };

        const statusInterval = setInterval(logStatus, 10000);

        return () => clearInterval(statusInterval);
    }, [exam?.isExamProctored, examStarted, videoReady, faceDetectionActive, faceDetector, objectDetector, audioContext, analyser]);

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
        if (visibilityTimeoutRef.current) {
            clearTimeout(visibilityTimeoutRef.current);
            visibilityTimeoutRef.current = null;
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
        tabSwitchViolationsRef.current = 0;
        screenChangeViolationsRef.current = 0;
        setTabSwitchViolations(0);
        setScreenChangeViolations(0);
        setLastTabSwitchTime("");
        setLastScreenChangeTime("");
        setIsTabVisible(true);
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
            let evaluationResult = null;
            try {
                const response = await fetch("http://localhost:5678/webhook/evaluate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ answersWithQuestionIds })
                });
                evaluationResult = await response.text();
                console.log(evaluationResult);
            } catch (error) {
                console.error("Evaluation failed:", error);
            }

            await fetch("/api/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    examId: examIdStr,
                    email,
                    userName,
                    answers,
                    evaluationResult,
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

    const getProgressWidth = () => {
        const totalTime = exam.duration * 60;
        return ((totalTime - timeLeft) / totalTime) * 100;
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
        if (!videoRef.current || !faceDetector || !canvasRef.current) {
            console.log("Face detection skipped - missing refs or detector");
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
            console.log("Video not ready for face detection");
            return;
        }

        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const startTime = performance.now();
            const detections = faceDetector.detectForVideo(video, startTime);

            console.log(`Face detection completed: ${detections.detections.length} faces found`);

            if (detections.detections.length === 0) {
                setNoFaceDetectedCount(prev => {
                    const newCount = prev + 1;
                    console.log(`No face detected count: ${newCount}`);
                    if (newCount >= 10) {
                        handleDisqualification("No face detected for extended period");
                    }
                    return newCount;
                });
                setMultipleFacesCount(0);
            } else if (detections.detections.length > 1) {
                setMultipleFacesCount(prev => {
                    const newCount = prev + 1;
                    console.log(`Multiple faces count: ${newCount}`);
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
        if (!videoRef.current || !objectDetector || !canvasRef.current) {
            console.log("Object detection skipped - missing refs or detector");
            return;
        }

        const video = videoRef.current;

        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
            console.log("Video not ready for object detection");
            return;
        }

        try {
            const startTime = performance.now();
            const detections = objectDetector.detectForVideo(video, startTime);

            console.log(`Object detection completed: ${detections.detections.length} objects found`);

            const suspiciousObjects = [
                'cell phone', 'mobile phone', 'phone', 'smartphone', 'iphone',
                'book', 'laptop', 'computer', 'tablet', 'keyboard',
                'paper', 'notebook', 'calculator', 'mouse',
                'headphones', 'earbuds', 'earphones'
            ];

            const currentDetections: string[] = [];
            let foundSuspicious = false;
            let suspiciousItem = '';

            detections.detections.forEach(detection => {
                detection.categories.forEach(category => {
                    if (category.score > 0.6) {
                        const objectName = category.categoryName.toLowerCase();
                        currentDetections.push(objectName);

                        console.log(`Detected object: ${objectName} (confidence: ${category.score})`);

                        if (suspiciousObjects.some(suspicious =>
                            objectName.includes(suspicious) || suspicious.includes(objectName)
                        )) {
                            foundSuspicious = true;
                            suspiciousItem = objectName;
                            console.log(`Suspicious object detected: ${objectName}`);
                        }
                    }
                });
            });

            setDetectedObjects(currentDetections);

            if (foundSuspicious) {
                setLastSuspiciousActivity(suspiciousItem);
                setSuspiciousObjectCount(prev => {
                    const newCount = prev + 1;
                    console.log(`Suspicious object count: ${newCount}`);
                    if (newCount >= 3) {
                        handleDisqualification(`Suspicious object detected: ${suspiciousItem}`);
                    }
                    return newCount;
                });
            } else {
                setSuspiciousObjectCount(0);
            }

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

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = detections.length === 1 ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 3;
        ctx.font = '16px Arial';
        ctx.fillStyle = detections.length === 1 ? '#00ff00' : '#ff0000';

        detections.forEach((detection, index) => {
            const bbox = detection.boundingBox;

            ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);

            const label = `Face ${index + 1}`;
            ctx.fillText(label, bbox.originX, bbox.originY - 10);
        });
    };

    const drawObjectDetections = (detections: any[]) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        detections.forEach(detection => {
            const bbox = detection.boundingBox;
            const category = detection.categories[0];

            if (category.score > 0.6) {
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 2;
                ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);

                ctx.fillStyle = '#ff6b6b';
                ctx.font = '14px Arial';
                const label = `${category.categoryName} (${(category.score * 100).toFixed(0)}%)`;

                const textWidth = ctx.measureText(label).width;
                ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
                ctx.fillRect(bbox.originX, bbox.originY - 25, textWidth + 10, 20);

                ctx.fillStyle = 'white';
                ctx.fillText(label, bbox.originX + 5, bbox.originY - 10);
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
                <Card className="fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] overflow-hidden group transition-all duration-500 hover:shadow-2xl border-border/50 backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/98 to-card/95" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-red-500/[0.02] via-transparent to-amber-500/[0.02]" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/40 to-transparent" />

                    <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-red-500/5 to-amber-500/5 rounded-full blur-2xl opacity-50 animate-pulse" />
                    <div className="absolute bottom-6 left-4 w-16 h-16 bg-gradient-to-tl from-amber-500/5 to-red-500/5 rounded-full blur-xl opacity-40 animate-pulse delay-1000" />

                    <CardContent className="relative z-10 p-6 space-y-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm shadow-lg group-hover:shadow-xl transition-all duration-300">
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                                <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-900/90 to-slate-800/90">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover rounded-xl"
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
                                        className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-xl"
                                    />

                                    <div className="absolute top-3 left-3 flex items-center gap-2">
                                        <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-white text-xs font-medium">REC</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-3 right-3">
                                        <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20">
                                            <span className="text-white text-xs font-mono">640x480</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                                    <Mic className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-bold text-foreground">Audio Analysis</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Audio Level:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-border/30">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 transition-all duration-150 rounded-full relative overflow-hidden"
                                                style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 animate-pulse" />
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="px-2 py-0.5 text-xs font-mono bg-card/80 border-border/50">
                                            {Math.round(audioLevel)}%
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Voice Detection:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-border/30">
                                            <div
                                                className={`h-full transition-all duration-300 rounded-full relative overflow-hidden ${speakingDetected
                                                    ? 'bg-gradient-to-r from-red-400 to-red-600'
                                                    : 'bg-gradient-to-r from-primary/60 to-primary'
                                                    }`}
                                                style={{ width: `${voiceConfidence * 100}%` }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${speakingDetected
                                            ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                                            : 'bg-primary/10 text-primary'
                                            }`}>
                                            {speakingDetected ? (
                                                <AlertTriangle className="w-3 h-3" />
                                            ) : (
                                                <CheckCircle2 className="w-3 h-3" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                        <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-xl border-2 transition-all duration-300 ${noFaceDetectedCount > 5
                                ? 'border-red-300/50 bg-gradient-to-br from-red-50/80 to-rose-50/60 dark:from-red-950/40 dark:to-rose-950/20'
                                : 'border-green-300/50 bg-gradient-to-br from-green-50/80 to-emerald-50/60 dark:from-green-950/40 dark:to-emerald-950/20'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${noFaceDetectedCount > 5 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                                    <span className="text-xs font-bold text-foreground">Face Detection</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${noFaceDetectedCount > 5 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {noFaceDetectedCount > 0 ? 'Not Detected' : 'Active'}
                                    </span>
                                    <Badge variant="outline" className={`px-2 py-0.5 text-xs ${noFaceDetectedCount > 5 ? 'border-red-300 text-red-600 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/30' : 'border-green-300 text-green-600 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/30'
                                        }`}>
                                        {noFaceDetectedCount > 5 ? 'Warning' : 'OK'}
                                    </Badge>
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl border-2 transition-all duration-300 ${suspiciousObjectCount > 0
                                ? 'border-amber-300/50 bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/20'
                                : 'border-blue-300/50 bg-gradient-to-br from-blue-50/80 to-cyan-50/60 dark:from-blue-950/40 dark:to-cyan-950/20'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${suspiciousObjectCount > 0 ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse`} />
                                    <span className="text-xs font-bold text-foreground">Object Scan</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${suspiciousObjectCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {suspiciousObjectCount > 0 ? 'Detected' : 'Clear'}
                                    </span>
                                    <Badge variant="outline" className={`px-2 py-0.5 text-xs ${suspiciousObjectCount > 0 ? 'border-amber-300 text-amber-600 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/30' : 'border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/30'
                                        }`}>
                                        {suspiciousObjectCount > 0 ? 'Alert' : 'Safe'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {multipleFacesCount > 0 && (
                            <Alert className="border-2 border-red-300/50 bg-gradient-to-r from-red-50/80 to-rose-50/60 dark:from-red-950/40 dark:to-rose-950/20 rounded-xl backdrop-blur-sm shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center shadow-md">
                                        <AlertTriangle className="w-4 h-4 text-white" />
                                    </div>
                                    <AlertDescription className="text-sm font-medium text-red-700 dark:text-red-300">
                                        Multiple faces detected in frame!
                                    </AlertDescription>
                                </div>
                            </Alert>
                        )}

                        {audioViolations > 0 && (
                            <Alert className="border-2 border-amber-300/50 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/20 rounded-xl backdrop-blur-sm shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                                        <Mic className="w-4 h-4 text-white" />
                                    </div>
                                    <AlertDescription className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                        Voice detected: {audioViolations}/3 warnings
                                    </AlertDescription>
                                </div>
                            </Alert>
                        )}

                        {suspiciousObjectCount > 0 && (
                            <Alert className="border-2 border-purple-300/50 bg-gradient-to-r from-purple-50/80 to-violet-50/60 dark:from-purple-950/40 dark:to-violet-950/20 rounded-xl backdrop-blur-sm shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md">
                                        <Monitor className="w-4 h-4 text-white" />
                                    </div>
                                    <AlertDescription className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                        Suspicious object: {lastSuspiciousActivity}
                                    </AlertDescription>
                                </div>
                            </Alert>
                        )}

                        {cameraError && (
                            <Alert className="border-2 border-red-400/50 bg-gradient-to-r from-red-100/80 to-rose-100/60 dark:from-red-950/60 dark:to-rose-950/40 rounded-xl backdrop-blur-sm shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
                                        <AlertTriangle className="w-4 h-4 text-white" />
                                    </div>
                                    <AlertDescription className="text-sm font-medium text-red-700 dark:text-red-300">
                                        {cameraError}
                                    </AlertDescription>
                                </div>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
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