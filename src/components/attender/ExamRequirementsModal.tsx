import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    Monitor,
    Camera,
    Mic,
    Shield,
    Lock,
    FileText,
    Wifi,
    Timer,
    Zap,
    AlertTriangle,
    Loader2,
    Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exam } from '@/types/attender';
import { Card } from '@/components/ui/card';

interface ExamRequirementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    exam: Exam | null;
    onProceed: () => void;
}

export const ExamRequirementsModal: React.FC<ExamRequirementsModalProps> = ({
    isOpen,
    onClose,
    exam,
    onProceed
}) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isMediaAllowed, setIsMediaAllowed] = useState(false);
    const [checkingMedia, setCheckingMedia] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsFullScreen(!!document.fullscreenElement);
            setIsMediaAllowed(false);
            setError(null);
        }
    }, [isOpen]);

    // Monitor full screen changes
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const requestFullScreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullScreen(true);
            setError(null);
        } catch (err) {
            console.error("Full screen error:", err);
            setError("Failed to enter full screen. Please try again or check your browser settings.");
        }
    };

    const requestMediaPermissions = async () => {
        setCheckingMedia(true);
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setIsMediaAllowed(true);
            setError(null);
        } catch (err) {
            console.error("Media permission error:", err);
            setError("Camera and microphone access denied. Please allow access to proceed.");
        } finally {
            setCheckingMedia(false);
        }
    };

    const handleStart = () => {
        if (!isFullScreen) {
            setError("You must enter full screen mode to start the exam.");
            return;
        }
        if (exam?.isExamProctored && !isMediaAllowed) {
            setError("Camera and microphone access is required for this proctored exam.");
            return;
        }
        onProceed();
    };

    if (!exam) return null;

    const allRequirementsMet = isFullScreen && (!exam.isExamProctored || isMediaAllowed);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-2xl border-border/40 shadow-2xl p-0 gap-0 overflow-hidden sm:rounded-2xl">

                {/* Header */}
                <div className="p-6 border-b border-border/40 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50" />
                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl ring-1 ring-primary/20 shadow-sm backdrop-blur-sm">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">Pre-Exam Validation</DialogTitle>
                                <DialogDescription className="text-muted-foreground mt-1 text-sm">
                                    Complete system checks for <span className="font-semibold text-foreground">{exam.title}</span>
                                </DialogDescription>
                            </div>
                        </div>
                        {exam.isExamProctored && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-2 py-1.5 px-3">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                                Proctored Session
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 border-destructive/20 bg-destructive/5">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Requirement Not Met</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* System Checks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full Screen Check */}
                        <div className={cn(
                            "relative group p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4 overflow-hidden",
                            isFullScreen
                                ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_-12px_rgba(16,185,129,0.3)]"
                                : "bg-card border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                        )}>
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg transition-colors", isFullScreen ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
                                        <Monitor className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Full Screen Mode</p>
                                        <p className="text-[11px] text-muted-foreground">Anti-cheat requirement</p>
                                    </div>
                                </div>
                                {isFullScreen && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in spin-in-45 duration-300" />}
                            </div>

                            {!isFullScreen ? (
                                <Button size="sm" variant="outline" onClick={requestFullScreen} className="w-full mt-2 bg-background/50 hover:bg-primary hover:text-primary-foreground border-border hover:border-primary transition-all">
                                    Enable Full Screen
                                </Button>
                            ) : (
                                <div className="h-9 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 rounded-md px-3 mt-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active & Verified
                                </div>
                            )}
                        </div>

                        {/* Media Check */}
                        {exam.isExamProctored && (
                            <div className={cn(
                                "relative group p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4 overflow-hidden",
                                isMediaAllowed
                                    ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_-12px_rgba(16,185,129,0.3)]"
                                    : "bg-card border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                            )}>
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg transition-colors", isMediaAllowed ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
                                            <div className="flex gap-1">
                                                <Camera className="w-3 h-3" />
                                                <Mic className="w-3 h-3" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Device Permissions</p>
                                            <p className="text-[11px] text-muted-foreground">Camera & Mic Check</p>
                                        </div>
                                    </div>
                                    {isMediaAllowed && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in spin-in-45 duration-300" />}
                                </div>

                                {!isMediaAllowed ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={requestMediaPermissions}
                                        className="w-full mt-2 bg-background/50 hover:bg-primary hover:text-primary-foreground border-border hover:border-primary transition-all"
                                        disabled={checkingMedia}
                                    >
                                        {checkingMedia ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Zap className="w-3 h-3 mr-2" />}
                                        {checkingMedia ? "Validating..." : "Grant Access"}
                                    </Button>
                                ) : (
                                    <div className="h-9 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 rounded-md px-3 mt-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Connected
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Guidelines Card */}
                    <Card className="border-border/50 bg-muted/20 overflow-hidden">
                        <div className="p-4 border-b border-border/40 bg-muted/40 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold">Rules of Engagement</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {[
                                { icon: Shield, text: "Anti-plagiarism algorithms are active." },
                                { icon: Timer, text: "Timer cannot be paused once started." },
                                { icon: Wifi, text: "Ensure a stable internet connection." },
                                { icon: Lock, text: "Browser tab switching is monitored." }
                            ].map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <rule.icon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                                    <span>{rule.text}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto text-muted-foreground hover:text-foreground hover:bg-muted/50">
                        Cancel check
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={!allRequirementsMet}
                        className={cn(
                            "w-full sm:w-auto min-w-[200px] gap-2 font-semibold transition-all duration-500",
                            allRequirementsMet
                                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {allRequirementsMet ? (
                            <>
                                Start Assessment <Play className="w-4 h-4 fill-current" />
                            </>
                        ) : (
                            <>
                                Pending Checks ({[isFullScreen, (exam.isExamProctored ? isMediaAllowed : null)].filter(x => x === false).length})
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
