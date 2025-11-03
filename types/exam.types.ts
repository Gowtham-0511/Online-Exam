// Question Types
export type QuestionType = 'mcq' | 'coding';

export interface McqOption {
    text: string;
    isCorrect?: boolean;
}

export interface Question {
    id?: string | number;
    type: QuestionType;
    question: string;
    marks: number;
    options?: McqOption[];
    testCases?: any[];
    language?: string;
    starterCode?: string;
    hint?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
}

// Exam Structure
export interface Exam {
    id: string;
    title: string;
    description?: string;
    duration: number; // in minutes
    questions: Question[];
    language: 'python' | 'javascript' | 'java' | 'cpp' | 'sql' | string;
    totalMarks?: number;
    passingMarks?: number;
    isProctored?: boolean;
    allowCodeExecution?: boolean;
    shuffleQuestions?: boolean;
    createdAt?: string;
    startTime?: string;
    endTime?: string;
}

// Answer Types
export interface AnswerWithQuestionId {
    questionId: string | number;
    question: string;
    answer: string;
    marks: number;
    originalIndex: number;
    type: QuestionType;
    selectedOption?: number;
    selectedOptionText?: string;
}

// SQL Result Types
export interface SqlResult {
    columns: string[];
    rows: Record<string, any>[];
}

// Schema Types
export interface SchemaColumn {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_key?: string;
    extra?: string;
    column_default?: any;
}

export interface SchemaTable {
    table_name: string;
    columns: SchemaColumn[];
}

export interface SchemaRelationship {
    from_table: string;
    from_column: string;
    to_table: string;
    to_column: string;
    constraint_name?: string;
}

export interface SchemaData {
    schemaData: SchemaTable[];
    relationships: SchemaRelationship[];
    serverType: string;
}

// Exam File Types
export interface ExamFile {
    file_name: string;
    file_url: string;
    file_type?: string;
    file_size?: number;
    description?: string;
}

// Violation Types
export interface ViolationState {
    violations: number;
    keyViolations: number;
    tabSwitchViolations: number;
    screenChangeViolations: number;
}

// Time Tracking
export interface QuestionTimeTracking {
    [questionIndex: number]: number; // time in seconds
}

export interface CodeRunCounts {
    [questionIndex: number]: number;
}

// Saved State Types
export interface SavedExamState {
    examId: string;
    answers: string[];
    mcqAnswers: { [key: number]: number };
    activeQuestionIndex: number;
    timeLeft: number;
    lastSaved: string;
    flaggedQuestions: number[];
    questionTimeSpent: QuestionTimeTracking;
    codeRunCounts: CodeRunCounts;
}

// Component Props Types
export interface ExamHeaderProps {
    exam: Exam;
    timeLeft: number;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    lastSaved: Date | null;
    isSaving: boolean;
    timeSinceLastSave: number;
    isOnline: boolean;
}

export interface QuestionNavigationProps {
    questions: Question[];
    activeQuestionIndex: number;
    setActiveQuestionIndex: (index: number) => void;
    questionFilter: 'all' | 'coding' | 'mcq';
    setQuestionFilter: (filter: 'all' | 'coding' | 'mcq') => void;
    answers: string[];
    mcqAnswers: { [key: number]: number };
    flaggedQuestions: Set<number>;
    toggleFlag: (index: number) => void;
    answeredCount: number;
    exam: Exam;
}

export interface CodeEditorProps {
    code: string;
    setCode: (code: string) => void;
    language: string;
    editorTheme: 'light' | 'dark';
    onRun: () => void;
    running: boolean;
    output: string;
    question?: Question;
}

export interface McqQuestionProps {
    question: Question;
    questionIndex: number;
    selectedOption: number | undefined;
    onSelectOption: (optionIndex: number) => void;
}

export interface SubmitSummaryProps {
    exam: Exam;
    answers: string[];
    mcqAnswers: { [key: number]: number };
    flaggedQuestions: Set<number>;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: () => void;
    setActiveQuestionIndex: (index: number) => void;
    isQuestionAnswered: (index: number) => boolean;
}

export interface SqlEditorProps {
    code: string;
    setCode: (code: string) => void;
    editorTheme: 'light' | 'dark';
    onExecute: () => void;
    running: boolean;
    sqlResult: SqlResult | null;
    schemaData: SchemaData | null;
}

// Tracking Types
export interface ExamActionMetadata {
    questionType?: QuestionType;
    marks?: number;
    codeRunCount?: number;
    answerLength?: number;
    firstAnswer?: boolean;
    timeSpent?: number;
    questionNumber?: number;
    [key: string]: any;
}

export interface BehaviorMetadata {
    questionNumber?: number;
    timestamp?: string;
    textLength?: number;
    idleSeconds?: number;
    charsPerSecond?: number;
    totalChars?: number;
    [key: string]: any;
}

// Window Screen Info
export interface WindowScreenInfo {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
}

declare global {
    interface Window {
        initialScreenInfo?: WindowScreenInfo;
    }
}

// Filter Types
export type QuestionFilterType = 'all' | 'coding' | 'mcq';

