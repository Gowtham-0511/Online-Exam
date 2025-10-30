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
    FileText,
    Settings,
    CheckCircle,
    ArrowLeft,
    ArrowRight,
    Trash2,
    RefreshCw,
    Code,
    Timer,
    Shield,
    Info,
    Loader2,
    Sparkles,
    Plus
} from "lucide-react";
import useSWR from 'swr';

const fetcher = async (url: string): Promise<any> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

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
    tags?: string[];
}

interface SqlCredential {
    id: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    serverType: 'ssms' | 'postgres';
    examTitle?: string;
    createdBy: string;
}

export default function CreateExam() {
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("python");
    const [duration, setDuration] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);

    const [isExamProctored, setIsExamProctored] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const [beginnerCount, setBeginnerCount] = useState(0);
    const [intermediateCount, setIntermediateCount] = useState(0);
    const [expertCount, setExpertCount] = useState(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
    const [showNewCredentialForm, setShowNewCredentialForm] = useState(false);

    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [useMarksBasedGeneration, setUseMarksBasedGeneration] = useState(false);
    const [totalMarks, setTotalMarks] = useState(0);
    const [marksDistribution, setMarksDistribution] = useState({
        coding: 70,
        mcq: 30
    });
    const [difficultyDistribution, setDifficultyDistribution] = useState({
        easy: 40,
        medium: 40,
        hard: 20
    });

    const { data: existingCredentials = [], mutate: mutateCredentials, isLoading: loadingCredentials } = useSWR<SqlCredential[]>(
        sqlServerType && session?.user?.email ? `/api/sql/list-credentials?createdBy=${session.user.email}` : null,
        async (url: string) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch credentials');
            const data = await response.json();
            return data.credentials;
        },
        { revalidateOnFocus: false }
    );

    const { data: tagsData, mutate: mutateTags, isLoading: loadingTags } = useSWR<string[]>(
        language ? `/api/questions/tags?language=${language}` : null,
        async (url: string) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch tags');
            const data = await response.json();
            return data.tags;
        },
        { revalidateOnFocus: false }
    );

    const availableTags = tagsData || [];

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

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateExam = async () => {
        const validQuestions = questions.filter(q => q.question && q.question.trim() !== "");

        if (!title || !title.trim()) {
            toast.error("Exam title is required.");
            return;
        }

        if (validQuestions.length === 0) {
            toast.error("Please add at least one question.");
            return;
        }

        setIsLoading(true);

        try {
            const examId = title.toLowerCase().replace(/\s+/g, "-");

            // Upload files if needed
            let uploadedFileUrls: string[] = [];
            if (requiresFileHandling && uploadedFiles.length > 0) {
                for (const file of uploadedFiles) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('examId', examId);

                    const response = await fetch('/api/upload-exam-file', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const data = await response.json();
                        uploadedFileUrls.push(data.fileUrl);
                    }
                }
            }

            const examData = {
                examId,
                title,
                language,
                ...(language === 'sql' && {
                    sqlServerType,
                    sqlCredentialId: (selectedCredentialId || savedCredentialId) ?? undefined
                }),
                requiresFileHandling,
                duration,
                createdBy: session?.user?.email,
                questions: validQuestions,
                isExamProctored,
                // These will be set during scheduling
                useExcelQuestions: false,
                questionConfig: {},
                allowedUsers: [],
                batchSchedules: [],
                assignmentType: 'batch',
                selectedUserEmails: []
            };

            const response = await fetch("/api/assessment/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(examData),
            });

            if (response.status === 409) {
                toast.error("An exam with this title already exists.");
                setIsLoading(false);
                return;
            }

            if (!response.ok) throw new Error("Failed to create exam");

            const result = await response.json();

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setCurrentStep(1);
                setTitle("");
                setQuestions([]);
            }, 2000);

        } catch (error) {
            console.error("Error creating exam:", error);
            toast.error("Error creating exam. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const generateQuestionsByMarks = async () => {
        if (totalMarks <= 0) {
            setError('Please enter valid total marks');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const codingMarks = Math.round((totalMarks * marksDistribution.coding) / 100);
            const mcqMarks = totalMarks - codingMarks;

            const easyMarks = Math.round((totalMarks * difficultyDistribution.easy) / 100);
            const mediumMarks = Math.round((totalMarks * difficultyDistribution.medium) / 100);
            const hardMarks = totalMarks - easyMarks - mediumMarks;

            const tagParam = selectedTags.length > 0 ? `&tags=${selectedTags.join(',')}` : '';

            const [codingRes, mcqRes] = await Promise.all([
                fetch(`/api/questions?language=${language}&questionType=coding${tagParam}`),
                fetch(`/api/questions?language=${language}&questionType=mcq${tagParam}`)
            ]);

            if (!codingRes.ok || !mcqRes.ok) {
                throw new Error('Failed to fetch questions');
            }

            const codingQuestions = await codingRes.json();
            const mcqQuestions = await mcqRes.json();

            const selectQuestionsByMarks = (questions: any[], targetMarks: number, difficulty: string) => {
                const filtered = questions.filter(q => q.difficulty?.toLowerCase() === difficulty.toLowerCase());
                const shuffled = filtered.sort(() => Math.random() - 0.5);
                const selected: any[] = [];
                let currentMarks = 0;

                for (const q of shuffled) {
                    if (currentMarks >= targetMarks) break;
                    if (currentMarks + q.marks <= targetMarks + 5) {
                        selected.push(q);
                        currentMarks += q.marks;
                    }
                }
                return selected;
            };

            const codingEasyMarks = Math.round((codingMarks * difficultyDistribution.easy) / 100);
            const codingMediumMarks = Math.round((codingMarks * difficultyDistribution.medium) / 100);
            const codingHardMarks = codingMarks - codingEasyMarks - codingMediumMarks;

            const selectedCodingEasy = selectQuestionsByMarks(codingQuestions, codingEasyMarks, 'easy');
            const selectedCodingMedium = selectQuestionsByMarks(codingQuestions, codingMediumMarks, 'medium');
            const selectedCodingHard = selectQuestionsByMarks(codingQuestions, codingHardMarks, 'hard');

            const mcqEasyMarks = Math.round((mcqMarks * difficultyDistribution.easy) / 100);
            const mcqMediumMarks = Math.round((mcqMarks * difficultyDistribution.medium) / 100);
            const mcqHardMarks = mcqMarks - mcqEasyMarks - mcqMediumMarks;

            const selectedMcqEasy = selectQuestionsByMarks(mcqQuestions, mcqEasyMarks, 'easy');
            const selectedMcqMedium = selectQuestionsByMarks(mcqQuestions, mcqMediumMarks, 'medium');
            const selectedMcqHard = selectQuestionsByMarks(mcqQuestions, mcqHardMarks, 'hard');

            const mappedCoding = [...selectedCodingEasy, ...selectedCodingMedium, ...selectedCodingHard].map((q, index) => ({
                id: `coding-q${index + 1}`,
                question: q.questionText ?? q.question,
                expectedOutput: q.expectedOutput ? q.expectedOutput.toString().trim() : '',
                difficulty: q.difficulty,
                marks: q.marks,
                solution: q.solution,
                type: 'coding',
                options: [],
                correctAnswer: undefined,
                tags: q.tags || []
            }));

            const mappedMcq = [...selectedMcqEasy, ...selectedMcqMedium, ...selectedMcqHard].map((q, index) => ({
                id: `mcq-q${mappedCoding.length + index + 1}`,
                question: q.questionText ?? q.question,
                expectedOutput: undefined,
                difficulty: q.difficulty,
                marks: q.marks,
                solution: q.solution,
                type: 'mcq',
                options: q.options?.map((opt: any) => ({
                    id: opt.id,
                    text: opt.text || opt.optionText,
                    isCorrect: opt.isCorrect
                })) || [],
                correctAnswer: q.options?.findIndex((opt: any) => opt.isCorrect === true),
                tags: q.tags || []
            }));

            const allQuestions = [...mappedCoding, ...mappedMcq].sort(() => Math.random() - 0.5);
            const actualMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

            setQuestions(allQuestions);
            toast.success(`Generated ${allQuestions.length} questions (Total: ${actualMarks}/${totalMarks} marks)`, { duration: 4000 });

        } catch (err) {
            console.error('Error generating questions:', err);
            setError('Failed to generate questions');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
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
            const tagParam = selectedTags.length > 0 ? `&tags=${selectedTags.join(',')}` : '';

            if (codingTotal > 0) {
                const codingRes = await fetch(`/api/questions?language=${language}&questionType=coding${tagParam}`);
                if (!codingRes.ok) throw new Error('Failed to fetch coding questions');

                const codingQuestions = await codingRes.json();
                const codingBeginner = codingQuestions.filter((q: any) => q.difficulty?.toLowerCase() === "easy").slice(0, beginnerCount);
                const codingIntermediate = codingQuestions.filter((q: any) => q.difficulty?.toLowerCase() === "medium").slice(0, intermediateCount);
                const codingExpert = codingQuestions.filter((q: any) => q.difficulty?.toLowerCase() === "hard").slice(0, expertCount);

                const mappedCoding = [...codingBeginner, ...codingIntermediate, ...codingExpert].map((q, index) => ({
                    id: `coding-q${index + 1}`,
                    question: q.questionText ?? q.question,
                    expectedOutput: q.expectedOutput ? q.expectedOutput.toString().trim() : '',
                    difficulty: q.difficulty,
                    marks: q.marks,
                    solution: q.solution,
                    type: 'coding',
                    options: [],
                    correctAnswer: undefined,
                    tags: q.tags || []
                }));

                allFetchedQuestions = [...allFetchedQuestions, ...mappedCoding];
            }

            if (mcqTotal > 0) {
                const mcqRes = await fetch(`/api/questions?language=${language}&questionType=mcq${tagParam}`);
                if (!mcqRes.ok) throw new Error('Failed to fetch MCQ questions');

                const mcqQuestions = await mcqRes.json();
                const mcqBeginner = mcqQuestions.filter((q: any) => q.difficulty?.toLowerCase() === "easy").slice(0, mcqBeginnerCount);
                const mcqIntermediate = mcqQuestions.filter((q: any) => q.difficulty?.toLowerCase() === "medium").slice(0, mcqIntermediateCount);
                const mcqExpert = mcqQuestions.filter((q: any) => q.difficulty?.toLowerCase() === "hard").slice(0, mcqExpertCount);

                const mappedMcq = [...mcqBeginner, ...mcqIntermediate, ...mcqExpert].map((q, index) => ({
                    id: `mcq-q${allFetchedQuestions.length + index + 1}`,
                    question: q.questionText ?? q.question,
                    expectedOutput: undefined,
                    difficulty: q.difficulty,
                    marks: q.marks,
                    solution: q.solution,
                    type: 'mcq',
                    options: q.options?.map((opt: any) => ({
                        id: opt.id,
                        text: opt.text || opt.optionText,
                        isCorrect: opt.isCorrect
                    })) || [],
                    correctAnswer: q.options?.findIndex((opt: any) => opt.isCorrect === true),
                    tags: q.tags || []
                }));

                allFetchedQuestions = [...allFetchedQuestions, ...mappedMcq];
            }

            setQuestions(allFetchedQuestions);
            toast.success(`Fetched ${allFetchedQuestions.length} questions successfully`);

        } catch (err) {
            console.error('Error fetching questions:', err);
            setError('Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    const languageOptions = [
        { value: "python", label: "Python", icon: "🐍" },
        { value: "sql", label: "SQL", icon: "🗄️" },
    ];

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
        setSelectedTags([]);
        setError('');
    };

    const deleteQuestion = (questionId: string) => {
        setQuestions(prevQuestions =>
            prevQuestions.filter(q => q.id !== questionId)
        );
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'hard': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-secondary text-secondary-foreground border-border';
        }
    };

    const steps = [
        { number: 1, title: 'Basic Info', icon: Info },
        { number: 2, title: 'Questions', icon: FileText },
        { number: 3, title: 'Review', icon: CheckCircle }
    ];

    return (
        <ExaminerLayout>
            <Head>
                <title>Create Exam - SysRank</title>
                <link rel="icon" href="/logo.png" />
            </Head>

            <div className="space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Create New Exam</h1>
                    <p className="text-muted-foreground">Design your exam questions and configuration</p>
                </div>

                {/* Progress Steps */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.number;
                                const isCompleted = currentStep > step.number;

                                return (
                                    <div key={step.number} className="flex items-center flex-1">
                                        <div className={`flex items-center gap-2 ${index < steps.length - 1 ? 'w-full' : ''}`}>
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${isActive ? 'bg-primary border-primary text-primary-foreground' :
                                                isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                    'bg-background border-border text-muted-foreground'
                                                }`}>
                                                {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>
                                            <span className={`text-sm font-medium hidden md:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {step.title}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`h-0.5 flex-1 mx-2 transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-border'}`}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <Progress value={(currentStep / steps.length) * 100} className="h-1" />
                    </CardContent>
                </Card>

                {/* Step Content - Basic Info, Questions, Review */}
                {/* ... Rest of the step content from original file ... */}
                {/* I'll include the key sections but you can copy the full step content from original */}

                <Card>
                    <CardContent className="p-6">
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold mb-1">Basic Information</h2>
                                    <p className="text-sm text-muted-foreground">Set up your exam details</p>
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
                                                                        ) : !existingCredentials || !Array.isArray(existingCredentials) || existingCredentials.length === 0 ? (
                                                                            <SelectItem value="none" disabled>No credentials found</SelectItem>
                                                                        ) : (
                                                                            (Array.isArray(existingCredentials) ? existingCredentials : [])
                                                                                .filter((c: SqlCredential) => c.serverType === sqlServerType)
                                                                                .map((credential: SqlCredential) => (
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

                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Exam Questions</h2>
                                    <p className="text-sm text-muted-foreground">Choose your question selection method</p>
                                </div>

                                {/* Generation Method Toggle */}
                                <Card className="border-primary/20">
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => {
                                                    setUseMarksBasedGeneration(false);
                                                    setQuestions([]);
                                                }}
                                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${!useMarksBasedGeneration
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                <FileText className="w-6 h-6 mx-auto mb-2" />
                                                <p className="font-semibold">Manual Selection</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Choose exact number of questions per difficulty
                                                </p>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setUseMarksBasedGeneration(true);
                                                    setQuestions([]);
                                                }}
                                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${useMarksBasedGeneration
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                <Sparkles className="w-6 h-6 mx-auto mb-2" />
                                                <p className="font-semibold">Generate by Marks</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Auto-generate based on total marks
                                                </p>
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Tags Filter - Show for both methods */}
                                <Card className="border-indigo-200 dark:border-indigo-800">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                                <Settings className="w-4 h-4" />
                                                Filter by Tags (Optional)
                                            </CardTitle>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => mutateTags()}
                                                disabled={loadingTags}
                                            >
                                                {loadingTags ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    'Load Tags'
                                                )}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {availableTags.length > 0 ? (
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {availableTags.map((tag: string) => (
                                                        <Badge
                                                            key={tag}
                                                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                                                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                                                            onClick={() => {
                                                                setSelectedTags(prev =>
                                                                    prev.includes(tag)
                                                                        ? prev.filter(t => t !== tag)
                                                                        : [...prev, tag]
                                                                );
                                                            }}
                                                        >
                                                            #{tag}
                                                            {selectedTags.includes(tag) && (
                                                                <CheckCircle className="w-3 h-3 ml-1" />
                                                            )}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                {selectedTags.length > 0 && (
                                                    <div className="flex items-center justify-between pt-2 border-t">
                                                        <p className="text-xs text-muted-foreground">
                                                            {selectedTags.length} tag(s) selected
                                                        </p>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedTags([])}
                                                            className="h-7 text-xs"
                                                        >
                                                            Clear All
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                Click "Load Tags" to see available tags for filtering
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Manual Selection Mode */}
                                {!useMarksBasedGeneration && (
                                    <div className="space-y-4">
                                        {/* Existing Coding and MCQ cards */}
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
                                    </div>
                                )}

                                {/* Marks-Based Generation Mode */}
                                {useMarksBasedGeneration && (
                                    <div className="space-y-4">
                                        <Card className="border-green-200 dark:border-green-800">
                                            <CardHeader>
                                                <CardTitle className="text-sm text-green-700 dark:text-green-400">
                                                    Total Marks Configuration
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Total Marks for Exam *</Label>
                                                    <Input
                                                        type="number"
                                                        min="10"
                                                        max="500"
                                                        value={totalMarks}
                                                        onChange={(e) => setTotalMarks(Number(e.target.value))}
                                                        placeholder="e.g., 100"
                                                        className="text-lg font-semibold"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-orange-200 dark:border-orange-800">
                                            <CardHeader>
                                                <CardTitle className="text-sm text-orange-700 dark:text-orange-400">
                                                    Question Type Distribution (%)
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs flex items-center justify-between">
                                                            <span>Coding Questions</span>
                                                            <span className="font-semibold">{marksDistribution.coding}%</span>
                                                        </Label>
                                                        <Input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={marksDistribution.coding}
                                                            onChange={(e) => {
                                                                const value = Number(e.target.value);
                                                                setMarksDistribution({
                                                                    coding: value,
                                                                    mcq: 100 - value
                                                                });
                                                            }}
                                                        />
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            ~{Math.round((totalMarks * marksDistribution.coding) / 100)} marks
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs flex items-center justify-between">
                                                            <span>MCQ Questions</span>
                                                            <span className="font-semibold">{marksDistribution.mcq}%</span>
                                                        </Label>
                                                        <Input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={marksDistribution.mcq}
                                                            onChange={(e) => {
                                                                const value = Number(e.target.value);
                                                                setMarksDistribution({
                                                                    mcq: value,
                                                                    coding: 100 - value
                                                                });
                                                            }}
                                                        />
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            ~{Math.round((totalMarks * marksDistribution.mcq) / 100)} marks
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-violet-200 dark:border-violet-800">
                                            <CardHeader>
                                                <CardTitle className="text-sm text-violet-700 dark:text-violet-400">
                                                    Difficulty Distribution (%)
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs flex items-center justify-between">
                                                            <span>Easy</span>
                                                            <span className="font-semibold">{difficultyDistribution.easy}%</span>
                                                        </Label>
                                                        <Input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={difficultyDistribution.easy}
                                                            onChange={(e) => {
                                                                const value = Number(e.target.value);
                                                                const remaining = 100 - value;
                                                                const mediumRatio = difficultyDistribution.medium / (difficultyDistribution.medium + difficultyDistribution.hard);
                                                                setDifficultyDistribution({
                                                                    easy: value,
                                                                    medium: Math.round(remaining * mediumRatio),
                                                                    hard: Math.round(remaining * (1 - mediumRatio))
                                                                });
                                                            }}
                                                        />
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            ~{Math.round((totalMarks * difficultyDistribution.easy) / 100)} marks
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs flex items-center justify-between">
                                                            <span>Medium</span>
                                                            <span className="font-semibold">{difficultyDistribution.medium}%</span>
                                                        </Label>
                                                        <Input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={difficultyDistribution.medium}
                                                            onChange={(e) => {
                                                                const value = Number(e.target.value);
                                                                const remaining = 100 - value;
                                                                const easyRatio = difficultyDistribution.easy / (difficultyDistribution.easy + difficultyDistribution.hard);
                                                                setDifficultyDistribution({
                                                                    medium: value,
                                                                    easy: Math.round(remaining * easyRatio),
                                                                    hard: Math.round(remaining * (1 - easyRatio))
                                                                });
                                                            }}
                                                        />
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            ~{Math.round((totalMarks * difficultyDistribution.medium) / 100)} marks
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs flex items-center justify-between">
                                                            <span>Hard</span>
                                                            <span className="font-semibold">{difficultyDistribution.hard}%</span>
                                                        </Label>
                                                        <Input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={difficultyDistribution.hard}
                                                            onChange={(e) => {
                                                                const value = Number(e.target.value);
                                                                const remaining = 100 - value;
                                                                const easyRatio = difficultyDistribution.easy / (difficultyDistribution.easy + difficultyDistribution.medium);
                                                                setDifficultyDistribution({
                                                                    hard: value,
                                                                    easy: Math.round(remaining * easyRatio),
                                                                    medium: Math.round(remaining * (1 - easyRatio))
                                                                });
                                                            }}
                                                        />
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            ~{Math.round((totalMarks * difficultyDistribution.hard) / 100)} marks
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Button
                                            onClick={generateQuestionsByMarks}
                                            disabled={loading || totalMarks <= 0}
                                            className="w-full"
                                            size="lg"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Generating Questions...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Generate Question Paper ({totalMarks} marks)
                                                </>
                                            )}
                                        </Button>

                                        {totalMarks > 0 && (
                                            <Alert>
                                                <Info className="w-4 h-4" />
                                                <AlertDescription>
                                                    <p className="font-medium mb-2">Distribution Preview</p>
                                                    <div className="text-xs space-y-1">
                                                        <p>• Coding: ~{Math.round((totalMarks * marksDistribution.coding) / 100)} marks ({marksDistribution.coding}%)</p>
                                                        <p>• MCQ: ~{Math.round((totalMarks * marksDistribution.mcq) / 100)} marks ({marksDistribution.mcq}%)</p>
                                                        <p className="mt-2 pt-2 border-t">• Easy: {difficultyDistribution.easy}% | Medium: {difficultyDistribution.medium}% | Hard: {difficultyDistribution.hard}%</p>
                                                    </div>
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                )}

                                {/* Rest of the existing code (error display, questions display, etc.) */}
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
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge className={getDifficultyColor(q.difficulty || '')}>
                                                                    {q.difficulty}
                                                                </Badge>
                                                                <Badge variant="outline" className="capitalize">
                                                                    {q.type === 'mcq' ? 'MCQ' : 'Coding'}
                                                                </Badge>
                                                                {q.marks && <Badge variant="secondary">{q.marks} marks</Badge>}

                                                                {/* Display Tags */}
                                                                {q.tags && q.tags.length > 0 && (
                                                                    <>
                                                                        {q.tags.map((tag, tagIndex) => (
                                                                            <Badge
                                                                                key={tagIndex}
                                                                                variant="outline"
                                                                                className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900"
                                                                            >
                                                                                #{tag}
                                                                            </Badge>
                                                                        ))}
                                                                    </>
                                                                )}
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
                                    <Button onClick={() => setCurrentStep(3)} disabled={questions.length === 0}>
                                        Next: Review
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
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
                                            </div>                                        </div>
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

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button onClick={handleCreateExam} disabled={isLoading}>
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
                                <h3 className="text-xl font-semibold mb-2">Exam Created!</h3>
                                <p className="text-muted-foreground">Redirecting to schedule page...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </ExaminerLayout>
    );
}