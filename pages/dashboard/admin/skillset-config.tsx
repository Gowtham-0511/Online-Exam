"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AdminLayout from "./layout";

import {
    Plus, Save, CheckCircle2, Cpu, Layers, Filter, BookOpen, ListChecks, Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Skill = { id: number; name: string };
type Exam = { id: number; title: string };

export default function SkillsetConfigPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [adding, setAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");

    // Fetchers
    const fetchExams = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/exams");
            if (!res.ok) throw new Error();
            const data = await res.json();
            setExams(data);
        } catch {
            toast.error("Failed to fetch exams");
        } finally {
            setLoading(false);
        }
    };

    const fetchSkills = async () => {
        try {
            const res = await fetch("/api/skills");
            if (!res.ok) throw new Error();
            const data = await res.json();
            setSkills(data);
        } catch {
            toast.error("Failed to fetch skills");
        }
    };

    const fetchExamSkills = async (examId: number) => {
        try {
            const res = await fetch(`/api/exam-skill-map?examId=${examId}`);
            if (!res.ok) throw new Error();
            const data: Skill[] = await res.json();
            setSelectedSkillIds(data.map((s) => s.id));
        } catch {
            toast.error("Failed to fetch mapped skills");
        }
    };

    useEffect(() => {
        fetchExams();
        fetchSkills();
    }, []);

    useEffect(() => {
        if (selectedExamId) fetchExamSkills(selectedExamId);
    }, [selectedExamId]);

    // Actions
    const handleSubmitMap = async () => {
        if (!selectedExamId) return;
        setSaving(true);
        try {
            const res = await fetch("/api/exam-skill-map", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId: selectedExamId, skillIds: selectedSkillIds }),
            });
            if (!res.ok) throw new Error();
            toast.success("Skills mapped successfully!");
        } catch {
            toast.error("Failed to map skills");
        } finally {
            setSaving(false);
        }
    };

    const toggleSkill = (id: number) => {
        setSelectedSkillIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleAddSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSkill.trim()) return;
        setAdding(true);
        try {
            const res = await fetch("/api/skills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSkill.trim() }),
            });
            if (!res.ok) throw new Error();
            toast.success("Skill added!");
            setNewSkill("");
            await fetchSkills();
        } catch {
            toast.error("Failed to add skill");
        } finally {
            setAdding(false);
        }
    };

    const selectedExam = useMemo(
        () => exams.find((e) => e.id === selectedExamId) || null,
        [exams, selectedExamId]
    );

    const filteredSkills = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return skills;
        return skills.filter((s) => s.name.toLowerCase().includes(q));
    }, [skills, filter]);

    return (
        <AdminLayout>
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 theme-transition">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-4 theme-transition">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <ListChecks className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">Skillset Configuration</h1>
                                <p className="text-sm text-muted-foreground">
                                    Map skills to exams and manage your skill catalog
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="gap-2 theme-transition"
                                            onClick={() => {
                                                fetchExams();
                                                fetchSkills();
                                                if (selectedExamId) fetchExamSkills(selectedExamId);
                                            }}
                                        >
                                            <Cpu className="h-4 w-4" />
                                            Refresh
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={8}>Reload data</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <AlertDialog>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Save Skill Mappings</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Confirm saving mappings for “{selectedExam?.title || "—"}”.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleSubmitMap}
                                            className="gap-2"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Save
                                                </>
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>

                                <Button
                                    variant="default"
                                    className="gap-2"
                                    disabled={!selectedExamId}
                                    asChild={false}
                                >
                                    <span
                                        onClick={(e) => {
                                            // Open dialog only if exam is selected; otherwise toast.
                                            if (!selectedExamId) {
                                                e.preventDefault();
                                                toast.error("Select an exam first");
                                            }
                                        }}
                                    >
                                        <Save className="h-4 w-4" />
                                        Save Mappings
                                    </span>
                                </Button>
                            </AlertDialog>
                        </div>
                    </div>
                </div>

                {/* Top Stats */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="theme-transition">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-muted-foreground">Exams</CardTitle>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-semibold tracking-tight">{exams.length}</span>
                                <Badge variant="secondary" className="rounded-full">Total</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                                Choose an exam to configure skills.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="theme-transition">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-muted-foreground">Skills</CardTitle>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-semibold tracking-tight">{skills.length}</span>
                                <Badge variant="secondary" className="rounded-full">Available</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                                Create skills and map them to exams.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="theme-transition">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium text-muted-foreground">Selected</CardTitle>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-semibold tracking-tight">{selectedSkillIds.length}</span>
                                <Badge variant="secondary" className="rounded-full">Skills</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                                Current mapping count for the chosen exam.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Left: Selection + Create */}
                    <Card className="lg:col-span-1 theme-transition">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                Exam Selection
                            </CardTitle>
                            <CardDescription>Pick an exam and review its skills.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="exam">Select Exam</Label>
                                <Select
                                    value={selectedExamId ? String(selectedExamId) : ""}
                                    onValueChange={(v) => setSelectedExamId(Number(v))}
                                >
                                    <SelectTrigger id="exam" className="theme-transition">
                                        <SelectValue placeholder="Choose an exam..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams.map((exam) => (
                                            <SelectItem key={exam.id} value={String(exam.id)}>
                                                {exam.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Current selection summary */}
                            <div className="rounded-lg border p-3 theme-transition">
                                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                                    <Layers className="h-4 w-4 text-primary" />
                                    Current Selection
                                </div>
                                <div className="text-sm">
                                    <div className="text-muted-foreground">
                                        Exam: <span className="text-foreground">{selectedExam?.title || "—"}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                        Selected Skills:{" "}
                                        <span className="text-foreground">{selectedSkillIds.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Create skill */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2 w-full">
                                        <Plus className="h-4 w-4" />
                                        Add New Skill
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Create Skill</DialogTitle>
                                        <DialogDescription>
                                            Add a new skill to your global skill catalog.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAddSkill} className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="skillName">Skill name</Label>
                                            <Input
                                                id="skillName"
                                                value={newSkill}
                                                onChange={(e) => setNewSkill(e.target.value)}
                                                placeholder="e.g., Algebra, Data Structures"
                                                className="theme-transition"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={adding} className="gap-2">
                                                {adding ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Add Skill
                                                    </>
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    {/* Right: Skills mapping */}
                    <Card className="lg:col-span-2 theme-transition">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-semibold tracking-tight">
                                        Skills for {selectedExam?.title || "—"}
                                    </h2>
                                    <Badge variant="outline">{selectedSkillIds.length} selected</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Filter className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Filter skills..."
                                            value={filter}
                                            onChange={(e) => setFilter(e.target.value)}
                                            className="pl-8 w-56 theme-transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {!selectedExamId ? (
                                <div className="flex h-56 items-center justify-center rounded border bg-muted/20 theme-transition">
                                    <div className="text-center">
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <ListChecks className="h-6 w-6" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Select an exam to configure its skills
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {loading && skills.length === 0 ? (
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                            {Array.from({ length: 8 }).map((_, i) => (
                                                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <ScrollArea className="h-[420px] pr-2">
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                                    {filteredSkills.map((skill) => {
                                                        const active = selectedSkillIds.includes(skill.id);
                                                        return (
                                                            <button
                                                                key={skill.id}
                                                                onClick={() => toggleSkill(skill.id)}
                                                                className={[
                                                                    "group flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm theme-transition",
                                                                    active
                                                                        ? "bg-primary/10 border-primary/30 text-foreground"
                                                                        : "bg-card hover:bg-accent/50",
                                                                ].join(" ")}
                                                            >
                                                                <span className="line-clamp-1">{skill.name}</span>
                                                                <span
                                                                    className={[
                                                                        "ml-2 h-2 w-2 rounded-full transition-colors",
                                                                        active ? "bg-primary" : "bg-muted-foreground/30",
                                                                    ].join(" ")}
                                                                />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </ScrollArea>

                                            <div className="mt-4 flex items-center justify-between">
                                                <p className="text-xs text-muted-foreground">
                                                    Tip: Click a skill to toggle selection. Use the filter to narrow results.
                                                </p>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            disabled={!selectedExamId}
                                                            className="gap-2"
                                                        >
                                                            {saving ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                    Saving...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Save className="h-4 w-4" />
                                                                    Save Mappings
                                                                </>
                                                            )}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Save {selectedSkillIds.length} skill(s) for “{selectedExam?.title}”?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleSubmitMap}>
                                                                Confirm
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
