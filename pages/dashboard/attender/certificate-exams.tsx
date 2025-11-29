import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Target, Award, ArrowRight, BookOpen, Search, AlertTriangle, Check, Maximize } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

interface CertificateExam {
    id: string;
    title: string;
    description: string;
    duration_minutes: number;
    passing_score: number;
    created_at: string;
}

export default function CertificateExams() {
    const { data: session } = useSession();
    const router = useRouter();
    const [exams, setExams] = useState<CertificateExam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [selectedExam, setSelectedExam] = useState<CertificateExam | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await fetch('/api/certificate/list');
            if (response.ok) {
                const data = await response.json();
                setExams(data.exams);
            }
        } catch (error) {
            console.error("Failed to fetch exams:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartClick = (exam: CertificateExam) => {
        setSelectedExam(exam);
        setTermsAccepted(false);
    };

    const handleProceed = async () => {
        if (!selectedExam) return;

        setIsStarting(true);

        try {
            // Request Full Screen
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
                await (elem as any).webkitRequestFullscreen();
            } else if ((elem as any).msRequestFullscreen) { /* IE11 */
                await (elem as any).msRequestFullscreen();
            }

            // Redirect to Exam Page
            router.push(`/dashboard/attender/exam/${selectedExam.id}`);
        } catch (err) {
            console.error("Error enabling full screen:", err);
            toast.error("Could not enable full screen. Please try again.");
            setIsStarting(false);
        }
    };

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>Certificate Exams | SysRank</title>
            </Head>

            <div className="min-h-screen bg-background/50 pb-20">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Certificate Exams
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Earn industry-recognized certificates by passing these exams.
                                </p>
                            </div>
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search exams..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i} className="overflow-hidden">
                                    <div className="h-48 bg-muted animate-pulse" />
                                    <CardHeader className="space-y-2">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-4">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : filteredExams.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-muted/30 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                <BookOpen className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Exams Found</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                {searchQuery
                                    ? `No exams matching "${searchQuery}" were found.`
                                    : "There are no certificate exams available at the moment."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredExams.map((exam) => (
                                <Card key={exam.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 overflow-hidden flex flex-col">
                                    <div className="relative h-48 bg-gradient-to-br from-primary/5 to-primary/10 group-hover:from-primary/10 group-hover:to-primary/20 transition-colors flex items-center justify-center">
                                        <Award className="w-16 h-16 text-primary/40 group-hover:text-primary/60 transition-colors transform group-hover:scale-110 duration-500" />
                                        <div className="absolute top-4 right-4">
                                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                                                Certificate
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardHeader>
                                        <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                                            {exam.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 min-h-[40px]">
                                            {exam.description || "No description provided."}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex-grow">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span>{exam.duration_minutes} mins</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Target className="w-4 h-4" />
                                                <span>Pass: {exam.passing_score}%</span>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="pt-0">
                                        <Button className="w-full group-hover:translate-x-1 transition-transform" onClick={() => handleStartClick(exam)}>
                                            Start Exam
                                            <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Exam Start Modal */}
                <Dialog open={!!selectedExam} onOpenChange={(open) => !open && setSelectedExam(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Start Certification Exam</DialogTitle>
                            <DialogDescription>
                                You are about to start <strong>{selectedExam?.title}</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-sm text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold mb-1">Important Instructions</p>
                                    <ul className="list-disc list-inside space-y-1 opacity-90">
                                        <li>This exam is proctored.</li>
                                        <li>Full screen mode will be enabled.</li>
                                        <li>Switching tabs is strictly prohibited.</li>
                                        <li>Ensure you have a stable internet connection.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="terms"
                                    checked={termsAccepted}
                                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                                />
                                <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    I agree to the terms and conditions
                                </Label>
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-between">
                            <Button variant="outline" onClick={() => setSelectedExam(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleProceed}
                                disabled={!termsAccepted || isStarting}
                                className="gap-2"
                            >
                                {isStarting ? (
                                    "Starting..."
                                ) : (
                                    <>
                                        <Maximize className="w-4 h-4" />
                                        Enable Full Screen & Start
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </UnifiedDashboardLayout>
    );
}
