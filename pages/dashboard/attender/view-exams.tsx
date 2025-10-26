import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    Clock,
    Code,
    Calendar,
    User,
    Play,
    Shield,
    FileText,
    Users,
    Star,
    Trophy,
    BookOpen,
    Timer,
    CheckCircle,
    AlertCircle,
    Info,
    ArrowRight,
    Zap,
    Target,
    Brain,
    Award,
    Lock,
    Unlock,
    Monitor,
    Camera,
    Mic,
    MicOff,
    VideoOff,
    Video,
    Maximize,
    X,
    ChevronRight,
    TrendingUp,
    Activity,
    Code2,
    Layers
} from 'lucide-react';
import AttenderLayout from './AttenderLayout';
import { useRouter } from "next/router";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface Question {
    id: string;
    question: string;
    expectedOutput: string;
    difficulty: 'easy' | 'medium' | 'hard';
    marks: number;
}

interface QuestionConfig {
    beginner: { count: number; marks: number };
    intermediate: { count: number; marks: number };
    hard: { count: number; marks: number };
}

interface Exam {
    id: number;
    title: string;
    language: string;
    duration: number;
    createdBy: string;
    createdAt: string;
    isExamProctored: boolean;
    isGeneratedFromExcel: boolean;
    questionConfig: string;
    questions: string;
    startTime: string | null;
    endTime: string | null;
    allowedUsers: string;
    participants: number;
}

