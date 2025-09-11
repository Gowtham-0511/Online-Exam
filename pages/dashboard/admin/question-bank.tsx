import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import AdminLayout from "./layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    BookOpen,
    Code,
    FileText,
    Upload,
    Save,
    Image as ImageIcon,
    Bold,
    Italic,
    Underline,
    Sparkles,
    Plus,
    FileSpreadsheet,
    CheckCircle,
    Zap,
    Target,
    Award,
    Layers,
    Download,
    List,
    X,
    Check
} from 'lucide-react';

interface MCQOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface QuestionInput {
    id?: number;
    questionText: string;
    expectedOutput?: string;
    difficulty: string;
    marks: number;
    language?: string;
    jobId: number;
    skillId: number;
    imageUrl?: string;
    imageAltText?: string;
    questionType: 'coding' | 'mcq';
    options?: MCQOption[];
    correctAnswer?: string;
    explanation?: string;
}

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder = "Write your question here..." }: RichTextEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleContentChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleContentChange();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target?.result as string;
                img.className = 'max-w-full h-auto block my-4 rounded-lg shadow-sm';

                if (editorRef.current) {
                    editorRef.current.appendChild(img);
                    handleContentChange();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Card className="overflow-hidden border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
            <CardContent className="p-0">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-3 bg-muted/30 border-b">
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => execCommand('bold')}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                            <Bold className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => execCommand('italic')}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                            <Italic className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => execCommand('underline')}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                            <Underline className="h-3 w-3" />
                        </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 px-3 text-xs hover:bg-green-500/10 hover:text-green-700"
                    >
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Image
                    </Button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </div>

                {/* Editor Area */}
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleContentChange}
                    onBlur={handleContentChange}
                    className="min-h-[200px] p-4 outline-none text-sm leading-relaxed bg-background prose prose-sm max-w-none focus:bg-muted/5 transition-colors"
                    suppressContentEditableWarning={true}
                    data-placeholder={placeholder}
                />

                <style jsx>{`
                    div[contenteditable]:empty:before {
                        content: attr(data-placeholder);
                        color: hsl(var(--muted-foreground));
                        pointer-events: none;
                    }
                `}</style>
            </CardContent>
        </Card>
    );
};


