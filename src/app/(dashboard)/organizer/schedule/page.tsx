"use client";

import { useState, useEffect } from "react";
// import { useRouter } from "next/router";
import { useMsal } from "@azure/msal-react";
import Head from "next/head";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Clock,
    Users,
    Calendar,
    CheckCircle,
    ArrowLeft,
    Loader2,
    Info,
    Plus,
    FileText,
    Search,
    ChevronRight,
    User,
    Briefcase,
    Globe,
    AlertCircle,
    RefreshCcw
} from "lucide-react";
import useSWR from 'swr';
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
    const { instance, accounts } = useMsal();
    const session = accounts[0];

    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [failedEmails, setFailedEmails] = useState<string[]>([]);
    const [isRetrying, setIsRetrying] = useState(false);

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
        '/api/organizer/batch',
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: availableExams = [], mutate: mutateExams, isLoading: loadingExams } = useSWR<any[]>(
        session?.username ? `/api/organizer/assessment/by-user?email=${session.username}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: usersData, mutate: mutateUsers } = useSWR<User[]>(
        ['/api/organizer/employee', '/api/organizer/external-users'],
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

            const response = await fetch('/api/organizer/assessment/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scheduleData)
            });

            if (!response.ok) throw new Error('Failed to schedule exam');

            const data = await response.json();

            if (data.failedEmails && data.failedEmails.length > 0) {
                setFailedEmails(data.failedEmails);
                toast.error(`Scheduled, but failed to email ${data.failedEmails.length} users.`);
            } else {
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    router.push('/organizer');
                }, 2000);
            }

        } catch (error) {
            console.error('Error scheduling exam:', error);
            toast.error('Failed to schedule exam');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = async () => {
        if (!selectedExamId || failedEmails.length === 0) return;
        setIsRetrying(true);
        try {
            const res = await fetch('/api/organizer/assessment/retry-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId: selectedExamId,
                    emails: failedEmails
                })
            });
            const data = await res.json();
            if (data.failedEmails && data.failedEmails.length > 0) {
                setFailedEmails(data.failedEmails);
                toast.error(`Retry failed for ${data.failedEmails.length} users.`);
            } else {
                setFailedEmails([]);
                toast.success("Emails sent successfully!");
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    router.push('/organizer');
                }, 2000);
            }
        } catch (e) {
            toast.error("Retry failed");
        } finally {
            setIsRetrying(false);
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

    return (
        <div className="min-h-screen bg-background/50">
            {/* Header Section */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Schedule Assessment
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Assign exams to batches and users with custom schedules
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => router.push('/organizer/create-exam')} className="hidden sm:flex">
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Exam
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar - Exam Selection */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm sticky top-28 max-h-[calc(100vh-8rem)] flex flex-col">
                            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Select Assessment
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Choose an exam to schedule
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-hidden">
                                {loadingExams ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <p className="text-sm text-muted-foreground animate-pulse">Loading assessments...</p>
                                    </div>
                                ) : availableExams.length > 0 ? (
                                    <ScrollArea className="h-[500px]">
                                        <div className="divide-y divide-border/50">
                                            {availableExams.map((exam) => (
                                                <div
                                                    key={exam.id}
                                                    className={cn(
                                                        "p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50 group relative",
                                                        selectedExamId === exam.id && "bg-primary/5 hover:bg-primary/10"
                                                    )}
                                                    onClick={() => setSelectedExamId(exam.id)}
                                                >
                                                    {selectedExamId === exam.id && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                                    )}
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                                            selectedExamId === exam.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                                                        )}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className={cn(
                                                                "font-medium text-sm truncate transition-colors",
                                                                selectedExamId === exam.id ? "text-primary" : "text-foreground"
                                                            )}>
                                                                {exam.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-background/50">
                                                                    {exam.language}
                                                                </Badge>
                                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {exam.duration}m
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {selectedExamId === exam.id && (
                                                            <CheckCircle className="w-4 h-4 text-primary animate-in zoom-in duration-200" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground">No assessments found</p>
                                            <p className="text-xs text-muted-foreground">Create a new exam to get started</p>
                                        </div>
                                        <Button onClick={() => router.push('/organizer/create-exam')} size="sm" variant="outline">
                                            Create Exam
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Content - Assignment Section */}
                    <div className="lg:col-span-8 space-y-6">
                        {!selectedExamId ? (
                            <Card className="border-dashed border-2 border-border/60 bg-muted/5 h-full min-h-[400px] flex items-center justify-center">
                                <CardContent className="flex flex-col items-center justify-center text-center space-y-4 max-w-sm p-8">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
                                        <Calendar className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold text-foreground">
                                            No Assessment Selected
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Select an assessment from the left panel to start scheduling batches and users.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Batch Assignment */}
                                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                    <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-primary" />
                                                    Batch Assignment
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Assign to entire batches with schedules
                                                </CardDescription>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs"
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
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
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
                                    <CardContent className="p-6">
                                        {availableBatches.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-4">
                                                {availableBatches.map((batch) => (
                                                    <div
                                                        key={batch.Id}
                                                        className={cn(
                                                            "group border rounded-lg transition-all duration-200",
                                                            selectedBatches.includes(batch.Id)
                                                                ? "border-primary bg-primary/5 shadow-sm"
                                                                : "border-border hover:border-primary/30 hover:bg-muted/30"
                                                        )}
                                                    >
                                                        <div className="p-4 flex items-start gap-4">
                                                            <div
                                                                className={cn(
                                                                    "w-5 h-5 rounded border flex items-center justify-center cursor-pointer mt-0.5 transition-colors",
                                                                    selectedBatches.includes(batch.Id)
                                                                        ? "bg-primary border-primary text-primary-foreground"
                                                                        : "border-muted-foreground/40 group-hover:border-primary/50"
                                                                )}
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
                                                                {selectedBatches.includes(batch.Id) && <CheckCircle className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="font-medium text-sm text-foreground">{batch.Name}</h4>
                                                                    <Badge variant="secondary" className="text-[10px] font-normal">
                                                                        {batch.EmployeeCount || 0} employees
                                                                    </Badge>
                                                                </div>

                                                                {selectedBatches.includes(batch.Id) && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 mt-3 border-t border-primary/10 animate-in slide-in-from-top-2 duration-200">
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-muted-foreground">Start Time</Label>
                                                                            <Input
                                                                                type="datetime-local"
                                                                                value={batchTimes[batch.Id]?.startTime || ''}
                                                                                onChange={(e) => setBatchTimes(prev => ({
                                                                                    ...prev,
                                                                                    [batch.Id]: { ...prev[batch.Id], startTime: e.target.value }
                                                                                }))}
                                                                                className="h-8 text-xs bg-background/50"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-muted-foreground">End Time</Label>
                                                                            <Input
                                                                                type="datetime-local"
                                                                                value={batchTimes[batch.Id]?.endTime || ''}
                                                                                onChange={(e) => setBatchTimes(prev => ({
                                                                                    ...prev,
                                                                                    [batch.Id]: { ...prev[batch.Id], endTime: e.target.value }
                                                                                }))}
                                                                                className="h-8 text-xs bg-background/50"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No batches available</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* User Assignment */}
                                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                    <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                                    <User className="w-4 h-4 text-primary" />
                                                    Individual Users
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Select specific users with custom schedules
                                                </CardDescription>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs gap-2"
                                                    onClick={() => setShowBulkTimeInput(!showBulkTimeInput)}
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Bulk Schedule
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search users by name or email..."
                                                value={userSearchQuery}
                                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                                className="pl-9 bg-background/50"
                                            />
                                        </div>

                                        {showBulkTimeInput && selectedUsers.length > 0 && (
                                            <Alert className="bg-primary/5 border-primary/20 animate-in slide-in-from-top-2">
                                                <Clock className="w-4 h-4 text-primary" />
                                                <AlertTitle className="text-sm font-semibold text-primary mb-2">
                                                    Bulk Schedule for {selectedUsers.length} selected user(s)
                                                </AlertTitle>
                                                <AlertDescription>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs">Start Time</Label>
                                                            <Input
                                                                type="datetime-local"
                                                                value={bulkUserTime.startTime}
                                                                onChange={(e) => setBulkUserTime(prev => ({ ...prev, startTime: e.target.value }))}
                                                                className="h-8 text-xs bg-background"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs">End Time</Label>
                                                            <Input
                                                                type="datetime-local"
                                                                value={bulkUserTime.endTime}
                                                                onChange={(e) => setBulkUserTime(prev => ({ ...prev, endTime: e.target.value }))}
                                                                className="h-8 text-xs bg-background"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => setShowBulkTimeInput(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={applyBulkTimeToSelected}
                                                            disabled={!bulkUserTime.startTime || !bulkUserTime.endTime}
                                                        >
                                                            Apply
                                                        </Button>
                                                    </div>
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        <div className="border border-border/50 rounded-lg max-h-[400px] overflow-y-auto bg-background/30">
                                            <div className="divide-y divide-border/50">
                                                {availableUsers
                                                    .filter(user =>
                                                        user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                        user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                                                    )
                                                    .map((user) => (
                                                        <div
                                                            key={user.email}
                                                            className={cn(
                                                                "group p-4 transition-all duration-200 hover:bg-muted/30",
                                                                selectedUsers.includes(user.email) && "bg-primary/5 hover:bg-primary/10"
                                                            )}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    className={cn(
                                                                        "w-5 h-5 rounded border flex items-center justify-center cursor-pointer mt-0.5 transition-colors",
                                                                        selectedUsers.includes(user.email)
                                                                            ? "bg-primary border-primary text-primary-foreground"
                                                                            : "border-muted-foreground/40 group-hover:border-primary/50"
                                                                    )}
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
                                                                    {selectedUsers.includes(user.email) && <CheckCircle className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <p className="font-medium text-sm text-foreground truncate">{user.name}</p>
                                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                                            {user.type === 'employee' ? (
                                                                                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Employee</span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> External</span>
                                                                            )}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>

                                                                    {selectedUsers.includes(user.email) && (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-primary/10 animate-in slide-in-from-top-2 duration-200">
                                                                            <div className="space-y-1.5">
                                                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Start Time</Label>
                                                                                <Input
                                                                                    type="datetime-local"
                                                                                    value={userTimes[user.email]?.startTime || ''}
                                                                                    onChange={(e) => setUserTimes(prev => ({
                                                                                        ...prev,
                                                                                        [user.email]: { ...prev[user.email], startTime: e.target.value }
                                                                                    }))}
                                                                                    className="h-7 text-xs bg-background/50"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">End Time</Label>
                                                                                <Input
                                                                                    type="datetime-local"
                                                                                    value={userTimes[user.email]?.endTime || ''}
                                                                                    onChange={(e) => setUserTimes(prev => ({
                                                                                        ...prev,
                                                                                        [user.email]: { ...prev[user.email], endTime: e.target.value }
                                                                                    }))}
                                                                                    className="h-7 text-xs bg-background/50"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-4 pt-4 sticky bottom-6 bg-background/80 backdrop-blur-sm p-4 rounded-lg border border-border/50 shadow-lg">
                                    <div className="text-sm text-muted-foreground mr-auto">
                                        {selectedBatches.length > 0 && (
                                            <span className="mr-3">{selectedBatches.length} batch(es) selected</span>
                                        )}
                                        {selectedUsers.length > 0 && (
                                            <span>{selectedUsers.length} user(s) selected</span>
                                        )}
                                    </div>
                                    <Button variant="outline" onClick={() => router.back()} className="h-10">
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleScheduleExam}
                                        disabled={isLoading || !selectedExamId || (selectedBatches.length === 0 && selectedUsers.length === 0)}
                                        className="h-10 min-w-[160px]"
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
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Retry Dialog */}
            {failedEmails.length > 0 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md border-destructive/50 shadow-2xl animate-in zoom-in-95 duration-300">
                        <CardHeader>
                            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6 text-destructive" />
                            </div>
                            <CardTitle className="text-center">Email Delivery Failed</CardTitle>
                            <CardDescription className="text-center">
                                The assessment was scheduled successfully, but we couldn't send emails to {failedEmails.length} candidates.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[150px] w-full border rounded-md p-2 bg-muted/50">
                                {failedEmails.map(email => (
                                    <div key={email} className="text-sm py-1 px-2 text-destructive font-medium border-b last:border-0 border-destructive/10">
                                        {email}
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => router.push('/organizer')}>
                                Skip & Finish
                            </Button>
                            <Button onClick={handleRetry} disabled={isRetrying} className="bg-primary">
                                {isRetrying ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Retrying...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCcw className="w-4 h-4 mr-2" />
                                        Retry Emails
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md border-border/50 shadow-2xl animate-in zoom-in-95 duration-300">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center ring-8 ring-primary/5 animate-in zoom-in duration-500 delay-150">
                                <CheckCircle className="w-10 h-10 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-foreground">Success!</h3>
                                <p className="text-muted-foreground">
                                    Assessment has been successfully scheduled.
                                    <br />
                                    Redirecting to dashboard...
                                </p>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary animate-progress origin-left" style={{ animationDuration: '2s' }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}