const ViewExams: React.FC = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Popup states
    const [showExamPopup, setShowExamPopup] = useState(false);
    const [examData, setExamData] = useState<Exam | null>(null);
    const [fullScreenEnabled, setFullScreenEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

    useEffect(() => {
        const fetchUserAssessments = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/attender/allowed-exam?email=${encodeURIComponent(session?.user?.email || "")}`);
                if (response.ok) {
                    const assessments = await response.json();
                    console.log(assessments);
                    setExams(assessments);
                } else {
                    setError('Failed to fetch exams');
                }
            } catch (error) {
                console.error('Error fetching assessments:', error);
                setError('Error fetching exams');
            } finally {
                setLoading(false);
            }
        };

        if (session?.user?.email) {
            fetchUserAssessments();
        }
    }, [session?.user?.email]);

    const getLanguageConfig = (language: string) => {
        const configs = {
            python: {
                icon: Code2,
                color: 'from-blue-500 to-blue-600',
                bgColor: 'bg-blue-50 dark:bg-blue-950/30',
                textColor: 'text-blue-700 dark:text-blue-300',
                borderColor: 'border-blue-200 dark:border-blue-800'
            },
            javascript: {
                icon: Zap,
                color: 'from-yellow-500 to-orange-500',
                bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
                textColor: 'text-yellow-700 dark:text-yellow-300',
                borderColor: 'border-yellow-200 dark:border-yellow-800'
            },
            java: {
                icon: Activity,
                color: 'from-red-500 to-red-600',
                bgColor: 'bg-destructive/10 dark:bg-red-950/30',
                textColor: 'text-red-700 dark:text-red-300',
                borderColor: 'border-red-200 dark:border-red-800'
            },
            cpp: {
                icon: Layers,
                color: 'from-purple-500 to-purple-600',
                bgColor: 'bg-purple-50 dark:bg-purple-950/30',
                textColor: 'text-purple-700 dark:text-purple-300',
                borderColor: 'border-purple-200 dark:border-purple-800'
            },
            c: {
                icon: Code,
                color: 'from-gray-500 to-gray-600',
                bgColor: 'bg-gray-50 dark:bg-gray-950/30',
                textColor: 'text-gray-700 dark:text-gray-300',
                borderColor: 'border-gray-200 dark:border-gray-800'
            }
        };
        return configs[language.toLowerCase() as keyof typeof configs] || configs.c;
    };

    const getDifficultyConfig = (difficulty: string) => {
        const configs = {
            easy: {
                color: 'from-green-500 to-emerald-500',
                bgColor: 'bg-green-50 dark:bg-green-950/30',
                textColor: 'text-green-700 dark:text-green-300',
                icon: Target
            },
            medium: {
                color: 'from-yellow-500 to-orange-500',
                bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
                textColor: 'text-yellow-700 dark:text-yellow-300',
                icon: Brain
            },
            hard: {
                color: 'from-red-500 to-red-600',
                bgColor: 'bg-destructive/10 dark:bg-red-950/30',
                textColor: 'text-red-700 dark:text-red-300',
                icon: Zap
            }
        };
        return configs[difficulty.toLowerCase() as keyof typeof configs] || configs.easy;
    };

    const getLanguageColor = (language: string) => {
        const colors = {
            python: 'bg-accent/10 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            javascript: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            java: 'bg-red-100 text-red-800 dark:bg-destructive dark:text-red-300',
            cpp: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            c: 'bg-gray-100 text-gray-800 dark:bg-muted dark:text-gray-300',
            default: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        };
        return colors[language.toLowerCase() as keyof typeof colors] || colors.default;
    };

    const getDifficultyColor = (difficulty: string) => {
        const colors = {
            easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            hard: 'bg-red-100 text-red-800 dark:bg-destructive dark:text-red-300'
        };
        return colors[difficulty.toLowerCase() as keyof typeof colors] || colors.easy;
    };

    const parseQuestions = (questionsStr: string): Question[] => {
        try {
            return JSON.parse(questionsStr);
        } catch {
            return [];
        }
    };

    const parseQuestionConfig = (configStr: string): QuestionConfig => {
        try {
            return JSON.parse(configStr);
        } catch {
            return { beginner: { count: 0, marks: 0 }, intermediate: { count: 0, marks: 0 }, hard: { count: 0, marks: 0 } };
        }
    };

    const calculateTotalMarks = (questions: Question[]): number => {
        return questions.reduce((total, q) => total + q.marks, 0);
    };

    const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const isExamActive = (exam: Exam): boolean => {
        if (!exam.startTime || !exam.endTime) return true;

        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const nowIST = new Date(now.getTime() + istOffset);

        const start = new Date(exam.startTime);
        const startIST = new Date(start.getTime() - istOffset);

        const end = new Date(exam.endTime);
        const endIST = new Date(end.getTime() - istOffset);

        console.log(`Exam: ${exam.title}, Now(IST): ${nowIST}, Start(IST): ${startIST}, End(IST): ${endIST}`);

        return nowIST >= startIST && nowIST <= endIST;
    };

    const getExamStatus = (exam: Exam): { status: string; color: string; bgColor: string } => {
        if (!exam.startTime || !exam.endTime) {
            return {
                status: 'Available',
                color: 'text-green-700 dark:text-green-300',
                bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
            };
        }

        const now = new Date();
        const start = new Date(exam.startTime);
        const end = new Date(exam.endTime);

        if (now < start) {
            return {
                status: 'Upcoming',
                color: 'text-blue-700 dark:text-blue-300',
                bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
            };
        } else if (now > end) {
            return {
                status: 'Expired',
                color: 'text-gray-700 dark:text-gray-400',
                bgColor: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700'
            };
        } else {
            return {
                status: 'Active',
                color: 'text-green-700 dark:text-green-300',
                bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
            };
        }
    };

    const handleStartExam = (examId: any) => {
        const exam = exams.find(e => e.id === examId);
        if (exam) {
            setExamData(exam);
            setShowExamPopup(true);
        }
    };

    const enableFullScreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setFullScreenEnabled(true);
        } catch (error) {
            console.error('Failed to enable fullscreen:', error);
        }
    };

    const enableCameraAndMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setCameraEnabled(true);
            setMicrophoneEnabled(true);
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.error('Failed to enable camera/microphone:', error);
        }
    };

    const canStartExam = (): boolean => {
        if (!examData) return false;
        const basicRequirements = fullScreenEnabled;
        if (examData.isExamProctored) {
            return basicRequirements && cameraEnabled && microphoneEnabled;
        }
        return basicRequirements;
    };

    const startExam = () => {
        if (canStartExam()) {
            router.push(`/exam/${examData?.title}`)
            setShowExamPopup(false);
        }
    };

    if (loading) {
        return (
            <AttenderLayout>
                <div className="min-h-screen bg-gradient-to-br from-background">
                    <div className="container mx-auto px-4 py-8 max-w-7xl">
                        <div className="mb-8">
                            <Skeleton className="h-12 w-64 mb-4" />
                            <Skeleton className="h-6 w-96" />
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="h-96 animate-pulse">
                                    <CardHeader>
                                        <Skeleton className="h-8 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-2/3" />
                                            <Skeleton className="h-12 w-full" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </AttenderLayout>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
                <Alert className="max-w-md border-red-200 dark:border-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                        {error}. Please try refreshing the page.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const totalActiveExams = exams.filter(exam => isExamActive(exam)).length;
    const totalProctoredExams = exams.filter(exam => exam.isExamProctored).length;
    const totalLanguages = new Set(exams.map(exam => exam.language)).size;

    return (
        <AttenderLayout>
            <div className="min-h-screen bg-gradient-to-br from-background">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    <div className="mb-12">
                        <div className="relative overflow-hidden rounded-3xl  bg-gradient-to-br from-background">
                            <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]" />
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center space-x-3 mb-2">
                                    {/* <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                                        <AvatarImage src={session?.user?.image || ""} />
                                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                            {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar> */}
                                    <div>
                                        <h1 className="text-4xl font-bold mb-2 bg-systech-gradient bg-clip-text text-transparent">Available Assessments</h1>
                                        <p className="text-muted-foreground text-lg">
                                            Welcome back, {session?.user?.name?.split(' ')[0] || 'Coder'}! Ready to code your way to success?
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {exams.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                            <Card className="group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200 dark:border-green-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Active Exams</p>
                                            <p className="text-3xl font-bold text-green-700 dark:text-green-300">{totalActiveExams}</p>
                                        </div>
                                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50 group-hover:scale-110 transition-transform">
                                            <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 border-orange-200 dark:border-orange-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Proctored</p>
                                            <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{totalProctoredExams}</p>
                                        </div>
                                        <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/50 group-hover:scale-110 transition-transform">
                                            <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 border-purple-200 dark:border-purple-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Languages</p>
                                            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{totalLanguages}</p>
                                        </div>
                                        <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/50 group-hover:scale-110 transition-transform">
                                            <Code className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {exams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="p-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 mb-6">
                                <FileText className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                            </div>
                            <h3 className="text-2xl font-semibold text-foreground mb-3">No Exams Available</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                You don't have any exams assigned at the moment. Check back later or contact your administrator for more information.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {exams.map((exam) => {
                                const questions = parseQuestions(exam.questions);
                                const totalMarks = calculateTotalMarks(questions);
                                const examStatus = getExamStatus(exam);
                                const langConfig = getLanguageConfig(exam.language);
                                const LangIcon = langConfig.icon;

                                return (
                                    <Card key={exam.id} className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 bg-white/80 dark:bg-muted/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                                        <div className={`h-2 bg-gradient-to-r ${langConfig.color}`} />

                                        <CardHeader className="pb-4 relative">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl bg-gradient-to-r ${langConfig.color} shadow-lg`}>
                                                        <LangIcon className="h-5 w-5 text-white" />
                                                    </div>
                                                    <Badge className={`${langConfig.bgColor} ${langConfig.textColor} border-0 font-medium px-3 py-1`}>
                                                        {exam.language.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <Badge className={`${examStatus.bgColor} ${examStatus.color} border font-medium px-3 py-1`}>
                                                    {examStatus.status}
                                                </Badge>
                                            </div>

                                            <CardTitle className="text-xl font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                                                {exam.title}
                                            </CardTitle>

                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <User className="h-4 w-4" />
                                                <span>Created by {exam.createdBy}</span>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-6">
                                            {/* Key Metrics */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                                    <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Duration</p>
                                                        <p className="font-bold text-foreground">{formatDuration(exam.duration)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                                    <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Total Marks</p>
                                                        <p className="font-bold text-foreground">{totalMarks}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Questions</p>
                                                        <p className="font-bold text-foreground">{questions.length}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-sm font-semibold text-foreground">Difficulty Distribution</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {Object.entries(
                                                        questions.reduce((acc, q) => {
                                                            acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
                                                            return acc;
                                                        }, {} as Record<string, number>)
                                                    ).map(([difficulty, count]) => {
                                                        const diffConfig = getDifficultyConfig(difficulty);
                                                        const DiffIcon = diffConfig.icon;
                                                        return (
                                                            <Badge
                                                                key={difficulty}
                                                                className={`${diffConfig.bgColor} ${diffConfig.textColor} border-0 px-3 py-1.5 flex items-center gap-1.5`}
                                                            >
                                                                <DiffIcon className="h-3 w-3" />
                                                                {difficulty} ({count})
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 flex-wrap">
                                                {exam.isExamProctored && (
                                                    <Badge className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 px-2 py-1">
                                                        <Shield className="h-3 w-3 mr-1" />
                                                        Proctored
                                                    </Badge>
                                                )}
                                                {exam.isGeneratedFromExcel && (
                                                    <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-2 py-1">
                                                        <FileText className="h-3 w-3 mr-1" />
                                                        Auto-Generated
                                                    </Badge>
                                                )}
                                            </div>

                                            {(exam.startTime || exam.endTime) && (
                                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                                                    <div className="space-y-2">
                                                        {exam.startTime && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                                <span className="text-blue-700 dark:text-blue-300 font-medium">
                                                                    Starts: {new Date(exam.startTime).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {exam.endTime && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                                <span className="text-blue-700 dark:text-blue-300 font-medium">
                                                                    Ends: {new Date(exam.endTime).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                className={`w-full h-12 font-semibold text-white shadow-lg transition-all duration-300 ${isExamActive(exam)
                                                    ? `bg-gradient-to-r ${langConfig.color} hover:shadow-xl hover:scale-[1.02] group-hover:shadow-2xl`
                                                    : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50'
                                                    }`}
                                                disabled={!isExamActive(exam)}
                                                onClick={() => handleStartExam(exam.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isExamActive(exam) ? (
                                                        <>
                                                            <Play className="h-5 w-5" />
                                                            <span>Start Challenge</span>
                                                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Lock className="h-4 w-4" />
                                                            <span>Exam Unavailable</span>
                                                        </>
                                                    )}
                                                </div>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {showExamPopup && examData && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-muted/95 backdrop-blur-xl border-0 shadow-2xl animate-in zoom-in-95 duration-300">
                                <CardHeader className="text-center pb-6 relative">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                                        onClick={() => setShowExamPopup(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>

                                    <div className="mb-4">
                                        <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto w-fit mb-4">
                                            <Monitor className="h-8 w-8 text-white" />
                                        </div>
                                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            Ready to Begin?
                                        </CardTitle>
                                        <CardDescription className="text-base mt-2">
                                            Complete the setup requirements to start your coding challenge
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-8">
                                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-200 dark:border-blue-800">
                                        <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                                            <Award className="h-5 w-5" />
                                            {examData.title}
                                        </h3>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                                                <Timer className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                                                <p className="text-xs text-muted-foreground">Duration</p>
                                                <p className="font-bold text-sm">{formatDuration(examData.duration)}</p>
                                            </div>

                                            <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                                                <FileText className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
                                                <p className="text-xs text-muted-foreground">Questions</p>
                                                <p className="font-bold text-sm">{parseQuestions(examData.questions).length}</p>
                                            </div>

                                            <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                                                <Star className="h-5 w-5 mx-auto text-yellow-600 dark:text-yellow-400 mb-1" />
                                                <p className="text-xs text-muted-foreground">Total Marks</p>
                                                <p className="font-bold text-sm">{calculateTotalMarks(parseQuestions(examData.questions))}</p>
                                            </div>

                                            <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                                                <Code className="h-5 w-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
                                                <p className="text-xs text-muted-foreground">Language</p>
                                                <p className="font-bold text-sm">{examData.language.toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="my-6" />

                                    <div className="space-y-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                            Terms & Conditions
                                        </h4>

                                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                            <div className="space-y-3 text-sm text-muted-foreground">
                                                {examData.isExamProctored ? (
                                                    <>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                                                            <p>Your exam session will be <strong className="text-foreground">continuously monitored</strong> via camera and microphone for security purposes.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                                                            <p>Any attempt to <strong className="text-foreground">switch tabs, minimize the window, or exit full-screen</strong> will be recorded and may result in exam termination.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                                                            <p>Use of <strong className="text-foreground">unauthorized resources, communication devices, or external assistance</strong> is strictly prohibited.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                                                            <p>All suspicious activities will be <strong className="text-foreground">flagged and reviewed</strong> by the exam administrator.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                                                            <p>By proceeding, you acknowledge that <strong className="text-foreground">recording data will be stored</strong> and used for evaluation purposes.</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                                            <p>You must remain in <strong className="text-foreground">full-screen mode</strong> throughout the entire exam duration.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                                            <p>All answers must be <strong className="text-foreground">your own work</strong>. Plagiarism or cheating will result in disqualification.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                                            <p>Once started, the <strong className="text-foreground">timer cannot be paused</strong>. Ensure you have adequate time before beginning.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                                            <p>Make sure you have a <strong className="text-foreground">stable internet connection</strong> to avoid submission issues.</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                                            <p>By proceeding, you agree to complete the exam <strong className="text-foreground">honestly and independently</strong>.</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                                            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                                By clicking "Start Coding Challenge", you accept all terms and conditions outlined above.
                                            </p>
                                        </div>
                                    </div>

                                    <Separator className="my-6" />

                                    <div className="space-y-6">
                                        <h4 className="font-bold text-lg flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            Setup Requirements
                                        </h4>

                                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${fullScreenEnabled
                                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                                            : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-full ${fullScreenEnabled
                                                        ? 'bg-green-100 dark:bg-green-900/50'
                                                        : 'bg-orange-100 dark:bg-orange-900/50'
                                                        }`}>
                                                        {fullScreenEnabled ? (
                                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <Maximize className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-sm">Full Screen Mode</h5>
                                                        <p className="text-xs text-muted-foreground">
                                                            {fullScreenEnabled
                                                                ? 'Full screen mode is active'
                                                                : 'Click to enable full screen for distraction-free experience'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                {!fullScreenEnabled && (
                                                    <Button
                                                        size="sm"
                                                        onClick={enableFullScreen}
                                                        className="bg-orange-600 hover:bg-orange-700 text-white"
                                                    >
                                                        Enable
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {examData.isExamProctored && (
                                            <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${cameraEnabled && microphoneEnabled
                                                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                                                : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-full ${cameraEnabled && microphoneEnabled
                                                            ? 'bg-green-100 dark:bg-green-900/50'
                                                            : 'bg-orange-100 dark:bg-orange-900/50'
                                                            }`}>
                                                            {cameraEnabled && microphoneEnabled ? (
                                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                            ) : (
                                                                <div className="flex items-center gap-1">
                                                                    {cameraEnabled ? (
                                                                        <Video className="h-4 w-4 text-green-600" />
                                                                    ) : (
                                                                        <VideoOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                                    )}
                                                                    {microphoneEnabled ? (
                                                                        <Mic className="h-4 w-4 text-green-600" />
                                                                    ) : (
                                                                        <MicOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h5 className="font-semibold text-sm">Camera & Microphone</h5>
                                                            <p className="text-xs text-muted-foreground">
                                                                {cameraEnabled && microphoneEnabled
                                                                    ? 'Camera and microphone permissions granted'
                                                                    : 'Enable camera and microphone for proctored exam'
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {(!cameraEnabled || !microphoneEnabled) && (
                                                        <Button
                                                            size="sm"
                                                            onClick={enableCameraAndMicrophone}
                                                            className="bg-orange-600 hover:bg-orange-700 text-white"
                                                        >
                                                            Enable
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {examData.isExamProctored && (
                                            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                                                <Shield className="h-4 w-4 text-blue-600" />
                                                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                                                    <strong>Proctored Exam Notice:</strong> This exam is monitored for security. Your camera and microphone will be active throughout the session. Any suspicious activity will be recorded and reviewed.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    <div className="flex gap-4 pt-6">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowExamPopup(false);
                                                // Exit fullscreen when cancel is clicked
                                                if (document.fullscreenElement) {
                                                    document.exitFullscreen().catch(err =>
                                                        console.error('Failed to exit fullscreen:', err)
                                                    );
                                                }
                                                setFullScreenEnabled(false);
                                            }}
                                            className="flex-1 h-12 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>

                                        <Button
                                            onClick={startExam}
                                            disabled={!canStartExam()}
                                            className={`flex-1 h-12 font-semibold transition-all duration-300 ${canStartExam()
                                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                                                : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
                                                }`}
                                        >
                                            {canStartExam() ? (
                                                <>
                                                    <Play className="h-5 w-5 mr-2" />
                                                    Start Coding Challenge
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="h-4 w-4 mr-2" />
                                                    Complete Requirements First
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <div className={`w-2 h-2 rounded-full ${fullScreenEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <span>Full Screen</span>
                                            {examData.isExamProctored && (
                                                <>
                                                    <div className={`w-2 h-2 rounded-full ${cameraEnabled && microphoneEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                    <span>Camera & Mic</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </AttenderLayout>

    );
};

export default ViewExams;