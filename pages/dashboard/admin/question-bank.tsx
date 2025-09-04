import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import AdminLayout from "./layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
    Layers
} from 'lucide-react';

interface QuestionInput {
    id?: number;
    questionText: string;
    expectedOutput: string;
    difficulty: string;
    marks: number;
    language: string;
    jobId: number;
    skillId: number;
    imageUrl?: string;
    imageAltText?: string;
}

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

// Enhanced Rich Text Editor Component
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
    });

    const [filters, setFilters] = useState({
        keyword: "",
        language: "",
        difficulty: "",
        jobId: "",
        skillId: ""
    });

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<QuestionInput[]>([]);
    const [uploading, setUploading] = useState(false);
    const [questions, setQuestions] = useState<QuestionInput[]>([]);
    const [editMode, setEditMode] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>({});

    const fetchFilteredQuestions = async () => {
        const params = new URLSearchParams(filters as any).toString();
        const res = await fetch(`/api/questions?${params}`);
        const data = await res.json();
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
                questions: preview.map((q) => ({ ...q, createdBy: "admin@example.com" })),
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

        if (!content || !content.replace(/<(.|\n)*?>/g, '').trim()) {
            toast.error("Please enter the question text!");
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
            toast.success("Question added");
            setQuestion({ ...question, questionText: "", expectedOutput: "" });
            fetchFilteredQuestions();
        } else {
            toast.error("Failed to add");
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
        javascript: { emoji: '💛', name: 'JavaScript' },
        java: { emoji: '☕', name: 'Java' },
        cpp: { emoji: '⚡', name: 'C++' },
        csharp: { emoji: '🔷', name: 'C#' },
        go: { emoji: '🐹', name: 'Go' },
        rust: { emoji: '🦀', name: 'Rust' }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen p-6 space-y-6">
                {/* Header Section */}
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
                                Create and manage coding challenges with style
                            </p>
                        </div>
                        <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
                    </div>
                </div>

                {/* Stats Cards */}
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
                                    <p className="text-sm font-medium text-muted-foreground">This Session</p>
                                    <p className="text-3xl font-bold text-green-600">0</p>
                                </div>
                                <Plus className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Bulk Uploaded</p>
                                    <p className="text-3xl font-bold text-purple-600">{preview.length}</p>
                                </div>
                                <FileSpreadsheet className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Manual Form */}
                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                                <Plus className="h-5 w-5 text-white" />
                            </div>
                            Add Single Question
                        </CardTitle>
                        <CardDescription>
                            Create detailed coding questions with rich text formatting and images
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleManualSubmit} className="space-y-6">
                            {/* Question Text */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Question (Rich Text & Images supported)
                                </Label>
                                <RichTextEditor
                                    value={question.questionText}
                                    onChange={(content: any) => setQuestion({ ...question, questionText: content })}
                                    placeholder="Write your coding question here. Use the toolbar to format text and add images..."
                                />
                            </div>

                            {/* Expected Output */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Expected Output
                                </Label>
                                <Textarea
                                    required
                                    placeholder="Enter the expected output for this question..."
                                    className="min-h-[100px] font-mono text-sm border-2 border-dashed resize-none"
                                    value={question.expectedOutput}
                                    onChange={(e) => setQuestion({ ...question, expectedOutput: e.target.value })}
                                />
                            </div>

                            {/* Form Fields Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Difficulty */}
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

                                {/* Marks */}
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

                                {/* Language */}
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

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                            >
                                <Save className="h-5 w-5 mr-2" />
                                Save Question
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Bulk Upload Section */}
                <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                                <FileSpreadsheet className="h-5 w-5 text-white" />
                            </div>
                            Bulk Upload (CSV)
                        </CardTitle>
                        <CardDescription>
                            Upload multiple questions at once using CSV format
                        </CardDescription>
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
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <span className="text-green-800 dark:text-green-200 font-medium">
                                            Preview: {preview.length} questions ready for upload
                                        </span>
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