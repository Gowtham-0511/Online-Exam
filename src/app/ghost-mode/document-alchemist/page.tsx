"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Upload,
    FileText,
    Headphones,
    Sparkles,
    Play,
    Pause,
    Download,
    RefreshCw,
    Mic,
    MoreHorizontal,
    Plus,
    X,
    Settings2,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'react-hot-toast';

// Types
type ProcessingStep = 'upload' | 'config' | 'processing' | 'result';

const DocumentAlchemist = () => {
    const router = useRouter();
    const containerRef = useRef(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // State
    const [step, setStep] = useState<ProcessingStep>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Config State
    const [selectedHostStyle, setSelectedHostStyle] = useState('Conversational');
    const [selectedDuration, setSelectedDuration] = useState(15);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Processing State
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    // Audio State
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [podcastTitle, setPodcastTitle] = useState('Generated Podcast');

    // Chime In State
    const [originalPodcastSrc, setOriginalPodcastSrc] = useState<string | null>(null);
    const [contextText, setContextText] = useState<string>("");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingInteraction, setIsProcessingInteraction] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);
    const [savedTime, setSavedTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // GSAP Animations
    useGSAP(() => {
        const ctx = gsap.context(() => {
            gsap.from(".animate-in", {
                y: 20,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: "power2.out"
            });

            gsap.from(".sidebar-item", {
                x: -20,
                opacity: 0,
                duration: 0.4,
                delay: 0.2,
                stagger: 0.05
            });
        }, containerRef);
        return () => ctx.revert();
    }, { scope: containerRef, dependencies: [step] });

    // File Handling
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileValidation(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileValidation(e.target.files[0]);
        }
    };

    const handleFileValidation = (selectedFile: File) => {
        const validTypes = ['.pdf', '.docx', '.txt', '.md'];
        const extension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

        if (validTypes.includes(extension) || selectedFile.type === 'application/pdf' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            setFile(selectedFile);
            setStep('config');
        } else {
            toast.error("Unsupported file type. Please use PDF, DOCX, TXT, or MD.");
        }
    };

    // Audio Player Helpers
    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    // Chime In Logic
    const startRecording = async () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = handleInteractionSubmit;

            mediaRecorderRef.current.start();
            setIsRecording(true);
            toast("Listening...", { icon: "🎙️" });
        } catch (err) {
            console.error("Mic Error:", err);
            toast.error("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleInteractionSubmit = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        if (audioBlob.size < 100) return; // Ignore empty

        setIsProcessingInteraction(true);
        const toastId = toast.loading("Consulting the hosts...");

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('context', contextText);

            const response = await fetch('/api/ghost-mode/podcast-interaction', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Interaction failed");

            const blob = await response.blob();
            const responseUrl = URL.createObjectURL(blob);

            if (!isInteracting) {
                // First interaction, save state logic if needed
                if (audioRef.current) setSavedTime(audioRef.current.currentTime);
                setOriginalPodcastSrc(audioSrc); // Backup original if not already set (though setOriginalPodcastSrc is usually set on gen)
            }

            setIsInteracting(true);
            setAudioSrc(responseUrl);

            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }, 100);

            toast.success("Hosts replied!", { id: toastId });

        } catch (error) {
            console.error(error);
            toast.error("Failed to chime in", { id: toastId });
            // Resume if failed
            if (audioRef.current) audioRef.current.play();
        } finally {
            setIsProcessingInteraction(false);
        }
    };

    const onAudioEnded = () => {
        if (isInteracting && originalPodcastSrc) {
            // Interaction finished, go back to podcast
            setIsInteracting(false);
            setAudioSrc(originalPodcastSrc);

            // Restore time and resume
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.currentTime = savedTime; // Go back to where we left off
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }, 100);
        } else {
            setIsPlaying(false);
        }
    };

    // Api Logic
    const startAlchemy = async () => {
        if (!file) return;

        setStep('processing');
        setProgress(0);
        setStatusText("Creating audio guide...");

        // Simulated progress
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95;
                if (prev < 30) return prev + 2;
                if (prev < 70) return prev + 0.5;
                return prev + 0.2;
            });
        }, 200);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'podcast');
            formData.append('hostStyle', selectedHostStyle);
            formData.append('duration', `${selectedDuration} minutes`);

            setStatusText("Deep diving into content...");

            const response = await fetch('/api/ghost-mode/generate-podcast', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Generative process failed');
            }

            const title = response.headers.get('X-Podcast-Title') || file.name.replace(/\.[^/.]+$/, "");
            const context = decodeURIComponent(response.headers.get('X-Podcast-Context') || "");

            setPodcastTitle(title);
            setContextText(context);

            const audioBlob = await response.blob();
            const url = URL.createObjectURL(audioBlob);
            setAudioSrc(url);
            setOriginalPodcastSrc(url);

            // Clean up
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);
            setIsInteracting(false);

            clearInterval(progressInterval);
            setProgress(100);

            setTimeout(() => setStep('result'), 500);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Generation Failed");
            setStatusText("Failed to generate audio.");
            clearInterval(progressInterval);
            setTimeout(() => setStep('config'), 2000);
        }
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-muted/20 font-sans text-foreground">
            <Toaster position="bottom-center" />

            {/* Top Navigation */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center px-6 gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/ghost-mode')} className="hover:bg-muted text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Headphones className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Audio Notebook</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Badge variant="secondary" className="hidden md:flex gap-1">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span>Ghost Mode AI</span>
                        </Badge>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Left Sidebar - Sources */}
                <aside className={cn(
                    "w-80 border-r bg-card h-full flex flex-col transition-all duration-300 ease-in-out relative z-10",
                    !isSidebarOpen && "-ml-80"
                )}>
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Sources</h3>
                        <Button variant="ghost" size="icon" className="hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => {
                            setFile(null);
                            setStep('upload');
                            setAudioSrc(null);
                        }}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-2">
                            {file ? (
                                <div className="sidebar-item p-3 rounded-lg border bg-accent/10 border-accent/20 flex items-start gap-3 group hover:bg-accent/20 transition-colors cursor-pointer">
                                    <div className="mt-1 p-1.5 rounded bg-background shadow-sm text-primary">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate leading-none mb-1">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{file.type === 'application/pdf' ? 'PDF' : 'DOC'} • {(file.size / 1024 / 1024).toFixed(1)}MB</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setStep('upload');
                                        setAudioSrc(null);
                                    }}>
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                    No sources added
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 relative flex flex-col min-w-0 bg-background">
                    {/* Toggle Sidebar Button */}
                    <div className="absolute left-4 top-4 z-20 md:hidden">
                        <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>

                    {step === 'upload' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in max-w-2xl mx-auto w-full">
                            <div className="text-center mb-10 space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    Turn documents into <span className="text-primary">Audio</span>
                                </h1>
                                <p className="text-muted-foreground text-lg">
                                    Upload a PDF, Word doc, or text file to generate an engaging podcast.
                                </p>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('file-upload')?.click()}
                                className={cn(
                                    "w-full aspect-[3/2] max-h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-muted/30 hover:bg-muted/50",
                                    isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/20"
                                )}
                            >
                                <div className="h-16 w-16 mb-4 rounded-full bg-background shadow-sm flex items-center justify-center text-primary">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-medium mb-1">Upload source</h3>
                                <p className="text-sm text-muted-foreground text-center px-8">
                                    Drag & drop or Click to Select <br />
                                    <span className="text-xs opacity-70">(PDF, DOCX, TXT, MD)</span>
                                </p>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept=".pdf,.docx,.txt,.md"
                                />
                            </div>
                        </div>
                    )}

                    {step === 'config' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in max-w-3xl mx-auto w-full">
                            <Card className="w-full shadow-lg border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-2xl">Audio Configuration</CardTitle>
                                    <CardDescription>Customize the style and length of your audio summary.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Host Personality</label>
                                            <Badge variant="outline">{selectedHostStyle}</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {['Analytical', 'Conversational', 'Storyteller'].map((style) => (
                                                <div
                                                    key={style}
                                                    onClick={() => setSelectedHostStyle(style)}
                                                    className={cn(
                                                        "cursor-pointer rounded-lg border p-4 text-center transition-all hover:bg-muted/50",
                                                        selectedHostStyle === style
                                                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                                            : "border-border bg-card"
                                                    )}
                                                >
                                                    <span className="text-sm font-medium">{style}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Target Duration</label>
                                            <span className="text-sm text-muted-foreground">{selectedDuration} min</span>
                                        </div>
                                        <Slider
                                            value={[selectedDuration]}
                                            onValueChange={(val) => setSelectedDuration(val[0])}
                                            min={5}
                                            max={45}
                                            step={5}
                                            className="py-2"
                                        />
                                    </div>

                                    <Button
                                        onClick={startAlchemy}
                                        size="lg"
                                        className="w-full text-md font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                    >
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Generate Audio Overview
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in text-center">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 border-4 border-muted rounded-full" />
                                <div
                                    className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
                                    style={{ animationDuration: '1.5s' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Headphones className="w-8 h-8 text-primary animate-pulse" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Analyzing Source...</h2>
                            <p className="text-muted-foreground max-w-sm mx-auto">{statusText}</p>
                            <div className="mt-8 w-64 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="flex-1 flex flex-col h-full animate-in">
                            {/* Main Player Display */}
                            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
                                {/* Background Ambient */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

                                <Card className="w-full max-w-3xl border-none shadow-2xl bg-card relative z-10 overflow-hidden">
                                    {/* Audio Visualizer Header */}
                                    <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center relative border-b">
                                        <div className="flex items-end gap-1.5 h-16 opacity-80">
                                            {[...Array(40)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "w-1.5 rounded-full transition-all duration-150 ease-in-out",
                                                        isRecording ? "bg-destructive/80" : "bg-primary",
                                                        isPlaying || isRecording ? "animate-pulse" : "h-2 bg-primary/30"
                                                    )}
                                                    style={{
                                                        height: isPlaying || isRecording ? `${Math.max(15, Math.random() * 80)}%` : '8px',
                                                        animationDelay: `${i * 0.05}s`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h1 className="text-2xl font-bold mb-1 line-clamp-1">{podcastTitle}</h1>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="secondary" className="font-normal border-transparent bg-secondary/50 text-secondary-foreground">
                                                        {isInteracting ? "Interaction" : "Overview"}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>{file?.name}</span>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="icon" onClick={() => {
                                                if (audioSrc) {
                                                    const a = document.createElement("a");
                                                    a.href = audioSrc;
                                                    a.download = `${podcastTitle}.mp3`;
                                                    a.click();
                                                }
                                            }}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            <Slider
                                                disabled={isInteracting}
                                                value={[currentTime]}
                                                max={duration || 100}
                                                onValueChange={(val) => {
                                                    if (audioRef.current && !isInteracting) {
                                                        audioRef.current.currentTime = val[0];
                                                        setCurrentTime(val[0]);
                                                    }
                                                }}
                                                className={cn("cursor-pointer", isInteracting && "opacity-50")}
                                            />
                                            <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                                <span>{formatTime(currentTime)}</span>
                                                <span>{formatTime(isInteracting ? duration : duration)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-8">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12 rounded-full text-muted-foreground hover:bg-muted"
                                                onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }}
                                                disabled={isInteracting}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-bold">-10</span>
                                                </div>
                                            </Button>

                                            <Button
                                                size="icon"
                                                className="h-16 w-16 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105"
                                                onClick={togglePlay}
                                                disabled={isRecording || isProcessingInteraction}
                                            >
                                                {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12 rounded-full text-muted-foreground hover:bg-muted"
                                                onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-bold">+10</span>
                                                </div>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Interaction Bar (NotebookLM style bottom bar) */}
                            <div className="border-t bg-card p-6 pb-8 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                                <div className="max-w-3xl mx-auto flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <div className={cn(
                                            "absolute inset-0 rounded-full border-2 border-primary/20 bg-muted/20 flex items-center px-4 text-muted-foreground transition-all",
                                            isRecording && "border-destructive/50 bg-destructive/5 text-destructive"
                                        )}>
                                            {isRecording
                                                ? "Listening... Release to send question."
                                                : isProcessingInteraction
                                                    ? "Hosts are thinking..."
                                                    : "Hold mic to ask a question or add a comment..."}
                                        </div>
                                        <div className="h-12 w-full" /> {/* Spacer for absolute overlay */}
                                    </div>

                                    <Button
                                        size="icon"
                                        className={cn(
                                            "h-14 w-14 rounded-full shadow-lg transition-all duration-200 border-4 border-background",
                                            isRecording ? "bg-destructive hover:bg-destructive text-white scale-110" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                        )}
                                        onMouseDown={startRecording}
                                        onMouseUp={stopRecording}
                                        onMouseLeave={stopRecording}
                                        onTouchStart={startRecording}
                                        onTouchEnd={stopRecording}
                                        disabled={isProcessingInteraction}
                                    >
                                        {isProcessingInteraction ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <audio
                ref={audioRef}
                src={audioSrc || undefined}
                onTimeUpdate={() => {
                    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                }}
                onEnded={onAudioEnded}
                onError={(e) => console.error("Audio error", e)}
            />
        </div>
    );
};

export default DocumentAlchemist;
