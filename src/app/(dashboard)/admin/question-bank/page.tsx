"use client"

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import * as XLSX from 'xlsx';
import { useMsal } from "@azure/msal-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Code,
    Save,
    Image as ImageIcon,
    Bold,
    Italic,
    Underline,
    Sparkles,
    Plus,
    Zap,
    Target,
    Award,
    Layers,
    List,
    X,
    Check,
    Search,
    Filter,
    Trash2,
    Edit2,
    Terminal,
    Database,
    Snowflake,
    FileCode,
    Server,
    Download
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
    tags?: string[];
    autoGenerate?: boolean;
    testCases?: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    Test Cases
                </Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestCase}
                    className="gap-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                >
                    <Plus className="h-3 w-3" />
                    Add Test Case
                </Button>
            </div>

            <div className="grid gap-4">
                {testCases.map((tc, index) => (
                    <Card key={index} className="relative overflow-hidden border border-border/50 bg-muted/20 group hover:border-primary/30 transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium font-mono text-muted-foreground">Case #{index + 1}</span>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={tc.isHidden}
                                            onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                                            className="rounded border-primary/50 text-primary focus:ring-primary/20"
                                        />
                                        Hidden Case
                                    </label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeTestCase(index)}
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Input</Label>
                                    <Textarea
                                        placeholder="Input data..."
                                        value={tc.input}
                                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                                        className="min-h-[80px] font-mono text-xs bg-background/50 resize-none focus-visible:ring-1"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Expected Output</Label>
                                    <Textarea
                                        placeholder="Expected output..."
                                        value={tc.expectedOutput}
                                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                                        className="min-h-[80px] font-mono text-xs bg-background/50 resize-none focus-visible:ring-1"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {testCases.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-muted-foreground/10 rounded-lg bg-muted/5">
                        <Terminal className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No test cases added yet</p>
                    </div>
                )}
            </div>
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
                img.className = 'max-w-full h-auto block my-4 rounded-lg shadow-sm border border-border';

                if (editorRef.current) {
                    editorRef.current.appendChild(img);
                    handleContentChange();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="group border rounded-lg overflow-hidden bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/30 border-b">
                <div className="flex items-center gap-0.5 bg-background rounded-md border shadow-sm p-0.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('bold')}
                        className="h-7 w-7 p-0 hover:bg-muted"
                    >
                        <Bold className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('italic')}
                        className="h-7 w-7 p-0 hover:bg-muted"
                    >
                        <Italic className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('underline')}
                        className="h-7 w-7 p-0 hover:bg-muted"
                    >
                        <Underline className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 px-2 text-xs gap-1.5 hover:bg-muted"
                >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Add Image
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
                className="min-h-[150px] p-4 outline-none text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
                suppressContentEditableWarning={true}
                data-placeholder={placeholder}
            />
        </div>
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
                    <List className="h-4 w-4 text-primary" />
                    Answer Options
                </Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="gap-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                    disabled={options.length >= 6}
                >
                    <Plus className="h-3 w-3" />
                    Add Option
                </Button>
            </div>

            <div className="grid gap-3">
                {options.map((option, index) => (
                    <div
                        key={option.id}
                        className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${option.isCorrect
                            ? 'bg-green-500/5 border-green-500/30'
                            : 'bg-background border-border hover:border-primary/30'
                            }`}
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                            {String.fromCharCode(65 + index)}
                        </div>

                        <div className="flex-1">
                            <Input
                                placeholder={`Option ${String.fromCharCode(65 + index)} text...`}
                                value={option.text}
                                onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                                className="border-0 bg-transparent focus-visible:ring-0 px-0 h-auto py-1 font-medium placeholder:font-normal"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCorrectAnswer(option.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${option.isCorrect
                                    ? 'bg-green-500 text-white shadow-sm'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {option.isCorrect ? <Check className="w-3 h-3" /> : null}
                                {option.isCorrect ? 'Correct' : 'Mark Correct'}
                            </button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(option.id)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                disabled={options.length <= 2}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function QuestionBankPage() {
    const { instance, accounts } = useMsal();
    const session = accounts[0];

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
    const [showForm, setShowForm] = useState(false);

    const fetchFilteredQuestions = async () => {
        const params = new URLSearchParams(filters as any).toString();
        const res = await fetch(`/api/admin/questions?${params}`);
        const data = await res.json();
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

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentQuestions = filteredQuestions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

    const handleApplyFilters = () => {
        setActiveFilters({ ...filters });
    };

    const handleClearFilters = () => {
        const emptyFilters = {
            keyword: "",
            language: "",
            difficulty: "",
            jobId: "",
            skillId: "",
            questionType: "",
            tag: ""
        };
        setFilters(emptyFilters);
        setActiveFilters({
            keyword: "",
            language: "",
            difficulty: "",
            questionType: "",
            tag: ""
        });
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneratingTags(true);

        const content = question.questionText;

        if (!content || !content.replace(/<(.|\n)*?>/g, '').trim()) {
            toast.error("Please enter the question text!");
            setGeneratingTags(false);
            return;
        }

        if (question.questionType === 'mcq') {
            if (!question.options || question.options.length < 2) {
                toast.error("MCQ must have at least 2 options!");
                setGeneratingTags(false);
                return;
            }
            const hasCorrectAnswer = question.options.some(option => option.isCorrect);
            if (!hasCorrectAnswer) {
                toast.error("Please mark one option as correct!");
                setGeneratingTags(false);
                return;
            }
            const emptyOptions = question.options.filter(option => !option.text.trim());
            if (emptyOptions.length > 0) {
                toast.error("Please fill in all option texts!");
                setGeneratingTags(false);
                return;
            }
        }

        const questionData = {
            ...question,
            questionText: content,
            createdBy: session?.username
        };

        const url = "/api/admin/questions";
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
                setShowForm(false);
            } else {
                toast.error(isEditing ? "Failed to update question" : "Failed to add question");
            }
        } finally {
            setGeneratingTags(false);
        }
    };

    const difficultyConfig = {
        easy: { icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Easy' },
        medium: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
        hard: { icon: Award, color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Hard' }
    };

    const languageConfig = {
        python: { icon: FileCode, name: 'Python' },
        sql: { icon: Database, name: 'SQL' },
        sqladmin: { icon: Database, name: 'SQL Admin' },
        databricks: { icon: Server, name: 'Pyspark(Databricks)' },
        snowsql: { icon: Snowflake, name: 'SnowSQL' },
        oracle: { icon: Database, name: 'Oracle' },
        oracleadmin: { icon: Database, name: 'Oracle Admin' },
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
            autoGenerate: q.autoGenerate || false,
            testCases: q.testCases || [],
            options: q.options || [
                { id: 'option_1', text: '', isCorrect: false },
                { id: 'option_2', text: '', isCorrect: false }
            ],
            explanation: q.explanation
        });
        setIsEditing(true);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this question?")) return;

        const res = await fetch("/api/admin/questions", {
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
        setShowForm(false);
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
            testCases: [],
            options: [
                { id: 'option_1', text: '', isCorrect: false },
                { id: 'option_2', text: '', isCorrect: false }
            ]
        });
    };

    const handleGenerateTestCases = async () => {
        if (!question.questionText.trim()) {
            toast.error("Please enter a question first!");
            return;
        }

        const loadingToast = toast.loading("Generating test cases with AI...");

        try {
            const res = await fetch("/api/admin/ai/generate-testcases", {
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
                    autoGenerate: false
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

    const handleDownloadExcel = () => {
        if (filteredQuestions.length === 0) {
            toast.error("No questions to export");
            return;
        }

        const dataToExport = filteredQuestions.map(q => {
            // Map difficulty to Level and Complexity
            let level = 1;
            let complexity = "Beginner";
            if (q.difficulty === 'medium') {
                level = 2;
                complexity = "Intermediate";
            } else if (q.difficulty === 'hard') {
                level = 3;
                complexity = "Advance";
            }

            // Get correct answer text
            const correctOption = q.options?.find(o => o.isCorrect);
            const answer = correctOption ? correctOption.text : (q.correctAnswer || '');

            return {
                Language: q.language || 'General',
                Category: "Developer", // Placeholder as mapped data isn't available
                level: level,
                Question: q.questionText.replace(/<[^>]*>/g, ''), // Strip HTML
                option1: q.options?.[0]?.text || '',
                option2: q.options?.[1]?.text || '',
                option3: q.options?.[2]?.text || '',
                option4: q.options?.[3]?.text || '',
                Answer: answer,
                Score: q.marks,
                Time_in_m: 2, // Defaulting based on requirement
                Complexity: complexity
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
        XLSX.writeFile(workbook, "QuestionBank.xlsx");
        toast.success("Questions exported successfully!");
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Question Bank
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your assessment content library
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleDownloadExcel}
                        className="transition-all duration-300 shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export to Excel
                    </Button>
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className={`${showForm ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'} transition-all duration-300 shadow-lg hover:shadow-primary/20`}
                    >
                        {showForm ? (
                            <>
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Question
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/20 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{questions.length}</h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/20 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Coding Challenges</p>
                            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                {questions.filter(q => q.questionType === 'coding').length}
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Code className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:border-purple-500/20 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">MCQ Items</p>
                            <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                                {questions.filter(q => q.questionType === 'mcq').length}
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <List className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <Card className="border-border shadow-lg animate-in slide-in-from-top-4 duration-300">
                    <CardHeader className="border-b bg-muted/30">
                        <CardTitle className="flex items-center gap-2">
                            {isEditing ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                            {isEditing ? 'Edit Question' : 'Create New Question'}
                        </CardTitle>
                        <CardDescription>
                            Fill in the details below to {isEditing ? 'update' : 'create'} a question.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleManualSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Basic Info */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label>Question Type</Label>
                                        <Tabs
                                            value={question.questionType}
                                            onValueChange={(value) => setQuestion({ ...question, questionType: value as 'coding' | 'mcq' })}
                                            className="w-full"
                                        >
                                            <TabsList className="grid w-full grid-cols-2 h-10">
                                                <TabsTrigger value="coding" className="flex items-center gap-2">
                                                    <Code className="h-4 w-4" /> Coding
                                                </TabsTrigger>
                                                <TabsTrigger value="mcq" className="flex items-center gap-2">
                                                    <List className="h-4 w-4" /> MCQ
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Difficulty & Marks</Label>
                                        <div className="flex gap-4">
                                            <Select
                                                value={question.difficulty}
                                                onValueChange={(value) => setQuestion({ ...question, difficulty: value })}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(difficultyConfig).map(([key, config]) => (
                                                        <SelectItem key={key} value={key}>
                                                            <div className="flex items-center gap-2">
                                                                <config.icon className={`h-4 w-4 ${config.color}`} />
                                                                <span>{config.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="relative w-24">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={question.marks}
                                                    onChange={(e) => setQuestion({ ...question, marks: parseInt(e.target.value) || 1 })}
                                                    className="pl-8"
                                                />
                                                <Award className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Language / Skill</Label>
                                        <Select
                                            value={question.language}
                                            onValueChange={(value) => setQuestion({ ...question, language: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(languageConfig).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([key, config]) => (
                                                    <SelectItem key={key} value={key}>
                                                        <div className="flex items-center gap-2">
                                                            <config.icon className="h-4 w-4" />
                                                            <span>{config.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Right Column: Content */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label>Question Content</Label>
                                        <RichTextEditor
                                            value={question.questionText}
                                            onChange={(content) => setQuestion({ ...question, questionText: content })}
                                            placeholder="Describe the problem statement..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Specific Content based on Type */}
                            <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
                                {question.questionType === 'coding' ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-semibold">Test Cases</h4>
                                                <p className="text-xs text-muted-foreground">Define inputs and expected outputs for validation.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={question.autoGenerate ? "default" : "outline"}
                                                    onClick={handleGenerateTestCases}
                                                    className="gap-2"
                                                >
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    AI Generate
                                                </Button>
                                            </div>
                                        </div>

                                        {question.autoGenerate ? (
                                            <div className="space-y-2 animate-in fade-in">
                                                <Label>Generated Output</Label>
                                                <Textarea
                                                    value={question.expectedOutput}
                                                    onChange={(e) => setQuestion({ ...question, expectedOutput: e.target.value })}
                                                    className="font-mono text-sm min-h-[150px]"
                                                    placeholder="AI generated content..."
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
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={generatingTags}
                                    className="bg-primary hover:bg-primary/90 min-w-[120px]"
                                >
                                    {generatingTags ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            {isEditing ? 'Update Question' : 'Save Question'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-border/60 sticky top-6">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Keyword..."
                                        value={filters.keyword}
                                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                                        className="pl-9 h-9 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <Select
                                    value={filters.questionType}
                                    onValueChange={(value) => setFilters({ ...filters, questionType: value === "all" ? "" : value })}
                                >
                                    <SelectTrigger className="h-9 text-sm">
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
                                <Label className="text-xs text-muted-foreground">Difficulty</Label>
                                <Select
                                    value={filters.difficulty}
                                    onValueChange={(value) => setFilters({ ...filters, difficulty: value === "all" ? "" : value })}
                                >
                                    <SelectTrigger className="h-9 text-sm">
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
                                <Label className="text-xs text-muted-foreground">Language</Label>
                                <Select
                                    value={filters.language}
                                    onValueChange={(value) => setFilters({ ...filters, language: value === "all" ? "" : value })}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="All Languages" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Languages</SelectItem>
                                        {Object.entries(languageConfig).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <config.icon className="h-4 w-4" />
                                                    <span>{config.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <Button onClick={handleApplyFilters} className="flex-1 h-9 text-xs">
                                    Apply
                                </Button>
                                <Button onClick={handleClearFilters} variant="outline" className="h-9 px-3">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Questions List */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            All Questions ({filteredQuestions.length})
                        </h2>
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages || 1}
                        </div>
                    </div>

                    {currentQuestions.length === 0 ? (
                        <Card className="border-dashed border-2 bg-muted/10">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Search className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium">No questions found</h3>
                                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                                    Try adjusting your filters or add a new question to get started.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={handleClearFilters}
                                >
                                    Clear Filters
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {currentQuestions.map((q, idx) => (
                                <Card
                                    key={q.id}
                                    className="group hover:border-primary/40 transition-all duration-300 hover:shadow-md border-border/60"
                                >
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant="outline" className={`${q.questionType === 'coding'
                                                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                                                        : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                                                        }`}>
                                                        {q.questionType === 'coding' ? <Code className="w-3 h-3 mr-1" /> : <List className="w-3 h-3 mr-1" />}
                                                        {q.questionType.toUpperCase()}
                                                    </Badge>
                                                    <Badge variant="outline" className={`${difficultyConfig[q.difficulty as keyof typeof difficultyConfig]?.bg} ${difficultyConfig[q.difficulty as keyof typeof difficultyConfig]?.color} border-0`}>
                                                        {q.difficulty.toUpperCase()}
                                                    </Badge>
                                                    {q.language && languageConfig[q.language as keyof typeof languageConfig] && (
                                                        <Badge variant="secondary" className="font-normal gap-1">
                                                            {(() => {
                                                                const Icon = languageConfig[q.language as keyof typeof languageConfig].icon;
                                                                return <Icon className="h-3 w-3" />;
                                                            })()}
                                                            {languageConfig[q.language as keyof typeof languageConfig].name}
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-muted-foreground font-medium px-2">
                                                        {q.marks} pts
                                                    </span>
                                                </div>

                                                <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-2 text-sm text-foreground/90">
                                                    <div dangerouslySetInnerHTML={{ __html: q.questionText }} />
                                                </div>

                                                {q.tags && q.tags.length > 0 && (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {q.tags.map((tag, i) => (
                                                            <span key={i} className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(q)}
                                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(q.id!)}
                                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {(() => {
                                    const pageNumbers = [];
                                    if (totalPages <= 5) {
                                        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
                                    } else {
                                        const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                        for (let i = 0; i < 5; i++) pageNumbers.push(startPage + i);
                                    }

                                    return pageNumbers.map((pageNum) => (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "ghost"}
                                            size="sm"
                                            className="w-8 h-8 p-0"
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    ));
                                })()}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}