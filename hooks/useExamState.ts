import { useState, useRef } from "react";
import type {
    Exam,
    SqlResult,
    SchemaData,
    QuestionFilterType,
    ThemeType,
    ExamFile,
    QuestionTimeTracking,
    CodeRunCounts,
    Question,
} from "@/types/exam.types";

export function useExamState() {
    // Core exam state
    const [exam, setExam] = useState<Exam | null>(null);
    const [code, setCode] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);
    const [isDisqualified, setDisqualified] = useState(false);
    const [examStarted, setExamStarted] = useState(false);
    const [loading, setLoading] = useState(true);

    // Code execution state
    const [output, setOutput] = useState("");
    const [running, setRunning] = useState(false);
    const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);

    // Question navigation state
    const [answers, setAnswers] = useState<string[]>([]);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [editorTheme, setEditorTheme] = useState<ThemeType>("dark");
    const [theme, setTheme] = useState<ThemeType>("dark");

    // MCQ state
    const [mcqAnswers, setMcqAnswers] = useState<{ [key: number]: number }>({});

    // Filtering and flagging
    const [questionFilter, setQuestionFilter] = useState<QuestionFilterType>("all");
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    // Submission state
    const [showSubmitSummary, setShowSubmitSummary] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-save state
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [timeSinceLastSave, setTimeSinceLastSave] = useState(0);
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Tutorial state
    const [showTutorial, setShowTutorial] = useState(true);
    const [tutorialCompleted, setTutorialCompleted] = useState(false);

    // Time tracking
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
    const [questionTimeSpent, setQuestionTimeSpent] = useState<QuestionTimeTracking>({});
    const [codeRunCounts, setCodeRunCounts] = useState<CodeRunCounts>({});
    const questionTimeRef = useRef<QuestionTimeTracking>({});

    // File and schema state (for Python/SQL exams)
    const [examFiles, setExamFiles] = useState<ExamFile[]>([]);
    const [erDiagramUrl, setErDiagramUrl] = useState<
        string | { schemaData: any[]; serverType: string } | null
    >(null);
    const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
    const [showErDiagram, setShowErDiagram] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);

    return {
        // Core exam state
        exam,
        setExam,
        code,
        setCode,
        timeLeft,
        setTimeLeft,
        isDisqualified,
        setDisqualified,
        examStarted,
        setExamStarted,
        loading,
        setLoading,

        // Code execution state
        output,
        setOutput,
        running,
        setRunning,
        sqlResult,
        setSqlResult,

        // Question navigation state
        answers,
        setAnswers,
        activeQuestionIndex,
        setActiveQuestionIndex,
        shuffledQuestions,
        setShuffledQuestions,

        // UI state
        sidebarOpen,
        setSidebarOpen,
        editorTheme,
        setEditorTheme,
        theme,
        setTheme,

        // MCQ state
        mcqAnswers,
        setMcqAnswers,

        // Filtering and flagging
        questionFilter,
        setQuestionFilter,
        flaggedQuestions,
        setFlaggedQuestions,
        searchTerm,
        setSearchTerm,

        // Submission state
        showSubmitSummary,
        setShowSubmitSummary,
        isSubmitting,
        setIsSubmitting,

        // Auto-save state
        lastSaved,
        setLastSaved,
        isSaving,
        setIsSaving,
        isOnline,
        setIsOnline,
        timeSinceLastSave,
        setTimeSinceLastSave,
        autoSaveIntervalRef,

        // Tutorial state
        showTutorial,
        setShowTutorial,
        tutorialCompleted,
        setTutorialCompleted,

        // Time tracking
        questionStartTime,
        setQuestionStartTime,
        questionTimeSpent,
        setQuestionTimeSpent,
        codeRunCounts,
        setCodeRunCounts,
        questionTimeRef,

        // File and schema state
        examFiles,
        setExamFiles,
        erDiagramUrl,
        setErDiagramUrl,
        schemaData,
        setSchemaData,
        showErDiagram,
        setShowErDiagram,
        selectedTable,
        setSelectedTable,
    };
}