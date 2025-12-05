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
    AlertCircle,
    Shield,
    Lock,
    FileText,
    Wifi,
    Timer,
    UserCheck,
    XCircle,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Exam } from '@/types/attender';

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
            <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">Exam Requirements</DialogTitle>
                                <DialogDescription className="text-xs font-medium mt-1">
                                    Complete the checks to start <strong>{exam.title}</strong>
                                </DialogDescription>
                            </div>
                        </div>
                        {exam.isExamProctored && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1.5 py-1.5">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </div>
                                Proctored
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Action Required</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Terms & Conditions */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <FileText className="w-4 h-4" />
                            <h3>Terms & Conditions</h3>
                        </div>
                        <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm space-y-3 text-sm text-muted-foreground">
                            <div className="flex gap-3 items-start">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <p>You must remain in <strong className="text-foreground">full-screen mode</strong> throughout the entire exam duration.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <p>All answers must be <strong className="text-foreground">your own work</strong>. Plagiarism or cheating will result in disqualification.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <p>Once started, the <strong className="text-foreground">timer cannot be paused</strong>. Ensure you have adequate time before beginning.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <p>Make sure you have a <strong className="text-foreground">stable internet connection</strong> to avoid submission issues.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <p>By proceeding, you agree to complete the exam <strong className="text-foreground">honestly and independently</strong>.</p>
                            </div>
                        </div>
                    </div>

                    {/* System Checks */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <Monitor className="w-4 h-4" />
                            <h3>System Check</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Full Screen Check */}
                            <div className={cn(
                                "p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4",
                                isFullScreen
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-muted/30 border-border hover:border-primary/30"
                            )}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg", isFullScreen ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
                                            <Monitor className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Full Screen</p>
                                            <p className="text-xs text-muted-foreground">Required</p>
                                        </div>
                                    </div>
                                    {isFullScreen && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                </div>
                                {!isFullScreen && (
                                    <Button size="sm" variant="outline" onClick={requestFullScreen} className="w-full">
                                        Enable Full Screen
                                    </Button>
                                )}
                            </div>

                            {/* Media Check (if proctored) */}
                            {exam.isExamProctored && (
                                <div className={cn(
                                    "p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4",
                                    isMediaAllowed
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : "bg-muted/30 border-border hover:border-primary/30"
                                )}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg", isMediaAllowed ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
                                                <div className="flex gap-1">
                                                    <Camera className="w-3 h-3" />
                                                    <Mic className="w-3 h-3" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">Camera & Mic</p>
                                                <p className="text-xs text-muted-foreground">Proctoring Active</p>
                                            </div>
                                        </div>
                                        {isMediaAllowed && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                    {!isMediaAllowed && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={requestMediaPermissions}
                                            className="w-full"
                                            disabled={checkingMedia}
                                        >
                                            {checkingMedia ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                                    Checking...
                                                </>
                                            ) : (
                                                "Allow Access"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-muted/20 sm:justify-between gap-3">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={!allRequirementsMet}
                        className={cn(
                            "gap-2 transition-all duration-300",
                            allRequirementsMet
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {allRequirementsMet ? (
                            <>
                                Start Exam <Lock className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                Complete Requirements <AlertCircle className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
