"use client";

import React, { useEffect, useState } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Clock,
    Users,
    Code,
    FileText,
    Calendar,
    Filter,
    Search,
    Eye,
    Settings,
    MoreHorizontal,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Terminal,
    Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
// import { useRouter } from 'next/router';

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
    type?: 'coding' | 'mcq';
    options?: { id: string; text: string; isCorrect: boolean }[];
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
    const [viewingAssessment, setViewingAssessment] = useState<Assessment | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const router = useRouter();

    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                const res = await fetch('/api/admin/assessment')
                const data = await res.json();
                // Simulate network delay for smooth loading animation
                setTimeout(() => {
                    setAssessments(data);
                    setLoading(false);
                }, 800);
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
        });
    };

    const getLanguageBadgeVariant = (language: string) => {
        const variants: Record<string, string> = {
            python: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            javascript: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
            java: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            sql: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
            cpp: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
        return variants[language.toLowerCase()] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    };

    const handleDeleteAssessment = async (id: number) => {
        if (confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
            try {
                const res = await fetch(`/api/admin/assessment?id=${id}`, {
                    method: 'DELETE',
                });

                if (res.ok) {
                    setAssessments(assessments.filter(a => a.id !== id));
                    setNotification({ type: 'success', message: 'Assessment deleted successfully' });
                } else {
                    throw new Error('Failed to delete');
                }
            } catch (error) {
                setNotification({ type: 'error', message: 'Failed to delete assessment' });
            }
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const filteredAssessments = assessments.filter(assessment => {
        const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assessment.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLanguage = filterLanguage === 'all' || assessment.language === filterLanguage;
        return matchesSearch && matchesLanguage;
    });

    const uniqueLanguages = [...new Set(assessments.map(a => a.language))];

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Notification Alert */}
                {notification && (
                    <div className="fixed top-6 right-6 z-50 w-96 animate-in slide-in-from-right-10 duration-300">
                        <Alert className={`border shadow-lg ${notification.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                            }`}>
                            {notification.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            )}
                            <AlertDescription className={`${notification.type === 'success'
                                ? 'text-emerald-800 dark:text-emerald-200'
                                : 'text-rose-800 dark:text-rose-200'
                                }`}>
                                {notification.message}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Assessment Management
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            Manage your coding assessments and challenges
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push('/organizer/create')}
                        size="lg"
                        className="shadow-lg hover:shadow-primary/20 transition-all duration-300 bg-primary hover:bg-primary/90"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create New Assessment
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                                    <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                                        {loading ? <Skeleton className="h-8 w-16" /> : assessments.length}
                                    </h3>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:border-purple-500/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Languages</p>
                                    <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                                        {loading ? <Skeleton className="h-8 w-16" /> : uniqueLanguages.length}
                                    </h3>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <Code className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Proctored</p>
                                    <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                                        {loading ? <Skeleton className="h-8 w-16" /> : assessments.filter(a => a.isExamProctored).length}
                                    </h3>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Eye className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-orange-500/5 to-transparent hover:border-orange-500/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                                    <h3 className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                                        {loading ? <Skeleton className="h-8 w-16" /> : `${Math.round(assessments.reduce((acc, a) => acc + a.duration, 0) / assessments.length || 0)}m`}
                                    </h3>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search assessments by title or creator..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-background"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Filter className="text-muted-foreground w-4 h-4" />
                        <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-background">
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

                {/* Assessments Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="h-[280px] animate-pulse">
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/4" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : filteredAssessments.length === 0 ? (
                    <Card className="border-dashed border-2 bg-muted/10">
                        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="rounded-full bg-muted p-6 animate-in zoom-in duration-500">
                                <FileText className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <div className="text-center space-y-2 max-w-md">
                                <h3 className="text-xl font-semibold">No assessments found</h3>
                                <p className="text-muted-foreground">
                                    {searchTerm || filterLanguage !== 'all'
                                        ? 'Try adjusting your search or filter criteria.'
                                        : 'Get started by creating your first assessment.'}
                                </p>
                            </div>
                            <Button onClick={() => router.push('/organizer/create')} className="mt-4">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Assessment
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredAssessments.map((assessment, index) => (
                            <Card
                                key={assessment.id}
                                className="group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2 flex-1 mr-4">
                                            <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                                {assessment.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium border ${getLanguageBadgeVariant(assessment.language)}`}>
                                                    {assessment.language.toUpperCase()}
                                                </Badge>
                                                {assessment.isExamProctored && (
                                                    <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 border">
                                                        Proctored
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {/* <DropdownMenuItem onClick={() => router.push(`/dashboard/organizer/edit/${assessment.id}`)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem> */}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteAssessment(assessment.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 py-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="w-4 h-4 text-primary/60" />
                                            <span>{assessment.duration} min</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Hash className="w-4 h-4 text-primary/60" />
                                            <span>{getQuestionCount(assessment.questions)} Qs</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4 text-primary/60" />
                                            <span>{formatDate(assessment.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="w-4 h-4 text-primary/60" />
                                            <span className="truncate max-w-[100px]" title={assessment.createdBy}>{assessment.createdBy}</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t flex items-center justify-between">
                                        <div className="text-xs font-medium text-muted-foreground">
                                            Total Marks: <span className="text-foreground">{getTotalMarks(assessment.questions)}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-primary hover:text-primary hover:bg-primary/10 -mr-2"
                                            onClick={() => setViewingAssessment(assessment)}
                                        >
                                            View Details
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* View Assessment Details Dialog */}
            <Dialog open={!!viewingAssessment} onOpenChange={() => setViewingAssessment(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                    {viewingAssessment?.title}
                                    {viewingAssessment && (
                                        <Badge variant="outline" className={`${getLanguageBadgeVariant(viewingAssessment.language)}`}>
                                            {viewingAssessment.language.toUpperCase()}
                                        </Badge>
                                    )}
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-2">
                                    Created by {viewingAssessment?.createdBy} on {viewingAssessment && formatDate(viewingAssessment.createdAt)}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {viewingAssessment && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="grid grid-cols-4 gap-4 p-6 bg-muted/10 border-b">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duration</p>
                                    <p className="font-medium flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        {viewingAssessment.duration} mins
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Questions</p>
                                    <p className="font-medium flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-muted-foreground" />
                                        {getQuestionCount(viewingAssessment.questions)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Marks</p>
                                    <p className="font-medium flex items-center gap-2">
                                        <AwardIcon className="w-4 h-4 text-muted-foreground" />
                                        {getTotalMarks(viewingAssessment.questions)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Type</p>
                                    <p className="font-medium flex items-center gap-2">
                                        {viewingAssessment.isExamProctored ? (
                                            <span className="flex items-center text-purple-600 dark:text-purple-400">
                                                <Eye className="w-4 h-4 mr-1" /> Proctored
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">Standard</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <ScrollArea className="h-[calc(85vh-280px)] bg-background">
                                <div className="p-6 space-y-6">
                                    {viewingAssessment.tags && viewingAssessment.tags.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {viewingAssessment.tags.map((tag, idx) => (
                                                    <Badge key={idx} variant="secondary" className="px-2 py-1 bg-secondary/50 hover:bg-secondary/70">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Terminal className="w-4 h-4" />
                                            Questions List
                                        </h3>
                                        {getQuestionsWithDetails(viewingAssessment.questions).map((question: any, index: number) => (
                                            <Card key={question.id || index} className="border-border/60 shadow-sm overflow-hidden">
                                                <CardHeader className="bg-muted/30 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="bg-background font-mono">Q{index + 1}</Badge>
                                                        <span className="font-medium text-sm text-muted-foreground capitalize">{question.type || 'Coding'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={
                                                            question.difficulty === 'easy' ? 'secondary' :
                                                                question.difficulty === 'medium' ? 'default' : 'destructive'
                                                        } className="capitalize text-[10px] px-2 h-5">
                                                            {question.difficulty}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] px-2 h-5 bg-background">
                                                            {question.marks} marks
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4 space-y-4">
                                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                                        <div dangerouslySetInnerHTML={{ __html: question.question }} />
                                                    </div>

                                                    {question.type === 'mcq' && question.options && (
                                                        <div className="grid gap-2 mt-4">
                                                            {question.options.map((option: any, optIdx: number) => (
                                                                <div
                                                                    key={option.id || optIdx}
                                                                    className={`flex items-center p-3 rounded-md border text-sm ${option.isCorrect
                                                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                                                                        : 'bg-background border-border'
                                                                        }`}
                                                                >
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 border ${option.isCorrect
                                                                        ? 'bg-emerald-200 dark:bg-emerald-800 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100'
                                                                        : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                                                                        }`}>
                                                                        {String.fromCharCode(65 + optIdx)}
                                                                    </div>
                                                                    <span className="flex-1">{option.text}</span>
                                                                    {option.isCorrect && (
                                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-2" />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {question.type !== 'mcq' && question.expectedOutput && (
                                                        <div className="mt-4 space-y-2">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Output</p>
                                                            <div className="bg-muted/50 p-3 rounded-md border font-mono text-xs overflow-x-auto">
                                                                <pre>{question.expectedOutput}</pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    <DialogFooter className="p-4 border-t bg-muted/10">
                        <Button
                            variant="outline"
                            onClick={() => setViewingAssessment(null)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Helper component for the award icon
function AwardIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
    )
}

export default AssessmentManagement;