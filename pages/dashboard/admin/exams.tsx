"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    Plus, Edit3, Trash2, Save, X, BookOpen, Calendar, FileText,
} from "lucide-react";

import AdminLayout from "./layout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Exam = {
    id: number;
    title: string;
    description?: string;
    createdAt: string;
};

export default function ExamsPage() {
    const [positions, setPositions] = useState<Exam[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [editId, setEditId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchPositions = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/exams");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setPositions(data);
        } catch {
            toast.error("Failed to fetch exams");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description }),
            });
            if (!res.ok) throw new Error("Failed create");
            toast.success("Exam created successfully! 🎉");
            setTitle("");
            setDescription("");
            setIsDialogOpen(false);
            fetchPositions();
        } catch {
            toast.error("Failed to create exam");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch("/api/exams", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, title: editTitle, description: editDesc }),
            });
            if (!res.ok) throw new Error("Failed update");
            toast.success("Exam updated successfully! ✨");
            setEditId(null);
            fetchPositions();
        } catch {
            toast.error("Update failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch("/api/exams", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error("Failed delete");
            toast.success("Exam deleted successfully");
            fetchPositions();
        } catch {
            toast.error("Delete failed");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    return (
        <AdminLayout>
            {/* Page container */}
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 theme-transition">
                {/* Sticky header */}
                <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-4 theme-transition">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">Exam Management</h1>
                                <p className="text-sm text-muted-foreground">Create, manage, and organize exams with ease</p>
                            </div>
                        </div>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Exam
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Create New Exam</DialogTitle>
                                    <DialogDescription>Add a new exam to your collection.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Exam Title</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., Midterm Mathematics"
                                            required
                                            className="theme-transition"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="desc">Description</Label>
                                        <Textarea
                                            id="desc"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Short description of the exam..."
                                            rows={4}
                                            className="theme-transition"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={loading} className="gap-2">
                                            {loading ? (
                                                <>
                                                    <Save className="h-4 w-4 animate-pulse" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Create Exam
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Stats card */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card className="theme-transition">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-muted-foreground">Total Exams</CardTitle>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-semibold tracking-tight">{positions.length}</span>
                                <Badge variant="secondary" className="rounded-full">Active</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                                Keep exams organized and up-to-date.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="theme-transition">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-muted-foreground">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                                    <Plus className="h-4 w-4" />
                                    New Exam
                                </Button>
                                <Button variant="secondary" className="gap-2">
                                    <FileText className="h-4 w-4" />
                                    Templates
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* List header */}
                <div className="mb-3 flex items-center justify-between">
                    {/* <div className="text-sm text-muted-foreground">
                        {positions.length} Active Exams
                    </div> */}
                    <Separator className="hidden w-1/2 sm:block" />
                </div>

                {/* Grid of exams */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {!loading && positions.map((pos) => (
                        <Card key={pos.id} className="group relative overflow-hidden border theme-transition hover:shadow-sm hover:bg-accent/30">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                    {editId === pos.id ? (
                                        <Input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="font-semibold text-base theme-transition"
                                        />
                                    ) : (
                                        <CardTitle className="line-clamp-1 pr-8">{pos.title}</CardTitle>
                                    )}
                                    <Badge variant="outline" className="shrink-0">
                                        <Calendar className="mr-1 h-3.5 w-3.5" />
                                        {formatDate(pos.createdAt)}
                                    </Badge>
                                </div>
                                <CardDescription className="mt-2">
                                    {editId === pos.id ? (
                                        <Textarea
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            rows={3}
                                            className="theme-transition"
                                        />
                                    ) : (
                                        <p className="line-clamp-3 text-sm text-muted-foreground">
                                            {pos.description || "No description available"}
                                        </p>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {editId === pos.id ? (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleUpdate(pos.id)}
                                            disabled={loading}
                                            className="flex-1 gap-2"
                                        >
                                            <Save className="h-4 w-4" />
                                            Save
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setEditId(null)}
                                            className="flex-1 gap-2"
                                        >
                                            <X className="h-4 w-4" />
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 dark:hover:border-blue-900/40"
                                            onClick={() => {
                                                setEditId(pos.id);
                                                setEditTitle(pos.title);
                                                setEditDesc(pos.description || "");
                                            }}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                            Edit
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" className="flex-1 gap-2">
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Exam</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete “{pos.title}”? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-red-600 hover:bg-red-700"
                                                        onClick={() => handleDelete(pos.id)}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </CardContent>

                            {/* Accent gradient on hover */}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                <div className="h-full w-full bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
                            </div>
                        </Card>
                    ))}

                    {/* Empty state */}
                    {!loading && positions.length === 0 && (
                        <Card className="col-span-full theme-transition">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <CardTitle>No exams yet</CardTitle>
                                <CardDescription className="mt-1">
                                    Get started by creating your first exam. Click the button below to begin.
                                </CardDescription>
                                <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-4 gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Your First Exam
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Loading skeletons */}
                    {loading && positions.length === 0 &&
                        Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="pb-2">
                                    <div className="h-5 w-1/2 rounded bg-muted" />
                                    <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="h-16 w-full rounded bg-muted" />
                                    <div className="h-9 w-full rounded bg-muted" />
                                </CardContent>
                            </Card>
                        ))
                    }
                </div>
            </div>
        </AdminLayout>
    );
}
