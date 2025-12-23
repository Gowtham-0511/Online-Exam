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
    MessageSquare,
    Ghost,
    Terminal
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        <div ref={containerRef} className="h-screen bg-background flex flex-col font-sans overflow-hidden relative selection:bg-pink-500/30">
            <Toaster position="bottom-center" toastOptions={{
                style: {
                    background: '#18181b',
                    color: '#fff',
                    border: '1px solid #3f3f46'
                }
            }} />

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />
            </div>

            {/* Top Navigation */}
            <header className="flex-none h-16 border-b border-border/40 bg-background/80 backdrop-blur-md z-20">
                <div className="flex h-full items-center px-6 gap-4 justify-between max-w-[1920px] mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/ghost-mode')}
                            className="hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-500/10 ring-1 ring-pink-500/20">
                                <Headphones className="w-4 h-4 text-pink-500" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-sm font-semibold tracking-tight text-foreground">Doc Alchemist</h1>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] text-muted-foreground font-mono uppercase">System Active</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-2 mr-4">
                            <Badge variant="outline" className="border-pink-500/20 bg-pink-500/5 text-pink-500 hover:bg-pink-500/10 transition-colors cursor-default">
                                <Sparkles className="w-3 h-3 mr-1.5" />
                                Ghost Mode AI
                            </Badge>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* Left Sidebar - Sources */}
                <aside className={cn(
                    "w-80 border-r border-border/40 bg-card/30 backdrop-blur-sm h-full flex flex-col transition-all duration-300 ease-in-out relative z-10",
                    !isSidebarOpen && "-ml-80"
                )}>
                    <div className="p-4 border-b border-border/40 flex items-center justify-between">
                        <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            Data Sources
                        </h3>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-pink-500/10 hover:text-pink-500" onClick={() => {
                                        setFile(null);
                                        setStep('upload');
                                        setAudioSrc(null);
                                    }}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Source</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-2">
                            {file ? (
                                <div className="sidebar-item p-3 rounded-lg border border-pink-500/20 bg-pink-500/5 flex items-start gap-3 group hover:border-pink-500/40 transition-all cursor-pointer">
                                    <div className="mt-1 p-1.5 rounded-md bg-background shadow-sm text-pink-500 ring-1 ring-pink-500/20">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate leading-none mb-1.5 text-foreground">{file.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm bg-background border-border">{file.type === 'application/pdf' ? 'PDF' : 'DOC'}</Badge>
                                            <span>{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 -mr-1" onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setStep('upload');
                                        setAudioSrc(null);
                                    }}>
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-xl bg-muted/5 flex flex-col items-center gap-2">
                                    <Ghost className="w-8 h-8 opacity-20" />
                                    <span>No sources added</span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-border/40 bg-background/20 backdrop-blur-md">
                        <div className="text-[10px] text-muted-foreground text-center">
                            <p>Ghost Mode employs ephemeral processing.</p>
                            <p className="opacity-60">Files are not persisted.</p>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 relative flex flex-col min-w-0 bg-transparent overflow-hidden">
                    {/* Toggle Sidebar Button (Mobile) */}
                    <div className="absolute left-4 top-4 z-20 md:hidden">
                        <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>

                    {step === 'upload' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in max-w-2xl mx-auto w-full relative z-10">
                            <div className="text-center mb-10 space-y-4">
                                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 ring-1 ring-pink-500/20 mb-4 shadow-lg shadow-pink-500/5">
                                    <Sparkles className="w-8 h-8 text-pink-500" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                                    Document <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Alchemist</span>
                                </h1>
                                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                                    Transmute static data into liquid knowledge. Upload documents to generate deep-dive podcasts.
                                </p>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('file-upload')?.click()}
                                className={cn(
                                    "w-full aspect-[2.5/1] max-h-[300px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-sm",
                                    isDragging
                                        ? "border-pink-500 bg-pink-500/10 scale-[1.02] shadow-xl shadow-pink-500/10"
                                        : "border-border/40 bg-card/30 hover:bg-card/50 hover:border-pink-500/30"
                                )}
                            >
                                <div className={cn(
                                    "h-16 w-16 mb-4 rounded-full bg-background/50 shadow-sm flex items-center justify-center text-pink-500 transition-transform duration-300",
                                    isDragging && "scale-110"
                                )}>
                                    <Upload className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-medium mb-1">Initiate Upload</h3>
                                <p className="text-sm text-muted-foreground text-center px-8">
                                    Drag artifact or <span className="text-pink-500 hover:underline">Select File</span> <br />
                                    <span className="text-xs opacity-60 font-mono mt-2 block">SUPPORTED: PDF, DOCX, TXT, MD</span>
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
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in max-w-4xl mx-auto w-full relative z-10">
                            <Card className="w-full shadow-2xl border-border/50 bg-card/50 backdrop-blur-md">
                                <CardHeader className="border-b border-border/40 pb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Settings2 className="w-5 h-5 text-pink-500" />
                                        <CardTitle className="text-2xl">Alchemy Configuration</CardTitle>
                                    </div>
                                    <CardDescription>Tune the parameters for your audio transmutation.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8 pt-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <Ghost className="w-4 h-4 text-muted-foreground" />
                                                Host Personality
                                            </label>
                                            <Badge variant="outline" className="text-pink-500 border-pink-500/20 bg-pink-500/5">{selectedHostStyle}</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {['Analytical', 'Conversational', 'Storyteller'].map((style) => (
                                                <div
                                                    key={style}
                                                    onClick={() => setSelectedHostStyle(style)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border p-4 text-center transition-all hover:shadow-md",
                                                        selectedHostStyle === style
                                                            ? "border-pink-500 bg-pink-500/10 text-pink-500 ring-1 ring-pink-500/50"
                                                            : "border-border/40 bg-background/40 hover:bg-accent/40"
                                                    )}
                                                >
                                                    <span className="text-sm font-medium">{style}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Duration Target</label>
                                            <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{selectedDuration} min</span>
                                        </div>
                                        <Slider
                                            value={[selectedDuration]}
                                            onValueChange={(val) => setSelectedDuration(val[0])}
                                            min={5}
                                            max={45}
                                            step={5}
                                            className="py-2 [&>.relative>.absolute]:bg-pink-500"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground font-mono opacity-70">
                                            <span>5m</span>
                                            <span>25m</span>
                                            <span>45m</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={startAlchemy}
                                        size="lg"
                                        className="w-full text-md font-semibold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-lg shadow-pink-500/20 border-0 h-12"
                                    >
                                        <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                                        Transmute to Audio
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in text-center relative z-10">
                            <div className="relative w-32 h-32 mb-8">
                                <div className="absolute inset-0 border-4 border-muted rounded-full opacity-20" />
                                <div
                                    className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"
                                    style={{ animationDuration: '2s' }}
                                />
                                <div className="absolute inset-2 border-4 border-rose-400 rounded-full border-b-transparent animate-spin opacity-60"
                                    style={{ animationDuration: '3s', animationDirection: 'reverse' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="p-4 rounded-full bg-pink-500/10 animate-pulse">
                                        <Headphones className="w-10 h-10 text-pink-500" />
                                    </div>
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold mb-3 tracking-tight">Synthesizing...</h2>
                            <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-light">{statusText}</p>

                            <div className="w-full max-w-sm h-1.5 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
                                <div
                                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300 ease-out box-shadow-glow"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="mt-4 font-mono text-xs text-muted-foreground/60">{Math.round(progress)}% COMPLETE</p>
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="flex-1 flex flex-col h-full animate-in overflow-hidden">
                            {/* Main Player Display */}
                            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-y-auto">

                                <Card className="w-full max-w-3xl border-0 shadow-2xl bg-card/60 backdrop-blur-xl relative z-10 ring-1 ring-white/10">
                                    {/* Audio Visualizer Header */}
                                    <div className="h-48 bg-gradient-to-br from-pink-500/10 via-background/40 to-rose-500/10 flex items-center justify-center relative border-b border-border/40 rounded-t-xl overflow-hidden">
                                        <div className="absolute inset-0 bg-grid-white/[0.02]" />
                                        <div className="flex items-end gap-1.5 h-20 opacity-90 z-10">
                                            {[...Array(40)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "w-1.5 rounded-full transition-all duration-150 ease-in-out shadow-[0_0_10px_rgba(236,72,153,0.3)]",
                                                        isRecording ? "bg-red-500/80" : "bg-pink-500",
                                                        isPlaying || isRecording ? "animate-pulse" : "h-2 bg-pink-500/30"
                                                    )}
                                                    style={{
                                                        height: isPlaying || isRecording ? `${Math.max(15, Math.random() * 80)}%` : '8px',
                                                        transitionDelay: `${i * 0.01}s`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h1 className="text-2xl font-bold mb-2 line-clamp-1 text-foreground">{podcastTitle}</h1>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <Badge variant="secondary" className={cn(
                                                        "font-normal border bg-secondary/50 backdrop-blur-md",
                                                        isInteracting ? "border-pink-500/30 text-pink-500" : "border-transparent"
                                                    )}>
                                                        {isInteracting ? "Interactive Mode" : "Overview Mode"}
                                                    </Badge>
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                    <span className="flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        {file?.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="outline" size="icon" className="hover:bg-pink-500/10 hover:text-pink-500 hover:border-pink-500/30" onClick={() => {
                                                            if (audioSrc) {
                                                                const a = document.createElement("a");
                                                                a.href = audioSrc;
                                                                a.download = `${podcastTitle}.mp3`;
                                                                a.click();
                                                            }
                                                        }}>
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Download Audio</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
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
                                                className={cn("cursor-pointer [&>.relative>.absolute]:bg-pink-500", isInteracting && "opacity-50")}
                                            />
                                            <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                                <span>{formatTime(currentTime)}</span>
                                                <span>{formatTime(duration)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-8 pb-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12 rounded-full text-muted-foreground hover:bg-pink-500/10 hover:text-pink-500 transition-colors"
                                                onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }}
                                                disabled={isInteracting}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-bold">-10</span>
                                                </div>
                                            </Button>

                                            <Button
                                                size="icon"
                                                className="h-20 w-20 p-4 rounded-full shadow-[0_0_30px_rgba(236,72,153,0.3)] bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white transition-all transform hover:scale-105 active:scale-95 border-4 border-background/20"
                                                onClick={togglePlay}
                                                disabled={isRecording || isProcessingInteraction}
                                            >
                                                {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12 rounded-full text-muted-foreground hover:bg-pink-500/10 hover:text-pink-500 transition-colors"
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
                            <div className="border-t border-border/40 bg-background/80 backdrop-blur-md p-6 pb-8 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                                <div className="max-w-3xl mx-auto flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <div className={cn(
                                            "absolute inset-0 rounded-full border border-pink-500/20 bg-muted/40 flex items-center px-6 text-muted-foreground transition-all backdrop-blur-sm",
                                            isRecording && "border-red-500/50 bg-red-500/5 text-red-500 animate-pulse"
                                        )}>
                                            {isRecording
                                                ? <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Listening... Release to send.</span>
                                                : isProcessingInteraction
                                                    ? <span className="flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Consulting the ghost in the machine...</span>
                                                    : <span className="flex items-center gap-2"><Mic className="w-4 h-4 opacity-50" /> Hold to interrupt and ask a question...</span>}
                                        </div>
                                        <div className="h-14 w-full" /> {/* Spacer for absolute overlay */}
                                    </div>

                                    <Button
                                        size="icon"
                                        className={cn(
                                            "h-14 w-14 rounded-full shadow-lg transition-all duration-300 border-4 border-background",
                                            isRecording
                                                ? "bg-red-500 hover:bg-red-600 text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                                                : "bg-pink-500 hover:bg-pink-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]"
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
                                <div className="text-center mt-3">
                                    <p className="text-[10px] text-muted-foreground/60 font-mono tracking-wider">GHOST MODE INTERACTION // AUDIO IS EPHEMERAL</p>
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
