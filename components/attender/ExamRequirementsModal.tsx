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
import { CheckCircle2, Monitor, Camera, Mic, AlertCircle, Shield, Lock } from 'lucide-react';

interface Exam {
    id: number;
    title: string;
    isExamProctored: boolean;
}

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
        } catch (err) {
            console.error("Full screen error:", err);
            setError("Failed to enter full screen. Please try again or check your browser settings.");
        }
    };

    const requestMediaPermissions = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setIsMediaAllowed(true);
        } catch (err) {
            console.error("Media permission error:", err);
            setError("Camera and microphone access denied. Please allow access to proceed.");
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Exam Requirements
                    </DialogTitle>
                    <DialogDescription>
                        Please complete the following requirements to start <strong>{exam.title}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Full Screen Requirement */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isFullScreen ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                <Monitor className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Full Screen Mode</p>
                                <p className="text-xs text-muted-foreground">Required for exam integrity</p>
                            </div>
                        </div>
                        {isFullScreen ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                            <Button size="sm" variant="outline" onClick={requestFullScreen}>
                                Enable
                            </Button>
                        )}
                    </div>

                    {/* Proctored Requirements */}
                    {exam.isExamProctored && (
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isMediaAllowed ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <div className="flex gap-1">
                                        <Camera className="w-4 h-4" />
                                        <Mic className="w-4 h-4" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Camera & Microphone</p>
                                    <p className="text-xs text-muted-foreground">Proctoring is active</p>
                                </div>
                            </div>
                            {isMediaAllowed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                                <Button size="sm" variant="outline" onClick={requestMediaPermissions}>
                                    Allow Access
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={!allRequirementsMet}
                        className={allRequirementsMet ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        {allRequirementsMet ? (
                            <>
                                Start Exam <Lock className="w-4 h-4 ml-2" />
                            </>
                        ) : (
                            "Complete Requirements"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
