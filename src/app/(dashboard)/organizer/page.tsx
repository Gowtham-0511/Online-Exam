"use client";

import { useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import useSWR from 'swr';
import { useRouter } from "next/navigation";
import {
    Plus,
    FileText,
    Users,
    Clock,
    CheckCircle,
    MoreVertical,
    Calendar,
    Search,
    BarChart2,
    ArrowUpRight,
    Target
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---
interface Exam {
    id: string;
    title: string;
    language: string;
    duration: number;
    createdAt: string;
    status?: "draft" | "published" | "archived";
    questionsCount?: number;
}

// --- Fetcher ---
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ExaminerDashboard() {
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState("overview");

    // --- Data Fetching ---
    const { data: exams = [], isLoading: examsLoading } = useSWR(
        session?.username
            ? `/api/organizer/assessment/by-user?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher
    );

    const { data: submissions = [], isLoading: submissionsLoading } = useSWR(
        session?.username
            ? `/api/organizer/submissions/by-examiner?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher
    );

    // --- Stats Calculation ---
    const stats = {
        totalExams: exams.length || 0,
        totalCandidates: new Set(submissions.map((s: any) => s.email)).size || 0,
        completedExams: submissions.length || 0,
        avgDuration: exams.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0) / (exams.length || 1)
    };

    const isLoading = examsLoading || submissionsLoading;

    // --- Animations ---
    useGSAP(() => {
        if (isLoading) return;

        // Ensure elements are visible initially if animation fails or JS is disabled
        gsap.set(".animate-header, .animate-stat-card, .animate-content", { autoAlpha: 1 });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        // Header animation
        tl.fromTo(".animate-header",
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 }
        );

        // Stats cards staggered entry
        tl.fromTo(".animate-stat-card",
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
            "-=0.3"
        );

        // Main content area fade in
        tl.fromTo(".animate-content",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6 },
            "-=0.2"
        );

    }, { scope: containerRef, dependencies: [isLoading] });

    // --- Helper Components ---
    const StatCard = ({ title, value, icon: Icon, trend, color, bgColor }: any) => (
        <div className="animate-stat-card bg-card border border-border/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group opacity-0">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${bgColor} transition-transform group-hover:scale-110`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
                {trend && (
                    <span className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                        +{trend}% <ArrowUpRight className="w-3 h-3 ml-1" />
                    </span>
                )}
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">{value}</h3>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
        </div>
    );

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
            <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No assessments yet</h3>
            <p className="text-muted-foreground max-w-sm mt-3 mb-8">
                Create your first assessment to start evaluating candidates effectively.
            </p>
            <Button size="lg" onClick={() => router.push('/organizer/create-exam')}>
                <Plus className="mr-2 h-5 w-5" />
                Create Assessment
            </Button>
        </div>
    );

    return (
        <div ref={containerRef} className="min-h-screen bg-background/50 p-6 lg:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* --- Header Section --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-header opacity-0">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Overview
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Welcome back, {session?.name?.split(' ')[0] || 'Organizer'}.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="lg"
                            className="hidden sm:flex border-primary/20 hover:bg-primary/5 hover:text-primary"
                            onClick={() => router.push('/organizer/ExamAnalytics')}
                        >
                            <BarChart2 className="mr-2 h-5 w-5" /> Analytics
                        </Button>
                        <Button
                            size="lg"
                            onClick={() => router.push('/organizer/create-exam')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105"
                        >
                            <Plus className="mr-2 h-5 w-5" /> Create Assessment
                        </Button>
                    </div>
                </div>

                {/* --- Loading State --- */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-40 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* --- Stats Grid --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Active Assessments"
                                value={stats.totalExams}
                                icon={FileText}
                                color="text-blue-600 dark:text-blue-400"
                                bgColor="bg-blue-100 dark:bg-blue-500/20"
                                trend={12} // Mock trend
                            />
                            <StatCard
                                title="Candidates"
                                value={stats.totalCandidates}
                                icon={Users}
                                color="text-purple-600 dark:text-purple-400"
                                bgColor="bg-purple-100 dark:bg-purple-500/20"
                            />
                            <StatCard
                                title="Evaluated"
                                value={stats.completedExams}
                                icon={CheckCircle}
                                color="text-emerald-600 dark:text-emerald-400"
                                bgColor="bg-emerald-100 dark:bg-emerald-500/20"
                            />
                            <StatCard
                                title="Avg. Duration (min)"
                                value={Math.round(stats.avgDuration)}
                                icon={Clock}
                                color="text-orange-600 dark:text-orange-400"
                                bgColor="bg-orange-100 dark:bg-orange-500/20"
                            />
                        </div>

                        {/* --- Main Content --- */}
                        <div className="animate-content opacity-0 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <Tabs defaultValue="active" className="w-full sm:w-auto" onValueChange={setActiveTab}>
                                    <TabsList className="bg-muted/50 border border-border/50">
                                        <TabsTrigger value="active">Active</TabsTrigger>
                                        <TabsTrigger value="drafts">Drafts</TabsTrigger>
                                        <TabsTrigger value="archived">Archived</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search assessments..."
                                        className="pl-9 bg-background border-border/50"
                                    />
                                </div>
                            </div>

                            <Card className="border-border/50 shadow-sm overflow-hidden min-h-[400px]">
                                {exams.length === 0 ? <EmptyState /> : (
                                    <div className="divide-y divide-border/50">
                                        {/* Header Row */}
                                        <div className="grid grid-cols-12 gap-4 p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/20 border-b border-border/50">
                                            <div className="col-span-12 sm:col-span-6 md:col-span-5 pl-2">Assessment</div>
                                            <div className="hidden sm:block sm:col-span-4 md:col-span-3">Details</div>
                                            <div className="hidden md:block md:col-span-2">Status</div>
                                            <div className="hidden md:block md:col-span-2 text-right pr-2">Actions</div>
                                        </div>

                                        {exams.slice(0, 10).map((exam: Exam) => (
                                            <div
                                                key={exam.id}
                                                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group cursor-pointer"
                                                onClick={() => router.push(`/organizer/view-exams?id=${exam.id}`)}
                                            >
                                                {/* Title & Language */}
                                                <div className="col-span-12 sm:col-span-6 md:col-span-5 flex items-center gap-4">
                                                    <div className={`
                                                        w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm
                                                        ${exam.language === 'python' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}
                                                    `}>
                                                        {exam.language === 'python' ? 'Py' : 'SQL'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base line-clamp-1">
                                                            {exam.title}
                                                        </h4>
                                                        <span className="text-xs text-muted-foreground">
                                                            Created on {new Date(exam.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <div className="hidden sm:flex sm:col-span-4 md:col-span-3 items-center gap-6 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2" title="Duration">
                                                        <Clock className="w-4 h-4" />
                                                        {exam.duration}m
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Questions">
                                                        <Target className="w-4 h-4" />
                                                        {exam.questionsCount || 0} Qs
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Candidates">
                                                        <Users className="w-4 h-4" />
                                                        <span>0</span>
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <div className="hidden md:flex md:col-span-2 items-center">
                                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200">
                                                        Published
                                                    </Badge>
                                                </div>

                                                {/* Actions */}
                                                <div className="hidden md:flex md:col-span-2 justify-end">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/organizer/view-exams?edit=${exam.id}`); }}>
                                                                Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/organizer/ExamAnalytics?examId=${exam.id}`); }}>
                                                                View Analytics
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                                Archive
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
