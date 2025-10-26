import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, AlertCircle, Eye, Code, Clock, Shield, Keyboard, Monitor } from 'lucide-react';

interface TutorialStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    type: 'info' | 'warning' | 'success';
}

interface ExamTutorialProps {
    onComplete: () => void;
    examLanguage: string;
    isProctored: boolean;
}

const ExamTutorial: React.FC<ExamTutorialProps> = ({ onComplete, examLanguage, isProctored }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const tutorialSteps: TutorialStep[] = [
        {
            title: "Welcome to Your Exam",
            description: `You're about to start a ${examLanguage.toUpperCase()} coding assessment. This tutorial will guide you through the exam interface and important rules.`,
            icon: <Code className="w-8 h-8" />,
            type: 'info'
        },
        {
            title: "Code Editor Features",
            description: "Use the code editor to write your solutions. You can switch between light/dark themes using the toggle button in the editor toolbar. The editor supports syntax highlighting and auto-completion.",
            icon: <Code className="w-8 h-8" />,
            type: 'success'
        },
        {
            title: "Time Management",
            description: "Keep an eye on the timer in the top-right corner. Your exam will auto-submit when time runs out. Save your progress regularly by moving between questions.",
            icon: <Clock className="w-8 h-8" />,
            type: 'info'
        },
        {
            title: "⚠️ Keyboard Shortcuts Disabled",
            description: "Copy (Ctrl+C), Paste (Ctrl+V), Cut (Ctrl+X), Undo (Ctrl+Z), and other shortcuts are DISABLED during the exam. Developer tools (F12, Ctrl+Shift+I) are also blocked.",
            icon: <Keyboard className="w-8 h-8" />,
            type: 'warning'
        },
        {
            title: "⚠️ Right-Click Disabled",
            description: "Right-click context menu is disabled throughout the exam. Attempting to use it will count as a violation (3 violations = disqualification).",
            icon: <AlertCircle className="w-8 h-8" />,
            type: 'warning'
        },
        {
            title: "⚠️ Tab Switching Rules",
            description: "DO NOT switch tabs, minimize the window, or switch to other applications. This will be detected and counted as a violation. Stay focused on the exam tab!",
            icon: <Monitor className="w-8 h-8" />,
            type: 'warning'
        }
    ];

    // Add proctoring step if exam is proctored
    if (isProctored) {
        tutorialSteps.push({
            title: "🎥 Proctoring Active",
            description: "This exam is proctored. Your webcam and screen activity will be monitored throughout the exam. Ensure you're in a quiet, well-lit environment and no one else is visible in the frame.",
            icon: <Eye className="w-8 h-8" />,
            type: 'warning'
        });
    }

    tutorialSteps.push({
        title: "Violation System",
        description: "You get 3 warnings for violations (right-click, forbidden keys, tab switching). After 3 violations, you will be automatically disqualified and your exam will be submitted.",
        icon: <Shield className="w-8 h-8" />,
        type: 'warning'
    });

    tutorialSteps.push({
        title: "Ready to Start!",
        description: "Click 'Start Exam' to begin. Remember: Stay focused, don't switch tabs, and good luck! You can flag questions for review and navigate using the sidebar.",
        icon: <Check className="w-8 h-8" />,
        type: 'success'
    });

    const handleNext = () => {
        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(() => {
            onComplete();
        }, 300);
    };

    const handleSkip = () => {
        if (window.confirm('Are you sure you want to skip the tutorial? Understanding the rules is important to avoid disqualification.')) {
            handleComplete();
        }
    };

    if (!isVisible) return null;

    const currentTutorialStep = tutorialSteps[currentStep];
    const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

    const getBackgroundColor = () => {
        switch (currentTutorialStep.type) {
            case 'warning':
                return 'bg-amber-500/10 border-amber-500/30';
            case 'success':
                return 'bg-green-500/10 border-green-500/30';
            default:
                return 'bg-primary/10 border-primary/30';
        }
    };

    const getIconColor = () => {
        switch (currentTutorialStep.type) {
            case 'warning':
                return 'text-amber-500';
            case 'success':
                return 'text-green-500';
            default:
                return 'text-primary';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-card border-2 border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Progress Bar */}
                <div className="h-2 bg-muted rounded-t-2xl overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Header */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl border-2 ${getBackgroundColor()}`}>
                                <div className={getIconColor()}>
                                    {currentTutorialStep.icon}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">
                                    {currentTutorialStep.title}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Step {currentStep + 1} of {tutorialSteps.length}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSkip}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Skip tutorial"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className={`p-6 rounded-xl border-2 ${getBackgroundColor()} min-h-[120px] flex items-center`}>
                        <p className="text-lg text-foreground leading-relaxed">
                            {currentTutorialStep.description}
                        </p>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                        {tutorialSteps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                                        ? 'w-8 bg-primary'
                                        : index < currentStep
                                            ? 'w-2 bg-primary/50'
                                            : 'w-2 bg-muted'
                                    }`}
                                title={`Go to step ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/30 rounded-b-2xl flex items-center justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>

                    <div className="text-sm text-muted-foreground">
                        {currentStep === tutorialSteps.length - 1 ? (
                            <span className="text-primary font-semibold">Ready to begin!</span>
                        ) : (
                            <span>Read carefully</span>
                        )}
                    </div>

                    <button
                        onClick={handleNext}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        {currentStep === tutorialSteps.length - 1 ? (
                            <>
                                <Check className="w-4 h-4" />
                                Start Exam
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamTutorial;