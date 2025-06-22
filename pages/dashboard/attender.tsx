import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Head from "next/head";

export default function AttenderDashboard() {
    const router = useRouter();
    const { data: session } = useSession();
    const [examId, setExamId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<ExamValidationError[]>([]);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [alertType, setAlertType] = useState<'error' | 'success' | 'warning'>('error');
    const [isHighContrast, setIsHighContrast] = useState(false);
    const examIdInputRef = useRef<HTMLInputElement>(null);
    const startButtonRef = useRef<HTMLButtonElement>(null);

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

    useEffect(() => {
        // Focus on exam ID input when component mounts
        if (examIdInputRef.current) {
            examIdInputRef.current.focus();
        }

        // Keyboard navigation handler
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip to main content with Alt+M
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                const mainContent = document.getElementById('main-content');
                if (mainContent) {
                    mainContent.focus();
                    mainContent.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // Toggle high contrast with Alt+C
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                setIsHighContrast(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const validateExamId = (examId: string): ExamValidationResult => {
        const errors: ExamValidationError[] = [];

        if (!examId.trim()) {
            errors.push({ field: 'examId', message: 'Exam ID is required' });
        } else if (examId.length < 3) {
            errors.push({ field: 'examId', message: 'Exam ID must be at least 3 characters' });
        } else if (examId.length > 50) {
            errors.push({ field: 'examId', message: 'Exam ID cannot exceed 50 characters' });
        } else if (!EXAM_ID_PATTERNS.advanced.test(examId)) {
            errors.push({ field: 'examId', message: 'Exam ID must start with a letter and contain only letters, numbers, hyphens, and underscores' });
        }

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
            // Clear previous errors
            setErrors([]);

            // Validate exam ID
            const validation = validateExamId(examId);
            if (!validation.isValid) {
                setErrors(validation.errors);
                showAlertMessage(validation.errors[0].message, 'error');
                return;
            }

            setIsLoading(true);

            // TODO: Replace this with actual API call
            // For now, simulate API validation
            const simulateApiCall = new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Simulate some exam IDs that don't exist
                    const invalidExamIds = ['invalid-exam', 'non-existent', 'expired-exam'];
                    if (invalidExamIds.includes(examId.toLowerCase())) {
                        reject(new Error('Exam not found or no longer available'));
                    } else {
                        resolve(true);
                    }
                }, 1500);
            });

            await simulateApiCall;

            // If validation passes, navigate to exam
            showAlertMessage('Exam validated successfully! Redirecting...', 'success');
            setTimeout(() => {
                router.push(`/exam/${examId}`);
            }, 1000);

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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            e.preventDefault();
            handleStartExam();
        }
    };

    // const handleStartExam = async () => {
    //     if (!examId.trim()) {
    //         const alertDiv = document.getElementById('custom-alert');
    //         if (alertDiv) {
    //             alertDiv.classList.remove('opacity-0', 'translate-y-2');
    //             alertDiv.classList.add('opacity-100', 'translate-y-0');
    //             setTimeout(() => {
    //                 alertDiv.classList.add('opacity-0', 'translate-y-2');
    //                 alertDiv.classList.remove('opacity-100', 'translate-y-0');
    //             }, 3000);
    //         }
    //         return;
    //     }

    //     setIsLoading(true);
    //     setTimeout(() => {
    //         router.push(`/exam/${examId}`);
    //     }, 1000);
    // };

    return (
        <>
            <Head>
                <title>Exam Hub</title>
                <link rel="icon" href="/logo.png" />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-20 w-64 h-64 bg-sky-200/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-32 right-32 w-80 h-80 bg-blue-200/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-blue-300/20 rounded-full blur-2xl animate-pulse delay-500"></div>
                </div>

                <div className="sr-only">
                    <a
                        href="#main-content"
                        className="absolute top-0 left-0 bg-blue-600 text-white px-4 py-2 transform -translate-y-full focus:translate-y-0 transition-transform duration-200 z-50"
                        onFocus={(e) => e.target.classList.remove('-translate-y-full')}
                        onBlur={(e) => e.target.classList.add('-translate-y-full')}
                    >
                        Skip to main content
                    </a>
                    <a
                        href="#exam-id-input"
                        className="absolute top-0 left-32 bg-blue-600 text-white px-4 py-2 transform -translate-y-full focus:translate-y-0 transition-transform duration-200 z-50"
                        onFocus={(e) => e.target.classList.remove('-translate-y-full')}
                        onBlur={(e) => e.target.classList.add('-translate-y-full')}
                    >
                        Skip to exam ID input
                    </a>
                </div>

                {/* Navigation Bar */}
                <nav
                    className={`relative z-10 border-b shadow-sm ${isHighContrast
                        ? 'bg-black text-white border-white'
                        : 'bg-white/90 backdrop-blur-lg border-sky-200/30'
                        }`}
                    role="navigation"
                    aria-label="Main navigation"
                >
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isHighContrast
                                        ? 'bg-white text-black'
                                        : 'bg-gradient-to-r from-sky-400 to-blue-500'
                                        }`}
                                    role="img"
                                    aria-label="ExamHub logo"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className={`text-xl font-bold ${isHighContrast
                                        ? 'text-white'
                                        : 'bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent'
                                        }`}>
                                        ExamHub
                                    </h1>
                                    <p className={`text-xs font-medium ${isHighContrast ? 'text-gray-300' : 'text-slate-500'
                                        }`}>
                                        Attender Portal
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main
                    id="main-content"
                    className="relative z-10 max-w-6xl mx-auto px-6 py-12"
                    role="main"
                    aria-label="Exam dashboard main content"
                    tabIndex={-1}
                >
                    <div className="text-center mb-12">
                        <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${isHighContrast
                            ? 'text-white'
                            : 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent'
                            }`}>
                            <span>Welcome Back!</span>
                        </h1>

                        <div className={`flex items-center justify-center space-x-2 ${isHighContrast ? 'text-white' : 'text-gray-600'
                            }`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium" aria-label={`Logged in as ${session?.user?.name}`}>
                                {session?.user?.name}
                            </span>
                        </div>
                    </div>

                    {/* Exam Entry Section */}
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white/90 backdrop-blur-lg border border-sky-200/40 rounded-3xl shadow-2xl shadow-sky-500/10 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-300/15 to-blue-300/15 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-300/15 to-sky-300/15 rounded-full blur-xl"></div>

                            <div className="relative z-10">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Start Your Exam</h2>
                                    <p className="text-gray-600">Enter your exam ID to begin the assessment</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label
                                            htmlFor="exam-id-input"
                                            className={`block text-sm font-semibold mb-3 ${isHighContrast ? 'text-white' : 'text-gray-700'
                                                }`}
                                        >
                                            Exam ID
                                            <span className="text-red-500 ml-1" aria-label="required">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="exam-id-input"
                                                ref={examIdInputRef}
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
                                                onKeyPress={handleKeyPress}
                                                placeholder="e.g. python-101, math-advanced-2024"
                                                className={`w-full px-4 py-4 border rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 placeholder-gray-400 ${isHighContrast
                                                    ? `bg-black text-white border-white focus:ring-white/50 ${errors.length > 0 ? 'border-red-300' : 'border-white'
                                                    }`
                                                    : `bg-blue-50/50 text-gray-800 ${errors.length > 0
                                                        ? 'border-red-300 focus:ring-red-200/50 focus:border-red-400'
                                                        : 'border-sky-200 focus:ring-sky-200/50 focus:border-sky-400'
                                                    }`
                                                    }`}
                                                disabled={isLoading}
                                                required
                                                aria-invalid={errors.length > 0}
                                                aria-describedby={errors.length > 0 ? "exam-id-error exam-id-help" : "exam-id-help"}
                                                aria-label="Enter your exam identification code"
                                                autoComplete="off"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4" aria-hidden="true">
                                                {errors.length > 0 ? (
                                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h4.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V9a2 2 0 01-2 2m-6 5a2 2 0 012 2v1a2 2 0 01-2 2H9a2 2 0 01-2-2v-1a2 2 0 012-2h4z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>

                                        {/* Help text */}
                                        <div id="exam-id-help" className={`mt-1 text-xs ${isHighContrast ? 'text-gray-300' : 'text-gray-500'
                                            }`}>
                                            Enter the unique identifier provided by your instructor
                                        </div>

                                        {/* Error message */}
                                        {errors.length > 0 && (
                                            <div
                                                id="exam-id-error"
                                                className="mt-2 text-sm text-red-600"
                                                role="alert"
                                                aria-live="polite"
                                            >
                                                <span className="sr-only">Error: </span>
                                                {errors[0].message}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        ref={startButtonRef}
                                        type="submit"
                                        disabled={isLoading || errors.length > 0}
                                        className={`w-full font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 flex items-center justify-center space-x-3 ${isHighContrast
                                            ? 'bg-white text-black hover:bg-gray-200 focus:ring-white/50 disabled:bg-gray-600 disabled:text-gray-400'
                                            : 'bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white focus:ring-sky-200/50'
                                            }`}
                                        aria-label={isLoading ? 'Starting exam, please wait' : 'Start exam'}
                                        aria-describedby={errors.length > 0 ? 'exam-id-error' : undefined}
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg
                                                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                >
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Starting Exam...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Start Exam</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="mt-12 max-w-4xl mx-auto">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Quick Tips</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/80 backdrop-blur-sm border border-sky-200/30 rounded-2xl p-6 text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-gray-800 mb-2">Manage Time</h4>
                                <p className="text-sm text-gray-600">Keep track of your time and pace yourself accordingly</p>
                            </div>

                            <div className="bg-white/80 backdrop-blur-sm border border-sky-200/30 rounded-2xl p-6 text-center">
                                <div className="w-12 h-12 bg-sky-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-gray-800 mb-2">Stay Focused</h4>
                                <p className="text-sm text-gray-600">Find a quiet space and eliminate distractions</p>
                            </div>

                            <div className="bg-white/80 backdrop-blur-sm border border-sky-200/30 rounded-2xl p-6 text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-gray-800 mb-2">Read Carefully</h4>
                                <p className="text-sm text-gray-600">Take time to understand each question thoroughly</p>
                            </div>
                        </div>
                    </div>

                </main>

                {showAlert && (
                    <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl shadow-lg transition-all duration-300 z-50 ${alertType === 'error' ? 'bg-red-500 text-white' :
                        alertType === 'success' ? 'bg-green-500 text-white' :
                            'bg-yellow-500 text-white'
                        } ${showAlert ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        <div className="flex items-center space-x-2">
                            {alertType === 'error' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {alertType === 'success' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {alertType === 'warning' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            )}
                            <span className="font-medium">{alertMessage}</span>
                        </div>
                    </div>
                )}

                {/* Custom Alert */}
                <div
                    id="custom-alert"
                    className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg opacity-0 translate-y-2 transition-all duration-300 z-50"
                >
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Please enter a valid exam ID</span>
                    </div>
                </div>
            </div>
        </>
    );
}