const MCQOptionsEditor = ({ options, onChange }: { options: MCQOption[]; onChange: (options: MCQOption[]) => void }) => {
    const addOption = () => {
        const newOption: MCQOption = {
            id: `option_${Date.now()}`,
            text: '',
            isCorrect: false
        };
        onChange([...options, newOption]);
    };

    const removeOption = (id: string) => {
        if (options.length > 2) {
            onChange(options.filter(option => option.id !== id));
        } else {
            toast.error("MCQ must have at least 2 options");
        }
    };

    const updateOption = (id: string, field: keyof MCQOption, value: string | boolean) => {
        onChange(options.map(option =>
            option.id === id ? { ...option, [field]: value } : option
        ));
    };

    const setCorrectAnswer = (id: string) => {
        onChange(options.map(option => ({
            ...option,
            isCorrect: option.id === id
        })));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Answer Options
                </Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="gap-2"
                    disabled={options.length >= 6}
                >
                    <Plus className="h-3 w-3" />
                    Add Option
                </Button>
            </div>

            <RadioGroup value={options.find(o => o.isCorrect)?.id || ""}>
                {options.map((option, index) => (
                    <Card key={option.id} className="border-2 border-dashed border-muted-foreground/20">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground w-8">
                                        {String.fromCharCode(65 + index)}.
                                    </span>
                                    <RadioGroupItem
                                        value={option.id}
                                        onClick={() => setCorrectAnswer(option.id)}
                                        className="cursor-pointer"
                                        title="Mark as correct answer"
                                    />
                                </div>

                                <Input
                                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                    value={option.text}
                                    onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                                    className="flex-1"
                                />

                                {option.isCorrect && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 rounded-md">
                                        <Check className="h-3 w-3 text-green-600" />
                                        <span className="text-xs text-green-700 dark:text-green-300">Correct</span>
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(option.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                    disabled={options.length <= 2}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </RadioGroup>

            <p className="text-xs text-muted-foreground">
                Click the radio button next to an option to mark it as the correct answer.
            </p>
        </div>
    );
};

export default function QuestionBankPage() {
    const { data: session } = useSession();

    const [question, setQuestion] = useState<QuestionInput>({
        questionText: "",
        expectedOutput: "",
        difficulty: "easy",
        marks: 1,
        language: "python",
        jobId: 1,
        skillId: 1,
        questionType: 'coding',
        options: [
            { id: 'option_1', text: '', isCorrect: false },
            { id: 'option_2', text: '', isCorrect: false }
        ]
    });

    const [filters, setFilters] = useState({
        keyword: "",
        language: "",
        difficulty: "",
        jobId: "",
        skillId: "",
        questionType: ""
    });

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<QuestionInput[]>([]);
    const [uploading, setUploading] = useState(false);
    const [questions, setQuestions] = useState<QuestionInput[]>([]);

    const fetchFilteredQuestions = async () => {
        const params = new URLSearchParams(filters as any).toString();
        const res = await fetch(`/api/questions?${params}`);
        const data = await res.json();
        console.log(data);
        setQuestions(data);
    };

    useEffect(() => {
        fetchFilteredQuestions();
    }, []);

    const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: { data: QuestionInput[] }) => {
                const rows = results.data as QuestionInput[];
                setPreview(rows);
                toast.success(`Parsed ${rows.length} questions`);
            },
        });
    };

    const handleBulkUpload = async () => {
        if (!preview.length) return;
        setUploading(true);
        const res = await fetch("/api/questions/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                questions: preview.map((q) => ({ ...q, createdBy: session?.user?.email })),
            }),
        });
        if (res.ok) {
            toast.success("Bulk upload successful");
            setFile(null);
            setPreview([]);
        } else {
            toast.error("Bulk upload failed");
        }
        setUploading(false);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const content = question.questionText;

        console.log(question);

        if (!content || !content.replace(/<(.|\n)*?>/g, '').trim()) {
            toast.error("Please enter the question text!");
            return;
        }

        // Validate MCQ specific fields
        if (question.questionType === 'mcq') {
            if (!question.options || question.options.length < 2) {
                toast.error("MCQ must have at least 2 options!");
                return;
            }

            const hasCorrectAnswer = question.options.some(option => option.isCorrect);
            if (!hasCorrectAnswer) {
                toast.error("Please mark one option as correct!");
                return;
            }

            const emptyOptions = question.options.filter(option => !option.text.trim());
            if (emptyOptions.length > 0) {
                toast.error("Please fill in all option texts!");
                return;
            }
        }

        // Validate coding question specific fields
        if (question.questionType === 'coding' && !question.expectedOutput) {
            toast.error("Please enter the expected output for coding questions!");
            return;
        }

        const questionData = {
            ...question,
            questionText: content,
            createdBy: session?.user?.email
        };

        const res = await fetch("/api/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData),
        });

        if (res.ok) {
            toast.success("Question added successfully!");
            setQuestion({
                ...question,
                questionText: "",
                expectedOutput: "",
                explanation: "",
                options: [
                    { id: 'option_1', text: '', isCorrect: false },
                    { id: 'option_2', text: '', isCorrect: false }
                ]
            });
            fetchFilteredQuestions();
        } else {
            toast.error("Failed to add question");
        }
    };

    const difficultyConfig = {
        easy: { icon: Target, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        medium: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        hard: { icon: Award, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' }
    };

    const languageConfig = {
        python: { emoji: '🐍', name: 'Python' },
        sql: { emoji: '🗄️', name: 'SQL' },
        javascript: { emoji: '💛', name: 'JavaScript' }
    };

    interface TemplateQuestion {
        questionText: string;
        expectedOutput?: string;
        difficulty: string;
        marks: number;
        language?: string;
        questionType: string;
        options?: string;
        correctAnswer?: string;
        explanation?: string;
    }

    const downloadTemplate = (): void => {
        const templateData: TemplateQuestion[] = [
            {
                questionText: "Write a function to reverse a string",
                expectedOutput: "function reverseString(str) { return str.split('').reverse().join(''); }",
                difficulty: "Easy",
                marks: 5,
                language: "JavaScript",
                questionType: "coding",
                explanation: "This function splits the string into characters, reverses the array, then joins them back."
            },
            {
                questionText: "What is the time complexity of binary search?",
                difficulty: "Medium",
                marks: 2,
                questionType: "mcq",
                options: "O(n)|O(log n)|O(n^2)|O(1)",
                correctAnswer: "O(log n)",
                explanation: "Binary search divides the search space in half with each comparison."
            }
        ];

        const headers: (keyof TemplateQuestion)[] = ['questionText', 'expectedOutput', 'difficulty', 'marks', 'language', 'questionType', 'options', 'correctAnswer', 'explanation'];
        const csvContent: string = [
            headers.join(','),
            ...templateData.map(row =>
                headers.map(header => `"${row[header] || ''}"`).join(',')
            )
        ].join('\n');

        const blob: Blob = new Blob([csvContent], { type: 'text/csv' });
        const url: string = window.URL.createObjectURL(blob);
        const a: HTMLAnchorElement = document.createElement('a');
        a.href = url;
        a.download = 'questions_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout>
            <div className="min-h-screen p-6 space-y-6">
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                            <BookOpen className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Question Bank
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                Create and manage coding challenges & MCQs with style
                            </p>
                        </div>
                        <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                                    <p className="text-3xl font-bold text-blue-600">{questions.length}</p>
                                </div>
                                <Layers className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-dashed border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Coding Questions</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {questions.filter(q => q.questionType.toLocaleLowerCase() === 'coding').length}
                                    </p>
                                </div>
                                <Code className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">MCQ Questions</p>
                                    <p className="text-3xl font-bold text-purple-600">
                                        {questions.filter(q => q.questionType.toLocaleLowerCase() === 'mcq').length}
                                    </p>
                                </div>
                                <List className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                                <Plus className="h-5 w-5 text-white" />
                            </div>
                            Add New Question
                        </CardTitle>
                        <CardDescription>
                            Create coding challenges or multiple choice questions with rich formatting
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleManualSubmit} className="space-y-6">
                            {/* Question Type Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Question Type</Label>
                                <Tabs
                                    value={question.questionType}
                                    onValueChange={(value) => setQuestion({ ...question, questionType: value as 'coding' | 'mcq' })}
                                    className="w-full"
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="coding" className="flex items-center gap-2">
                                            <Code className="h-4 w-4" />
                                            Coding Question
                                        </TabsTrigger>
                                        <TabsTrigger value="mcq" className="flex items-center gap-2">
                                            <List className="h-4 w-4" />
                                            MCQ Question
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {/* Question Text */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Question (Rich Text & Images supported)
                                </Label>
                                <RichTextEditor
                                    value={question.questionText}
                                    onChange={(content: any) => setQuestion({ ...question, questionText: content })}
                                    placeholder={`Write your ${question.questionType.toLocaleLowerCase() === 'coding' ? 'coding' : 'MCQ'} question here. Use the toolbar to format text and add images...`}
                                />
                            </div>

                            {/* Conditional Fields Based on Question Type */}
                            {question.questionType.toLocaleLowerCase() === 'coding' ? (
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold flex items-center gap-2">
                                        <Code className="h-4 w-4" />
                                        Expected Output / Solution
                                    </Label>
                                    <Textarea
                                        required
                                        placeholder="Enter the expected output or solution for this coding question..."
                                        className="min-h-[100px] font-mono text-sm border-2 border-dashed resize-none"
                                        value={question.expectedOutput}
                                        onChange={(e) => setQuestion({ ...question, expectedOutput: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <MCQOptionsEditor
                                    options={question.options || []}
                                    onChange={(options) => setQuestion({ ...question, options })}
                                />
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Difficulty</Label>
                                    <Select
                                        value={question.difficulty}
                                        onValueChange={(value) => setQuestion({ ...question, difficulty: value })}
                                    >
                                        <SelectTrigger className="border-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(difficultyConfig).map(([key, config]) => {
                                                const IconComponent = config.icon;
                                                return (
                                                    <SelectItem key={key} value={key}>
                                                        <div className="flex items-center gap-2">
                                                            <IconComponent className={`h-4 w-4 ${config.color}`} />
                                                            <span className="capitalize">{key}</span>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Marks</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="Points"
                                        className="border-2"
                                        value={question.marks}
                                        onChange={(e) => setQuestion({ ...question, marks: parseInt(e.target.value) || 1 })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Programming Language</Label>
                                    <Select
                                        value={question.language}
                                        onValueChange={(value) => setQuestion({ ...question, language: value })}
                                    >
                                        <SelectTrigger className="border-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(languageConfig).map(([key, config]) => (
                                                <SelectItem key={key} value={key}>
                                                    <span>{config.emoji} {config.name}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                            >
                                <Save className="h-5 w-5 mr-2" />
                                Save {question.questionType.toLocaleLowerCase() === 'coding' ? 'Coding' : 'MCQ'} Question
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                                <FileSpreadsheet className="h-5 w-5 text-white" />
                            </div>
                            Bulk Upload (CSV)
                        </CardTitle>
                        <CardDescription>
                            Upload multiple questions at once using CSV format (supports both coding and MCQ questions)
                        </CardDescription>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-muted-foreground">
                                Need help formatting your CSV? Download our template with examples of both question types.
                            </p>
                            <Button
                                onClick={downloadTemplate}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download Template
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleCSVChange}
                                className="border-2 border-dashed flex-1"
                            />

                            {preview.length > 0 && (
                                <Button
                                    onClick={handleBulkUpload}
                                    disabled={uploading}
                                    size="lg"
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload {preview.length} Questions
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        {uploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Uploading questions...</span>
                                    <span>Processing...</span>
                                </div>
                                <Progress value={undefined} className="w-full" />
                            </div>
                        )}

                        {preview.length > 0 && !uploading && (
                            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <span className="text-green-800 dark:text-green-200 font-medium">
                                            Preview: {preview.length} questions ready for upload
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Code className="h-4 w-4 text-blue-600" />
                                            <span>Coding: {preview.filter(q => q.questionType.toLocaleLowerCase() === 'coding').length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <List className="h-4 w-4 text-purple-600" />
                                            <span>MCQ: {preview.filter(q => q.questionType.toLocaleLowerCase() === 'mcq').length}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}