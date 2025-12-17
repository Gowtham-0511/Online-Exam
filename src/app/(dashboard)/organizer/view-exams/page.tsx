"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR, { mutate } from 'swr';
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import toast from "react-hot-toast";
import {
    FileText,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Clock,
    Shield,
    Users,
    Calendar,
    Edit2,
    Trash2,
    UserPlus,
    CheckCircle,
    XCircle,
    Loader2,
    ChevronRight,
    Briefcase,
    Globe,
    AlertCircle,
    Sparkles,
    LayoutGrid,
    List
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Exam {
    id: string;
    title: string;
    language: string;
    duration: number;
    createdAt: string;
    status?: "draft" | "published" | "archived";
    isExamProctored: boolean;
    assignmentType: string;
    questionsCount?: number;
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
    EmployeeCount?: number;
}

export default function ViewExamsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    // --- State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [view, setView] = useState<'grid' | 'list'>('grid');

    // Edit Dialog State
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({ duration: 0, isExamProctored: false });
    const [loadingEdit, setLoadingEdit] = useState(false);

    // Reassign Dialog State
    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [reassigningExam, setReassigningExam] = useState<Exam | null>(null);
    const [assignmentType, setAssignmentType] = useState<'user' | 'batch' | 'both'>('user');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
    const [assignSearchQuery, setAssignSearchQuery] = useState('');
    const [loadingReassign, setLoadingReassign] = useState(false);

    // --- Data Fetching ---
    const { data: exams = [], error, isLoading } = useSWR(
        session?.user?.email
            ? `/api/organizer/assessment/by-user?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    // Fetch Users & Batches
    const { data: batches = [] } = useSWR<Batch[]>(
        session?.user?.email ? '/api/organizer/batch' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: users = [] } = useSWR<User[]>(
        session?.user?.email ? ['/api/organizer/employee', '/api/organizer/external-users'] : null,
        async (urls: string[]) => {
            const [employees, external] = await Promise.all([
                fetch(urls[0]).then(res => res.ok ? res.json() : []),
                fetch(urls[1]).then(res => res.ok ? res.json() : [])
            ]);
            return [
                ...employees.map((e: any) => ({ ...e, id: e.Id || e.id, email: e.Email || e.email, name: e.Name || e.name, type: 'employee' })),
                ...external.map((e: any) => ({ ...e, type: 'external' }))
            ];
        },
        { revalidateOnFocus: false }
    );

    // --- GSAP Animations ---
    useGSAP(() => {
        if (isLoading) return;

        gsap.set(".animate-item", { autoAlpha: 1 });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo(".animate-header",
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5 }
        );

        tl.fromTo(".animate-item",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.05 },
            "-=0.3"
        );

    }, { scope: containerRef, dependencies: [isLoading, exams] });

    // --- Helpers ---
    const filteredExams = useMemo(() => {
        return exams.filter((exam: Exam) => {
            const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                exam.language.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterStatus === 'all' || exam.assignmentType === filterStatus;
            return matchesSearch && matchesFilter;
        });
    }, [exams, searchQuery, filterStatus]);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.name.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(assignSearchQuery.toLowerCase())
        );
    }, [users, assignSearchQuery]);

    const filteredBatches = useMemo(() => {
        return batches.filter(b =>
            b.Name.toLowerCase().includes(assignSearchQuery.toLowerCase())
        );
    }, [batches, assignSearchQuery]);

    const getLanguageIcon = (lang: string) => {
        const l = lang.toLowerCase();
        if (l.includes('python')) return "🐍";
        if (l.includes('java') && !l.includes('script')) return "☕";
        if (l.includes('script')) return "⚡";
        if (l.includes('sql')) return "🗄️";
        if (l.includes('c++') || l.includes('cpp')) return "⚙️";
        return "💻";
    };

    const getAssignmentColor = (type: string) => {
        switch (type) {
            case 'user': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'batch': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'both': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    // --- Actions ---
    const handleDelete = async (examId: string) => {
        if (!confirm('Are you sure? This cannot be undone.')) return;

        try {
            await fetch(`/api/organizer/assessment/delete/${examId}`, { method: "DELETE" });
            toast.success("Exam deleted");
            mutate(`/api/organizer/assessment/by-user?email=${encodeURIComponent(session?.user?.email || '')}`);
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const handleEdit = (exam: Exam) => {
        setEditingExam(exam);
        setEditForm({ duration: exam.duration, isExamProctored: exam.isExamProctored });
        setEditDialogOpen(true);
    };

    const saveEdit = async () => {
        if (!editingExam) return;
        setLoadingEdit(true);
        try {
            await fetch(`/api/organizer/assessment/${encodeURIComponent(editingExam.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editForm, assignmentType: editingExam.assignmentType })
            });
            toast.success("Exam updated");
            setEditDialogOpen(false);
            mutate(`/api/organizer/assessment/by-user?email=${encodeURIComponent(session?.user?.email || '')}`);
        } catch (e) {
            toast.error("Update failed");
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleReassign = (exam: Exam) => {
        setReassigningExam(exam);
        setSelectedUsers([]);
        setSelectedBatches([]);
        setAssignmentType(exam.assignmentType as any === 'user' ? 'user' : exam.assignmentType === 'batch' ? 'batch' : 'both');
        setReassignDialogOpen(true);
    };

    const saveReassignment = async () => {
        if (!reassigningExam) return;
        if (assignmentType === 'user' && !selectedUsers.length) return toast.error("Select at least one user");
        if (assignmentType === 'batch' && !selectedBatches.length) return toast.error("Select at least one batch");
        if (assignmentType === 'both' && (!selectedUsers.length && !selectedBatches.length)) return toast.error("Select users or batches");

        setLoadingReassign(true);
        try {
            await fetch('/api/organizer/assessment/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId: reassigningExam.id,
                    type: assignmentType,
                    userEmails: selectedUsers,
                    batchAssignments: selectedBatches.map(b => ({ batchId: b, assessmentId: reassigningExam.id }))
                })
            });
            toast.success("Assignments updated");
            setReassignDialogOpen(false);
            mutate(`/api/organizer/assessment/by-user?email=${encodeURIComponent(session?.user?.email || '')}`);
        } catch (e) {
            toast.error("Assignment failed");
        } finally {
            setLoadingReassign(false);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
                <p className="text-muted-foreground mb-6">Failed to load your assessments.</p>
                <Button onClick={() => window.location.reload()}>Reload Page</Button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background/50 p-6 lg:p-10 font-sans">
            {/* Header */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-header opacity-0">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary" />
                            My Assessments
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Manage and track your technical evaluations.
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={() => router.push('/organizer/create')}
                        className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Assessment
                    </Button>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 animate-header opacity-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assessments..."
                            className="pl-9 bg-background border-border/50 h-11"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-[180px] h-11 bg-background border-border/50">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="All Types" />
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

                {/* Content */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-[200px] rounded-xl" />
                        ))}
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5 animate-header opacity-0">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">No assessments found</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                            {searchQuery ? "Try adjusting your search filters." : "Get started by creating your first technical assessment."}
                        </p>
                        {!searchQuery && (
                            <Button variant="outline" className="mt-6" onClick={() => router.push('/organizer/create')}>
                                Create Now
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredExams.map((exam: Exam) => (
                            <Card key={exam.id} className="animate-item opacity-0 group hover:shadow-lg transition-all border-border/50 overflow-hidden flex flex-col">
                                <CardHeader className="p-4 pb-2 relative">
                                    <div className="flex justify-between items-start">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl group-hover:scale-105 transition-transform duration-300">
                                            {getLanguageIcon(exam.language)}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(exam)}>
                                                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleReassign(exam)}>
                                                    <UserPlus className="w-4 h-4 mr-2" /> Reassign
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(exam.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <CardTitle className="mt-2 text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors" title={exam.title}>
                                        {exam.title}
                                    </CardTitle>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                                            {exam.language}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">• {new Date(exam.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-4 pt-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded border border-transparent hover:border-border/50 transition-colors">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="font-medium">{exam.duration}m</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded border border-transparent hover:border-border/50 transition-colors">
                                            <Shield className={`w-3.5 h-3.5 ${exam.isExamProctored ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                            <span className="font-medium">{exam.isExamProctored ? 'Proctored' : 'Standard'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 border-t border-border/50 bg-muted/10 p-3 flex justify-between items-center">
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${getAssignmentColor(exam.assignmentType)} bg-opacity-10`}>
                                        {exam.assignmentType === 'user' && <Users className="w-3 h-3" />}
                                        {exam.assignmentType === 'batch' && <Briefcase className="w-3 h-3" />}
                                        {exam.assignmentType === 'both' && <Globe className="w-3 h-3" />}
                                        <span className="capitalize">{exam.assignmentType}</span>
                                    </div>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-primary/10 hover:text-primary rounded-full transition-colors" onClick={() => handleEdit(exam)}>
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">Edit Details</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </CardFooter>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Details</DialogTitle>
                        <DialogDescription>Modify settings for {editingExam?.title}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={editForm.duration}
                                onChange={e => setEditForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Proctoring Enabled</Label>
                                <p className="text-xs text-muted-foreground">Monitor tab switching</p>
                            </div>
                            <Switch
                                checked={editForm.isExamProctored}
                                onCheckedChange={checked => setEditForm(prev => ({ ...prev, isExamProctored: checked }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveEdit} disabled={loadingEdit}>
                            {loadingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reassign Dialog */}
            <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Reassign Assessment</DialogTitle>
                        <DialogDescription>Assign <span className="font-semibold text-primary">{reassigningExam?.title}</span> to new candidates.</DialogDescription>
                    </DialogHeader>

                    <Tabs value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="user">Users</TabsTrigger>
                            <TabsTrigger value="batch">Batches</TabsTrigger>
                            <TabsTrigger value="both">Both</TabsTrigger>
                        </TabsList>

                        {/* Common Search */}
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search candidates..."
                                className="pl-9"
                                value={assignSearchQuery}
                                onChange={e => setAssignSearchQuery(e.target.value)}
                            />
                        </div>

                        <TabsContent value="user" className="mt-0 space-y-4">
                            <ScrollArea className="h-[250px] border rounded-md p-2">
                                {filteredUsers.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No users found.</div>
                                ) : filteredUsers.map(user => (
                                    <div
                                        key={user.email}
                                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedUsers.includes(user.email) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                        onClick={() => setSelectedUsers(prev => prev.includes(user.email) ? prev.filter(e => e !== user.email) : [...prev, user.email])}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                        {selectedUsers.includes(user.email) && <CheckCircle className="w-4 h-4 text-primary" />}
                                    </div>
                                ))}
                            </ScrollArea>
                            <p className="text-xs text-muted-foreground text-right">{selectedUsers.length} users selected</p>
                        </TabsContent>

                        <TabsContent value="batch" className="mt-0 space-y-4">
                            <ScrollArea className="h-[250px] border rounded-md p-2">
                                {filteredBatches.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No batches found.</div>
                                ) : filteredBatches.map(batch => (
                                    <div
                                        key={batch.Id}
                                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedBatches.includes(batch.Id) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                        onClick={() => setSelectedBatches(prev => prev.includes(batch.Id) ? prev.filter(e => e !== batch.Id) : [...prev, batch.Id])}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{batch.Name}</span>
                                            {batch.description && <span className="text-xs text-muted-foreground">{batch.description}</span>}
                                        </div>
                                        {selectedBatches.includes(batch.Id) && <CheckCircle className="w-4 h-4 text-primary" />}
                                    </div>
                                ))}
                            </ScrollArea>
                            <p className="text-xs text-muted-foreground text-right">{selectedBatches.length} batches selected</p>
                        </TabsContent>

                        <TabsContent value="both" className="mt-0">
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-muted-foreground">Select both users and batches from the tabs above or use the mixed search.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border rounded-md p-3 h-[200px] overflow-auto">
                                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Users</h4>
                                        {filteredUsers.map(user => (
                                            <div
                                                key={user.email}
                                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-sm ${selectedUsers.includes(user.email) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                                onClick={() => setSelectedUsers(prev => prev.includes(user.email) ? prev.filter(e => e !== user.email) : [...prev, user.email])}
                                            >
                                                <span className="truncate w-32">{user.name}</span>
                                                {selectedUsers.includes(user.email) && <CheckCircle className="w-3 h-3 text-primary" />}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border rounded-md p-3 h-[200px] overflow-auto">
                                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Batches</h4>
                                        {filteredBatches.map(batch => (
                                            <div
                                                key={batch.Id}
                                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-sm ${selectedBatches.includes(batch.Id) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                                onClick={() => setSelectedBatches(prev => prev.includes(batch.Id) ? prev.filter(e => e !== batch.Id) : [...prev, batch.Id])}
                                            >
                                                <span className="truncate w-32">{batch.Name}</span>
                                                {selectedBatches.includes(batch.Id) && <CheckCircle className="w-3 h-3 text-primary" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground text-right">{selectedUsers.length} users, {selectedBatches.length} batches selected</p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveReassignment} disabled={loadingReassign}>
                            {loadingReassign ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            Confirm Assignment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}