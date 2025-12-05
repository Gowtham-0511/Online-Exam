"use client";

import { memo, useEffect, useRef, useState } from "react";
import { FilesetResolver, FaceDetector, ObjectDetector } from "@mediapipe/tasks-vision";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Mic,
    AlertTriangle,
    CheckCircle2,
    Eye,
    Shield,
    Activity,
    Camera,
    Scan,
    ChevronDown,
    ChevronUp,
    Brain,
    Sparkles
} from "lucide-react";

// Import Gemini utilities
import {
    analyzeWithGemini,
    storeViolationWithAI,
    captureVideoFrame,
    GeminiAnalysis
} from "@/utils/geminiAnalysisUtils";

interface ProctoringMonitorProps {
    isExamProctored: boolean;
    examStarted: boolean;
    examId: string;
    userEmail: string;
    onDisqualification: (reason: string) => void;
}

const ProctoringMonitor = memo(({
    isExamProctored,
    examStarted,
    examId,
    userEmail,
    onDisqualification
}: ProctoringMonitorProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Feature flags
    const USE_GEMINI_VALIDATION = true; // Toggle this to enable/disable Gemini
    const GEMINI_VALIDATION_THRESHOLD = 0.65; // Confidence threshold for Gemini violations

    // MediaPipe state
    const [cameraError, setCameraError] = useState("");
    const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
    const [objectDetector, setObjectDetector] = useState<ObjectDetector | null>(null);
    const [faceDetectionActive, setFaceDetectionActive] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    const [noFaceDetectedCount, setNoFaceDetectedCount] = useState(0);
    const [multipleFacesCount, setMultipleFacesCount] = useState(0);
    const [suspiciousObjectCount, setSuspiciousObjectCount] = useState(0);
    const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
    const [lastSuspiciousActivity, setLastSuspiciousActivity] = useState<string>("");

    // Audio state
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const [speakingDetected, setSpeakingDetected] = useState(false);
    const [audioViolations, setAudioViolations] = useState(0);
    const [voiceConfidence, setVoiceConfidence] = useState(0);

    // UI state
    const [isMinimized, setIsMinimized] = useState(false);

    // Gemini state
    const [geminiAnalyzing, setGeminiAnalyzing] = useState(false);
    const [lastGeminiAnalysis, setLastGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
    const [geminiValidationCount, setGeminiValidationCount] = useState(0);
    const [lastGeminiCallTime, setLastGeminiCallTime] = useState(0);

    // Debug state
    const [detectionDebug, setDetectionDebug] = useState({
        lastFaceCount: 0,
        lastObjectDetected: '',
        lastDetectionTime: '',
        geminiLastCall: '',
        geminiStatus: 'idle'
    });

    const audioViolationsRef = useRef(0);
    const geminiThrottleRef = useRef<NodeJS.Timeout | null>(null);

    // ============================================
    // GEMINI VALIDATION FUNCTION
    // ============================================
    const validateWithGemini = async (
        detectionType: "multiple_faces" | "no_face" | "suspicious_object",
        context?: { objectName?: string }
    ) => {
        // Throttle: Don't call Gemini more than once every 5 seconds
        const now = Date.now();
        if (now - lastGeminiCallTime < 5000) {
            console.log("⏸️ Gemini throttled - waiting...");
            return null;
        }

        if (!videoRef.current || geminiAnalyzing) {
            return null;
        }

        setGeminiAnalyzing(true);
        setLastGeminiCallTime(now);

        try {
            // Capture frame from video
            const frameBase64 = captureVideoFrame(videoRef.current);
            if (!frameBase64) {
                console.error("Failed to capture video frame");
                return null;
            }

            console.log(`🧠 Gemini analyzing: ${detectionType}`, context);
            setDetectionDebug(prev => ({
                ...prev,
                geminiLastCall: new Date().toLocaleTimeString(),
                geminiStatus: 'analyzing'
            }));

            // Call Gemini API
            const result = await analyzeWithGemini(frameBase64, detectionType, context);

            if (result.success && result.analysis) {
                setLastGeminiAnalysis(result.analysis);
                setGeminiValidationCount(prev => prev + 1);

                console.log("✅ Gemini analysis result:", result.analysis);
                setDetectionDebug(prev => ({
                    ...prev,
                    geminiStatus: 'completed'
                }));

                // If Gemini confirms violation with high confidence
                if (result.analysis.isViolation &&
                    result.analysis.confidence >= GEMINI_VALIDATION_THRESHOLD * 100) {

                    // Store violation with AI analysis
                    await storeViolationWithAI(
                        frameBase64,
                        userEmail,
                        examId,
                        result.analysis.reason,
                        result.analysis
                    );

                    // Take action based on severity
                    if (result.analysis.recommendation === "disqualify" ||
                        result.analysis.severity === "critical") {
                        onDisqualification(result.analysis.reason);
                    }
                }

                return result.analysis;
            }

            return null;

        } catch (error) {
            console.error("❌ Gemini validation error:", error);
            setDetectionDebug(prev => ({
                ...prev,
                geminiStatus: 'error'
            }));
            return null;
        } finally {
            setGeminiAnalyzing(false);
        }
    };

    // ============================================
    // CAMERA INITIALIZATION
    // ============================================
    useEffect(() => {
        if (!isExamProctored) return;

        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                setCameraError("Camera permission denied. You may be disqualified.");
            }
        };

        initCamera();

        return () => {
            if (videoRef.current?.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [isExamProctored]);

    // ============================================
    // MEDIAPIPE INITIALIZATION
    // ============================================
    useEffect(() => {
        if (!isExamProctored || !videoReady) return;

        const initializeDetection = async () => {
            let retries = 3;
            while (retries > 0) {
                try {
                    console.log("🔄 Initializing MediaPipe detection...");

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
                        scoreThreshold: 0.3,
                        maxResults: 10
                    });

                    setFaceDetector(faceDetector);
                    setObjectDetector(objectDetector);
                    setFaceDetectionActive(true);

                    console.log("✅ MediaPipe initialized successfully");
                    return;

                } catch (error) {
                    retries--;
                    console.error(`❌ Detection initialization failed. Retries left: ${retries}`, error);

                    if (retries === 0) {
                        setCameraError("AI detection failed to initialize");
                        onDisqualification("Proctoring system initialization failed");
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        };

        setTimeout(initializeDetection, 1000);

        return () => {
            faceDetector?.close?.();
            objectDetector?.close?.();
        };
    }, [isExamProctored, videoReady]);

    // ============================================
    // AUDIO INITIALIZATION
    // ============================================
    useEffect(() => {
        if (!isExamProctored) return;

        const initializeAudio = async () => {
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
                if (audioCtx.state === 'suspended') await audioCtx.resume();

                const source = audioCtx.createMediaStreamSource(stream);
                const analyserNode = audioCtx.createAnalyser();
                analyserNode.fftSize = 2048;
                analyserNode.smoothingTimeConstant = 0.8;
                source.connect(analyserNode);

                setAudioContext(audioCtx);
                setMicrophone(source);
                setAnalyser(analyserNode);
            } catch (error) {
                console.error("Audio initialization failed:", error);
            }
        };

        setTimeout(initializeAudio, 1000);

        return () => {
            audioContext?.close?.();
            microphone?.disconnect?.();
            analyser?.disconnect?.();
        };
    }, [isExamProctored]);

    // ============================================
    // FACE DETECTION LOOP (WITH GEMINI VALIDATION)
    // ============================================
    useEffect(() => {
        if (!faceDetectionActive || !faceDetector || !examStarted || !videoReady) return;

        const detectFaces = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

            try {
                const detections = faceDetector.detectForVideo(video, performance.now());

                // NO FACE DETECTED
                if (detections.detections.length === 0) {
                    setNoFaceDetectedCount(prev => {
                        const newCount = prev + 1;

                        // After 5 consecutive detections, validate with Gemini
                        if (newCount === 5 && USE_GEMINI_VALIDATION) {
                            validateWithGemini("no_face");
                        }

                        // Disqualify after 10 (give Gemini time to validate)
                        if (newCount >= 10) {
                            onDisqualification("No face detected for extended period");
                        }
                        return newCount;
                    });
                }
                // MULTIPLE FACES DETECTED
                else if (detections.detections.length > 1) {
                    setMultipleFacesCount(prev => {
                        const newCount = prev + 1;

                        // Immediately validate with Gemini on first detection
                        if (newCount === 1 && USE_GEMINI_VALIDATION) {
                            validateWithGemini("multiple_faces");
                        }

                        // Disqualify after 3 consecutive (or if Gemini confirms)
                        if (newCount >= 3) {
                            onDisqualification("Multiple faces detected");
                        }
                        return newCount;
                    });
                }
                // EXACTLY ONE FACE (GOOD)
                else {
                    setNoFaceDetectedCount(0);
                    setMultipleFacesCount(0);
                }

                setDetectionDebug(prev => ({
                    ...prev,
                    lastFaceCount: detections.detections.length,
                    lastDetectionTime: new Date().toLocaleTimeString()
                }));

                drawDetections(detections.detections);
            } catch (error) {
                console.error("Face detection error:", error);
            }
        };

        const interval = setInterval(detectFaces, 500);
        return () => clearInterval(interval);
    }, [faceDetectionActive, faceDetector, examStarted, videoReady, onDisqualification]);

    // ============================================
    // OBJECT DETECTION LOOP (WITH GEMINI VALIDATION)
    // ============================================
    useEffect(() => {
        if (!faceDetectionActive || !objectDetector || !examStarted || !videoReady) return;

        const detectObjects = async () => {
            if (!videoRef.current) return;

            const video = videoRef.current;
            if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

            try {
                const detections = objectDetector.detectForVideo(video, performance.now());

                const suspiciousObjects = [
                    'cell phone', 'mobile phone', 'phone', 'smartphone', 'telephone',
                    'book', 'laptop', 'computer', 'tablet', 'keyboard', 'mouse',
                    'monitor', 'screen', 'notebook', 'paper', 'headphones', 'earphones',
                    'smartwatch', 'watch', 'calculator'
                ];

                let foundSuspicious = false;
                let suspiciousItem = '';
                const detectedItems: string[] = [];

                detections.detections.forEach(detection => {
                    detection.categories.forEach(category => {
                        if (category.score > 0.3) {
                            const objectName = category.categoryName.toLowerCase();
                            detectedItems.push(`${objectName} (${(category.score * 100).toFixed(0)}%)`);

                            const isSuspicious = suspiciousObjects.some(s =>
                                objectName.includes(s) || s.includes(objectName)
                            );

                            if (isSuspicious) {
                                foundSuspicious = true;
                                suspiciousItem = objectName;
                                console.log(`⚠️ Suspicious object: ${objectName} - ${(category.score * 100).toFixed(1)}%`);
                            }
                        }
                    });
                });

                setDetectedObjects(detectedItems);
                setDetectionDebug(prev => ({
                    ...prev,
                    lastObjectDetected: suspiciousItem || 'none',
                }));

                if (foundSuspicious) {
                    setLastSuspiciousActivity(suspiciousItem);
                    setSuspiciousObjectCount(prev => {
                        const newCount = prev + 1;

                        // Validate with Gemini on first detection
                        if (newCount === 1 && USE_GEMINI_VALIDATION) {
                            validateWithGemini("suspicious_object", {
                                objectName: suspiciousItem
                            });
                        }

                        // Disqualify after 3 consecutive (unless Gemini says it's safe)
                        if (newCount >= 3) {
                            onDisqualification(`Suspicious object detected: ${suspiciousItem}`);
                        }
                        return newCount;
                    });
                } else {
                    setSuspiciousObjectCount(prev => Math.max(0, prev - 1));
                }
            } catch (error) {
                console.error("Object detection error:", error);
            }
        };

        const interval = setInterval(detectObjects, 500);
        return () => clearInterval(interval);
    }, [faceDetectionActive, objectDetector, examStarted, videoReady, onDisqualification]);

    // ============================================
    // AUDIO MONITORING LOOP
    // ============================================
    useEffect(() => {
        if (!analyser || !examStarted || !audioContext) return;

        let animationFrame: number;

        const monitorAudio = () => {
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
                setVoiceConfidence(voiceScore);

                if (voiceScore > 0.7 && !speakingDetected) {
                    setSpeakingDetected(true);
                    audioViolationsRef.current += 1;
                    const newCount = audioViolationsRef.current;
                    setAudioViolations(newCount);

                    if (newCount >= 3) {
                        onDisqualification("Multiple voice violations - speaking detected");
                    }

                    setTimeout(() => setSpeakingDetected(false), 5000);
                }
            }

            animationFrame = requestAnimationFrame(monitorAudio);
        };

        monitorAudio();
        return () => cancelAnimationFrame(animationFrame);
    }, [analyser, examStarted, speakingDetected, audioContext, onDisqualification]);

    // ============================================
    // VIDEO READY HANDLER
    // ============================================
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleVideoReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
                setVideoReady(true);
            }
        };

        video.addEventListener('loadedmetadata', handleVideoReady);
        video.addEventListener('loadeddata', handleVideoReady);
        video.addEventListener('canplay', handleVideoReady);

        return () => {
            video.removeEventListener('loadedmetadata', handleVideoReady);
            video.removeEventListener('loadeddata', handleVideoReady);
            video.removeEventListener('canplay', handleVideoReady);
        };
    }, []);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    const drawDetections = (detections: any[]) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = detections.length === 1 ? '#10b981' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.fillStyle = detections.length === 1 ? '#10b981' : '#ef4444';

        detections.forEach((detection, index) => {
            const bbox = detection.boundingBox;
            ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
            ctx.fillText(`Face ${index + 1}`, bbox.originX, bbox.originY - 10);
        });
    };

    const analyzeVoicePattern = (frequencyData: Uint8Array, sampleRate: number) => {
        const binSize = sampleRate / frequencyData.length;
        const fundamentalRange = { min: 85, max: 300 };
        const formantF1Range = { min: 300, max: 1000 };

        const fundamentalBins = {
            start: Math.floor(fundamentalRange.min / binSize),
            end: Math.floor(fundamentalRange.max / binSize)
        };

        const formantF1Bins = {
            start: Math.floor(formantF1Range.min / binSize),
            end: Math.floor(formantF1Range.max / binSize)
        };

        const fundamentalEnergy = frequencyData
            .slice(fundamentalBins.start, fundamentalBins.end)
            .reduce((sum, val) => sum + val * val, 0);

        const formantF1Energy = frequencyData
            .slice(formantF1Bins.start, formantF1Bins.end)
            .reduce((sum, val) => sum + val * val, 0);

        const totalEnergy = frequencyData.reduce((sum, val) => sum + val * val, 0);
        if (totalEnergy === 0) return 0;

        let voiceScore = 0;
        if (fundamentalEnergy / totalEnergy > 0.05) voiceScore += 0.2;
        if ((formantF1Energy) / totalEnergy > 0.15) voiceScore += 0.4;

        return voiceScore;
    };

    const detectVoiceActivity = (frequencyData: Uint8Array, timeData: Uint8Array) => {
        let zeroCrossings = 0;
        for (let i = 1; i < timeData.length; i++) {
            if ((timeData[i - 1] >= 128) !== (timeData[i] >= 128)) zeroCrossings++;
        }
        const zcr = zeroCrossings / timeData.length;
        const energy = timeData.reduce((sum, val) => sum + Math.pow((val - 128) / 128, 2), 0) / timeData.length;

        return energy > 0.01 && zcr >= 0.1 && zcr <= 0.4;
    };

    if (!isExamProctored) return null;

    const getStatusColor = () => {
        if (noFaceDetectedCount > 5 || multipleFacesCount > 0 || suspiciousObjectCount > 0 || audioViolations > 0) {
            return 'destructive';
        }
        if (geminiAnalyzing) return 'default';
        return 'default';
    };

    const getStatusText = () => {
        if (geminiAnalyzing) return 'AI Analyzing...';
        if (noFaceDetectedCount > 5) return 'Face Not Detected';
        if (multipleFacesCount > 0) return 'Multiple Faces';
        if (suspiciousObjectCount > 0) return 'Suspicious Object';
        if (audioViolations > 0) return 'Voice Detected';
        return 'Monitoring Active';
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <Card className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isMinimized ? 'w-80' : 'w-96'
            } max-w-[calc(100vw-3rem)] border-border/50 shadow-2xl`}>
            <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Shield className="w-5 h-5 text-primary" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                AI Proctoring
                                {USE_GEMINI_VALIDATION && (
                                    <Badge variant="secondary" className="text-xs gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Gemini
                                    </Badge>
                                )}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {geminiAnalyzing ? "AI analyzing..." : "Real-time monitoring"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                    >
                        {isMinimized ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                </div>

                {!isMinimized && (
                    <>
                        {/* Video Feed */}
                        <div className="p-4 space-y-4">
                            <div className="relative overflow-hidden rounded-lg border border-border bg-muted/10">
                                <div className="relative aspect-[4/3] bg-slate-900">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                    />

                                    {/* Recording Badge */}
                                    <div className="absolute top-3 left-3">
                                        <Badge variant="destructive" className="flex items-center gap-1.5 px-2 py-1">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                            <span className="text-xs font-semibold">LIVE</span>
                                        </Badge>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="absolute top-3 right-3">
                                        <Badge variant={getStatusColor()} className="text-xs">
                                            {getStatusText()}
                                        </Badge>
                                    </div>

                                    {/* Gemini Analyzing Indicator */}
                                    {geminiAnalyzing && (
                                        <div className="absolute bottom-3 left-3">
                                            <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-1">
                                                <Brain className="w-3 h-3 animate-pulse" />
                                                <span className="text-xs">AI Analyzing...</span>
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                {/* Face Detection */}
                                <div className={`p-3 rounded-lg border transition-all ${noFaceDetectedCount > 5
                                    ? 'border-destructive/50 bg-destructive/5'
                                    : 'border-green-500/50 bg-green-500/5'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Eye className={`w-3.5 h-3.5 ${noFaceDetectedCount > 5 ? 'text-destructive' : 'text-green-500'
                                            }`} />
                                        <span className="text-xs font-medium">Face</span>
                                    </div>
                                    <p className={`text-xs font-semibold ${noFaceDetectedCount > 5 ? 'text-destructive' : 'text-green-600'
                                        }`}>
                                        {noFaceDetectedCount > 5 ? 'Alert' : 'Detected'}
                                    </p>
                                </div>

                                {/* Object Detection */}
                                <div className={`p-3 rounded-lg border transition-all ${suspiciousObjectCount > 0
                                    ? 'border-amber-500/50 bg-amber-500/5'
                                    : 'border-blue-500/50 bg-blue-500/5'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Scan className={`w-3.5 h-3.5 ${suspiciousObjectCount > 0 ? 'text-amber-500' : 'text-blue-500'
                                            }`} />
                                        <span className="text-xs font-medium">Objects</span>
                                    </div>
                                    <p className={`text-xs font-semibold ${suspiciousObjectCount > 0 ? 'text-amber-600' : 'text-blue-600'
                                        }`}>
                                        {suspiciousObjectCount > 0 ? 'Warning' : 'Clear'}
                                    </p>
                                </div>

                                {/* Audio Detection */}
                                <div className={`p-3 rounded-lg border transition-all ${audioViolations > 0
                                    ? 'border-destructive/50 bg-destructive/5'
                                    : 'border-primary/50 bg-primary/5'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Mic className={`w-3.5 h-3.5 ${audioViolations > 0 ? 'text-destructive' : 'text-primary'
                                            }`} />
                                        <span className="text-xs font-medium">Audio</span>
                                    </div>
                                    <p className={`text-xs font-semibold ${audioViolations > 0 ? 'text-destructive' : 'text-primary'
                                        }`}>
                                        {audioViolations > 0 ? `${audioViolations}/3` : 'Silent'}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* AI Analysis Status */}
                            {USE_GEMINI_VALIDATION && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                            <Brain className="w-3.5 h-3.5" />
                                            Gemini Validations
                                        </span>
                                        <span className="text-xs font-mono font-semibold text-foreground">
                                            {geminiValidationCount}
                                        </span>
                                    </div>
                                    {lastGeminiAnalysis && (
                                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                            <p className="font-medium mb-1">Last AI Analysis:</p>
                                            <p className="truncate">{lastGeminiAnalysis.reason}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant={
                                                    lastGeminiAnalysis.severity === 'critical' ? 'destructive' :
                                                        lastGeminiAnalysis.severity === 'high' ? 'destructive' :
                                                            lastGeminiAnalysis.severity === 'medium' ? 'default' : 'secondary'
                                                } className="text-xs">
                                                    {lastGeminiAnalysis.severity}
                                                </Badge>
                                                <span className="text-xs">
                                                    {lastGeminiAnalysis.confidence}% confident
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Audio Level Indicator */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5" />
                                        Audio Activity
                                    </span>
                                    <span className="text-xs font-mono font-semibold text-foreground">
                                        {Math.round(audioLevel)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-150 ${audioLevel > 30
                                            ? 'bg-gradient-to-r from-amber-500 to-red-500'
                                            : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                            }`}
                                        style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Warnings */}
                            {multipleFacesCount > 0 && (
                                <Alert className="border-destructive/50 bg-destructive/10">
                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                    <AlertDescription className="text-xs font-medium text-destructive">
                                        Multiple faces detected in frame
                                    </AlertDescription>
                                </Alert>
                            )}

                            {audioViolations > 0 && (
                                <Alert className="border-amber-500/50 bg-amber-500/10">
                                    <Mic className="w-4 h-4 text-amber-600" />
                                    <AlertDescription className="text-xs font-medium text-amber-700 dark:text-amber-500">
                                        Voice detected: {audioViolations}/3 warnings
                                    </AlertDescription>
                                </Alert>
                            )}

                            {cameraError && (
                                <Alert className="border-destructive/50 bg-destructive/10">
                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                    <AlertDescription className="text-xs font-medium text-destructive">
                                        {cameraError}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </>
                )}

                {/* Minimized View */}
                {isMinimized && (
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Badge variant={getStatusColor()} className="text-xs">
                                {getStatusText()}
                            </Badge>
                            {USE_GEMINI_VALIDATION && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Brain className="w-3 h-3" />
                                    {geminiValidationCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs font-medium text-foreground">Active</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

ProctoringMonitor.displayName = 'ProctoringMonitor';

export default ProctoringMonitor;