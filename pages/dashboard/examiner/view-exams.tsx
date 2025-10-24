import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    Clock,
    Edit3,
    FileText,
    Globe,
    MoreVertical,
    Plus,
    Trash2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import ExaminerLayout from "./ExaminerLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

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

export default function ViewExamsPage() {
    const { data: session } = useSession();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        duration: 0,
        isExamProctored: false,
        assignmentType: '',
        userEmails: [] as string[],
        batchAssignments: [] as any[]
    });
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [userEmailInput, setUserEmailInput] = useState('');

    useEffect(() => {
        const fetchExams = async () => {
            if (!session?.user?.email) return;

            try {
                setLoading(true);
                const res = await fetch(`/api/assessment/by-user?email=${session.user.email}`);

                if (!res.ok) {
                    throw new Error('Failed to fetch exams');
                }

                const data = await res.json();
                setExams(data);
            } catch (error) {
                console.error("Failed to fetch exams", error);
                toast.error("Failed to load exams");
            } finally {
                setLoading(false);
            }
        };

        fetchExams();
    }, [session]);

    const handleDelete = async (examId: string) => {
        try {
            setDeletingId(examId);
            const response = await fetch(`/api/assessment/delete/${examId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error('Failed to delete exam');
            }

            toast.success("Exam deleted successfully");
            setExams(prev => prev.filter(exam => exam.id !== examId));
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete exam");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = async (examId: string) => {
        const exam = exams.find(e => e.id === examId);
        if (!exam) return;

        setEditingExam(exam);
        setEditDialogOpen(true);
        await fetchExamDetails(exam.title); // Pass title instead of id
    };

    const handleCreateNew = () => {
        router.push('/dashboard/examiner');
    };

    const handleSaveEdit = async () => {
        if (!editingExam) return;

        try {
            setLoadingEdit(true);

            // Update exam details using title
            const examRes = await fetch(`/api/assessment/${encodeURIComponent(editingExam.title)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duration: editForm.duration,
                    isExamProctored: editForm.isExamProctored,
                    assignmentType: editForm.assignmentType
                })
            });

            if (!examRes.ok) throw new Error('Failed to update exam');

            const updatedExam = await examRes.json();

            // Update assignments using the actual ID from response
            const assignmentRes = await fetch('/api/assessment/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId: updatedExam.id, // Use the ID from the response
                    type: 'both',
                    userEmails: editForm.userEmails,
                    batchAssignments: editForm.batchAssignments
                })
            });

            if (!assignmentRes.ok) throw new Error('Failed to update assignments');

            toast.success("Exam updated successfully");
            setEditDialogOpen(false);
            setEditingExam(null);

            // Refresh exams list
            const res = await fetch(`/api/assessment/by-user?email=${session?.user?.email}`);
            const data = await res.json();
            setExams(data);

        } catch (error) {
            console.error("Update error:", error);
            toast.error("Failed to update exam");
        } finally {
            setLoadingEdit(false);
        }
    };

    const fetchExamDetails = async (examTitle: string) => {
        try {
            setLoadingEdit(true);
            const res = await fetch(`/api/assessment/${encodeURIComponent(examTitle)}`);

            if (!res.ok) throw new Error('Failed to fetch exam details');

            const data = await res.json();

            setEditForm({
                duration: data.exam.duration,
                isExamProctored: data.exam.isExamProctored,
                assignmentType: data.exam.assignmentType,
                userEmails: data.userAssignments.map((u: any) => u.userEmail),
                batchAssignments: data.batchAssignments
            });

            return data;
        } catch (error) {
            console.error("Failed to fetch exam details", error);
            toast.error("Failed to load exam details");
        } finally {
            setLoadingEdit(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const addUserEmail = () => {
        if (userEmailInput.trim() && !editForm.userEmails.includes(userEmailInput.trim())) {
            setEditForm(prev => ({
                ...prev,
                userEmails: [...prev.userEmails, userEmailInput.trim()]
            }));
            setUserEmailInput('');
        }
    };

    const removeUserEmail = (email: string) => {
        setEditForm(prev => ({
            ...prev,
            userEmails: prev.userEmails.filter(e => e !== email)
        }));
    };

    const removeBatchAssignment = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            batchAssignments: prev.batchAssignments.filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return (
            <ExaminerLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-96" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="border-border">
                                <CardHeader className="pb-3">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Skeleton className="h-6 w-16" />
                                        <Skeleton className="h-6 w-20" />
                                    </div>
                                    <Skeleton className="h-4 w-full" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-9 flex-1" />
                                        <Skeleton className="h-9 w-9" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </ExaminerLayout>
        );
    }

    const EditDialog = () => (
        <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>Edit Exam: {editingExam?.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Update exam settings and manage assignments
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-6 py-4">
                    {/* Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                            id="duration"
                            type="number"
                            value={editForm.duration}
                            onChange={(e) => setEditForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                            min="1"
                        />
                    </div>

                    {/* Is Proctored */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="proctored">Enable Proctoring</Label>
                        <Switch
                            id="proctored"
                            checked={editForm.isExamProctored}
                            onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isExamProctored: checked }))}
                        />
                    </div>

                    {/* Assignment Type */}
                    <div className="space-y-2">
                        <Label htmlFor="assignmentType">Assignment Type</Label>
                        <select
                            id="assignmentType"
                            value={editForm.assignmentType}
                            onChange={(e) => setEditForm(prev => ({ ...prev, assignmentType: e.target.value }))}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="user">User</option>
                            <option value="batch">Batch</option>
                            <option value="both">Both</option>
                        </select>
                    </div>

                    {/* User Assignments */}
                    {(editForm.assignmentType === 'user' || editForm.assignmentType === 'both') && (
                        <div className="space-y-2">
                            <Label>Assigned Users</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter user email"
                                    value={userEmailInput}
                                    onChange={(e) => setUserEmailInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addUserEmail()}
                                />
                                <Button onClick={addUserEmail} size="sm">Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {editForm.userEmails.map((email) => (
                                    <Badge key={email} variant="secondary" className="pl-2 pr-1">
                                        {email}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 ml-1"
                                            onClick={() => removeUserEmail(email)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Batch Assignments */}
                    {(editForm.assignmentType === 'batch' || editForm.assignmentType === 'both') && (
                        <div className="space-y-2">
                            <Label>Batch Assignments</Label>
                            {editForm.batchAssignments.length > 0 ? (
                                <div className="space-y-2">
                                    {editForm.batchAssignments.map((batch, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                                            <div className="text-sm">
                                                <div>Batch ID: {batch.batchId}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(batch.startTime).toLocaleString()} - {new Date(batch.endTime).toLocaleString()}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeBatchAssignment(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No batch assignments</p>
                            )}
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                        setEditDialogOpen(false);
                        setEditingExam(null);
                    }}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleSaveEdit} disabled={loadingEdit}>
                        {loadingEdit ? "Saving..." : "Save Changes"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return (
        <ExaminerLayout>
            <EditDialog />
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">My Exams</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage and organize your exam assessments
                        </p>
                    </div>
                    <Button onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Exam
                    </Button>
                </div>

                {/* Stats Section */}
                {exams.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="border-border">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{exams.length}</div>
                                <div className="text-xs text-muted-foreground mt-1">Total Exams</div>
                            </CardContent>
                        </Card>
                        <Card className="border-border">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">
                                    {Math.round(exams.reduce((acc, exam) => acc + exam.duration, 0) / exams.length)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Avg Duration (min)</div>
                            </CardContent>
                        </Card>
                        <Card className="border-border">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">
                                    {new Set(exams.map(exam => exam.language)).size}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Languages</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Content Section */}
                {exams.length === 0 ? (
                    <Card className="border-2 border-dashed border-border">
                        <CardContent className="text-center py-12">
                            <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Exams Created Yet</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                                Get started by creating your first exam assessment. You can add questions, set duration, and customize settings.
                            </p>
                            <Button onClick={handleCreateNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Exam
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map((exam) => (
                            <Card key={exam.id} className="group hover:shadow-md transition-all border-border">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                                                {exam.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-1">
                                                {formatDate(exam.createdAt)}
                                            </CardDescription>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(exam.id)}>
                                                    <Edit3 className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem
                                                            onSelect={(e) => e.preventDefault()}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete <span className="font-semibold">"{exam.title}"</span>?
                                                                This action cannot be undone and all associated data will be lost.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(exam.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                disabled={deletingId === exam.id}
                                                            >
                                                                {deletingId === exam.id ? "Deleting..." : "Delete"}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    {/* Exam Details */}
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            <Globe className="h-3 w-3 mr-1" />
                                            {exam.language}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {exam.duration}m
                                        </Badge>
                                        {exam.questionsCount && (
                                            <Badge variant="outline" className="text-xs">
                                                <FileText className="h-3 w-3 mr-1" />
                                                {exam.questionsCount} questions
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Full Date */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {formatDateTime(exam.createdAt)}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleEdit(exam.id)}
                                            className="flex-1"
                                        >
                                            <Edit3 className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="px-3"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Exam</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete <span className="font-semibold">"{exam.title}"</span>?
                                                        This action cannot be undone and all associated data will be lost.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(exam.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        disabled={deletingId === exam.id}
                                                    >
                                                        {deletingId === exam.id ? "Deleting..." : "Delete"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </ExaminerLayout>
    );
}