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
    ArrowRight
} from 'lucide-react';
import AttenderLayout from './AttenderLayout';
import { useRouter } from "next/router";


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

    const getLanguageColor = (language: string) => {
        const colors = {
            python: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            javascript: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            java: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            cpp: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            c: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
            default: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        };
        return colors[language.toLowerCase() as keyof typeof colors] || colors.default;
    };

    const getDifficultyColor = (difficulty: string) => {
        const colors = {
            easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
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
        // if (!exam.startTime || !exam.endTime) return true;

        // const now = new Date();
        // const start = new Date(exam.startTime);
        // const end = new Date(exam.endTime);

        // // Add debugging logs
        // console.log('Current time:', now.toISOString());
        // console.log('Exam start time:', start.toISOString());
        // console.log('Exam end time:', end.toISOString());
        // console.log('Is active:', now >= start && now <= end);

        // return now >= start && now <= end;
        return true;
    };

    const getExamStatus = (exam: Exam): { status: string; color: string } => {
        if (!exam.startTime || !exam.endTime) {
            return { status: 'Available', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
        }

        const now = new Date();
        const start = new Date(exam.startTime);
        const end = new Date(exam.endTime);

        if (now < start) {
            return { status: 'Upcoming', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
        } else if (now > end) {
            return { status: 'Expired', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
        } else {
            return { status: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
        }
    };

    const handelStartExam = async (examId: any) => {
        const fetchExamDetails = async () => {
            try {
                const response = await fetch(`/api/assessment/${encodeURIComponent(examId)}`, { method: 'GET' });
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Exam not found or no longer available');
                    } else {
                        throw new Error('Failed to fetch exam details');
                    }
                }
                const examData = await response.json();
                console.log('Fetched exam data:', examData);

                setExamData(examData);
                setShowExamPopup(true);
            } catch (error) {
                console.error('Error fetching exam details:', error);
                setError('Failed to load exam details');
            }
        };

        await fetchExamDetails();
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
            // You might want to store the stream for later use
            stream.getTracks().forEach(track => track.stop()); // Stop for now, will restart when exam begins
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
            // Navigate to exam page or start exam logic
            console.log('Starting exam:', examData?.title);
            // You can add navigation logic here
            router.push(`/exam/${examData?.title}`)
            setShowExamPopup(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <Skeleton className="h-8 w-64 mb-4" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="h-80">
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Alert className="max-w-md">
                    <AlertDescription>
                        {error}. Please try refreshing the page.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <AttenderLayout>
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-systech-gradient">
                                <Trophy className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">Available Exams</h1>
                                <p className="text-muted-foreground">
                                    Welcome back, {session?.user?.name || session?.user?.email}! Ready to showcase your skills?
                                </p>
                            </div>
                        </div>

                        {exams.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-5 w-5 text-systech-primary" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Exams</p>
                                                <p className="text-2xl font-bold text-foreground">{exams.length}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Play className="h-5 w-5 text-green-600" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Active</p>
                                                <p className="text-2xl font-bold text-foreground">
                                                    {exams.filter(exam => isExamActive(exam)).length}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-orange-600" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Proctored</p>
                                                <p className="text-2xl font-bold text-foreground">
                                                    {exams.filter(exam => exam.isExamProctored).length}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Code className="h-5 w-5 text-purple-600" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Languages</p>
                                                <p className="text-2xl font-bold text-foreground">
                                                    {new Set(exams.map(exam => exam.language)).size}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* Exams Grid */}
                    {exams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No Exams Available</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                You don't have any exams assigned at the moment. Check back later or contact your administrator.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {exams.map((exam) => {
                                const questions = parseQuestions(exam.questions);
                                const questionConfig = parseQuestionConfig(exam.questionConfig);
                                const totalMarks = calculateTotalMarks(questions);
                                const examStatus = getExamStatus(exam);
                                const allowedUsers = JSON.parse(exam.allowedUsers || '[]');

                                return (
                                    <Card key={exam.id} className="group hover:shadow-lg transition-all duration-300 bg-card/80 backdrop-blur-sm border border-border/50 hover:border-systech-primary/30">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1.5 rounded-md bg-systech-gradient">
                                                        <Code className="h-4 w-4 text-white" />
                                                    </div>
                                                    <Badge className={getLanguageColor(exam.language)}>
                                                        {exam.language.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <Badge className={examStatus.color}>
                                                    {examStatus.status}
                                                </Badge>
                                            </div>

                                            <CardTitle className="text-xl font-bold text-foreground group-hover:text-systech-primary transition-colors">
                                                {exam.title}
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Exam Details */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Timer className="h-4 w-4 text-systech-primary" />
                                                    <span className="text-muted-foreground">Duration:</span>
                                                    <span className="font-medium text-foreground">{formatDuration(exam.duration)}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <FileText className="h-4 w-4 text-systech-primary" />
                                                    <span className="text-muted-foreground">Questions:</span>
                                                    <span className="font-medium text-foreground">{questions.length}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <Star className="h-4 w-4 text-systech-primary" />
                                                    <span className="text-muted-foreground">Total Marks:</span>
                                                    <span className="font-medium text-foreground">{totalMarks}</span>
                                                </div>

                                                <div className="flex gap-2 flex-wrap">
                                                    {exam.isExamProctored && (
                                                        <Badge variant="outline" className="text-xs">
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            Proctored
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Question Difficulty Breakdown */}
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-foreground">Difficulty Breakdown:</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {[...Object.values(
                                                        questions.reduce((acc, q) => {
                                                            if (!acc[q.difficulty]) {
                                                                acc[q.difficulty] = q;
                                                            }
                                                            return acc;
                                                        }, {} as Record<string, typeof questions[0]>)
                                                    )].map((q, index) => (
                                                        <Badge
                                                            key={index}
                                                            variant="outline"
                                                            className={`${getDifficultyColor(q.difficulty)} text-xs`}
                                                        >
                                                            {q.difficulty} ({q.marks}pts)
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Exam Features */}


                                            {/* Exam Timing */}
                                            {(exam.startTime || exam.endTime) && (
                                                <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-md">
                                                    {exam.startTime && (
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>Starts: {new Date(exam.startTime).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {exam.endTime && (
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-3 w-3" />
                                                            <span>Ends: {new Date(exam.endTime).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Button */}
                                            <Button
                                                className="w-full bg-systech-gradient hover:opacity-90 text-white font-medium transition-all duration-300 group-hover:scale-[1.02]"
                                                disabled={!isExamActive(exam)}
                                                onClick={() => handelStartExam(exam.title)}
                                            >
                                                <Play className="h-4 w-4 mr-2" />
                                                {isExamActive(exam) ? 'Start Exam' : 'Exam Unavailable'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Exam Details Popup */}
                    {showExamPopup && examData && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-md">
                                <CardHeader className="text-center">
                                    <CardTitle className="text-xl">Exam Details</CardTitle>
                                    <CardDescription>Review exam information and requirements</CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    {/* Exam Info */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-lg">{examData.title}</h3>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p>Duration: {formatDuration(examData.duration) || 'Not specified'}</p>
                                            <p>Questions: {examData.questions.length}</p>
                                            <p>Total Marks: {calculateTotalMarks(parseQuestions(examData.questions))}</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Requirements Section */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold">Requirements:</h4>

                                        {/* Full Screen Requirement */}
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                {fullScreenEnabled ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-orange-500" />
                                                )}
                                                <span className="text-sm">Full Screen Mode</span>
                                            </div>
                                            {!fullScreenEnabled && (
                                                <Button size="sm" onClick={enableFullScreen}>
                                                    Enable
                                                </Button>
                                            )}
                                        </div>

                                        {/* Proctored Exam Requirements */}
                                        {examData.isExamProctored && (
                                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    {cameraEnabled && microphoneEnabled ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <AlertCircle className="w-5 h-5 text-orange-500" />
                                                    )}
                                                    <span className="text-sm">Camera & Microphone</span>
                                                </div>
                                                {(!cameraEnabled || !microphoneEnabled) && (
                                                    <Button size="sm" onClick={enableCameraAndMicrophone}>
                                                        Enable
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {examData.isExamProctored && (
                                            <Alert>
                                                <Info className="w-4 h-4" />
                                                <AlertDescription className="text-xs">
                                                    This exam is proctored. Your camera and microphone will be active during the exam.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-3 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowExamPopup(false)}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={startExam}
                                            disabled={!canStartExam()}
                                            className="flex-1 bg-systech-gradient hover:opacity-90"
                                        >
                                            {canStartExam() ? (
                                                <>
                                                    Start Exam
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </>
                                            ) : (
                                                'Complete Requirements'
                                            )}
                                        </Button>
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