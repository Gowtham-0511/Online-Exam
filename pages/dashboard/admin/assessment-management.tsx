import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Clock, Users, Code, FileText, Calendar, Filter, Search, Eye, Settings, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import AdminLayout from './layout';
import { useRouter } from 'next/router';


interface QuestionConfig {
    beginner: { count: number; marks: number };
    intermediate: { count: number; marks: number };
    hard: { count: number; marks: number };
}

interface Question {
    id: string;
    question: string;
    expectedOutput: string;
    difficulty: 'easy' | 'medium' | 'hard';
    marks: number;
}

interface Assessment {
    id: number;
    title: string;
    language: string;
    duration: number;
    createdBy: string;
    createdAt: string;
    isExamProctored: boolean;
    isGeneratedFromExcel: boolean;
    questionConfig: string;
    questions: string;
    startTime: string | null;
    endTime: string | null;
    allowedUsers: string | null;
    sqlCredentialId?: number | null;
    assignmentType?: string;
    tags?: string[];
}

const AssessmentManagement = () => {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('all');
    const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
    const [viewingAssessment, setViewingAssessment] = useState<Assessment | null>(null);

    const router = useRouter();

    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                const res = await fetch('/api/admin/assessment')
                const data = await res.json();
                setTimeout(() => {
                    setAssessments(data);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error('Error fetching assessments:', error);
                setLoading(false);
            }
        };

        fetchAssessment();
    }, []);

    const getQuestionsWithDetails = (questionsStr: string) => {
        try {
            return JSON.parse(questionsStr);
        } catch {
            return [];
        }
    };

    const getQuestionCount = (questionsStr: string): number => {
        try {
            const questions = JSON.parse(questionsStr);
            return Array.isArray(questions) ? questions.length : 0;
        } catch {
            return 0;
        }
    };

    const getTotalMarks = (questionsStr: string): number => {
        try {
            const questions: Question[] = JSON.parse(questionsStr);
            return questions.reduce((total, q) => total + q.marks, 0);
        } catch {
            return 0;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getLanguageBadgeVariant = (language: string) => {
        const variants = {
            python: 'default',
            javascript: 'secondary',
            java: 'destructive',
            sql: 'outline',
            default: 'secondary'
        };
        return variants[language as keyof typeof variants] || variants.default;
    };

    const handleDeleteAssessment = (id: number) => {
        setAssessments(assessments.filter(a => a.id !== id));
    };

    const filteredAssessments = assessments.filter(assessment => {
        const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assessment.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLanguage = filterLanguage === 'all' || assessment.language === filterLanguage;
        return matchesSearch && matchesLanguage;
    });

    const uniqueLanguages = [...new Set(assessments.map(a => a.language))];

    if (loading) {
        return (
            <AdminLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <Skeleton className="h-8 w-64 mb-2" />
                            <Skeleton className="h-4 w-96" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <Skeleton className="h-8 w-8 mb-2" />
                                    <Skeleton className="h-4 w-24 mb-1" />
                                    <Skeleton className="h-6 w-12" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="h-64">
                                <CardContent className="p-6">
                                    <Skeleton className="h-6 w-full mb-4" />
                                    <Skeleton className="h-4 w-20 mb-4" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Assessment Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Create, edit, and manage your coding assessments
                        </p>
                    </div>
                    <Button onClick={() => router.push('/dashboard/examiner')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Assessment
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Assessments</p>
                                    <p className="text-2xl font-bold text-foreground">{assessments.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-accent/10 rounded-lg">
                                    <Code className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Languages</p>
                                    <p className="text-2xl font-bold text-foreground">{uniqueLanguages.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-chart-1/10 rounded-lg">
                                    <Users className="w-5 h-5 text-chart-1" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Proctored</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {assessments.filter(a => a.isExamProctored).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-chart-2/10 rounded-lg">
                                    <Clock className="w-5 h-5 text-chart-2" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {Math.round(assessments.reduce((acc, a) => acc + a.duration, 0) / assessments.length || 0)}m
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter Section */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search assessments by title or creator..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="text-muted-foreground w-4 h-4" />
                                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="All Languages" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Languages</SelectItem>
                                        {uniqueLanguages.map(lang => (
                                            <SelectItem key={lang} value={lang}>
                                                {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assessments Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAssessments.map((assessment) => (
                        <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg mb-2">{assessment.title}</CardTitle>
                                        <Badge variant={getLanguageBadgeVariant(assessment.language) as any}>
                                            {assessment.language.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setEditingAssessment(assessment)}>
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteAssessment(assessment.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>{assessment.duration} min</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <FileText className="w-4 h-4" />
                                        <span>{getQuestionCount(assessment.questions)} questions</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Total Marks: <span className="font-medium text-foreground">{getTotalMarks(assessment.questions)}</span>
                                    </div>
                                    {assessment.isExamProctored && (
                                        <Badge variant="outline" className="text-xs">
                                            <Eye className="w-3 h-3 mr-1" />
                                            Proctored
                                        </Badge>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-border">
                                    <div className="text-xs text-muted-foreground">
                                        {formatDate(assessment.createdAt)}
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setViewingAssessment(assessment)}
                                >
                                    View Details
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredAssessments.length === 0 && (
                    <Card>
                        <CardContent className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <CardTitle className="mb-2">No assessments found</CardTitle>
                            <CardDescription className="mb-4">
                                {searchTerm || filterLanguage !== 'all'
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'Get started by creating your first assessment.'}
                            </CardDescription>
                            <Button onClick={() => router.push('/dashboard/examiner')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Assessment
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
            {/* View Assessment Details Dialog */}
            <Dialog open={!!viewingAssessment} onOpenChange={() => setViewingAssessment(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{viewingAssessment?.title}</DialogTitle>
                        <DialogDescription>
                            Assessment Details and Questions
                        </DialogDescription>
                    </DialogHeader>

                    {viewingAssessment && (
                        <div className="space-y-6">
                            {/* Assessment Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">Language</p>
                                    <Badge variant={getLanguageBadgeVariant(viewingAssessment.language) as any}>
                                        {viewingAssessment.language.toUpperCase()}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Duration</p>
                                    <p className="font-medium">{viewingAssessment.duration} minutes</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Questions</p>
                                    <p className="font-medium">{getQuestionCount(viewingAssessment.questions)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Marks</p>
                                    <p className="font-medium">{getTotalMarks(viewingAssessment.questions)}</p>
                                </div>
                            </div>

                            {/* Tags */}
                            {viewingAssessment.tags && viewingAssessment.tags.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {viewingAssessment.tags.map((tag, idx) => (
                                            <Badge key={idx} variant="secondary">{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Questions */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Questions</h3>
                                <div className="space-y-4">
                                    {getQuestionsWithDetails(viewingAssessment.questions).map((question: any, index: number) => (
                                        <Card key={question.id}>
                                            <CardHeader>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-base">
                                                            Question {index + 1}
                                                        </CardTitle>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline">
                                                            {question.difficulty}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {question.marks} marks
                                                        </Badge>
                                                        <Badge>
                                                            {question.type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div
                                                    className="prose prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: question.question }}
                                                />

                                                {question.type === 'mcq' && question.options && (
                                                    <div className="mt-4">
                                                        <p className="text-sm font-medium mb-2">Options:</p>
                                                        <div className="space-y-2">
                                                            {question.options.map((option: any, optIdx: number) => (
                                                                <div
                                                                    key={option.id}
                                                                    className={`p-2 rounded border ${option.isCorrect
                                                                            ? 'bg-green-50 border-green-200'
                                                                            : 'bg-background'
                                                                        }`}
                                                                >
                                                                    <span className="font-medium">{optIdx + 1}. </span>
                                                                    {option.text}
                                                                    {option.isCorrect && (
                                                                        <Badge variant="outline" className="ml-2 text-green-600">
                                                                            Correct
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {question.type === 'coding' && question.expectedOutput && (
                                                    <div className="mt-4">
                                                        <p className="text-sm font-medium mb-2">Expected Solution:</p>
                                                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                                            <code>{question.expectedOutput}</code>
                                                        </pre>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AssessmentManagement;