import { memo, useEffect, useRef, useState } from "react";
import { FilesetResolver, FaceDetector, ObjectDetector } from "@mediapipe/tasks-vision";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, AlertTriangle, CheckCircle2, Monitor } from "lucide-react";

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

    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const [speakingDetected, setSpeakingDetected] = useState(false);
    const [audioViolations, setAudioViolations] = useState(0);
    const [voiceConfidence, setVoiceConfidence] = useState(0);

    const audioViolationsRef = useRef(0);

    // Initialize camera
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

    // Initialize MediaPipe detectors
    useEffect(() => {
        if (!isExamProctored || !videoReady) return;

        const initializeDetection = async () => {
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
            } catch (error) {
                console.error("Failed to initialize MediaPipe detection:", error);
                setCameraError("AI detection unavailable - continuing with basic monitoring");
            }
        };

        setTimeout(initializeDetection, 2000);

        return () => {
            faceDetector?.close?.();
            objectDetector?.close?.();
        };
    }, [isExamProctored, videoReady]);

    // Initialize audio monitoring
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

    // Face detection loop
    useEffect(() => {
        if (!faceDetectionActive || !faceDetector || !examStarted || !videoReady) return;

        const detectFaces = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

            try {
                const detections = faceDetector.detectForVideo(video, performance.now());

                if (detections.detections.length === 0) {
                    setNoFaceDetectedCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= 10) {
                            onDisqualification("No face detected for extended period");
                        }
                        return newCount;
                    });
                } else if (detections.detections.length > 1) {
                    setMultipleFacesCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= 5) {
                            onDisqualification("Multiple faces detected");
                        }
                        return newCount;
                    });
                } else {
                    setNoFaceDetectedCount(0);
                    setMultipleFacesCount(0);
                }

                drawDetections(detections.detections);
            } catch (error) {
                console.error("Face detection error:", error);
            }
        };

        const interval = setInterval(detectFaces, 1000);
        return () => clearInterval(interval);
    }, [faceDetectionActive, faceDetector, examStarted, videoReady, onDisqualification]);

    // Object detection loop
    useEffect(() => {
        if (!faceDetectionActive || !objectDetector || !examStarted || !videoReady) return;

        const detectObjects = async () => {
            if (!videoRef.current) return;

            const video = videoRef.current;
            if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;

            try {
                const detections = objectDetector.detectForVideo(video, performance.now());
                const suspiciousObjects = ['cell phone', 'mobile phone', 'phone', 'smartphone',
                    'book', 'laptop', 'computer', 'tablet', 'keyboard'];

                let foundSuspicious = false;
                let suspiciousItem = '';

                detections.detections.forEach(detection => {
                    detection.categories.forEach(category => {
                        if (category.score > 0.6) {
                            const objectName = category.categoryName.toLowerCase();
                            if (suspiciousObjects.some(s => objectName.includes(s) || s.includes(objectName))) {
                                foundSuspicious = true;
                                suspiciousItem = objectName;
                            }
                        }
                    });
                });

                if (foundSuspicious) {
                    setLastSuspiciousActivity(suspiciousItem);
                    setSuspiciousObjectCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= 3) {
                            onDisqualification(`Suspicious object detected: ${suspiciousItem}`);
                        }
                        return newCount;
                    });
                } else {
                    setSuspiciousObjectCount(0);
                }
            } catch (error) {
                console.error("Object detection error:", error);
            }
        };

        const interval = setInterval(detectObjects, 1000);
        return () => clearInterval(interval);
    }, [faceDetectionActive, objectDetector, examStarted, videoReady, onDisqualification]);

    // Audio monitoring loop
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
                    } else {
                        toast.error(`Voice detected. Warning ${newCount}/3`);
                    }

                    setTimeout(() => setSpeakingDetected(false), 5000);
                }
            }

            animationFrame = requestAnimationFrame(monitorAudio);
        };

        monitorAudio();
        return () => cancelAnimationFrame(animationFrame);
    }, [analyser, examStarted, speakingDetected, audioContext, onDisqualification]);

    // Video ready handler
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
        ctx.lineWidth = 3;
        ctx.fillStyle = detections.length === 1 ? '#00ff00' : '#ff0000';

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

    return (
        <Card className="fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] overflow-hidden group transition-all duration-500 hover:shadow-2xl border-border/50 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/98 to-card/95" />
            <div className="absolute inset-0 bg-gradient-to-tr from-red-500/[0.02] via-transparent to-amber-500/[0.02]" />

            <CardContent className="relative z-10 p-6 space-y-6">
                <div className="relative group">
                    <div className="relative overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm shadow-lg">
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-900/90 to-slate-800/90">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover rounded-xl"
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
                                <div className="w-20 h-2 bg-muted/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 transition-all duration-150"
                                        style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                                    />
                                </div>
                                <Badge variant="outline" className="px-2 py-0.5 text-xs font-mono">
                                    {Math.round(audioLevel)}%
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border-2 transition-all duration-300 ${noFaceDetectedCount > 5
                            ? 'border-red-300/50 bg-gradient-to-br from-red-50/80 to-rose-50/60'
                            : 'border-green-300/50 bg-gradient-to-br from-green-50/80 to-emerald-50/60'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${noFaceDetectedCount > 5 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                            <span className="text-xs font-bold">Face Detection</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {noFaceDetectedCount > 5 ? 'Warning' : 'OK'}
                        </Badge>
                    </div>

                    <div className={`p-3 rounded-xl border-2 transition-all duration-300 ${suspiciousObjectCount > 0
                            ? 'border-amber-300/50 bg-gradient-to-br from-amber-50/80 to-orange-50/60'
                            : 'border-blue-300/50 bg-gradient-to-br from-blue-50/80 to-cyan-50/60'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${suspiciousObjectCount > 0 ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse`} />
                            <span className="text-xs font-bold">Object Scan</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {suspiciousObjectCount > 0 ? 'Alert' : 'Safe'}
                        </Badge>
                    </div>
                </div>

                {multipleFacesCount > 0 && (
                    <Alert className="border-2 border-red-300/50 bg-gradient-to-r from-red-50/80 to-rose-50/60 rounded-xl">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription className="text-sm font-medium">
                            Multiple faces detected in frame!
                        </AlertDescription>
                    </Alert>
                )}

                {audioViolations > 0 && (
                    <Alert className="border-2 border-amber-300/50 bg-gradient-to-r from-amber-50/80 to-orange-50/60 rounded-xl">
                        <Mic className="w-4 h-4" />
                        <AlertDescription className="text-sm font-medium">
                            Voice detected: {audioViolations}/3 warnings
                        </AlertDescription>
                    </Alert>
                )}

                {cameraError && (
                    <Alert className="border-2 border-red-400/50 bg-gradient-to-r from-red-100/80 to-rose-100/60 rounded-xl">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription className="text-sm font-medium">
                            {cameraError}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
});

ProctoringMonitor.displayName = 'ProctoringMonitor';

export default ProctoringMonitor;