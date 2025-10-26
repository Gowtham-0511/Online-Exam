import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import ExaminerLayout from "./ExaminerLayout";
import { X, Edit2, Trash2, UserPlus, Clock, Shield, Users, Calendar, Search, Filter, MoreVertical, Check } from "lucide-react";

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
    id: string;
    name: string;
    description?: string;
}

export default function ViewExamsPage() {
    const { data: session } = useSession();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const router = useRouter();

    // Edit Dialog State
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        duration: 0,
        isExamProctored: false,
    });
    const [loadingEdit, setLoadingEdit] = useState(false);

    // Reassign Dialog State
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
        if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
            return;
        }

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

            const examRes = await fetch(`/api/admin/assessments/${encodeURIComponent(editingExam.id)}`, {
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

    const handleReassign = async (examId: string) => {
        const exam = exams.find(e => e.id === examId);
        if (!exam) return;

        setReassigningExam(exam);
        setReassignDialogOpen(true);
        setAssignmentType('user');
        setSelectedUsers([]);
        setSelectedBatches([]);

        // Fetch current assignments
        await fetchCurrentAssignments(examId);
        await fetchAvailableUsers();
        await fetchAvailableBatches();
    };

    const fetchCurrentAssignments = async (examId: string) => {
        try {
            const [userRes, batchRes] = await Promise.all([
                fetch(`/api/admin/assessments/user-assignments?assessmentId=${examId}`),
                fetch(`/api/admin/assessments/batch-assignments?assessmentId=${examId}`)
            ]);

            if (userRes.ok) {
                const userAssignments = await userRes.json();
                setSelectedUsers(userAssignments.map((u: any) => u.userEmail));
            }

            if (batchRes.ok) {
                const batchAssignments = await batchRes.json();
                setSelectedBatches(batchAssignments.map((b: any) => b.batchId));
            }
        } catch (error) {
            console.error('Error fetching current assignments:', error);
        }
    };

    const fetchAvailableUsers = async () => {
        setLoadingUsers(true);
        try {
            const [employeesRes, externalUsersRes] = await Promise.all([
                fetch('/api/admin/employee'),
                fetch('/api/admin/external-users')
            ]);

            if (employeesRes.ok && externalUsersRes.ok) {
                const employees = await employeesRes.json();
                const externalUsers = await externalUsersRes.json();

                const allUsers = [
                    ...employees.map((emp: any) => ({
                        id: emp.Id || emp.id,
                        email: emp.Email || emp.email,
                        name: emp.Name || emp.name,
                        type: 'employee' as const
                    })),
                    ...externalUsers.map((user: any) => ({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        type: 'external' as const
                    }))
                ];

                setAvailableUsers(allUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchAvailableBatches = async () => {
        setLoadingBatches(true);
        try {
            const response = await fetch('/api/admin/batch');
            if (response.ok) {
                const batches = await response.json();
                setAvailableBatches(batches);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            toast.error('Failed to load batches');
        } finally {
            setLoadingBatches(false);
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

            const assignmentRes = await fetch('/api/assessment/assignments', {
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
        setSelectedBatches(prev =>
            prev.includes(batchId)
                ? prev.filter(id => id !== batchId)
                : [...prev, batchId]
        );
    };

    const filteredUsers = availableUsers.filter(user =>
        user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
        user.email.toLowerCase().includes(searchUser.toLowerCase())
    );

    const filteredBatches = availableBatches.filter(batch =>
        console.log(batch)
        // batch.name.toLowerCase().includes(searchBatch.toLowerCase())
    );

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.language.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || exam.assignmentType === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <ExaminerLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Loading exams...</p>
                    </div>
                </div>
            </ExaminerLayout>
        );
    }

    return (
        <ExaminerLayout>
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="border-b border-border bg-card">
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold text-foreground">My Assessments</h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Manage and track your created assessments
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/dashboard/examiner')}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                            >
                                Create Assessment
                            </button>
                        </div>

                        {/* Search and Filter Bar */}
                        <div className="mt-6 flex gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search assessments..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                            >
                                <option value="all">All Types</option>
                                <option value="user">User Assigned</option>
                                <option value="batch">Batch Assigned</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-6 py-6">
                    {filteredExams.length === 0 ? (
                        <div className="text-center py-16 bg-card rounded-lg border border-border">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                {searchQuery || filterStatus !== 'all' ? 'No assessments found' : 'No assessments yet'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                {searchQuery || filterStatus !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Get started by creating your first assessment'}
                            </p>
                            {!searchQuery && filterStatus === 'all' && (
                                <button
                                    onClick={() => router.push('/dashboard/examiner')}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                                >
                                    Create Assessment
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredExams.map((exam) => (
                                <div
                                    key={exam.id}
                                    className="bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
                                >
                                    <div className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1">
                                                        <h3 className="text-base font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
                                                            {exam.title}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="h-4 w-4" />
                                                                <span>{exam.duration} mins</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="h-4 w-4" />
                                                                <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                                                                    {exam.language}
                                                                </span>
                                                                {exam.isExamProctored && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                                                                        <Shield className="h-3 w-3" />
                                                                        Proctored
                                                                    </span>
                                                                )}
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                                                    {exam.assignmentType}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={() => handleEdit(exam.id)}
                                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleReassign(exam.id)}
                                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                                    title="Reassign"
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(exam.id)}
                                                    disabled={deletingId === exam.id}
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    {deletingId === exam.id ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Edit Dialog */}
                {editDialogOpen && editingExam && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full">
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h2 className="text-lg font-semibold text-foreground">Edit Assessment</h2>
                                <button
                                    onClick={() => setEditDialogOpen(false)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Assessment Title
                                    </label>
                                    <input
                                        type="text"
                                        value={editingExam.title}
                                        disabled
                                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-muted-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Duration (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.duration}
                                        onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                                        min="1"
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="isExamProctored"
                                        checked={editForm.isExamProctored}
                                        onChange={(e) => setEditForm({ ...editForm, isExamProctored: e.target.checked })}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                                    />
                                    <label htmlFor="isExamProctored" className="text-sm font-medium text-foreground cursor-pointer flex-1">
                                        Enable Proctoring
                                    </label>
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>

                            <div className="flex gap-3 p-6 border-t border-border">
                                <button
                                    onClick={() => setEditDialogOpen(false)}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={loadingEdit}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {loadingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reassign Dialog */}
                {reassignDialogOpen && reassigningExam && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-card border border-border rounded-lg shadow-lg max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Reassign Assessment</h2>
                                    <p className="text-sm text-muted-foreground mt-1">{reassigningExam.title}</p>
                                </div>
                                <button
                                    onClick={() => setReassignDialogOpen(false)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto flex-1">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-3">
                                        Assignment Type
                                    </label>
                                    <div className="flex gap-3">
                                        {['user', 'batch', 'both'].map((type) => (
                                            <label
                                                key={type}
                                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${assignmentType === type
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    value={type}
                                                    checked={assignmentType === type}
                                                    onChange={(e) => setAssignmentType(e.target.value as any)}
                                                    className="sr-only"
                                                />
                                                <span className={`text-sm font-medium ${assignmentType === type ? 'text-primary' : 'text-foreground'
                                                    }`}>
                                                    {type === 'user' ? 'Users Only' : type === 'batch' ? 'Batches Only' : 'Both'}
                                                </span>
                                                {assignmentType === type && <Check className="h-4 w-4 text-primary" />}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {(assignmentType === 'user' || assignmentType === 'both') && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-3">
                                            Select Users
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                ({selectedUsers.length} selected)
                                            </span>
                                        </label>
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder="Search users..."
                                                value={searchUser}
                                                onChange={(e) => setSearchUser(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                                            />
                                        </div>
                                        <div className="border border-border rounded-lg max-h-64 overflow-y-auto bg-background">
                                            {loadingUsers ? (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                                    Loading users...
                                                </div>
                                            ) : filteredUsers.length === 0 ? (
                                                <div className="p-8 text-center text-muted-foreground">No users found</div>
                                            ) : (
                                                filteredUsers.map((user) => (
                                                    <label
                                                        key={user.email}
                                                        className="flex items-center p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.includes(user.email)}
                                                            onChange={() => toggleUserSelection(user.email)}
                                                            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                                                        />
                                                        <div className="ml-3 flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                                                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                                        </div>
                                                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground ml-2">
                                                            {user.type}
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(assignmentType === 'batch' || assignmentType === 'both') && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-3">
                                            Select Batches
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                ({selectedBatches.length} selected)
                                            </span>
                                        </label>
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder="Search batches..."
                                                value={searchBatch}
                                                onChange={(e) => setSearchBatch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground">
                                            </input>
                                        </div>
                                        <div className="border border-border rounded-lg max-h-64 overflow-y-auto bg-background">
                                            {loadingBatches ? (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                                    Loading batches...
                                                </div>
                                            ) : filteredBatches.length === 0 ? (
                                                <div className="p-8 text-center text-muted-foreground">No batches found</div>
                                            ) : (
                                                filteredBatches.map((batch) => (
                                                    <label
                                                        key={batch.id}
                                                        className="flex items-center p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBatches.includes(batch.id)}
                                                            onChange={() => toggleBatchSelection(batch.id)}
                                                            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                                                        />
                                                        <div className="ml-3 flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-foreground truncate">{batch.name}</div>
                                                            {batch.description && (
                                                                <div className="text-xs text-muted-foreground truncate">{batch.description}</div>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 p-6 border-t border-border">
                                <button
                                    onClick={() => setReassignDialogOpen(false)}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveReassignment}
                                    disabled={loadingReassign}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {loadingReassign ? 'Reassigning...' : 'Reassign Assessment'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ExaminerLayout>
    );
}