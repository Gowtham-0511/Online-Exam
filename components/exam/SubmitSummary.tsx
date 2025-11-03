import { X, Clock, CheckCircle2, Send } from "lucide-react";
import { useMemo } from "react";
import type { SubmitSummaryProps, Question } from "@/types/exam.types";

interface ExtendedSubmitSummaryProps extends SubmitSummaryProps {
    timeLeft: number;
}

export default function SubmitSummary({
    exam,
    answers,
    mcqAnswers,
    flaggedQuestions,
    isSubmitting,
    onClose,
    onSubmit,
    setActiveQuestionIndex,
    isQuestionAnswered,
    timeLeft,
}: ExtendedSubmitSummaryProps) {
    // Calculate answered count
    const answeredCount = useMemo(() => {
        return exam.questions.filter((_, index) => isQuestionAnswered(index)).length;
    }, [exam.questions, isQuestionAnswered]);

    // Get unanswered question indices
    const unansweredIndices = useMemo(() => {
        return exam.questions
            .map((_, idx) => idx)
            .filter((idx) => !isQuestionAnswered(idx));
    }, [exam.questions, isQuestionAnswered]);

    // Format time
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-1">
                                Exam Summary
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Review your answers before final submission
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            aria-label="Close summary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Summary Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                <div className="text-sm text-muted-foreground mb-1">
                                    Total Questions
                                </div>
                                <div className="text-2xl font-bold text-foreground">
                                    {exam.questions.length}
                                </div>
                            </div>
                            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                <div className="text-sm text-muted-foreground mb-1">
                                    Answered
                                </div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {answeredCount}
                                </div>
                            </div>
                            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                <div className="text-sm text-muted-foreground mb-1">
                                    Unanswered
                                </div>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {exam.questions.length - answeredCount}
                                </div>
                            </div>
                            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <div className="text-sm text-muted-foreground mb-1">Flagged</div>
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {flaggedQuestions.size}
                                </div>
                            </div>
                        </div>

                        {/* Time Remaining */}
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Time Remaining
                                        </div>
                                        <div className="text-lg font-bold text-foreground">
                                            {formattedTime}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Unanswered Questions Warning */}
                        {unansweredIndices.length > 0 && (
                            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0">
                                        ⚠️
                                    </div>
                                    <div>
                                        <div className="font-semibold text-red-600 dark:text-red-400 mb-1">
                                            You have {unansweredIndices.length} unanswered question
                                            {unansweredIndices.length > 1 ? "s" : ""}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Questions:{" "}
                                            {unansweredIndices
                                                .map((idx) => `Q${idx + 1}`)
                                                .join(", ")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Flagged Questions */}
                        {flaggedQuestions.size > 0 && (
                            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg flex-shrink-0">🚩</span>
                                    <div className="flex-1">
                                        <div className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                            {flaggedQuestions.size} question
                                            {flaggedQuestions.size > 1 ? "s" : ""} flagged for
                                            review
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Questions:{" "}
                                            {Array.from(flaggedQuestions)
                                                .sort((a, b) => a - b)
                                                .map((idx) => `Q${idx + 1}`)
                                                .join(", ")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Question Breakdown */}
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-3">
                                Question Breakdown
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {exam.questions.map((q: Question, index: number) => {
                                    const isAnswered = isQuestionAnswered(index);
                                    const isFlagged = flaggedQuestions.has(index);

                                    return (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border flex items-center justify-between ${isAnswered
                                                    ? "bg-green-500/10 border-green-500/20"
                                                    : "bg-red-500/10 border-red-500/20"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isAnswered
                                                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                                            : "bg-red-500/20 text-red-600 dark:text-red-400"
                                                        }`}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-foreground">
                                                            Question {index + 1}
                                                        </span>
                                                        {q.type === "mcq" && (
                                                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs rounded">
                                                                MCQ
                                                            </span>
                                                        )}
                                                        {q.type !== "mcq" && (
                                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded">
                                                                Coding
                                                            </span>
                                                        )}
                                                        {isFlagged && <span>🚩</span>}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {q.marks} points
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isAnswered ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                )}
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        setActiveQuestionIndex(index);
                                                    }}
                                                    className="px-3 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                                >
                                                    Review
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/30">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors"
                    >
                        Continue Exam
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Confirm & Submit
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}