// Theme Types
export type ThemeType = 'light' | 'dark';

// API Response Types
export interface SubmissionResponse {
    success: boolean;
    message: string;
    submissionId?: string;
}

export interface CodeExecutionResponse {
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
}

export interface SqlExecutionResponse {
    success: boolean;
    columns?: string[];
    rows?: Record<string, any>[];
    error?: string;
    executionTime?: number;
}

// Hook Return Types
export interface UseExamStateReturn {
    exam: Exam | null;
    setExam: (exam: Exam | null) => void;
    code: string;
    setCode: (code: string) => void;
    timeLeft: number;
    setTimeLeft: (time: number | ((prev: number) => number)) => void;
    isDisqualified: boolean;
    setDisqualified: (value: boolean) => void;
    examStarted: boolean;
    setExamStarted: (value: boolean) => void;
    output: string;
    setOutput: (output: string) => void;
    running: boolean;
    setRunning: (value: boolean) => void;
    answers: string[];
    setAnswers: (answers: string[] | ((prev: string[]) => string[])) => void;
    activeQuestionIndex: number;
    setActiveQuestionIndex: (index: number) => void;
    sqlResult: SqlResult | null;
    setSqlResult: (result: SqlResult | null) => void;
    shuffledQuestions: Question[];
    setShuffledQuestions: (questions: Question[]) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    loading: boolean;
    setLoading: (value: boolean) => void;
    editorTheme: ThemeType;
    setEditorTheme: (theme: ThemeType) => void;
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    mcqAnswers: { [key: number]: number };
    setMcqAnswers: (answers: { [key: number]: number } | ((prev: { [key: number]: number }) => { [key: number]: number })) => void;
    questionFilter: QuestionFilterType;
    setQuestionFilter: (filter: QuestionFilterType) => void;
    flaggedQuestions: Set<number>;
    setFlaggedQuestions: (questions: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
    showSubmitSummary: boolean;
    setShowSubmitSummary: (value: boolean) => void;
    lastSaved: Date | null;
    setLastSaved: (date: Date | null) => void;
    isSaving: boolean;
    setIsSaving: (value: boolean) => void;
    isOnline: boolean;
    setIsOnline: (value: boolean) => void;
    timeSinceLastSave: number;
    setTimeSinceLastSave: (time: number) => void;
    showTutorial: boolean;
    setShowTutorial: (value: boolean) => void;
    tutorialCompleted: boolean;
    setTutorialCompleted: (value: boolean) => void;
    questionStartTime: number;
    setQuestionStartTime: (time: number) => void;
    questionTimeSpent: QuestionTimeTracking;
    setQuestionTimeSpent: (time: QuestionTimeTracking | ((prev: QuestionTimeTracking) => QuestionTimeTracking)) => void;
    codeRunCounts: CodeRunCounts;
    setCodeRunCounts: (counts: CodeRunCounts | ((prev: CodeRunCounts) => CodeRunCounts)) => void;
    examFiles: ExamFile[];
    setExamFiles: (files: ExamFile[]) => void;
    schemaData: SchemaData | null;
    setSchemaData: (data: SchemaData | null) => void;
    showErDiagram: boolean;
    setShowErDiagram: (value: boolean) => void;
    selectedTable: string | null;
    setSelectedTable: (table: string | null) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isSubmitting: boolean;
    setIsSubmitting: (value: boolean) => void;
}

export interface UseExamViolationsReturn {
    violations: number;
    setViolations: (count: number) => void;
    keyViolations: number;
    setKeyViolations: (count: number) => void;
    tabSwitchViolations: number;
    setTabSwitchViolations: (count: number) => void;
    screenChangeViolations: number;
    setScreenChangeViolations: (count: number) => void;
    lastTabSwitchTime: string;
    setLastTabSwitchTime: (time: string) => void;
    lastScreenChangeTime: string;
    setLastScreenChangeTime: (time: string) => void;
    isTabVisible: boolean;
    setIsTabVisible: (value: boolean) => void;
    violationsRef: React.MutableRefObject<number>;
    keyViolationsRef: React.MutableRefObject<number>;
    tabSwitchViolationsRef: React.MutableRefObject<number>;
    screenChangeViolationsRef: React.MutableRefObject<number>;
    lastVisibilityChangeRef: React.MutableRefObject<number>;
    visibilityTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
    handleContextMenuRef: React.MutableRefObject<((e: any) => void) | null>;
    handleKeyDownRef: React.MutableRefObject<((e: any) => void) | null>;
    handleBlurRef: React.MutableRefObject<((e: any) => void) | null>;
    handleFsChangeRef: React.MutableRefObject<((e: any) => void) | null>;
    handleVisibilityChangeRef: React.MutableRefObject<((e: any) => void) | null>;
    hasSubmittedRef: React.MutableRefObject<boolean>;
}

// Utility Types
export type EditorLanguage = 'python' | 'javascript' | 'java' | 'cpp' | 'sql' | 'typescript' | 'c' | 'csharp';

export interface FormatTimeResult {
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
}