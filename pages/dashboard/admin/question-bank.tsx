import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
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
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import Head from "next/head";

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
    tags?: string[];
    autoGenerate?: boolean;
    testCases?: Array<{ input: string; expectedOutput: string; isHidden: boolean }>; // Add this
}

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

interface TestCase {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
}

const TestCasesEditor = ({
    testCases,
    onChange
}: {
    testCases: TestCase[];
    onChange: (testCases: TestCase[]) => void
}) => {
    const addTestCase = () => {
        onChange([...testCases, { input: '', expectedOutput: '', isHidden: false }]);
    };

    const removeTestCase = (index: number) => {
        onChange(testCases.filter((_, i) => i !== index));
    };

    const updateTestCase = (index: number, field: keyof TestCase, value: string | boolean) => {
        const updated = testCases.map((tc, i) =>
            i === index ? { ...tc, [field]: value } : tc
        );
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Test Cases</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestCase}
                    className="gap-2"
                >
                    <Plus className="h-3 w-3" />
                    Add Test Case
                </Button>
            </div>

            {testCases.map((tc, index) => (
                <Card key={index} className="border-2">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Test Case {index + 1}</span>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={tc.isHidden}
                                        onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                                        className="rounded"
                                    />
                                    Hidden
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTestCase(index)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Input</Label>
                                <Textarea
                                    placeholder="Enter input..."
                                    value={tc.input}
                                    onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                                    className="min-h-[80px] font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Expected Output</Label>
                                <Textarea
                                    placeholder="Enter expected output..."
                                    value={tc.expectedOutput}
                                    onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                                    className="min-h-[80px] font-mono text-xs"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {testCases.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No test cases added yet. Click "Add Test Case" to create one.
                </p>
            )}
        </div>
    );
};

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
        autoGenerate: false,
        testCases: [],
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
        questionType: "",
        tag: ""
    });

    const [activeFilters, setActiveFilters] = useState({
        keyword: "",
        language: "",
        difficulty: "",
        questionType: "",
        tag: ""
    });

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<QuestionInput[]>([]);
    const [uploading, setUploading] = useState(false);
    const [questions, setQuestions] = useState<QuestionInput[]>([]);

    const [selectedQuestion, setSelectedQuestion] = useState<QuestionInput | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showQuestions, setShowQuestions] = useState(false);

    const fetchFilteredQuestions = async () => {
        const params = new URLSearchParams(filters as any).toString();
        const res = await fetch(`/api/questions?${params}`);
        const data = await res.json();
        console.log(data);
        setQuestions(data);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filteredQuestions, setFilteredQuestions] = useState<QuestionInput[]>([]);

    const [generatingTags, setGeneratingTags] = useState(false);

    useEffect(() => {
        fetchFilteredQuestions();
    }, []);

    useEffect(() => {
        let filtered = [...questions];

        if (activeFilters.keyword) {
            filtered = filtered.filter(q =>
                q.questionText.toLowerCase().includes(activeFilters.keyword.toLowerCase())
            );
        }

        if (activeFilters.language) {
            filtered = filtered.filter(q => q.language === activeFilters.language);
        }

        if (activeFilters.difficulty) {
            filtered = filtered.filter(q => q.difficulty === activeFilters.difficulty);
        }

        if (activeFilters.questionType) {
            filtered = filtered.filter(q => q.questionType === activeFilters.questionType);
        }

        if (activeFilters.tag) {
            filtered = filtered.filter(q =>
                q.tags?.some(tag => tag.includes(activeFilters.tag.toLowerCase()))
            );
        }

        setFilteredQuestions(filtered);
        setCurrentPage(1);
    }, [questions, activeFilters]);

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentQuestions = filteredQuestions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

    const handleApplyFilters = () => {
        setActiveFilters({ ...filters });
    };

    const handleClearFilters = () => {
        setFilters({
            keyword: "",
            language: "",
            difficulty: "",
            jobId: "",
            skillId: "",
            questionType: "",
            tag: ""
        });
        setActiveFilters({
            keyword: "",
            language: "",
            difficulty: "",
            questionType: "",
            tag: ""
        });
    };

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

        setGeneratingTags(true);

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

        const questionData = {
            ...question,
            questionText: content,
            createdBy: session?.user?.email
        };

        const url = "/api/questions";
        const method = isEditing ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(questionData),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(
                    `${isEditing ? 'Updated' : 'Added'} successfully! Tags: ${data.tags?.join(', ') || 'none'}`
                );
                handleCancelEdit();
                fetchFilteredQuestions();
            } else {
                toast.error(isEditing ? "Failed to update question" : "Failed to add question");
            }
        } finally {
            setGeneratingTags(false);
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
        // javascript: { emoji: '💛', name: 'JavaScript' }
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

    const handleEdit = (q: QuestionInput) => {
        setSelectedQuestion(q);
        setQuestion({
            id: q.id,
            questionText: q.questionText,
            expectedOutput: q.expectedOutput || "",
            difficulty: q.difficulty,
            marks: q.marks,
            language: q.language || "python",
            jobId: q.jobId,
            skillId: q.skillId,
            questionType: q.questionType,
            autoGenerate: q.autoGenerate || false, // Add this
            testCases: q.testCases || [], // Add this
            options: q.options || [
                { id: 'option_1', text: '', isCorrect: false },
                { id: 'option_2', text: '', isCorrect: false }
            ],
            explanation: q.explanation
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this question?")) return;

        const res = await fetch("/api/questions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });

        if (res.ok) {
            toast.success("Question deleted successfully!");
            fetchFilteredQuestions();
        } else {
            toast.error("Failed to delete question");
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setSelectedQuestion(null);
        setQuestion({
            questionText: "",
            expectedOutput: "",
            difficulty: "easy",
            marks: 1,
            language: "python",
            jobId: 1,
            skillId: 1,
            questionType: 'coding',
            autoGenerate: false,
            testCases: [], // Add this
            options: [
                { id: 'option_1', text: '', isCorrect: false },
                { id: 'option_2', text: '', isCorrect: false }
            ]
        });
    };

    const downloadFilteredQuestions = () => {
        if (filteredQuestions.length === 0) {
            toast.error("No questions to download");
            return;
        }

        const headers = ['questionText', 'expectedOutput', 'difficulty', 'marks', 'language', 'questionType', 'options', 'correctAnswer', 'explanation'];

        const csvContent = [
            headers.join(','),
            ...filteredQuestions.map(q => {
                const row = {
                    questionText: q.questionText.replace(/<[^>]*>/g, '').replace(/"/g, '""'),
                    expectedOutput: q.expectedOutput?.replace(/"/g, '""') || '',
                    difficulty: q.difficulty,
                    marks: q.marks,
                    language: q.language || '',
                    questionType: q.questionType,
                    options: q.options ? q.options.map(opt => opt.text).join('|') : '',
                    correctAnswer: q.options?.find(opt => opt.isCorrect)?.text || '',
                    explanation: q.explanation?.replace(/"/g, '""') || ''
                };
                return headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filtered_questions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success(`Downloaded ${filteredQuestions.length} questions`);
    };

    const handleGenerateTestCases = async () => {
        if (!question.questionText.trim()) {
            toast.error("Please enter a question first!");
            return;
        }

        const loadingToast = toast.loading("Generating test cases with AI...");

        try {
            const res = await fetch("/api/ai/generate-testcases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questionText: question.questionText,
                    language: question.language,
                }),
            });

            const data = await res.json();

            if (res.ok && data.testCases) {
                setQuestion({
                    ...question,
                    testCases: data.testCases,
                    autoGenerate: false // Switch to manual mode to show test cases
                });
                toast.success(`Generated ${data.testCases.length} test cases!`, {
                    id: loadingToast
                });
            } else {
                toast.error(data.error || "Failed to generate test cases", {
                    id: loadingToast
                });
            }
        } catch (err) {
            console.error("Error generating test cases:", err);
            toast.error("Error generating test cases", {
                id: loadingToast
            });
        }
    };


    return (
        <UnifiedDashboardLayout role="admin">
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
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
                            {isEditing ? 'Edit Question' : 'Add New Question'}
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
                                <div className="space-y-4">
                                    <Label className="text-sm font-semibold flex items-center gap-2">
                                        <Code className="h-4 w-4" />
                                        Expected Output / Test Cases
                                    </Label>

                                    {/* Toggle Buttons */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={!question.autoGenerate ? "default" : "outline"}
                                            onClick={() => setQuestion({ ...question, autoGenerate: false })}
                                        >
                                            Manual Test Cases
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={question.autoGenerate ? "default" : "outline"}
                                            onClick={handleGenerateTestCases}
                                        >
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            AI Generate
                                        </Button>
                                    </div>

                                    {/* Conditional Rendering */}
                                    {question.autoGenerate ? (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Generated Expected Output</Label>
                                            <Textarea
                                                required
                                                placeholder="AI generated test cases will appear here..."
                                                className="min-h-[150px] font-mono text-sm border-2 border-dashed"
                                                value={question.expectedOutput}
                                                onChange={(e) => setQuestion({ ...question, expectedOutput: e.target.value })}
                                            />
                                        </div>
                                    ) : (
                                        <TestCasesEditor
                                            testCases={question.testCases || []}
                                            onChange={(testCases) => setQuestion({ ...question, testCases })}
                                        />
                                    )}
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
                                    <Label className="text-sm font-semibold">Skill Sets</Label>
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

                            <div className="flex gap-2">
                                {isEditing && (
                                    <Button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        variant="outline"
                                        size="lg"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={generatingTags}
                                    className={`${isEditing ? 'flex-1' : 'w-full'} bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]`}
                                >
                                    {generatingTags ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                                            Generating AI Tags...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5 mr-2" />
                                            {isEditing ? 'Update' : 'Save'} {question.questionType === 'coding' ? 'Coding' : 'MCQ'} Question
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
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
                </Card> */}

                {showQuestions && (
                    <Card className="border-2 border-dashed border-muted-foreground/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Target className="h-5 w-5" />
                                Filter Questions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm">Search Keyword</Label>
                                    <Input
                                        placeholder="Search in questions..."
                                        value={filters.keyword}
                                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm">Question Type</Label>
                                    <Select
                                        value={filters.questionType || "all"}
                                        onValueChange={(value) => setFilters({ ...filters, questionType: value === "all" ? "" : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="coding">Coding</SelectItem>
                                            <SelectItem value="mcq">MCQ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm">Difficulty</Label>
                                    <Select
                                        value={filters.difficulty || "all"}
                                        onValueChange={(value) => setFilters({ ...filters, difficulty: value === "all" ? "" : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Levels" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Levels</SelectItem>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm">Language</Label>
                                    <Select
                                        value={filters.language || "all"}
                                        onValueChange={(value) => setFilters({ ...filters, language: value === "all" ? "" : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Languages" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Languages</SelectItem>
                                            {Object.entries(languageConfig).map(([key, config]) => (
                                                <SelectItem key={key} value={key}>
                                                    {config.emoji} {config.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm">Tag</Label>
                                    <Input
                                        placeholder="Filter by tag..."
                                        value={filters.tag}
                                        onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <Button onClick={handleApplyFilters} className="flex-1">
                                    Apply Filters
                                </Button>
                                <Button onClick={handleClearFilters} variant="outline">
                                    Clear
                                </Button>
                            </div>

                            {(activeFilters.keyword || activeFilters.language || activeFilters.difficulty || activeFilters.questionType) && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="text-sm text-muted-foreground">Active filters:</span>
                                    {activeFilters.keyword && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                            Keyword: {activeFilters.keyword}
                                        </span>
                                    )}
                                    {activeFilters.questionType && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                            Type: {activeFilters.questionType}
                                        </span>
                                    )}
                                    {activeFilters.difficulty && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                                            Difficulty: {activeFilters.difficulty}
                                        </span>
                                    )}
                                    {activeFilters.language && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                            Language: {activeFilters.language}
                                        </span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg">
                                    <List className="h-5 w-5 text-white" />
                                </div>
                                All Questions ({filteredQuestions.length})
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    onClick={downloadFilteredQuestions}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    disabled={filteredQuestions.length === 0}
                                >
                                    <Download className="h-4 w-4" />
                                    Download
                                </Button>
                                <Button
                                    onClick={() => setShowQuestions(!showQuestions)}
                                    variant="outline"
                                >
                                    {showQuestions ? 'Hide' : 'Show'} Questions
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    {showQuestions && (
                        <CardContent className="space-y-4">
                            {filteredQuestions.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    {questions.length === 0 ? 'No questions found' : 'No questions match your filters'}
                                </p>
                            ) : (
                                <>
                                    <div className="text-sm text-muted-foreground">
                                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredQuestions.length)} of {filteredQuestions.length} questions
                                    </div>

                                    {currentQuestions.map((q) => (
                                        <Card key={q.id} className="border-2">
                                            <CardContent className="p-4">
                                                <div className="space-y-3">
                                                    {/* Header with badges */}
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${q.questionType === 'coding' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                                                }`}>
                                                                {q.questionType === 'coding' ? 'CODING' : 'MCQ'}
                                                            </span>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyConfig[q.difficulty as keyof typeof difficultyConfig]?.bg
                                                                } ${difficultyConfig[q.difficulty as keyof typeof difficultyConfig]?.color}`}>
                                                                {q.difficulty.toUpperCase()}
                                                            </span>
                                                            {q.language && (
                                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                                                    {languageConfig[q.language as keyof typeof languageConfig]?.name}
                                                                </span>
                                                            )}
                                                            {q.tags && q.tags.length > 0 && (
                                                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                                                    {q.tags.map((tag, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium"
                                                                        >
                                                                            #{tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-medium">
                                                                {q.marks} marks
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => handleEdit(q)}
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(q.id!)}
                                                                variant="destructive"
                                                                size="sm"
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Question Text */}
                                                    <div className="border-l-4 border-primary/30 pl-4">
                                                        <div
                                                            className="prose prose-sm max-w-none dark:prose-invert"
                                                            dangerouslySetInnerHTML={{ __html: q.questionText }}
                                                        />
                                                    </div>

                                                    {/* Expected Output for Coding Questions */}
                                                    {q.questionType === 'coding' && q.expectedOutput && (
                                                        <div className="mt-3">
                                                            <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                                <Code className="h-4 w-4 text-green-600" />
                                                                Expected Output / Solution
                                                            </Label>
                                                            <div className="bg-muted/50 p-3 rounded-lg border-2 border-dashed mt-2">
                                                                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                                                                    {q.expectedOutput}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Test Cases for Coding Questions */}
                                                    {q.questionType === 'coding' && q.testCases && q.testCases.length > 0 && (
                                                        <div className="mt-3">
                                                            <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                                <Layers className="h-4 w-4 text-blue-600" />
                                                                Test Cases ({q.testCases.length})
                                                            </Label>
                                                            <div className="space-y-2">
                                                                {q.testCases.map((tc: TestCase, index: number) => (
                                                                    <Card key={index} className="border-2">
                                                                        <CardContent className="p-3">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-xs font-medium">Test Case {index + 1}</span>
                                                                                {tc.isHidden && (
                                                                                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                                                                                        Hidden
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                                                <div>
                                                                                    <span className="font-medium text-muted-foreground">Input:</span>
                                                                                    <pre className="mt-1 p-2 bg-muted rounded font-mono whitespace-pre-wrap">
                                                                                        {tc.input}
                                                                                    </pre>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-medium text-muted-foreground">Expected Output:</span>
                                                                                    <pre className="mt-1 p-2 bg-muted rounded font-mono whitespace-pre-wrap">
                                                                                        {tc.expectedOutput}
                                                                                    </pre>
                                                                                </div>
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* MCQ Options */}
                                                    {q.questionType === 'mcq' && q.options && (
                                                        <div className="space-y-2 mt-3">
                                                            <Label className="text-sm font-semibold">Options:</Label>
                                                            {q.options.map((opt: any, idx: number) => (
                                                                <div
                                                                    key={opt.id}
                                                                    className={`flex items-center gap-2 text-sm p-2 rounded ${opt.isCorrect ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-muted/30'
                                                                        }`}
                                                                >
                                                                    <span className="font-bold min-w-[24px]">
                                                                        {String.fromCharCode(65 + idx)}.
                                                                    </span>
                                                                    <span className="flex-1">{opt.text}</span>
                                                                    {opt.isCorrect && (
                                                                        <div className="flex items-center gap-1 text-green-600">
                                                                            <CheckCircle className="h-4 w-4" />
                                                                            <span className="text-xs font-medium">Correct</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <Button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Previous
                                            </Button>

                                            <div className="flex items-center gap-2">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }

                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            variant={currentPage === pageNum ? "default" : "outline"}
                                                            size="sm"
                                                            className="w-10"
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                            </div>

                                            <Button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    )}
                </Card>
            </div>
        </UnifiedDashboardLayout>
    );
}