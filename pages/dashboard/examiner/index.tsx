import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import ExaminerLayout from "./ExaminerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Clock,
    FileText,
    Users,
    Calendar,
    Settings,
    CheckCircle,
    ArrowLeft,
    ArrowRight,
    Plus,
    Trash2,
    RefreshCw,
    Code,
    Timer,
    Shield,
    Info,
    Loader2
} from "lucide-react";

interface QuestionOption {
    id: number;
    text: string;
    isCorrect: boolean;
}

interface Question {
    solution: any;
    id: string;
    question: string;
    expectedOutput?: string;
    answer?: string;
    difficulty?: string;
    marks?: number;
    type?: string;
    options?: QuestionOption[];
    correctAnswer?: number;
}

export default function ExaminerDashboard() {
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("python");
    const [duration, setDuration] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { data: session } = useSession();
    const [questions, setQuestions] = useState<Question[]>([
        {
            id: "q1", question: "", expectedOutput: "", difficulty: undefined, marks: undefined,
            solution: undefined
        }
    ]);
    const router = useRouter();
    const [uploadedQuestions, setUploadedQuestions] = useState<any[]>([]);
    const [questionConfig, setQuestionConfig] = useState({
        beginner: { count: 0, marks: 0 },
        intermediate: { count: 0, marks: 0 },
        hard: { count: 0, marks: 0 }
    });
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [useExcelQuestions, setUseExcelQuestions] = useState(false);
    const [isExamProctored, setIsExamProctored] = useState(false);

    const [allowedUsersRaw, setAllowedUsersRaw] = useState("");
    const [currentStep, setCurrentStep] = useState(1);

    const [beginnerCount, setBeginnerCount] = useState(0);
    const [intermediateCount, setIntermediateCount] = useState(0);
    const [expertCount, setExpertCount] = useState(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
    const [availableBatches, setAvaileBatches] = useState<any[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    const [batchTimes, setBatchTimes] = useState<{ [key: string]: { startTime: string, endTime: string } }>({});

    const [assignmentType, setAssignmentType] = useState<'batch' | 'users'>('batch');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');

    const [sqlServerType, setSqlServerType] = useState<'ssms' | 'postgres' | ''>('');
    const [sqlCredentials, setSqlCredentials] = useState({
        host: '',
        port: '',
        username: '',
        password: '',
        database: ''
    });
    const [savedCredentialId, setSavedCredentialId] = useState<string | null>(null);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'success' | 'failed' | null>(null);

    const [requiresFileHandling, setRequiresFileHandling] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [fileUploadError, setFileUploadError] = useState('');

    const [mcqBeginnerCount, setMcqBeginnerCount] = useState(0);
    const [mcqIntermediateCount, setMcqIntermediateCount] = useState(0);
    const [mcqExpertCount, setMcqExpertCount] = useState(0);

    const [existingCredentials, setExistingCredentials] = useState<any[]>([]);
    const [loadingCredentials, setLoadingCredentials] = useState(false);
    const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
    const [showNewCredentialForm, setShowNewCredentialForm] = useState(false);

    const resetForm = () => {
        setTitle("");
        setLanguage("python");
        setDuration(10);
        setIsExamProctored(false);
        setQuestions([{
            id: "q1",
            question: "",
            expectedOutput: "",
            difficulty: undefined,
            marks: undefined,
            solution: undefined
        }]);
        setUploadedQuestions([]);
        setUseExcelQuestions(false);
        setGeneratedQuestions([]);
        setQuestionConfig({
            beginner: { count: 0, marks: 0 },
            intermediate: { count: 0, marks: 0 },
            hard: { count: 0, marks: 0 }
        });
        setMcqBeginnerCount(0);
        setMcqIntermediateCount(0);
        setMcqExpertCount(0);
        setSelectedBatches([]);
        setAvaileBatches([]);
        setBatchTimes({});
        setSqlServerType('');
        setSqlCredentials({
            host: '',
            port: '',
            username: '',
            password: '',
            database: ''
        });
        setConnectionStatus(null);
        setSavedCredentialId(null);
        setRequiresFileHandling(false);
        setUploadedFiles([]);
        setFileUploadError('');
        setSelectedCredentialId('');
        setShowNewCredentialForm(false);
        setExistingCredentials([]);

        setAssignmentType('batch');
        setSelectedUsers([]);
        setAvailableUsers([]);
        setUserSearchQuery('');
    };

    const testSqlConnection = async () => {
        setTestingConnection(true);
        setConnectionStatus(null);

        try {
            const response = await fetch('/api/sql/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverType: sqlServerType,
                    credentials: sqlCredentials,
                    saveCredentials: showNewCredentialForm,
                    examTitle: title,
                    createdBy: session?.user?.email
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setConnectionStatus('success');
                if (showNewCredentialForm && data.credentialId) {
                    setSavedCredentialId(data.credentialId);
                    toast.success('Connection successful and credentials saved!');
                } else {
                    toast.success('Connection successful!');
                }
            } else {
                setConnectionStatus('failed');
                toast.error(data.message || 'Connection failed');
            }
        } catch (error) {
            setConnectionStatus('failed');
            toast.error('Failed to test connection');
        } finally {
            setTestingConnection(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const excelFiles = Array.from(files).filter(file =>
            file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
        );

        if (excelFiles.length === 0) {
            setFileUploadError('Please upload only Excel (.xlsx, .xls) or CSV files');
            return;
        }

        setFileUploadError('');
        setUploadedFiles(prev => [...prev, ...excelFiles]);
    };

    const uploadFilesToStorage = async (files: File[]): Promise<string[]> => {
        const uploadedUrls: string[] = [];
        const examId = title.toLowerCase().replace(/\s+/g, "-");

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('examId', examId);

            try {
                toast.loading(`Uploading ${file.name} (${i + 1}/${files.length})...`, {
                    id: 'file-upload'
                });

                const response = await fetch('/api/upload-exam-file', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('File upload failed');

                const data = await response.json();
                uploadedUrls.push(data.fileUrl);

                toast.success(`${file.name} uploaded`, { id: 'file-upload' });
            } catch (error) {
                console.error('Error uploading file:', error);
                toast.error(`Failed to upload ${file.name}`, { id: 'file-upload' });
                throw error;
            }
        }

        return uploadedUrls;
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    interface BatchTimes {
        [key: string]: {
            startTime: string;
            endTime: string;
        };
    }

    interface ExamData {
        examId: string;
        title: string;
        language: string;
        sqlServerType?: string;
        sqlCredentialId?: string;
        duration: number;
        createdBy: string | undefined;
        questions: Question[];
        isExamProctored: boolean;
        useExcelQuestions: boolean;
        questionConfig: typeof questionConfig;
        allowedUsers: string[];
        batchSchedules: {
            batchId: string;
            startTime: string;
            endTime: string;
        }[];
        requiresFileHandling?: boolean;
        assignmentType?: 'batch' | 'users';
        selectedUserEmails?: string[];
    }

    const handleCreateExam = useCallback(
        async (batchTimes: BatchTimes): Promise<void> => {
            const validQuestions: Question[] = questions.filter(
                (q) => q.question && q.question.trim() !== ""
            );

            if (!title || !title.trim()) {
                toast.error("Exam title is required.");
                return;
            }

            if (validQuestions.length === 0) {
                toast.error("Please add at least one question or generate questions from Excel.");
                return;
            }

            setIsLoading(true);

            const incompleteBatchSchedules: string[] = selectedBatches.filter((batchId) => {
                const times = batchTimes[batchId];
                return !times?.startTime || !times?.endTime;
            });

            if (incompleteBatchSchedules.length > 0) {
                const batchNames = incompleteBatchSchedules
                    .map((batchId) => {
                        const batch = availableBatches.find((b) => b.Id === batchId);
                        return batch?.Name || batchId;
                    })
                    .join(", ");

                toast.error(`Please set start and end times for: ${batchNames}`);
                setIsLoading(false);
                return;
            }

            try {
                const examId: string = title.toLowerCase().replace(/\s+/g, "-");

                let uploadedFileUrls: string[] = [];
                let examFilesData: { name: string; url: string; size: number }[] = [];

                if (requiresFileHandling && uploadedFiles.length > 0) {
                    try {
                        uploadedFileUrls = await uploadFilesToStorage(uploadedFiles);
                        examFilesData = uploadedFileUrls.map((url, index) => ({
                            name: uploadedFiles[index].name,
                            url: url,
                            size: uploadedFiles[index].size
                        }));
                        toast.success('Files uploaded successfully');
                    } catch (error) {
                        toast.error('Failed to upload files. Please try again.');
                        setIsLoading(false);
                        return;
                    }
                }

                const examData: ExamData = {
                    examId,
                    title,
                    language,
                    ...(language === 'sql' && {
                        sqlServerType,
                        sqlCredentialId: (selectedCredentialId || savedCredentialId) ?? undefined
                    }),
                    requiresFileHandling,
                    duration,
                    createdBy: session?.user?.email ?? undefined,
                    questions: validQuestions,
                    isExamProctored,
                    useExcelQuestions,
                    questionConfig,
                    allowedUsers: allowedUsersRaw
                        .split(",")
                        .map((email) => email.trim())
                        .filter(Boolean),
                    assignmentType,
                    selectedUserEmails: assignmentType === 'users' ? selectedUsers : [],
                    batchSchedules: selectedBatches.map((batchId) => ({
                        batchId,
                        startTime: batchTimes[batchId]?.startTime || "",
                        endTime: batchTimes[batchId]?.endTime || "",
                    })),
                };

                try {
                    const response: Response = await fetch("/api/assessment/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(examData),
                    });

                    if (response.status === 409) {
                        toast.error("An exam with this title already exists. Please choose a different title.");
                        setIsLoading(false);
                        return;
                    }

                    if (!response.ok) throw new Error("Failed to create exam");

                    if (examFilesData.length > 0) {
                        try {
                            const fileResponse = await fetch('/api/exam-files/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    examId: examId,
                                    files: examFilesData
                                })
                            });

                            if (!fileResponse.ok) {
                                console.error('Failed to save file references to database');
                                toast.error('Exam created but failed to save file references');
                            } else {
                                toast.success('Exam created with files successfully!');
                            }
                        } catch (fileError) {
                            console.error('Error saving file references:', fileError);
                            toast.error('Exam created but failed to save file references');
                        }
                    }

                    setShowSuccess(true);
                    setTimeout(() => {
                        setShowSuccess(false);
                        resetForm();
                    }, 2000);

                } catch (error) {
                    console.error("Error saving exam data:", error);
                    toast.error("Failed to save exam data. Please try again.");
                    setIsLoading(false);
                    return;
                }

            } catch (error) {
                console.error("Error creating exam:", error);
                toast.error("Error creating exam. Please try again.");
            } finally {
                setIsLoading(false);
                setCurrentStep(1);
            }
        },
        [
            title,
            questions,
            language,
            duration,
            session,
            selectedBatches,
            availableBatches,
            isExamProctored,
            useExcelQuestions,
            questionConfig,
            allowedUsersRaw,
            resetForm,
            requiresFileHandling,
            uploadedFiles,
            sqlServerType,
            savedCredentialId,
            selectedCredentialId,
            showNewCredentialForm,
            assignmentType,
            selectedUsers,
        ]
    );

    const fetchAvailableUsers = async () => {
        setLoadingUsers(true);
        try {
            const [employeesRes, externalUsersRes] = await Promise.all([
                fetch('/api/admin/employee'),
                fetch('/api/admin/external-users')
            ]);

            if (employeesRes.ok && externalUsersRes.ok) {
                const employees = await employeesRes.json();
                const externalUsers = await externalUsersRes.json();

                const allUsers = [
                    ...employees.map((emp: any) => ({
                        id: emp.Id || emp.id,
                        email: emp.Email || emp.email,
                        name: emp.Name || emp.name,
                        type: 'employee'
                    })),
                    ...externalUsers.map((user: any) => ({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        type: 'external'
                    }))
                ];

                setAvailableUsers(allUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    };

    const languageOptions = [
        { value: "python", label: "Python", icon: "🐍" },
        { value: "sql", label: "SQL", icon: "🗄️" },
    ];

    const isFormValid = title.trim() !== "" && questions.some(q =>
        q &&
        typeof q.question === 'string' &&
        q.question.trim() !== ""
    );

    const fetchQuestions = async (): Promise<void> => {
        const codingTotal = beginnerCount + intermediateCount + expertCount;
        const mcqTotal = mcqBeginnerCount + mcqIntermediateCount + mcqExpertCount;

        if (codingTotal === 0 && mcqTotal === 0) {
            setError('Please select at least one question');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let allFetchedQuestions: Question[] = [];

            if (codingTotal > 0) {
                const codingRes = await fetch(`/api/questions?language=${language}&questionType=coding`);
                if (!codingRes.ok) throw new Error(`Failed to fetch coding questions`);

                const codingQuestions: any[] = await codingRes.json();

                const codingBeginner = codingQuestions
                    .filter((q) => q.difficulty?.toLowerCase() === "easy")
                    .slice(0, beginnerCount);

                const codingIntermediate = codingQuestions
                    .filter((q) => q.difficulty?.toLowerCase() === "medium")
                    .slice(0, intermediateCount);

                const codingExpert = codingQuestions
                    .filter((q) => q.difficulty?.toLowerCase() === "hard")
                    .slice(0, expertCount);

                const selectedCoding = [...codingBeginner, ...codingIntermediate, ...codingExpert];

                const mappedCoding: Question[] = selectedCoding.map((q, index) => ({
                    id: `coding-q${index + 1}`,
                    question: q.questionText ?? q.question,
                    expectedOutput: q.expectedOutput ? q.expectedOutput.toString().trim() : '',
                    difficulty: q.difficulty,
                    marks: q.marks,
                    solution: q.solution !== undefined ? q.solution : undefined,
                    type: 'coding',
                    options: [],
                    correctAnswer: undefined
                }));

                allFetchedQuestions = [...allFetchedQuestions, ...mappedCoding];
            }

            if (mcqTotal > 0) {
                const mcqRes = await fetch(`/api/questions?language=${language}&questionType=mcq`);
                if (!mcqRes.ok) throw new Error(`Failed to fetch MCQ questions`);

                const mcqQuestions: any[] = await mcqRes.json();

                const mcqBeginner = mcqQuestions
                    .filter((q) => q.difficulty?.toLowerCase() === "easy")
                    .slice(0, mcqBeginnerCount);

                const mcqIntermediate = mcqQuestions
                    .filter((q) => q.difficulty?.toLowerCase() === "medium")
                    .slice(0, mcqIntermediateCount);

                const mcqExpert = mcqQuestions
                    .filter((q) => q.difficulty?.toLowerCase() === "hard")
                    .slice(0, mcqExpertCount);

                const selectedMcq = [...mcqBeginner, ...mcqIntermediate, ...mcqExpert];

                const mappedMcq: Question[] = selectedMcq.map((q, index) => ({
                    id: `mcq-q${allFetchedQuestions.length + index + 1}`,
                    question: q.questionText ?? q.question,
                    expectedOutput: undefined,
                    difficulty: q.difficulty,
                    marks: q.marks,
                    solution: q.solution !== undefined ? q.solution : undefined,
                    type: 'mcq',
                    options: Array.isArray(q.options) && q.options.length > 0 ? q.options.map((opt: any) => ({
                        id: opt.id,
                        text: opt.text || opt.optionText,
                        isCorrect: opt.isCorrect
                    })) : [],
                    correctAnswer: Array.isArray(q.options) ? q.options.findIndex((opt: any) => opt.isCorrect === true) : undefined
                }));
                allFetchedQuestions = [...allFetchedQuestions, ...mappedMcq];
            }

            setQuestions(allFetchedQuestions);
            toast.success(`Fetched ${allFetchedQuestions.length} questions successfully`);

        } catch (err) {
            console.error('Error fetching questions:', err);
            if (err instanceof Error) {
                setError(`Failed to fetch questions: ${err.message}`);
            } else {
                setError('Failed to fetch questions: Unknown error');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableBatches = async () => {
        setLoadingBatches(true);
        try {
            const response = await fetch('/api/admin/batch');
            if (response.ok) {
                const batches = await response.json();
                setAvaileBatches(batches);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            toast.error('Failed to load batches');
        } finally {
            setLoadingBatches(false);
        }
    };

    const fetchExistingCredentials = async () => {
        setLoadingCredentials(true);
        try {
            const response = await fetch(`/api/sql/list-credentials?createdBy=${session?.user?.email}`);
            if (response.ok) {
                const data = await response.json();
                setExistingCredentials(data.credentials);
            }
        } catch (error) {
            console.error('Error fetching credentials:', error);
            toast.error('Failed to load credentials');
        } finally {
            setLoadingCredentials(false);
        }
    };

    const clearQuestions = () => {
        setQuestions([]);
        setError('');
    };

    const resetCounts = () => {
        setBeginnerCount(0);
        setIntermediateCount(0);
        setExpertCount(0);
        setMcqBeginnerCount(0);
        setMcqIntermediateCount(0);
        setMcqExpertCount(0);
        setError('');
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900';
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900';
            case 'hard': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900';
            default: return 'bg-secondary text-secondary-foreground border-border';
        }
    };

    const steps = [
        { number: 1, title: 'Basic Info', icon: Info },
        { number: 2, title: 'Questions', icon: FileText },
        { number: 3, title: 'Assign Batch', icon: Users },
        { number: 4, title: 'Review', icon: CheckCircle }
    ];

    const deleteQuestion = (questionId: string) => {
        setQuestions(prevQuestions =>
            prevQuestions.filter(q => q.id !== questionId)
        );
    };

    return (
        <ExaminerLayout>
            <Head>
                <title>SysRank - Create Exam</title>
                <link rel="icon" href="/logo.png" />
            </Head>

            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Create New Exam</h1>
                    <p className="text-muted-foreground">
                        Design comprehensive assessments with our intuitive builder
                    </p>
                </div>

                {/* Progress Steps */}
                <Card className="border-border">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.number;
                                const isCompleted = currentStep > step.number;

                                return (
                                    <div key={step.number} className="flex items-center flex-1">
                                        <div className={`flex items-center gap-2 ${index < steps.length - 1 ? 'w-full' : ''}`}>
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${isActive
                                                ? 'bg-primary border-primary text-primary-foreground'
                                                : isCompleted
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-background border-border text-muted-foreground'
                                                }`}>
                                                {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>
                                            <span className={`text-sm font-medium hidden md:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                {step.title}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`h-0.5 flex-1 mx-2 transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-border'
                                                }`}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <Progress value={(currentStep / steps.length) * 100} className="h-1" />
                    </CardContent>
                </Card>

                {/* Main Content Card */}
                <Card className="border-border">
                    <CardContent className="p-6">
                        {/* Step 1: Basic Information */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Basic Information</h2>
                                    <p className="text-sm text-muted-foreground">Set up your exam details and configuration</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Exam Title *</Label>
                                        <Input
                                            id="title"
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., Python Programming Assessment"
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="language">Programming Language</Label>
                                        <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {languageOptions.map((lang) => (
                                                    <SelectItem key={lang.value} value={lang.value}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{lang.icon}</span>
                                                            <span>{lang.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (minutes)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min={1}
                                            max={300}
                                            value={duration}
                                            onChange={(e) => setDuration(Number(e.target.value))}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Exam Proctoring</Label>
                                        <div className="flex items-center justify-between h-10 px-3 border border-border rounded-md">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">{isExamProctored ? 'Proctored' : 'Non-Proctored'}</span>
                                            </div>
                                            <Switch
                                                checked={isExamProctored}
                                                onCheckedChange={setIsExamProctored}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    {language === 'python' && (
                                        <>
                                            <div className="md:col-span-2 space-y-2">
                                                <Label>File Handling Required</Label>
                                                <div className="flex items-center justify-between h-10 px-3 border border-border rounded-md">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm">{requiresFileHandling ? 'Enabled' : 'Disabled'}</span>
                                                    </div>
                                                    <Switch
                                                        checked={requiresFileHandling}
                                                        onCheckedChange={setRequiresFileHandling}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>

                                            {requiresFileHandling && (
                                                <div className="md:col-span-2 space-y-4">
                                                    <Card className="border-primary/20">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Upload Excel/CSV Files</CardTitle>
                                                            <CardDescription>
                                                                Upload files that will be provided to students during the exam
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="space-y-4">
                                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                    <Plus className="w-8 h-8 mb-2 text-muted-foreground" />
                                                                    <p className="mb-2 text-sm text-muted-foreground">
                                                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">Excel (.xlsx, .xls) or CSV files</p>
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept=".xlsx,.xls,.csv"
                                                                    multiple
                                                                    onChange={handleFileUpload}
                                                                />
                                                            </label>

                                                            {fileUploadError && (
                                                                <Alert variant="destructive">
                                                                    <AlertDescription>{fileUploadError}</AlertDescription>
                                                                </Alert>
                                                            )}

                                                            {uploadedFiles.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <Label className="text-sm">Uploaded Files ({uploadedFiles.length})</Label>
                                                                    <div className="space-y-2">
                                                                        {uploadedFiles.map((file, index) => (
                                                                            <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                                                                                <div className="flex items-center gap-3">
                                                                                    <FileText className="w-4 h-4 text-primary" />
                                                                                    <div>
                                                                                        <p className="text-sm font-medium">{file.name}</p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            {(file.size / 1024).toFixed(2)} KB
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => removeFile(index)}
                                                                                    className="text-destructive hover:text-destructive"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {language === 'sql' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="sqlServerType">SQL Server Type *</Label>
                                                <Select value={sqlServerType} onValueChange={(value) => {
                                                    setSqlServerType(value as 'ssms' | 'postgres' | '');
                                                    if (value) {
                                                        fetchExistingCredentials();
                                                    }
                                                }} disabled={isLoading}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select SQL Server" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ssms">
                                                            <div className="flex items-center gap-2">
                                                                <span>🗄️</span>
                                                                <span>SQL Server (SSMS)</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="postgres">
                                                            <div className="flex items-center gap-2">
                                                                <span>🐘</span>
                                                                <span>PostgreSQL</span>
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {sqlServerType && (
                                                <div className="md:col-span-2 space-y-4">
                                                    <Card className="border-primary/20">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Database Connection Settings</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <Label>Choose Credential</Label>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setShowNewCredentialForm(!showNewCredentialForm);
                                                                        setSelectedCredentialId('');
                                                                    }}
                                                                >
                                                                    {showNewCredentialForm ? 'Use Existing' : 'Create New'}
                                                                </Button>
                                                            </div>

                                                            {!showNewCredentialForm && (
                                                                <Select
                                                                    value={selectedCredentialId}
                                                                    onValueChange={(value) => {
                                                                        setSelectedCredentialId(value);
                                                                        const selected = existingCredentials.find(c => c.id === value);
                                                                        if (selected) {
                                                                            setSqlCredentials({
                                                                                host: selected.host,
                                                                                port: selected.port.toString(),
                                                                                username: selected.username,
                                                                                password: '********',
                                                                                database: selected.database
                                                                            });
                                                                            setSqlServerType(selected.serverType);
                                                                            setSavedCredentialId(value);
                                                                            setConnectionStatus('success');
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select existing credential" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {loadingCredentials ? (
                                                                            <SelectItem value="loading" disabled>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                                    Loading...
                                                                                </div>
                                                                            </SelectItem>
                                                                        ) : existingCredentials.length === 0 ? (
                                                                            <SelectItem value="none" disabled>No credentials found</SelectItem>
                                                                        ) : (
                                                                            existingCredentials
                                                                                .filter(c => c.serverType === sqlServerType)
                                                                                .map((credential) => (
                                                                                    <SelectItem key={credential.id} value={credential.id}>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-medium">{credential.examTitle || 'Unnamed'}</span>
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                {credential.host}:{credential.port} - {credential.database}
                                                                                            </span>
                                                                                        </div>
                                                                                    </SelectItem>
                                                                                ))
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}

                                                            {showNewCredentialForm && (
                                                                <div className="space-y-4">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="host">Host/Server *</Label>
                                                                            <Input
                                                                                id="host"
                                                                                value={sqlCredentials.host}
                                                                                onChange={(e) => setSqlCredentials(prev => ({ ...prev, host: e.target.value }))}
                                                                                placeholder="localhost"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="port">Port *</Label>
                                                                            <Input
                                                                                id="port"
                                                                                value={sqlCredentials.port}
                                                                                onChange={(e) => setSqlCredentials(prev => ({ ...prev, port: e.target.value }))}
                                                                                placeholder={sqlServerType === 'postgres' ? '5432' : '1433'}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="database">Database Name *</Label>
                                                                        <Input
                                                                            id="database"
                                                                            value={sqlCredentials.database}
                                                                            onChange={(e) => setSqlCredentials(prev => ({ ...prev, database: e.target.value }))}
                                                                            placeholder="database_name"
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="username">Username *</Label>
                                                                            <Input
                                                                                id="username"
                                                                                value={sqlCredentials.username}
                                                                                onChange={(e) => setSqlCredentials(prev => ({ ...prev, username: e.target.value }))}
                                                                                placeholder="username"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="password">Password *</Label>
                                                                            <Input
                                                                                id="password"
                                                                                type="password"
                                                                                value={sqlCredentials.password}
                                                                                onChange={(e) => setSqlCredentials(prev => ({ ...prev, password: e.target.value }))}
                                                                                placeholder="••••••••"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        onClick={testSqlConnection}
                                                                        disabled={testingConnection || !sqlCredentials.host || !sqlCredentials.port || !sqlCredentials.username || !sqlCredentials.password || !sqlCredentials.database}
                                                                        className="w-full"
                                                                        variant={connectionStatus === 'success' ? 'default' : 'outline'}
                                                                    >
                                                                        {testingConnection ? (
                                                                            <>
                                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                Testing Connection...
                                                                            </>
                                                                        ) : connectionStatus === 'success' ? (
                                                                            <>
                                                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                                                Connection Successful
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                                                Test Connection
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                    {connectionStatus === 'failed' && (
                                                                        <Alert variant="destructive">
                                                                            <AlertDescription>
                                                                                Connection failed. Please check your credentials and try again.
                                                                            </AlertDescription>
                                                                        </Alert>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {selectedCredentialId && !showNewCredentialForm && (
                                                                <Alert>
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    <AlertDescription>
                                                                        Using existing credential: {existingCredentials.find(c => c.id === selectedCredentialId)?.examTitle}
                                                                    </AlertDescription>
                                                                </Alert>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={() => setCurrentStep(2)}
                                        disabled={
                                            !title.trim() ||
                                            (language === 'sql' && (
                                                !sqlServerType ||
                                                (!selectedCredentialId && !savedCredentialId)
                                            )) ||
                                            (language === 'python' && requiresFileHandling && uploadedFiles.length === 0)
                                        }
                                    >
                                        Next: Questions
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Questions */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Exam Questions</h2>
                                    <p className="text-sm text-muted-foreground">Configure your question selection from the question bank</p>
                                </div>

                                <div className="space-y-4">
                                    <Card className="border-blue-200 dark:border-blue-800">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                                <Code className="w-4 h-4" />
                                                Coding Questions
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Easy</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={beginnerCount}
                                                        onChange={(e) => setBeginnerCount(Number(e.target.value))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Medium</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={intermediateCount}
                                                        onChange={(e) => setIntermediateCount(Number(e.target.value))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Hard</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={expertCount}
                                                        onChange={(e) => setExpertCount(Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-purple-200 dark:border-purple-800">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                MCQ Questions
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Easy</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={mcqBeginnerCount}
                                                        onChange={(e) => setMcqBeginnerCount(Number(e.target.value))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Medium</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={mcqIntermediateCount}
                                                        onChange={(e) => setMcqIntermediateCount(Number(e.target.value))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Hard</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={mcqExpertCount}
                                                        onChange={(e) => setMcqExpertCount(Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        onClick={fetchQuestions}
                                        disabled={loading}
                                        className="flex-1 min-w-[200px]"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Fetching Questions...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-4 h-4 mr-2" />
                                                Fetch Questions
                                            </>
                                        )}
                                    </Button>

                                    <Button variant="outline" onClick={resetCounts}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Reset
                                    </Button>

                                    {questions.length > 0 && (
                                        <Button variant="destructive" onClick={clearQuestions}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Clear
                                        </Button>
                                    )}
                                </div>

                                {(beginnerCount + intermediateCount + expertCount + mcqBeginnerCount + mcqIntermediateCount + mcqExpertCount > 0) && (
                                    <Alert>
                                        <Info className="w-4 h-4" />
                                        <AlertDescription>
                                            <p className="font-medium">Total: {beginnerCount + intermediateCount + expertCount + mcqBeginnerCount + mcqIntermediateCount + mcqExpertCount} questions</p>
                                            <p className="text-sm mt-1">
                                                Coding: {beginnerCount + intermediateCount + expertCount} | MCQ: {mcqBeginnerCount + mcqIntermediateCount + mcqExpertCount}
                                            </p>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {questions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Fetched Questions ({questions.length})</CardTitle>
                                            <CardDescription>Language: {language}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {questions.map((q, index) => (
                                                <Card key={q.id || index} className="bg-muted/30">
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={getDifficultyColor(q.difficulty || '')}>
                                                                    {q.difficulty}
                                                                </Badge>
                                                                <Badge variant="outline" className="capitalize">
                                                                    {q.type === 'mcq' ? 'MCQ' : 'Coding'}
                                                                </Badge>
                                                                {q.marks && <Badge variant="secondary">{q.marks} marks</Badge>}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => deleteQuestion(q.id)}
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3">
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Question:</Label>
                                                            <div
                                                                className="text-sm p-3 bg-background rounded-md border border-border"
                                                                dangerouslySetInnerHTML={{ __html: q.question || 'No question text' }}
                                                            />
                                                        </div>

                                                        {q.type === 'mcq' && q.options && q.options.length > 0 && (
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground mb-1 block">Options:</Label>
                                                                <div className="space-y-2">
                                                                    {q.options.map((option: QuestionOption, optIndex: number) => (
                                                                        <div
                                                                            key={option.id || optIndex}
                                                                            className={`p-2 rounded-md text-sm flex items-center gap-2 ${option.isCorrect
                                                                                ? 'bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900'
                                                                                : 'bg-background border border-border'
                                                                                }`}
                                                                        >
                                                                            <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                                                            <span>{option.text}</span>
                                                                            {option.isCorrect && (
                                                                                <Badge className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-xs">Correct</Badge>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {q.expectedOutput && (
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground mb-1 block">Expected Output:</Label>
                                                                <code className="text-sm p-3 bg-background rounded-md border border-border block font-mono">
                                                                    {q.expectedOutput}
                                                                </code>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => setCurrentStep(3)}
                                        disabled={!questions.some(q => q.question?.trim())}
                                    >
                                        Next: Assign Batch
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Batch Assignment */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Assign to Batches</h2>
                                    <p className="text-sm text-muted-foreground">Select which batches can access this exam</p>
                                </div>

                                {/* Assignment Type Selector */}
                                <Card className="border-primary/20">
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => {
                                                    setAssignmentType('batch');
                                                    setSelectedUsers([]);
                                                }}
                                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${assignmentType === 'batch'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                <Users className="w-6 h-6 mx-auto mb-2" />
                                                <p className="font-semibold">Assign to Batches</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Assign exam to entire batches
                                                </p>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setAssignmentType('users');
                                                    setSelectedBatches([]);
                                                    setBatchTimes({});
                                                    if (availableUsers.length === 0) {
                                                        fetchAvailableUsers();
                                                    }
                                                }}
                                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${assignmentType === 'users'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                <Users className="w-6 h-6 mx-auto mb-2" />
                                                <p className="font-semibold">Select Individual Users</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Choose specific users
                                                </p>
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {assignmentType === 'batch' && (
                                    <div className="space-y-4">
                                        {availableBatches.length === 0 && (
                                            <div className="text-center py-8">
                                                <Button
                                                    onClick={fetchAvailableBatches}
                                                    disabled={loadingBatches}
                                                >
                                                    {loadingBatches ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Loading Batches...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Users className="w-4 h-4 mr-2" />
                                                            Load Available Batches
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}

                                        {availableBatches.length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-muted-foreground">
                                                        {availableBatches.length} batches available
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedBatches(availableBatches.map(b => b.Id));
                                                                const newTimes: { [key: string]: { startTime: string, endTime: string } } = {};
                                                                availableBatches.forEach(batch => {
                                                                    newTimes[batch.Id] = { startTime: '', endTime: '' };
                                                                });
                                                                setBatchTimes(newTimes);
                                                            }}
                                                        >
                                                            Select All
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedBatches([]);
                                                                setBatchTimes({});
                                                            }}
                                                        >
                                                            Clear All
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {availableBatches.map((batch) => (
                                                        <Card
                                                            key={batch.Id}
                                                            className={`transition-all ${selectedBatches.includes(batch.Id)
                                                                ? 'ring-2 ring-primary bg-primary/5'
                                                                : ''
                                                                }`}
                                                        >
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start justify-between mb-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div
                                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${selectedBatches.includes(batch.Id)
                                                                                ? 'bg-primary border-primary'
                                                                                : 'border-muted-foreground'
                                                                                }`}
                                                                            onClick={() => {
                                                                                setSelectedBatches(prev =>
                                                                                    prev.includes(batch.Id)
                                                                                        ? prev.filter(id => id !== batch.Id)
                                                                                        : [...prev, batch.Id]
                                                                                );
                                                                                if (!selectedBatches.includes(batch.Id)) {
                                                                                    setBatchTimes(prev => ({
                                                                                        ...prev,
                                                                                        [batch.Id]: { startTime: '', endTime: '' }
                                                                                    }));
                                                                                } else {
                                                                                    setBatchTimes(prev => {
                                                                                        const { [batch.Id]: removed, ...rest } = prev;
                                                                                        return rest;
                                                                                    });
                                                                                }
                                                                            }}
                                                                        >
                                                                            {selectedBatches.includes(batch.Id) && (
                                                                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="font-semibold text-sm">{batch.Name}</h3>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {batch.EmployeeCount || 0} Employees
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {selectedBatches.includes(batch.Id) && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs flex items-center gap-2">
                                                                                <Calendar className="w-3 h-3" />
                                                                                Start Time *
                                                                            </Label>
                                                                            <Input
                                                                                type="datetime-local"
                                                                                value={batchTimes[batch.Id]?.startTime || ''}
                                                                                onChange={(e) => {
                                                                                    setBatchTimes(prev => ({
                                                                                        ...prev,
                                                                                        [batch.Id]: {
                                                                                            ...prev[batch.Id],
                                                                                            startTime: e.target.value
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs flex items-center gap-2">
                                                                                <Clock className="w-3 h-3" />
                                                                                End Time *
                                                                            </Label>
                                                                            <Input
                                                                                type="datetime-local"
                                                                                value={batchTimes[batch.Id]?.endTime || ''}
                                                                                onChange={(e) => {
                                                                                    setBatchTimes(prev => ({
                                                                                        ...prev,
                                                                                        [batch.Id]: {
                                                                                            ...prev[batch.Id],
                                                                                            endTime: e.target.value
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>

                                                {selectedBatches.length > 0 && (
                                                    <Alert>
                                                        <CheckCircle className="w-4 h-4" />
                                                        <AlertDescription>
                                                            <p className="font-medium mb-2">Selected: {selectedBatches.length} batches</p>
                                                            <div className="text-xs space-y-1">
                                                                {selectedBatches.map(batchId => {
                                                                    const batch = availableBatches.find(b => b.Id === batchId);
                                                                    const times = batchTimes[batchId];
                                                                    return (
                                                                        <div key={batchId} className="flex items-center justify-between">
                                                                            <span>{batch?.Name}</span>
                                                                            <span className="text-muted-foreground">
                                                                                {times?.startTime && times?.endTime ? '✓ Scheduled' : '⚠ Times needed'}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {assignmentType === 'users' && (
                                    <div className="space-y-4">
                                        {loadingUsers ? (
                                            <div className="text-center py-8">
                                                <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                                                <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3">
                                                    <Input
                                                        placeholder="Search users by name or email..."
                                                        value={userSearchQuery}
                                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                                        className="w-full"
                                                    />

                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm text-muted-foreground">
                                                            {availableUsers.filter(user =>
                                                                user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                                user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                                            ).length} users available
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSelectedUsers(availableUsers.map(u => u.email))}
                                                            >
                                                                Select All
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSelectedUsers([])}
                                                            >
                                                                Clear All
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border border-border rounded-lg max-h-[400px] overflow-y-auto">
                                                    <div className="space-y-2 p-4">
                                                        {availableUsers
                                                            .filter(user =>
                                                                user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                                user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                                            )
                                                            .map((user) => (
                                                                <div
                                                                    key={user.email}
                                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedUsers.includes(user.email)
                                                                        ? 'border-primary bg-primary/5'
                                                                        : 'border-border hover:border-primary/50'
                                                                        }`}
                                                                    onClick={() => {
                                                                        setSelectedUsers(prev =>
                                                                            prev.includes(user.email)
                                                                                ? prev.filter(email => email !== user.email)
                                                                                : [...prev, user.email]
                                                                        );
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div
                                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedUsers.includes(user.email)
                                                                                ? 'bg-primary border-primary'
                                                                                : 'border-muted-foreground'
                                                                                }`}
                                                                        >
                                                                            {selectedUsers.includes(user.email) && (
                                                                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-sm">{user.name}</p>
                                                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                                                        </div>
                                                                    </div>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {user.type === 'employee' ? 'Employee' : 'External'}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                {selectedUsers.length > 0 && (
                                                    <Alert>
                                                        <CheckCircle className="w-4 h-4" />
                                                        <AlertDescription>
                                                            <p className="font-medium">{selectedUsers.length} users selected</p>
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (assignmentType === 'batch') {
                                                const incompleteTimes = selectedBatches.some(batchId => {
                                                    const times = batchTimes[batchId];
                                                    return !times?.startTime || !times?.endTime;
                                                });

                                                if (incompleteTimes) {
                                                    toast.error('Please set start and end times for all selected batches');
                                                    return;
                                                }
                                            }
                                            setCurrentStep(4);
                                        }}
                                        disabled={
                                            (assignmentType === 'batch' && selectedBatches.length === 0) ||
                                            (assignmentType === 'users' && selectedUsers.length === 0)
                                        }
                                    >
                                        Next: Review
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Review & Create</h2>
                                    <p className="text-sm text-muted-foreground">Review your exam details before creating</p>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Exam Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Title</Label>
                                                <p className="font-semibold">{title}</p>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Language</Label>
                                                <div className="flex items-center gap-2">
                                                    <span>{languageOptions.find(l => l.value === language)?.icon}</span>
                                                    <span className="font-semibold">{languageOptions.find(l => l.value === language)?.label}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Duration</Label>
                                                <div className="flex items-center gap-2">
                                                    <Timer className="w-4 h-4" />
                                                    <span className="font-semibold">{duration} minutes</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Questions</Label>
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    <span className="font-semibold">{questions.filter(q => q.question.trim()).length} questions</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Proctoring</Label>
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4" />
                                                    <span className="font-semibold">{isExamProctored ? 'Proctored' : 'Non-Proctored'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Batches</Label>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span className="font-semibold">{selectedBatches.length} batches</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {questions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Question Breakdown</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-3 gap-4">
                                                {['easy', 'medium', 'hard'].map((difficulty) => {
                                                    const count = questions.filter(q => q.difficulty?.toLowerCase() === difficulty).length;
                                                    return (
                                                        <div key={difficulty} className="text-center space-y-2">
                                                            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold text-white ${difficulty === 'easy' ? 'bg-emerald-500' :
                                                                difficulty === 'medium' ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`}>
                                                                {count}
                                                            </div>
                                                            <p className="text-sm font-medium capitalize">{difficulty}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {selectedBatches.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Batch Schedules</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {selectedBatches.map(batchId => {
                                                    const batch = availableBatches.find(b => b.Id === batchId);
                                                    const times = batchTimes[batchId];
                                                    return (
                                                        <div key={batchId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                            <div>
                                                                <p className="font-semibold text-sm">{batch?.Name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {batch?.EmployeeCount || 0} Employees
                                                                </p>
                                                            </div>
                                                            <div className="text-right text-xs">
                                                                {times?.startTime && (
                                                                    <p>{new Date(times.startTime).toLocaleString()}</p>
                                                                )}
                                                                {times?.endTime && (
                                                                    <p className="text-muted-foreground">to {new Date(times.endTime).toLocaleString()}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Assignment Type</Label>
                                    <p className="font-semibold capitalize">{assignmentType}</p>
                                </div>

                                {assignmentType === 'users' && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Selected Users</Label>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span className="font-semibold">{selectedUsers.length} users</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(3)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => handleCreateExam(batchTimes)}
                                        disabled={isLoading || !isFormValid}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Exam
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full mx-auto flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">Success!</h3>
                                <p className="text-muted-foreground">Your exam has been created successfully</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </ExaminerLayout>
    );
}