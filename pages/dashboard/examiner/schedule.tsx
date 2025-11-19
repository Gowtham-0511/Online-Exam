import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Clock,
    Users,
    Calendar,
    CheckCircle,
    ArrowLeft,
    Loader2,
    Info,
    Plus,
    FileText
} from "lucide-react";
import useSWR from 'swr';
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";

const fetcher = async (url: string): Promise<any> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

interface Batch {
    Id: string;
    Name: string;
    EmployeeCount?: number;
}

interface User {
    id: string;
    email: string;
    name: string;
    type: 'employee' | 'external';
}

export default function ScheduleExam() {
    const router = useRouter();
    const { data: session } = useSession();

    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
    const [batchTimes, setBatchTimes] = useState<{ [key: string]: { startTime: string, endTime: string } }>({});

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');

    const [examDetails, setExamDetails] = useState<any>(null);

    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [userTimes, setUserTimes] = useState<{ [key: string]: { startTime: string, endTime: string } }>({});

    const [bulkUserTime, setBulkUserTime] = useState({ startTime: '', endTime: '' });
    const [showBulkTimeInput, setShowBulkTimeInput] = useState(false);

    const { data: availableBatches = [], mutate: mutateBatches } = useSWR<Batch[]>(
        '/api/admin/batch',
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: availableExams = [], mutate: mutateExams, isLoading: loadingExams } = useSWR<any[]>(
        session?.user?.email ? `/api/assessment/by-user?email=${session.user.email}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: usersData, mutate: mutateUsers } = useSWR<User[]>(
        ['/api/admin/employee', '/api/admin/external-users'],
        async (urls: [string, string]) => {
            const [employeesRes, externalUsersRes] = await Promise.all([
                fetch(urls[0]),
                fetch(urls[1])
            ]);

            if (!employeesRes.ok || !externalUsersRes.ok) {
                throw new Error('Failed to fetch users');
            }

            const employees = await employeesRes.json();
            const externalUsers = await externalUsersRes.json();

            return [
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
        },
        { revalidateOnFocus: false }
    );

    const availableUsers = usersData || [];

    useEffect(() => {
        if (selectedExamId) {
            const exam = availableExams.find(e => e.id === selectedExamId);
            setExamDetails(exam);
        }
    }, [selectedExamId, availableExams]);

    const handleScheduleExam = async () => {

        if (selectedBatches.length === 0 && selectedUsers.length === 0) {
            toast.error('Please select at least one batch or user');
            return;
        }

        if (selectedBatches.length > 0) {
            const incompleteBatchSchedules = selectedBatches.filter((batchId) => {
                const times = batchTimes[batchId];
                return !times?.startTime || !times?.endTime;
            });

            if (incompleteBatchSchedules.length > 0) {
                const batchNames = incompleteBatchSchedules
                    .map((batchId) => {
                        const batch = availableBatches.find((b) => b.Id === batchId);
                        return batch?.Name || batchId;
                    })
                    .join(", ");

                toast.error(`Please set start and end times for batches: ${batchNames}`);
                return;
            }
        }

        if (selectedUsers.length > 0) {
            const incompleteUserSchedules = selectedUsers.filter((userEmail) => {
                const times = userTimes[userEmail];
                return !times?.startTime || !times?.endTime;
            });

            if (incompleteUserSchedules.length > 0) {
                const userNames = incompleteUserSchedules
                    .map((email) => {
                        const user = availableUsers.find((u) => u.email === email);
                        return user?.name || email;
                    })
                    .join(", ");

                toast.error(`Please set start and end times for users: ${userNames}`);
                return;
            }
        }

        setIsLoading(true);

        try {
            const scheduleData = {
                assessmentId: selectedExamId,
                ...(selectedBatches.length > 0 && {
                    batchSchedules: selectedBatches.map((batchId) => ({
                        batchId,
                        startTime: batchTimes[batchId]?.startTime || "",
                        endTime: batchTimes[batchId]?.endTime || "",
                    }))
                }),
                ...(selectedUsers.length > 0 && {
                    userSchedules: selectedUsers.map((userEmail) => ({
                        userEmail,
                        startTime: userTimes[userEmail]?.startTime || "",
                        endTime: userTimes[userEmail]?.endTime || "",
                    }))
                })
            };

            const response = await fetch('/api/assessment/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scheduleData)
            });

            if (!response.ok) throw new Error('Failed to schedule exam');

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                router.push('/dashboard/examiner');
            }, 2000);

        } catch (error) {
            console.error('Error scheduling exam:', error);
            toast.error('Failed to schedule exam');
        } finally {
            setIsLoading(false);
        }
    };

    const applyBulkTimeToSelected = () => {
        if (!bulkUserTime.startTime || !bulkUserTime.endTime) {
            toast.error('Please set both start and end times');
            return;
        }

        const newUserTimes = { ...userTimes };
        selectedUsers.forEach(email => {
            newUserTimes[email] = {
                startTime: bulkUserTime.startTime,
                endTime: bulkUserTime.endTime
            };
        });
        setUserTimes(newUserTimes);
        toast.success(`Applied schedule to ${selectedUsers.length} users`);
    };

    // Update the entire return statement in schedule.tsx

    return (
        <UnifiedDashboardLayout role="examiner">
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Header Section */}
                <div className="border-b border-border bg-card">
                    <div className="container max-w-7xl mx-auto px-4 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">Schedule Assessment</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Assign exams to batches and users with custom schedules
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => router.push('/exam/create')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Exam
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="container max-w-7xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Sidebar - Exam Selection */}
                        <div className="lg:col-span-1">
                            <Card className="sticky top-6 border-border shadow-sm">
                                <CardHeader className="border-b border-border bg-muted/30">
                                    <CardTitle className="text-base font-semibold text-foreground">
                                        Select Assessment
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Choose an exam to schedule
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loadingExams ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                                            <p className="text-sm text-muted-foreground">Loading assessments...</p>
                                        </div>
                                    ) : availableExams.length > 0 ? (
                                        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                                            {availableExams.map((exam) => (
                                                <div
                                                    key={exam.id}
                                                    className={`p-4 cursor-pointer transition-all hover:bg-accent/50 ${selectedExamId === exam.id
                                                        ? 'bg-primary/10 border-l-4 border-l-primary'
                                                        : ''
                                                        }`}
                                                    onClick={() => setSelectedExamId(exam.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${selectedExamId === exam.id
                                                                ? 'bg-primary border-primary'
                                                                : 'border-muted-foreground/50'
                                                                }`}
                                                        >
                                                            {selectedExamId === exam.id && (
                                                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-sm text-foreground truncate">
                                                                {exam.title}
                                                            </h3>
                                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {exam.language}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {exam.duration}m
                                                                </span>
                                                                {/* <span className="text-xs text-muted-foreground">
                                                                    {exam.questions?.length } Q's
                                                                </span> */}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 px-4">
                                            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                                                <FileText className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">No assessments found</p>
                                            <Button onClick={() => router.push('/exam/create')} size="sm">
                                                Create Your First Exam
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Content - Assignment Section */}
                        <div className="lg:col-span-2 space-y-6">
                            {!selectedExamId ? (
                                <Card className="border-dashed border-2 border-border">
                                    <CardContent className="flex flex-col items-center justify-center py-16">
                                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <Calendar className="w-10 h-10 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground mb-2">
                                            No Assessment Selected
                                        </h3>
                                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                                            Select an assessment from the left panel to start scheduling
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    {/* Batch Assignment */}
                                    <Card className="border-border shadow-sm">
                                        <CardHeader className="border-b border-border bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                                        <Users className="w-5 h-5 text-primary" />
                                                        Batch Assignment
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-1">
                                                        Assign to entire batches with schedules
                                                    </CardDescription>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedBatches(availableBatches.map(b => b.Id));
                                                            const newTimes: { [key: string]: { startTime: string, endTime: string } } = {};
                                                            availableBatches.forEach(batch => {
                                                                newTimes[batch.Id] = { startTime: '', endTime: '' };
                                                            });
                                                            setBatchTimes(newTimes);
                                                        }}
                                                    >
                                                        Select All
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedBatches([]);
                                                            setBatchTimes({});
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            {availableBatches.length > 0 ? (
                                                <div className="space-y-3">
                                                    {availableBatches.map((batch) => (
                                                        <Card
                                                            key={batch.Id}
                                                            className={`transition-all border ${selectedBatches.includes(batch.Id)
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border hover:border-primary/50'
                                                                }`}
                                                        >
                                                            <CardContent className="p-4">
                                                                <div className="flex items-center gap-3 mb-4">
                                                                    <div
                                                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 ${selectedBatches.includes(batch.Id)
                                                                            ? 'bg-primary border-primary'
                                                                            : 'border-muted-foreground/50'
                                                                            }`}
                                                                        onClick={() => {
                                                                            setSelectedBatches(prev =>
                                                                                prev.includes(batch.Id)
                                                                                    ? prev.filter(id => id !== batch.Id)
                                                                                    : [...prev, batch.Id]
                                                                            );
                                                                            if (!selectedBatches.includes(batch.Id)) {
                                                                                setBatchTimes(prev => ({
                                                                                    ...prev,
                                                                                    [batch.Id]: { startTime: '', endTime: '' }
                                                                                }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        {selectedBatches.includes(batch.Id) && (
                                                                            <CheckCircle className="w-4 h-4 text-primary-foreground" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h4 className="font-semibold text-sm text-foreground">
                                                                            {batch.Name}
                                                                        </h4>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                            {batch.EmployeeCount || 0} employees enrolled
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {selectedBatches.includes(batch.Id) && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border">
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                                <Calendar className="w-3.5 h-3.5" />
                                                                                Start Time
                                                                            </Label>
                                                                            <Input
                                                                                type="datetime-local"
                                                                                value={batchTimes[batch.Id]?.startTime || ''}
                                                                                onChange={(e) => {
                                                                                    setBatchTimes(prev => ({
                                                                                        ...prev,
                                                                                        [batch.Id]: {
                                                                                            ...prev[batch.Id],
                                                                                            startTime: e.target.value
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                                className="h-9 text-sm"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                                <Clock className="w-3.5 h-3.5" />
                                                                                End Time
                                                                            </Label>
                                                                            <Input
                                                                                type="datetime-local"
                                                                                value={batchTimes[batch.Id]?.endTime || ''}
                                                                                onChange={(e) => {
                                                                                    setBatchTimes(prev => ({
                                                                                        ...prev,
                                                                                        [batch.Id]: {
                                                                                            ...prev[batch.Id],
                                                                                            endTime: e.target.value
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                                className="h-9 text-sm"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))}

                                                    {selectedBatches.length > 0 && (
                                                        <Alert className="bg-primary/5 border-primary/20">
                                                            <CheckCircle className="w-4 h-4 text-primary" />
                                                            <AlertDescription className="text-xs">
                                                                <span className="font-semibold text-foreground">
                                                                    {selectedBatches.length} batch(es) selected
                                                                </span>
                                                                <div className="mt-2 space-y-1">
                                                                    {selectedBatches.map(batchId => {
                                                                        const batch = availableBatches.find(b => b.Id === batchId);
                                                                        const times = batchTimes[batchId];
                                                                        return (
                                                                            <div key={batchId} className="flex items-center justify-between text-xs">
                                                                                <span className="text-muted-foreground">{batch?.Name}</span>
                                                                                <Badge variant={times?.startTime && times?.endTime ? "default" : "secondary"} className="text-xs">
                                                                                    {times?.startTime && times?.endTime ? '✓ Scheduled' : '⚠ Pending'}
                                                                                </Badge>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                                                        <Users className="w-8 h-8 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">No batches available</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* User Assignment */}
                                    <Card className="border-border shadow-sm">
                                        <CardHeader className="border-b border-border bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                                        <Users className="w-5 h-5 text-primary" />
                                                        Individual Users
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-1">
                                                        Select specific users with custom schedules
                                                    </CardDescription>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowBulkTimeInput(!showBulkTimeInput)}
                                                    >
                                                        <Clock className="w-4 h-4 mr-2" />
                                                        Bulk
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedUsers(availableUsers.map(u => u.email))}
                                                    >
                                                        Select All
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUsers([]);
                                                            setUserTimes({});
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="space-y-4">
                                                <Input
                                                    placeholder="🔍 Search users by name or email..."
                                                    value={userSearchQuery}
                                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                                    className="h-10"
                                                />

                                                {showBulkTimeInput && selectedUsers.length > 0 && (
                                                    <Card className="border-primary/30 bg-primary/5">
                                                        <CardContent className="p-4">
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-sm font-semibold text-foreground">
                                                                        Bulk Schedule for {selectedUsers.length} user(s)
                                                                    </Label>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setShowBulkTimeInput(false)}
                                                                    >
                                                                        ✕
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                            <Calendar className="w-3.5 h-3.5" />
                                                                            Start Time
                                                                        </Label>
                                                                        <Input
                                                                            type="datetime-local"
                                                                            value={bulkUserTime.startTime}
                                                                            onChange={(e) => setBulkUserTime(prev => ({
                                                                                ...prev,
                                                                                startTime: e.target.value
                                                                            }))}
                                                                            className="h-9 text-sm"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                            <Clock className="w-3.5 h-3.5" />
                                                                            End Time
                                                                        </Label>
                                                                        <Input
                                                                            type="datetime-local"
                                                                            value={bulkUserTime.endTime}
                                                                            onChange={(e) => setBulkUserTime(prev => ({
                                                                                ...prev,
                                                                                endTime: e.target.value
                                                                            }))}
                                                                            className="h-9 text-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    onClick={applyBulkTimeToSelected}
                                                                    disabled={!bulkUserTime.startTime || !bulkUserTime.endTime}
                                                                    className="w-full h-9"
                                                                    size="sm"
                                                                >
                                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                                    Apply to Selected Users
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                <div className="border border-border rounded-lg max-h-[500px] overflow-y-auto bg-card">
                                                    <div className="divide-y divide-border">
                                                        {availableUsers
                                                            .filter(user =>
                                                                user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                                user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                                            )
                                                            .map((user) => (
                                                                <div
                                                                    key={user.email}
                                                                    className={`p-4 transition-all ${selectedUsers.includes(user.email)
                                                                        ? 'bg-primary/5 border-l-4 border-l-primary'
                                                                        : 'hover:bg-accent/50'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div
                                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 ${selectedUsers.includes(user.email)
                                                                                ? 'bg-primary border-primary'
                                                                                : 'border-muted-foreground/50'
                                                                                }`}
                                                                            onClick={() => {
                                                                                setSelectedUsers(prev =>
                                                                                    prev.includes(user.email)
                                                                                        ? prev.filter(email => email !== user.email)
                                                                                        : [...prev, user.email]
                                                                                );
                                                                                if (!selectedUsers.includes(user.email)) {
                                                                                    setUserTimes(prev => ({
                                                                                        ...prev,
                                                                                        [user.email]: { startTime: '', endTime: '' }
                                                                                    }));
                                                                                }
                                                                            }}
                                                                        >
                                                                            {selectedUsers.includes(user.email) && (
                                                                                <CheckCircle className="w-4 h-4 text-primary-foreground" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-semibold text-sm text-foreground truncate">
                                                                                {user.name}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                                        </div>
                                                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                                                            {user.type === 'employee' ? 'Employee' : 'External'}
                                                                        </Badge>
                                                                    </div>

                                                                    {selectedUsers.includes(user.email) && (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border">
                                                                            <div className="space-y-1.5">
                                                                                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                                    Start Time
                                                                                </Label>
                                                                                <Input
                                                                                    type="datetime-local"
                                                                                    value={userTimes[user.email]?.startTime || ''}
                                                                                    onChange={(e) => {
                                                                                        setUserTimes(prev => ({
                                                                                            ...prev,
                                                                                            [user.email]: {
                                                                                                ...prev[user.email],
                                                                                                startTime: e.target.value
                                                                                            }
                                                                                        }));
                                                                                    }}
                                                                                    className="h-9 text-sm"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    End Time
                                                                                </Label>
                                                                                <Input
                                                                                    type="datetime-local"
                                                                                    value={userTimes[user.email]?.endTime || ''}
                                                                                    onChange={(e) => {
                                                                                        setUserTimes(prev => ({
                                                                                            ...prev,
                                                                                            [user.email]: {
                                                                                                ...prev[user.email],
                                                                                                endTime: e.target.value
                                                                                            }
                                                                                        }));
                                                                                    }}
                                                                                    className="h-9 text-sm"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                {selectedUsers.length > 0 && (
                                                    <Alert className="bg-primary/5 border-primary/20">
                                                        <CheckCircle className="w-4 h-4 text-primary" />
                                                        <AlertDescription className="text-xs">
                                                            <span className="font-semibold text-foreground">
                                                                {selectedUsers.length} user(s) selected
                                                            </span>
                                                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                                                {selectedUsers.map(userEmail => {
                                                                    const user = availableUsers.find(u => u.email === userEmail);
                                                                    const times = userTimes[userEmail];
                                                                    return (
                                                                        <div key={userEmail} className="flex items-center justify-between text-xs">
                                                                            <span className="text-muted-foreground truncate flex-1 mr-2">
                                                                                {user?.name}
                                                                            </span>
                                                                            <Badge variant={times?.startTime && times?.endTime ? "default" : "secondary"} className="text-xs flex-shrink-0">
                                                                                {times?.startTime && times?.endTime ? '✓ Scheduled' : '⚠ Pending'}
                                                                            </Badge>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button variant="outline" onClick={() => router.back()} size="lg">
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleScheduleExam}
                                            disabled={
                                                isLoading ||
                                                !selectedExamId ||
                                                (selectedBatches.length === 0 && selectedUsers.length === 0)
                                            }
                                            size="lg"
                                            className="min-w-[180px]"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Scheduling...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Schedule Assessment
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Success Modal */}
                {showSuccess && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md border-border shadow-2xl animate-in zoom-in-95 duration-200">
                            <CardContent className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">Success!</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Assessment scheduled successfully. Redirecting...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </UnifiedDashboardLayout>
    );
}