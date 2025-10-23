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

interface Exam {
    id: string;
    title: string;
    language: string;
    duration: number;
    createdAt: string;
    questionsCount?: number;
    status?: "draft" | "published" | "archived";
}

export default function ViewExamsPage() {
    const { data: session } = useSession();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

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

    const handleEdit = (examId: string) => {
        console.log('Edit exam with ID:', examId);
        toast.success('Edit functionality coming soon!');
    };

    const handleCreateNew = () => {
        router.push('/dashboard/examiner');
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

    return (
        <ExaminerLayout>
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