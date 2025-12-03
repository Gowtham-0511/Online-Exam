"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR, { mutate } from 'swr';
import toast from "react-hot-toast";
// import { useRouter } from "next/router";
import {
    X, Edit2, Trash2, UserPlus, Clock, Shield, Users, Calendar,
    Search, Filter, MoreVertical, Check, Plus, FileText, Code2,
    Sparkles, ChevronRight, AlertCircle, Loader2
} from "lucide-react";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Exam {
    id: string;
    title: string;
    language: string;
    duration: number;
    createdAt: string;
    questionsCount?: number;
    status?: "draft" | "published" | "archived";
    isExamProctored: boolean;
    assignmentType: string;
}

interface User {
    id: string;
    email: string;
    name: string;
    type: 'employee' | 'external';
}

interface Batch {
    Id: string;
    Name: string;
    description?: string;
}

export default function ViewExamsPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const { data: exams = [], error, isLoading } = useSWR(
        session?.user?.email
            ? `/api/organizer/assessment/by-user?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        duration: 0,
        isExamProctored: false,
    });
    const [loadingEdit, setLoadingEdit] = useState(false);

    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [reassigningExam, setReassigningExam] = useState<Exam | null>(null);
    const [assignmentType, setAssignmentType] = useState<'user' | 'batch' | 'both'>('user');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [loadingReassign, setLoadingReassign] = useState(false);
    const [searchUser, setSearchUser] = useState('');
    const [searchBatch, setSearchBatch] = useState('');

    const handleDelete = async (examId: string) => {
        if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
            return;
        }

        try {
            setDeletingId(examId);
            const response = await fetch(`/api/organizer/assessment/delete/${examId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error('Failed to delete exam');
            }

            toast.success("Exam deleted successfully");

            mutate(
                `/api/organizer/assessment/by-user?email=${encodeURIComponent(session?.user?.email || '')}`,
                exams.filter((exam: Exam) => exam.id !== examId),
                false
            );
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete exam");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = async (examId: string) => {
        const exam = exams.find((e: Exam) => e.id === examId);
        if (!exam) return;

        setEditingExam(exam);
        setEditForm({
            duration: exam.duration,
            isExamProctored: exam.isExamProctored,
        });
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingExam) return;

        try {
            setLoadingEdit(true);

            const examRes = await fetch(`/api/organizer/assessment/${encodeURIComponent(editingExam.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duration: editForm.duration,
                    isExamProctored: editForm.isExamProctored,
                    assignmentType: editingExam.assignmentType
                })
            });

            if (!examRes.ok) throw new Error('Failed to update exam');

            toast.success("Exam updated successfully");
            setEditDialogOpen(false);
            setEditingExam(null);

            mutate(`/api/organizer/assessment/by-user?email=${encodeURIComponent(session?.user?.email || '')}`);

        } catch (error) {
            console.error("Update error:", error);
            toast.error("Failed to update exam");
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleSaveReassignment = async () => {
        if (!reassigningExam) return;

        if (assignmentType === 'user' && selectedUsers.length === 0) {
            toast.error('Please select at least one user');
            return;
        }

        if (assignmentType === 'batch' && selectedBatches.length === 0) {
            toast.error('Please select at least one batch');
            return;
        }

        if (assignmentType === 'both' && selectedUsers.length === 0 && selectedBatches.length === 0) {
            toast.error('Please select at least one user or batch');
            return;
        }

        try {
            setLoadingReassign(true);

            const batchAssignments = selectedBatches.map(batchId => ({
                batchId,
                assessmentId: reassigningExam.id
            }));

            const assignmentRes = await fetch('/api/organizer/assessment/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId: reassigningExam.id,
                    type: assignmentType,
                    userEmails: selectedUsers,
                    batchAssignments: batchAssignments
                })
            });

            if (!assignmentRes.ok) throw new Error('Failed to update assignments');

            toast.success("Exam reassigned successfully");
            setReassignDialogOpen(false);
            setReassigningExam(null);

            mutate(`/api/organizer/assessment/by-user?email=${encodeURIComponent(session?.user?.email || '')}`);

        } catch (error) {
            console.error("Reassignment error:", error);
            toast.error("Failed to reassign exam");
        } finally {
            setLoadingReassign(false);
        }
    };

    const toggleUserSelection = (email: string) => {
        setSelectedUsers(prev =>
            prev.includes(email)
                ? prev.filter(e => e !== email)
                : [...prev, email]
        );
    };

    const toggleBatchSelection = (batchId: string) => {
        setSelectedBatches(prev => {
            const newSelection = prev.includes(batchId)
                ? prev.filter(id => id !== batchId)
                : [...prev, batchId];
            return newSelection;
        });
    };

    const filteredUsers = availableUsers.filter(user =>
        user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
        user.email.toLowerCase().includes(searchUser.toLowerCase())
    );

    const filteredBatches = availableBatches.filter(batch =>
        batch.Name.toLowerCase().includes(searchBatch.toLowerCase())
    );

    const filteredExams = exams?.filter((exam: Exam) => {
        const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.language.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || exam.assignmentType === filterStatus;
        return matchesSearch && matchesFilter;
    }) || [];

    const getLanguageIcon = (language: string) => {
        switch (language.toLowerCase()) {
            case 'python': return '🐍';
            case 'sql': return '🗄️';
            case 'javascript': return '⚡';
            case 'java': return '☕';
            case 'cpp': return '⚙️';
            case 'csharp': return '#️⃣';
            default: return '💻';
        }
    };

    const getAssignmentTypeColor = (type: string) => {
        switch (type) {
            case 'user': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'batch': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'both': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    if (isLoading && !exams?.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-muted-foreground font-medium animate-pulse">Loading assessments...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full border-destructive/20 shadow-lg">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center ring-4 ring-destructive/5">
                            <AlertCircle className="w-8 h-8 text-destructive" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Failed to load assessments</h3>
                            <p className="text-sm text-muted-foreground">
                                We encountered an error while fetching your data.
                            </p>
                        </div>
                        <Button
                            onClick={() => mutate(`/api/organizer/assessment/by-user?email=${encodeURIComponent(session?.user?.email || '')}`)}
                            className="w-full"
                            variant="outline"
                        >
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background/50">
            {/* Header Section */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    My Assessments
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage your technical assessments and challenges
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => router.push('/organizer/create')}
                            className="group relative overflow-hidden shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                            size="lg"
                        >
                            <span className="relative z-10 flex items-center gap-2 font-semibold">
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                Create Assessment
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Button>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 pb-2">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                            <Input
                                type="text"
                                placeholder="Search by title or language..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 shadow-sm"
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[200px] h-11 bg-background border-border/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Filter by type" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="user">User Assigned</SelectItem>
                                <SelectItem value="batch">Batch Assigned</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {filteredExams.length === 0 ? (
                    <Card className="border-dashed border-2 bg-muted/5 hover:bg-muted/10 transition-colors duration-300">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                <div className="relative bg-background p-4 rounded-full ring-1 ring-border shadow-sm">
                                    <FileText className="w-12 h-12 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="space-y-2 max-w-sm">
                                <h3 className="text-xl font-semibold text-foreground">
                                    {searchQuery || filterStatus !== 'all' ? 'No assessments found' : 'No assessments yet'}
                                </h3>
                                <p className="text-muted-foreground">
                                    {searchQuery || filterStatus !== 'all'
                                        ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                                        : 'Get started by creating your first technical assessment to evaluate candidates.'}
                                </p>
                            </div>
                            {!searchQuery && filterStatus === 'all' && (
                                <Button
                                    onClick={() => router.push('/organizer/create')}
                                    variant="outline"
                                    size="lg"
                                    className="mt-4"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Your First Assessment
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                        {filteredExams.map((exam: Exam, index: number) => (
                            <Card
                                key={exam.id}
                                className="group relative flex flex-col overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/50 backdrop-blur-sm"
                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-xl ring-1 ring-inset ring-primary/10 group-hover:scale-110 transition-transform duration-300">
                                                {getLanguageIcon(exam.language)}
                                            </div>
                                            <div className="space-y-1">
                                                <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                                    {exam.title}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium tracking-wide uppercase">
                                                        {exam.language}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => handleEdit(exam.id)}>
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setReassigningExam(exam);
                                                    setReassignDialogOpen(true);
                                                }}>
                                                    <UserPlus className="h-4 w-4 mr-2" />
                                                    Reassign
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(exam.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 pb-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
                                            <Clock className="h-4 w-4 text-primary/70" />
                                            <span className="font-medium text-foreground">{exam.duration}</span>
                                            <span className="text-xs">mins</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
                                            <Shield className={`h-4 w-4 ${exam.isExamProctored ? 'text-green-500' : 'text-muted-foreground'}`} />
                                            <span className="font-medium text-foreground">
                                                {exam.isExamProctored ? 'Proctored' : 'Standard'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-0 pb-4 px-6 flex items-center justify-between gap-4">
                                    <Badge
                                        variant="outline"
                                        className={`font-normal ${getAssignmentTypeColor(exam.assignmentType)}`}
                                    >
                                        {exam.assignmentType === 'user' && <Users className="h-3 w-3 mr-1.5" />}
                                        {exam.assignmentType === 'batch' && <Users className="h-3 w-3 mr-1.5" />}
                                        {exam.assignmentType === 'both' && <Users className="h-3 w-3 mr-1.5" />}
                                        <span className="capitalize">{exam.assignmentType} Assignment</span>
                                    </Badge>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                                                    onClick={() => handleEdit(exam.id)}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>View Details</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </CardFooter>

                                {/* Decorative gradient line at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Assessment</DialogTitle>
                        <DialogDescription>
                            Make changes to the assessment settings here.
                        </DialogDescription>
                    </DialogHeader>
                    {editingExam && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={editingExam.title}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="duration">Duration (minutes)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={editForm.duration}
                                    onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Proctoring</Label>
                                    <div className="text-sm text-muted-foreground">
                                        Enable AI proctoring
                                    </div>
                                </div>
                                <Switch
                                    checked={editForm.isExamProctored}
                                    onCheckedChange={(checked) => setEditForm({ ...editForm, isExamProctored: checked })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={loadingEdit}>
                            {loadingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reassignment Dialog */}
            <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Reassign Assessment</DialogTitle>
                        <DialogDescription>
                            Assign this assessment to additional users or batches.
                        </DialogDescription>
                    </DialogHeader>

                    {reassigningExam && (
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
                            <div className="grid gap-2">
                                <Label>Assignment Type</Label>
                                <div className="flex gap-2">
                                    {['user', 'batch', 'both'].map((type) => (
                                        <Button
                                            key={type}
                                            variant={assignmentType === type ? "default" : "outline"}
                                            onClick={() => setAssignmentType(type as any)}
                                            className="flex-1 capitalize"
                                        >
                                            {type}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {(assignmentType === 'user' || assignmentType === 'both') && (
                                <div className="space-y-2">
                                    <Label>Select Users</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search users..."
                                            value={searchUser}
                                            onChange={(e) => setSearchUser(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <ScrollArea className="h-[200px] rounded-md border p-2">
                                        {loadingUsers ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : filteredUsers.length === 0 ? (
                                            <div className="text-center text-sm text-muted-foreground py-4">
                                                No users found
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {filteredUsers.map((user) => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => toggleUserSelection(user.email)}
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(user.email)
                                                            ? "bg-primary/10 hover:bg-primary/20"
                                                            : "hover:bg-muted"
                                                            }`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{user.name}</span>
                                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                                        </div>
                                                        {selectedUsers.includes(user.email) && (
                                                            <Check className="h-4 w-4 text-primary" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            )}

                            {(assignmentType === 'batch' || assignmentType === 'both') && (
                                <div className="space-y-2">
                                    <Label>Select Batches</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search batches..."
                                            value={searchBatch}
                                            onChange={(e) => setSearchBatch(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <ScrollArea className="h-[200px] rounded-md border p-2">
                                        {loadingBatches ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : filteredBatches.length === 0 ? (
                                            <div className="text-center text-sm text-muted-foreground py-4">
                                                No batches found
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {filteredBatches.map((batch) => (
                                                    <div
                                                        key={batch.Id}
                                                        onClick={() => toggleBatchSelection(batch.Id)}
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedBatches.includes(batch.Id)
                                                            ? "bg-primary/10 hover:bg-primary/20"
                                                            : "hover:bg-muted"
                                                            }`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{batch.Name}</span>
                                                            {batch.description && (
                                                                <span className="text-xs text-muted-foreground">{batch.description}</span>
                                                            )}
                                                        </div>
                                                        {selectedBatches.includes(batch.Id) && (
                                                            <Check className="h-4 w-4 text-primary" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveReassignment} disabled={loadingReassign}>
                            {loadingReassign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Assign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}