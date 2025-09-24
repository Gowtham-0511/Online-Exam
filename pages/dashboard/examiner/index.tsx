import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import ExaminerLayout from "./ExaminerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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

    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
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

    const [questionType, setQuestionType] = useState("coding");
    const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);

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
        setSelectedBatches([]);
        setAvaileBatches([]);
        setBatchTimes({});
    };

    const handleCreateExam = useCallback(async () => {
        const validQuestions = questions.filter(q => q.question && q.question.trim() !== "");

        if (!title || !title.trim()) {
            toast.error("Exam title is required.");
            return;
        }

        if (validQuestions.length === 0) {
            toast.error("Please add at least one question or generate questions from Excel.");
            return;
        }

        setIsLoading(true);

        try {
            const examId = title.toLowerCase().replace(/\s+/g, "-");

            const examData = {
                examId,
                title,
                language,
                duration,
                createdBy: session?.user?.email,
                questions: validQuestions,
                isExamProctored,
                useExcelQuestions,
                questionConfig,
                startTime,
                endTime,
                allowedUsers: allowedUsersRaw
                    .split(",")
                    .map((email) => email.trim())
                    .filter(Boolean),
                batchSchedules: selectedBatches.map(batchId => ({
                    batchId,
                    startTime: batchTimes[batchId]?.startTime || '',
                    endTime: batchTimes[batchId]?.endTime || ''
                }))
            };

            console.log(examData);

            try {
                const response = await fetch("/api/assessment/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(examData),
                });

                if (response.status === 409) {
                    toast.error("An exam with this title already exists. Please choose a different title.");
                    return;
                }

                if (!response.ok) throw new Error("Failed to create exam");

                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    resetForm();
                }, 2000);

            } catch (error) {
                console.error("Error saving exam data:", error);
                toast.error("Failed to save exam data. Please try again.");
                return;
            }

        } catch (error) {
            console.error("Error creating exam:", error);
            toast.error("Error creating exam. Please try again.");
        } finally {
            setIsLoading(false);
            setCurrentStep(1);
        }
    }, [title, questions, language, duration, session, selectedBatches]);

    const languageOptions = [
        { value: "python", label: "Python", icon: "🐍" },
        { value: "sql", label: "SQL", icon: "🗄️" },
        // { value: "javascript", label: "JavaScript", icon: "⚡" },
        // { value: "java", label: "Java", icon: "☕" },
    ];

    const isFormValid = title.trim() !== "" && questions.some(q =>
        q &&
        typeof q.question === 'string' &&
        q.question.trim() !== ""
    );

    // const fetchQuestions = async () => {
    //     if (beginnerCount + intermediateCount + expertCount === 0) {
    //         setError('Please select at least one question');
    //         return;
    //     }

    //     setLoading(true);
    //     setError('');

    //     try {
    //         const res = await fetch(`/api/question-bank?language=${language}`);

    //         if (!res.ok) {
    //             throw new Error(`HTTP error! status: ${res.status}`);
    //         }

    //         const allQuestions = await res.json();

    //         const beginner = allQuestions
    //             .filter((q: { difficulty: string; }) => q.difficulty.toLocaleLowerCase() === "easy")
    //             .slice(0, beginnerCount);

    //         const intermediate = allQuestions
    //             .filter((q: { difficulty: string; }) => q.difficulty.toLocaleLowerCase() === "medium")
    //             .slice(0, intermediateCount);

    //         const expert = allQuestions
    //             .filter((q: { difficulty: string; }) => q.difficulty.toLocaleLowerCase() === "hard")
    //             .slice(0, expertCount);

    //         const selectedQuestions = [...beginner, ...intermediate, ...expert];

    //         const mappedQuestions = selectedQuestions.map((q, index) => ({
    //             id: `generated-q${index + 1}`,
    //             question: q.questionText ?? q.question,
    //             expectedOutput: q.expectedOutput ? q.expectedOutput.toString().trim() : '',
    //             difficulty: q.difficulty,
    //             marks: q.marks,
    //             solution: q.solution !== undefined ? q.solution : undefined
    //         }));

    //         setQuestions(mappedQuestions);

    //     } catch (err) {
    //         console.error('Error fetching questions:', err);
    //         if (err instanceof Error) {
    //             setError(`Failed to fetch questions: ${err.message}`);
    //         } else {
    //             setError('Failed to fetch questions: Unknown error');
    //         }
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const fetchQuestions = async (): Promise<void> => {
        if (beginnerCount + intermediateCount + expertCount === 0) {
            setError('Please select at least one question');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/questions?language=${language}&questionType=${questionType}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const allQuestions: any[] = await res.json();

            const beginner = allQuestions
                .filter((q) => q.difficulty?.toLowerCase() === "easy")
                .slice(0, beginnerCount);

            const intermediate = allQuestions
                .filter((q) => q.difficulty?.toLowerCase() === "medium")
                .slice(0, intermediateCount);

            const expert = allQuestions
                .filter((q) => q.difficulty?.toLowerCase() === "hard")
                .slice(0, expertCount);

            const selectedQuestions = [...beginner, ...intermediate, ...expert];

            const mappedQuestions: Question[] = selectedQuestions.map((q, index) => ({
                id: `generated-q${index + 1}`,
                question: q.questionText ?? q.question,
                expectedOutput: q.expectedOutput ? q.expectedOutput.toString().trim() : '',
                difficulty: q.difficulty,
                marks: q.marks,
                solution: q.solution !== undefined ? q.solution : undefined,
                type: q.questionType || questionType,
                options: q.options || [],
                correctAnswer: q.options ? q.options.findIndex((opt: QuestionOption) => opt.isCorrect) : undefined
            }));

            setQuestions(mappedQuestions);

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
                console.log(batches);
                setAvaileBatches(batches);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            toast.error('Failed to load batches');
        } finally {
            setLoadingBatches(false);
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
        setError('');
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400';
            case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:text-yellow-400';
            case 'hard': return 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400';
            default: return 'bg-muted text-muted-foreground';
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

            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-6xl">
                    {/* Header */}
                    <div className="text-center mb-8 space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            Create Assessment
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">Design Your Exam</h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Create comprehensive assessments with our intuitive builder
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.number;
                                const isCompleted = currentStep > step.number;

                                return (
                                    <div key={step.number} className="flex items-center">
                                        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${isActive ? 'bg-primary/10 text-primary' :
                                            isCompleted ? 'bg-green-500/10 text-green-600' :
                                                'bg-muted/50 text-muted-foreground'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground' :
                                                isCompleted ? 'bg-green-500 text-white' :
                                                    'bg-muted text-muted-foreground'
                                                }`}>
                                                {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.number}
                                            </div>
                                            <span className="font-medium">{step.title}</span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`w-16 h-0.5 mx-2 transition-all duration-200 ${isCompleted ? 'bg-green-500' : 'bg-border'
                                                }`}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4">
                            <Progress value={(currentStep / steps.length) * 100} className="w-full max-w-md mx-auto" />
                        </div>
                    </div>

                    {/* Main Content Card */}
                    <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-8">
                            {/* Step 1: Basic Information */}
                            {currentStep === 1 && (
                                <div className="space-y-8">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center">
                                            <Info className="w-8 h-8 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-foreground">Basic Information</h2>
                                        <p className="text-muted-foreground">Set up your exam details and configuration</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="title" className="text-sm font-medium">Exam Title *</Label>
                                            <Input
                                                id="title"
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g., Python Programming Assessment"
                                                disabled={isLoading}
                                                className="h-11"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="language" className="text-sm font-medium">Programming Language</Label>
                                            <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
                                                <SelectTrigger className="h-11">
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
                                            <Label htmlFor="questionType" className="text-sm font-medium">Question Type</Label>
                                            <Select value={questionType} onValueChange={setQuestionType} disabled={isLoading}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="coding">
                                                        <div className="flex items-center gap-2">
                                                            <Code className="w-4 h-4" />
                                                            <span>Coding Questions</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="mcq">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="w-4 h-4" />
                                                            <span>MCQ Questions</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</Label>
                                            <Input
                                                id="duration"
                                                type="number"
                                                min={1}
                                                max={300}
                                                value={duration}
                                                onChange={(e) => setDuration(Number(e.target.value))}
                                                disabled={isLoading}
                                                className="h-11"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-sm font-medium">Exam Proctoring</Label>
                                            <Card className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">
                                                            {isExamProctored ? 'Proctored' : 'Non-Proctored'}
                                                        </span>
                                                    </div>
                                                    <Switch
                                                        checked={isExamProctored}
                                                        onCheckedChange={setIsExamProctored}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </Card>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={() => setCurrentStep(2)}
                                            disabled={!title.trim()}
                                            className="px-8"
                                        >
                                            Next: Questions
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Questions */}
                            {currentStep === 2 && (
                                <div className="space-y-8">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center">
                                            <FileText className="w-8 h-8 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-foreground">Exam Questions</h2>
                                        <p className="text-muted-foreground">Configure your question selection from the question bank</p>
                                    </div>

                                    {/* Question Count Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Card className="border-green-200 dark:border-green-800">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                    Beginner Questions
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="50"
                                                    value={beginnerCount}
                                                    onChange={(e) => setBeginnerCount(Number(e.target.value))}
                                                    className="h-10"
                                                />
                                            </CardContent>
                                        </Card>

                                        <Card className="border-yellow-200 dark:border-yellow-800">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                                    Intermediate Questions
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="50"
                                                    value={intermediateCount}
                                                    onChange={(e) => setIntermediateCount(Number(e.target.value))}
                                                    className="h-10"
                                                />
                                            </CardContent>
                                        </Card>

                                        <Card className="border-red-200 dark:border-red-800">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                    Expert Questions
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="50"
                                                    value={expertCount}
                                                    onChange={(e) => setExpertCount(Number(e.target.value))}
                                                    className="h-10"
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            onClick={fetchQuestions}
                                            disabled={loading}
                                            className="flex-1 min-w-[200px]"
                                            size="lg"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Fetching Questions...
                                                </>
                                            ) : (
                                                <>
                                                    {questionType === 'mcq' ? <FileText className="w-4 h-4 mr-2" /> : <Code className="w-4 h-4 mr-2" />}
                                                    Fetch {questionType === 'mcq' ? 'MCQ' : 'Coding'} Questions
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
                                                Clear Questions
                                            </Button>
                                        )}
                                    </div>

                                    {/* Question Summary */}
                                    {(beginnerCount + intermediateCount + expertCount > 0) && (
                                        <Alert>
                                            <Info className="w-4 h-4" />
                                            <AlertDescription>
                                                Total questions to fetch: <strong>{beginnerCount + intermediateCount + expertCount}</strong>
                                                {' '}({beginnerCount} beginner, {intermediateCount} intermediate, {expertCount} expert)
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Error Display */}
                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Questions Display */}
                                    {questions.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <FileText className="w-5 h-5" />
                                                            Fetched Questions ({questions.length})
                                                        </CardTitle>
                                                        <CardDescription>
                                                            Language: <Badge variant="secondary">{language}</Badge>
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {questions.map((q, index) => (
                                                    <Card key={q.id || index} className="bg-muted/30">
                                                        <CardHeader className="pb-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${q.difficulty === 'easy' ? 'bg-green-500' :
                                                                        q.difficulty?.toLocaleLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                                                        }`}>
                                                                        {index + 1}
                                                                    </div>
                                                                    <Badge className={getDifficultyColor(q.difficulty || '')}>
                                                                        {q.difficulty}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {q.marks && (
                                                                        <Badge variant="outline">{q.marks} marks</Badge>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => deleteQuestion(q.id)}
                                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                        title="Delete question"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-4">
                                                            <div>
                                                                <Label className="text-sm font-semibold mb-2 block">Question:</Label>
                                                                <Card className="p-3 bg-background">
                                                                    <div
                                                                        className="text-sm leading-relaxed prose prose-sm max-w-none"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: q.question || 'No question text available'
                                                                        }}
                                                                    />
                                                                </Card>
                                                            </div>

                                                            {q.type === 'mcq' && q.options && q.options.length > 0 && (
                                                                <div>
                                                                    <Label className="text-sm font-semibold mb-2 block">Options:</Label>
                                                                    <div className="space-y-2">
                                                                        {q.options.map((option: QuestionOption, optIndex: number) => (
                                                                            <Card key={option.id || optIndex} className={`p-3 ${option.isCorrect ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-background'}`}>
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${option.isCorrect ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                                                                                        }`}>
                                                                                        {String.fromCharCode(65 + optIndex)}
                                                                                    </div>
                                                                                    <span className="text-sm">{option.text}</span>
                                                                                    {option.isCorrect && (
                                                                                        <Badge className="ml-auto bg-green-500 hover:bg-green-600">Correct</Badge>
                                                                                    )}
                                                                                </div>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {q.expectedOutput && (
                                                                <div>
                                                                    <Label className="text-sm font-semibold mb-2 block">Expected Output:</Label>
                                                                    <Card className="p-3 bg-background">
                                                                        <code className="text-sm font-mono">{q.expectedOutput}</code>
                                                                    </Card>
                                                                </div>
                                                            )}

                                                            {q.solution && (
                                                                <div>
                                                                    <Label className="text-sm font-semibold mb-2 block">Solution:</Label>
                                                                    <Card className="p-3 bg-slate-900 text-green-400 overflow-x-auto">
                                                                        <pre className="text-sm font-mono whitespace-pre-wrap">
                                                                            {q.solution}
                                                                        </pre>
                                                                    </Card>
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
                                            className="px-8"
                                        >
                                            Next: Assign Batch
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Batch Assignment */}
                            {currentStep === 3 && (
                                <div className="space-y-8">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center">
                                            <Users className="w-8 h-8 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-foreground">Assign to Batches</h2>
                                        <p className="text-muted-foreground">Select which batches can access this exam</p>
                                    </div>

                                    {/* Fetch Batches Button */}
                                    {availableBatches.length === 0 && (
                                        <div className="text-center">
                                            <Button
                                                onClick={fetchAvailableBatches}
                                                disabled={loadingBatches}
                                                size="lg"
                                                className="px-8"
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

                                    {/* Batch Selection */}
                                    {availableBatches.length > 0 && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Users className="w-5 h-5" />
                                                        Available Batches ({availableBatches.length})
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Select the batches and set their exam schedule
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-4">
                                                        {availableBatches.map((batch) => (
                                                            <Card
                                                                key={batch.Id}
                                                                className={`transition-all duration-200 ${selectedBatches.includes(batch.Id)
                                                                    ? 'ring-2 ring-primary bg-primary/5'
                                                                    : ''
                                                                    }`}
                                                            >
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-start justify-between mb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div
                                                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${selectedBatches.includes(batch.Id)
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
                                                                                <h3 className="font-semibold">{batch.Name}</h3>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    {batch.EmployeeCount || 0} Employees
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {selectedBatches.includes(batch.Id) && (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium">Start Time</Label>
                                                                                <Input
                                                                                    type="datetime-local"
                                                                                    value={batchTimes[batch.Id]?.startTime || ''}
                                                                                    onChange={(e) => setBatchTimes(prev => ({
                                                                                        ...prev,
                                                                                        [batch.Id]: {
                                                                                            ...prev[batch.Id],
                                                                                            startTime: e.target.value
                                                                                        }
                                                                                    }))}
                                                                                    className="h-10"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium">End Time</Label>
                                                                                <Input
                                                                                    type="datetime-local"
                                                                                    value={batchTimes[batch.Id]?.endTime || ''}
                                                                                    onChange={(e) => setBatchTimes(prev => ({
                                                                                        ...prev,
                                                                                        [batch.Id]: {
                                                                                            ...prev[batch.Id],
                                                                                            endTime: e.target.value
                                                                                        }
                                                                                    }))}
                                                                                    className="h-10"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>

                                                    {selectedBatches.length > 0 && (
                                                        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <CheckCircle className="w-4 h-4 text-primary" />
                                                                <span className="font-medium">Selected Batches ({selectedBatches.length})</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {selectedBatches.map(batchId => {
                                                                    const batch = availableBatches.find(b => b.Id === batchId);
                                                                    const times = batchTimes[batchId];
                                                                    return (
                                                                        <div key={batchId} className="flex items-center justify-between text-sm">
                                                                            <Badge variant="default">{batch?.Name || batchId}</Badge>
                                                                            <span className="text-muted-foreground">
                                                                                {times?.startTime ? new Date(times.startTime).toLocaleString() : 'No start time'} -
                                                                                {times?.endTime ? new Date(times.endTime).toLocaleString() : 'No end time'}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-4 flex gap-2">
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
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-4">
                                        <Button variant="outline" onClick={() => setCurrentStep(2)}>
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentStep(4)}
                                            disabled={selectedBatches.length === 0}
                                            className="px-8"
                                        >
                                            Next: Review
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {currentStep === 4 && (
                                <div className="space-y-8">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center">
                                            <CheckCircle className="w-8 h-8 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-foreground">Review & Create</h2>
                                        <p className="text-muted-foreground">Review your exam details before creating</p>
                                    </div>

                                    {/* Review Summary */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Settings className="w-5 h-5" />
                                                Exam Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                                                    <p className="font-semibold">{title}</p>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-muted-foreground">Language</Label>
                                                    <div className="flex items-center gap-2">
                                                        <span>{languageOptions.find(l => l.value === language)?.icon}</span>
                                                        <span className="font-semibold">{languageOptions.find(l => l.value === language)?.label}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Timer className="w-4 h-4" />
                                                        <span className="font-semibold">{duration} minutes</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-muted-foreground">Questions</Label>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        <span className="font-semibold">{questions.filter(q => q.question.trim()).length} questions</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-muted-foreground">Proctoring</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-4 h-4" />
                                                        <span className="font-semibold">{isExamProctored ? 'Proctored' : 'Non-Proctored'}</span>
                                                    </div>
                                                </div>

                                                {(startTime || endTime) && (
                                                    <div className="space-y-1">
                                                        <Label className="text-sm font-medium text-muted-foreground">Schedule</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4" />
                                                            <span className="font-semibold text-sm">
                                                                {startTime && new Date(startTime).toLocaleString()}
                                                                {startTime && endTime && ' - '}
                                                                {endTime && new Date(endTime).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {allowedUsersRaw.trim() && (
                                                    <div className="space-y-1">
                                                        <Label className="text-sm font-medium text-muted-foreground">Allowed Users</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Users className="w-4 h-4" />
                                                            <span className="font-semibold">{allowedUsersRaw.split(',').length} users</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Question Breakdown */}
                                    {questions.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Question Breakdown</CardTitle>
                                                <CardDescription>Overview of questions by difficulty level</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {['easy', 'medium', 'hard'].map((difficulty) => {
                                                        const count = questions.filter(q => q.difficulty?.toLocaleLowerCase() === difficulty).length;
                                                        const percentage = questions.length ? (count / questions.length) * 100 : 0;

                                                        return (
                                                            <div key={difficulty} className="text-center space-y-2">
                                                                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-white ${difficulty === 'easy' ? 'bg-green-500' :
                                                                    difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}>
                                                                    {count}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold capitalize">{difficulty}</p>
                                                                    <p className="text-sm text-muted-foreground">{percentage.toFixed(0)}% of total</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Batch Schedules */}
                                    {selectedBatches.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Users className="w-5 h-5" />
                                                    Batch Schedules ({selectedBatches.length})
                                                </CardTitle>
                                                <CardDescription>
                                                    Exam schedule for each assigned batch
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {selectedBatches.map(batchId => {
                                                        const batch = availableBatches.find(b => b.Id === batchId);
                                                        const times = batchTimes[batchId];
                                                        return (
                                                            <Card key={batchId} className="bg-muted/30">
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="space-y-1">
                                                                            <h4 className="font-semibold">{batch?.Name || batchId}</h4>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                {batch?.EmployeeCount || 0} Employees
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right space-y-1">
                                                                            <div className="flex items-center gap-2 text-sm">
                                                                                <Calendar className="w-4 h-4" />
                                                                                <span className="font-medium">
                                                                                    {times?.startTime ?
                                                                                        new Date(times.startTime).toLocaleDateString() + ' ' +
                                                                                        new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                        : 'No start time set'
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-sm">
                                                                                <Clock className="w-4 h-4" />
                                                                                <span className="font-medium">
                                                                                    {times?.endTime ?
                                                                                        new Date(times.endTime).toLocaleDateString() + ' ' +
                                                                                        new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                        : 'No end time set'
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {times?.startTime && times?.endTime && (
                                                                        <div className="mt-3 p-2 bg-primary/10 rounded text-sm">
                                                                            <span className="text-primary font-medium">
                                                                                Duration: {Math.floor((new Date(times.endTime).getTime() - new Date(times.startTime).getTime()) / (1000 * 60 * 60))} hours &nbsp; {Math.floor(((new Date(times.endTime).getTime() - new Date(times.startTime).getTime()) % (1000 * 60 * 60)) / (1000 * 60))} minutes
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    <div className="flex justify-between pt-4">
                                        <Button variant="outline" onClick={() => setCurrentStep(3)}>
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleCreateExam}
                                            disabled={isLoading || !isFormValid}
                                            size="lg"
                                            className="px-8"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Creating Exam...
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
                        <Card className="w-full max-w-md animate-in zoom-in-95 duration-300">
                            <CardContent className="p-8 text-center space-y-4">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full mx-auto flex items-center justify-center">
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-foreground mb-2">Success!</h3>
                                    <p className="text-muted-foreground">Your exam has been created successfully</p>
                                </div>
                                <div className="w-full bg-primary/10 rounded-full h-1">
                                    <div className="bg-primary h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </ExaminerLayout>
    );
}