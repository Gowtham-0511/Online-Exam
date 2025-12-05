import { CheckCircle2, Code, FileText } from "lucide-react";
import { useMemo } from "react";
import type { Question, QuestionNavigationProps } from "@/types/exam.types";

export default function QuestionNavigation({
    questions,
    activeQuestionIndex,
    setActiveQuestionIndex,
    questionFilter,
    setQuestionFilter,
    answers,
    mcqAnswers,
    flaggedQuestions,
    toggleFlag,
    answeredCount,
    exam,
    sidebarOpen,
    isOnline,
    searchTerm,
    setSearchTerm,
}: QuestionNavigationProps & {
    sidebarOpen: boolean;
    isOnline: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}) {
    // Count coding and MCQ questions
    const codingCount = useMemo(
        () => questions.filter((q) => q.type !== "mcq").length,
        [questions]
    );

    const mcqCount = useMemo(
        () => questions.filter((q) => q.type === "mcq").length,
        [questions]
    );

    // Check if a question is answered
    const isQuestionAnswered = (index: number) => {
        const question = questions[index];
        if (question?.type === "mcq") {
            return mcqAnswers[index] !== undefined;
        }
        return !!(answers[index] && answers[index].trim() !== "");
    };

    // Filter questions based on filter and search
    const filteredQuestions = useMemo(() => {
        return questions
            .map((q, index) => ({ q, index }))
            .filter(({ q, index }) => {
                // Filter by type
                if (questionFilter === "coding" && q.type === "mcq") return false;
                if (questionFilter === "mcq" && q.type !== "mcq") return false;

                // Filter by search term
                if (
                    searchTerm &&
                    !`Q${index + 1}`.toLowerCase().includes(searchTerm.toLowerCase())
                ) {
                    return false;
                }

                return true;
            });
    }, [questions, questionFilter, searchTerm]);

    return (
        <aside
            className={`${sidebarOpen ? "w-64" : "w-0"
                } lg:w-64 border-r border-border bg-card flex-shrink-0 overflow-hidden transition-all duration-300`}
        >
            <div className="h-full flex flex-col">
                {/* Header with Progress */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-foreground">Questions</h2>
                        <span className="text-xs text-muted-foreground">
                            {answeredCount}/{questions.length}
                        </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{
                                width: `${(answeredCount / questions.length) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {/* Search */}
                    <div className="px-2 mb-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search questions..."
                                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Question Type Filter */}
                    <div className="px-2 mb-3 flex gap-2">
                        <button
                            onClick={() => setQuestionFilter("all")}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${questionFilter === "all"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            All ({questions.length})
                        </button>
                        <button
                            onClick={() => setQuestionFilter("coding")}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${questionFilter === "coding"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            Code ({codingCount})
                        </button>
                        <button
                            onClick={() => setQuestionFilter("mcq")}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${questionFilter === "mcq"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            MCQ ({mcqCount})
                        </button>
                    </div>

                    {/* Compact Grid View */}
                    <div className="grid grid-cols-5 gap-1.5 px-2">
                        {filteredQuestions.map(({ q, index }) => {
                            const isActive = activeQuestionIndex === index;
                            const isAnswered = isQuestionAnswered(index);
                            const isFlagged = flaggedQuestions.has(index);
                            const isMcq = q.type === "mcq";

                            return (
                                <button
                                    key={index}
                                    onClick={() => setActiveQuestionIndex(index)}
                                    className={`aspect-square p-2 rounded-lg text-xs font-semibold transition-all relative ${isActive
                                            ? "bg-primary text-primary-foreground shadow-lg scale-110"
                                            : isAnswered
                                                ? "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        } ${isFlagged ? "ring-2 ring-amber-500" : ""}`}
                                    title={`Question ${index + 1} - ${isMcq ? "MCQ" : "Coding"
                                        } - ${q.marks}pts${isFlagged ? " (Flagged)" : ""}`}
                                    aria-label={`Question ${index + 1}`}
                                >
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <span>{index + 1}</span>
                                        {isAnswered && (
                                            <CheckCircle2 className="w-3 h-3 absolute top-0.5 right-0.5" />
                                        )}
                                        {isFlagged && (
                                            <span className="absolute top-0.5 left-0.5 text-xs">
                                                🚩
                                            </span>
                                        )}
                                        {isMcq && (
                                            <FileText className="w-2.5 h-2.5 absolute bottom-0.5 left-0.5 opacity-50" />
                                        )}
                                        {!isMcq && (
                                            <Code className="w-2.5 h-2.5 absolute bottom-0.5 left-0.5 opacity-50" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer with Stats */}
                <div className="p-4 border-t border-border bg-muted/50">
                    <div className="space-y-2">
                        {/* Connection Status */}
                        {!isOnline && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                    Offline Mode
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Statistics */}
                    <div className="space-y-2 text-xs mt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Answered</span>
                            <span className="font-semibold text-primary">
                                {answeredCount}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Unanswered</span>
                            <span className="font-semibold text-muted-foreground">
                                {questions.length - answeredCount}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-muted-foreground mb-0.5">Flagged</div>
                            <div className="font-semibold text-muted-foreground">
                                {flaggedQuestions.size}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}