import { Clock, Code, Send, X, Menu, HelpCircle } from "lucide-react";
import { useMemo } from "react";
import type { ExamHeaderProps } from "@/types/exam.types";

export default function ExamHeader({
    exam,
    timeLeft,
    theme,
    setTheme,
    sidebarOpen,
    setSidebarOpen,
    lastSaved,
    isSaving,
    timeSinceLastSave,
    isOnline,
    onSubmit,
    onShowTutorial,
    isSubmitting,
}: ExamHeaderProps & {
    onSubmit: () => void;
    onShowTutorial: () => void;
    isSubmitting: boolean;
}) {
    // Compute time color based on time left
    const timeColor = useMemo(() => {
        if (timeLeft > 300) return "text-primary";
        if (timeLeft > 60) return "text-amber-600 dark:text-amber-400";
        return "text-destructive";
    }, [timeLeft]);

    // Format time display
    const formattedTime = useMemo(() => {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const remainingSeconds = timeLeft % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }, [timeLeft]);

    return (
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                    aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {sidebarOpen ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <Menu className="w-5 h-5" />
                    )}
                </button>

                {/* Exam Title & Info */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Code className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-bold text-foreground">{exam.title}</h1>
                        <p className="text-xs text-muted-foreground">
                            {exam.language.toUpperCase()} • {exam.questions.length} Questions
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
                {/* Timer */}
                <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${timeLeft <= 60
                            ? "bg-destructive/10 border-destructive"
                            : timeLeft <= 300
                                ? "bg-amber-500/10 border-amber-500"
                                : "bg-primary/10 border-primary"
                        }`}
                >
                    <Clock className={`w-4 h-4 ${timeColor}`} />
                    <span className={`font-mono font-bold ${timeColor}`}>
                        {formattedTime}
                    </span>
                </div>

                {/* Help/Tutorial Button */}
                <button
                    onClick={onShowTutorial}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="View tutorial again"
                    aria-label="View tutorial"
                >
                    <HelpCircle className="w-5 h-5" />
                </button>

                {/* Submit Button */}
                <button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    aria-label="Submit exam"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Submit
                        </>
                    )}
                </button>
            </div>
        </header>
    );
}