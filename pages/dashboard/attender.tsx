import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle,
    Clock,
    Info,
    FileText,
    User,
    LogOut,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    Moon,
    Sun,
    Loader2,
    BarChart3
} from "lucide-react";

export default function AttenderDashboard() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [examId, setExamId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<ExamValidationError[]>([]);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [alertType, setAlertType] = useState<'error' | 'success' | 'warning'>('error');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [showExamPopup, setShowExamPopup] = useState(false);
    const [examData, setExamData] = useState<any>(null);
    const [fullScreenEnabled, setFullScreenEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

    interface ExamValidationError {
        field: string;
        message: string;
    }

    interface ExamValidationResult {
        isValid: boolean;
        errors: ExamValidationError[];
    }

    const EXAM_ID_PATTERNS = {
        basic: /^[a-zA-Z0-9-_]{3,50}$/,
        advanced: /^[a-zA-Z][a-zA-Z0-9-_]{2,49}$/
    };

    // Dark mode toggle
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        if (!isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    // Initialize user in SQLite database when session is available
    useEffect(() => {
        const initializeUser = async () => {
            if (status === "loading") return;

            if (!session?.user?.email) {
                setIsInitializing(false);
                return;
            }

            try {
                const response = await fetch('/api/users/get-or-create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: session.user.email,
                        name: session.user.name || null,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to initialize user');
                }

                const userData = await response.json();
                setUserRole(userData.role);

                if (userData.role !== 'attender') {
                    showAlertMessage(`Access denied. This page is for attenders only. Your role: ${userData.role}`, 'error');
                    setTimeout(() => {
                        router.push('/');
                    }, 2000);
                }
            } catch (error) {
                console.error('Error initializing user:', error);
                showAlertMessage('Failed to initialize user account. Please try refreshing the page.', 'error');
            } finally {
                setIsInitializing(false);
            }
        };

        initializeUser();
    }, [session, status, router]);

    const validateExamId = (examId: string): ExamValidationResult => {
        const errors: ExamValidationError[] = [];

        if (!examId.trim()) {
            errors.push({ field: 'examId', message: 'Exam ID is required' });
        } else if (examId.length < 3) {
            errors.push({ field: 'examId', message: 'Exam ID must be at least 3 characters' });
        } else if (examId.length > 50) {
            errors.push({ field: 'examId', message: 'Exam ID cannot exceed 50 characters' });
        }
        // else if (!EXAM_ID_PATTERNS.advanced.test(examId)) {
        //     errors.push({ field: 'examId', message: 'Exam ID must start with a letter and contain only letters, numbers, hyphens, and underscores' });
        // }

        return { isValid: errors.length === 0, errors };
    };

    const showAlertMessage = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlert(true);

        setTimeout(() => {
            setShowAlert(false);
        }, 4000);
    };

    const handleStartExam = async () => {
        try {
            setErrors([]);

            const validation = validateExamId(examId);
            if (!validation.isValid) {
                setErrors(validation.errors);
                showAlertMessage(validation.errors[0].message, 'error');
                return;
            }

            if (!session?.user?.email || userRole !== 'attender') {
                showAlertMessage('Please wait for user initialization to complete', 'warning');
                return;
            }

            setIsLoading(true);

            console.log('Starting exam with ID:', examId);


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
                    throw error;
                }
            };

            await fetchExamDetails();

            // showAlertMessage('Exam validated successfully! Redirecting...', 'success');
            // setTimeout(() => {
            //     router.push(`/exam/${examId}`);
            // }, 1000);

        } catch (error) {
            console.error('Error starting exam:', error);

            let errorMessage = 'Failed to start exam. Please try again.';

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            showAlertMessage(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const enableFullScreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setFullScreenEnabled(true);
            showAlertMessage('Full screen enabled', 'success');
        } catch (error) {
            showAlertMessage('Failed to enable full screen', 'error');
        }
    };

    const enableCameraAndMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setCameraEnabled(true);
            setMicrophoneEnabled(true);
            showAlertMessage('Camera and microphone enabled', 'success');

            // Stop the stream for now, we'll restart it during the exam
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            showAlertMessage('Failed to enable camera and microphone', 'error');
        }
    };

    const startExam = () => {
        setShowExamPopup(false);
        showAlertMessage('Starting exam...', 'success');
        setTimeout(() => {
            router.push(`/exam/${examId}`);
        }, 1000);
    };

    const canStartExam = () => {
        if (!examData) return false;

        if (examData.isExamProctored) {
            return fullScreenEnabled && cameraEnabled && microphoneEnabled;
        } else {
            return fullScreenEnabled;
        }
    };

    // Show loading state while initializing
    if (status === "loading" || isInitializing) {
        return (
            <>
                <Head>
                    <title>SysRank - Loading</title>
                    <link rel="icon" href="/logo.png" />
                </Head>
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <Card className="w-80">
                        <CardContent className="flex flex-col items-center justify-center p-8">
                            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4 animate-pulse">
                                <FileText className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
                            <p className="text-muted-foreground text-center">Setting up your dashboard</p>
                            <Loader2 className="w-6 h-6 mt-4 animate-spin text-primary" />
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    // Redirect to sign in if not authenticated
    if (status === "unauthenticated") {
        router.push('/api/auth/signin');
        return null;
    }

    return (
        <>
            <Head>
                <title>SysRank - Attender Dashboard</title>
                <link rel="icon" href="/logo.png" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Navigation */}
                <header className="border-b bg-card/50 backdrop-blur-sm">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-foreground">SysRank</h1>
                                    <p className="text-xs text-muted-foreground">Attender Portal</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleDarkMode}
                                    className="w-9 h-9 p-0"
                                >
                                    {isDarkMode ? (
                                        <Sun className="w-4 h-4" />
                                    ) : (
                                        <Moon className="w-4 h-4" />
                                    )}
                                </Button>

                                <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{session?.user?.name}</span>
                                </div>

                                <Badge variant="secondary">
                                    {userRole || 'Loading...'}
                                </Badge>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push('/api/auth/signout')}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-4 py-12">
                    {/* Welcome Section */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
                            Welcome Back!
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Ready to take your exam? Enter your exam ID below to get started.
                        </p>
                    </div>

                    {/* Exam Entry Card */}
                    <div className="max-w-2xl mx-auto mb-12">
                        <Card className="border-border bg-card">
                            <CardHeader className="text-center pb-4">
                                <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-primary-foreground" />
                                </div>
                                <CardTitle className="text-2xl">Start Your Exam</CardTitle>
                                <CardDescription>
                                    Enter your exam ID to begin the assessment
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="examId" className="text-sm font-semibold">
                                        Exam ID <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="examId"
                                            type="text"
                                            value={examId}
                                            onChange={(e) => {
                                                setExamId(e.target.value);
                                                if (errors.length > 0) {
                                                    setErrors([]);
                                                }
                                            }}
                                            onBlur={() => {
                                                const validation = validateExamId(examId);
                                                setErrors(validation.errors);
                                            }}
                                            placeholder="e.g. python-101, math-advanced-2024"
                                            className={`pr-10 ${errors.length > 0
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : ''
                                                }`}
                                            disabled={isLoading || userRole !== 'attender'}
                                            aria-invalid={errors.length > 0}
                                            aria-describedby={errors.length > 0 ? "exam-id-error" : undefined}
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                            {errors.length > 0 ? (
                                                <AlertCircle className="w-5 h-5 text-destructive" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                    {errors.length > 0 && (
                                        <p id="exam-id-error" className="text-sm text-destructive">
                                            {errors[0].message}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    onClick={handleStartExam}
                                    disabled={isLoading || userRole !== 'attender'}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Starting Exam...
                                        </>
                                    ) : userRole !== 'attender' ? (
                                        'Access Restricted'
                                    ) : (
                                        <>
                                            Start Exam
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Tips */}
                    <div className="max-w-4xl mx-auto">
                        <h3 className="text-xl font-semibold mb-6 text-center">Quick Tips</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="text-center">
                                <CardContent className="pt-6">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Manage Time</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Keep track of your time and pace yourself accordingly
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="text-center">
                                <CardContent className="pt-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-primary" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Stay Focused</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Find a quiet space and eliminate distractions
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="text-center">
                                <CardContent className="pt-6">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Read Carefully</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Take time to understand each question thoroughly
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>

                {/* Alert Messages */}
                {showAlert && (
                    <div className="fixed top-4 right-4 z-50 max-w-md">
                        <Alert variant={alertType === 'error' ? 'destructive' : 'default'}
                            className={`transition-all duration-300 ${showAlert ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                } ${alertType === 'success'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
                                    : alertType === 'warning'
                                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200'
                                        : ''
                                }`}>
                            <div className="flex items-center">
                                {alertType === 'error' && <AlertCircle className="w-4 h-4 mr-2" />}
                                {alertType === 'success' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                                {alertType === 'warning' && <AlertTriangle className="w-4 h-4 mr-2" />}
                                <AlertDescription className="font-medium">
                                    {alertMessage}
                                </AlertDescription>
                            </div>
                        </Alert>
                    </div>
                )}

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
                                        <p>Duration: {examData.duration || 'Not specified'}</p>
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
                                        className="flex-1"
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
        </>
    );
}