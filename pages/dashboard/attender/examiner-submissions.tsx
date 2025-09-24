import React, { useEffect, useState } from 'react'
import AttenderLayout from './AttenderLayout'
import { useSession } from 'next-auth/react'

interface QuestionResult {
    questionId: string
    question: string
    feedback: string
    marks: number
}

interface UserSubmission {
    id: number;
    userName: string;
    examId: string;
    answersWithQuestionIds: string;
    submittedAt: string;
}

interface ProcessedSubmission {
    id: number;
    userName: string;
    examId: string;
    submittedAt: string;
    originalAnswers: string;
    parsedAnswers: any[] | null;
    parseError?: string;
}

interface AssessmentStats {
    totalQuestions: number
    totalMarks: number
    averageScore: number
    passedQuestions: number
}

const ExaminerSubmissions: React.FC = () => {
    const { data: session, status } = useSession()
    const [submissions, setSubmissions] = useState<ProcessedSubmission[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedSubmission, setSelectedSubmission] = useState<ProcessedSubmission | null>(null)
    const [submissionStats, setSubmissionStats] = useState<AssessmentStats | null>(null)

    function cleanQuestions(raw: string) {
        try {
            console.log("Processing raw data...");

            const parsedData = JSON.parse(raw);
            console.log("Outer JSON parsed successfully");

            console.log("Parsed data type:", typeof parsedData);

        } catch (error) {
            console.error("Error in cleanQuestions:", error instanceof Error ? error.message : String(error));
            console.error("Raw data preview:", raw.substring(0, 200) + "...");

            try {
                console.log("Attempting regex fallback...");

                const arrayMatch = raw.match(/\[\s*\{[^}]*"questionId"[\s\S]*\]\s*(?=```|\}|$)/);

                if (arrayMatch) {
                    const extractedJson = arrayMatch[0];
                    console.log("Regex extracted JSON array");
                    return JSON.parse(extractedJson);
                }

                console.error("Regex fallback also failed");
                return [];

            } catch (fallbackError) {
                console.error(
                    "Fallback parsing failed:",
                    fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                );
                return [];
            }
        }
    }

    const calculateStats = (results: QuestionResult[]): AssessmentStats => {
        if (!Array.isArray(results)) {
            console.error("calculateStats received non-array:", results)
            return {
                totalQuestions: 0,
                totalMarks: 0,
                averageScore: 0,
                passedQuestions: 0
            }
        }

        const totalQuestions = results.length
        const totalMarks = results.reduce((sum, result) => sum + (result.marks || 0), 0)
        const passedQuestions = results.filter(result => (result.marks || 0) > 0).length
        const averageScore = totalQuestions > 0 ? (totalMarks / totalQuestions) : 0

        return {
            totalQuestions,
            totalMarks,
            averageScore: Number(averageScore.toFixed(2)),
            passedQuestions
        }
    }

    const getScoreColor = (marks: number): string => {
        if (marks === 0) return 'bg-destructive/10 text-destructive border-destructive/20'
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400'
    }

    const getGradeFromAverage = (average: number): { grade: string; color: string } => {
        if (average >= 0.9) return { grade: 'A+', color: 'text-emerald-600 dark:text-emerald-400' }
        if (average >= 0.8) return { grade: 'A', color: 'text-emerald-500 dark:text-emerald-300' }
        if (average >= 0.7) return { grade: 'B+', color: 'text-primary' }
        if (average >= 0.6) return { grade: 'B', color: 'text-blue-600 dark:text-blue-400' }
        if (average >= 0.5) return { grade: 'C', color: 'text-amber-600 dark:text-amber-400' }
        if (average >= 0.4) return { grade: 'D', color: 'text-orange-600 dark:text-orange-400' }
        return { grade: 'F', color: 'text-destructive' }
    }

    const stripHtmlTags = (html: string): string => {
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    }

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleViewEvaluation = (submission: ProcessedSubmission) => {
        setSelectedSubmission(submission)
        if (submission.parsedAnswers) {
            setSubmissionStats(calculateStats(submission.parsedAnswers))
        }
    }

    const handleBackToSubmissions = () => {
        setSelectedSubmission(null)
        setSubmissionStats(null)
    }

    useEffect(() => {
        const fetchUserSubmission = async (): Promise<void> => {
            if (!session?.user?.email) return

            setLoading(true)
            try {
                const response = await fetch(`/api/attender/submission?email=${encodeURIComponent(session.user.email)}`)

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const submissions: UserSubmission[] = await response.json()

                console.log("Processing multiple submissions...");

                const processedSubmissions: ProcessedSubmission[] = submissions.map((submission: UserSubmission) => {
                    try {
                        console.log(`Processing submission for exam: ${submission.examId}`);

                        const rawString: string = JSON.parse(submission.answersWithQuestionIds)
                        const firstParsed: any = JSON.parse(rawString)
                        const trimmed: string = firstParsed[0].output.replace(/```json|```/g, "").trim();
                        const secondParsed: any[] = JSON.parse(trimmed);

                        return {
                            id: submission.id,
                            userName: submission.userName,
                            examId: submission.examId,
                            submittedAt: submission.submittedAt,
                            originalAnswers: submission.answersWithQuestionIds,
                            parsedAnswers: secondParsed
                        }
                    } catch (parseError: unknown) {
                        console.error(`Error parsing submission ${submission.id}:`, parseError)
                        return {
                            id: submission.id,
                            userName: submission.userName,
                            examId: submission.examId,
                            submittedAt: submission.submittedAt,
                            originalAnswers: submission.answersWithQuestionIds,
                            parsedAnswers: null,
                            parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
                        }
                    }
                })

                console.log("Final processed submissions:", processedSubmissions);
                setSubmissions(processedSubmissions)

            } catch (error: unknown) {
                console.error('Error fetching submissions:', error)
                setError(error instanceof Error ? error.message : 'Failed to fetch submissions')
            } finally {
                setLoading(false)
            }
        }

        if (status === 'authenticated') {
            fetchUserSubmission()
        }
    }, [session?.user?.email, status])

    if (status === 'loading' || loading) {
        return (
            <AttenderLayout>
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-accent rounded-full animate-spin animate-reverse animation-delay-150"></div>
                        <div className="mt-6 text-center">
                            <h3 className="text-lg font-semibold text-foreground">Loading Results</h3>
                            <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch your data...</p>
                        </div>
                    </div>
                </div>
            </AttenderLayout>
        )
    }

    if (error) {
        return (
            <AttenderLayout>
                <div className="min-h-screen bg-background flex items-center justify-center p-6">
                    <div className="max-w-md w-full">
                        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 backdrop-blur-sm">
                            <div className="flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mx-auto mb-4">
                                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Results</h3>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </AttenderLayout>
        )
    }

    if (submissions.length === 0) {
        return (
            <AttenderLayout>
                <div className="min-h-screen bg-background flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="bg-muted/50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">No Submissions Found</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            You haven't submitted any assessments yet. Complete an exam to see your results here.
                        </p>
                    </div>
                </div>
            </AttenderLayout>
        )
    }

    // Show evaluation report for selected submission
    if (selectedSubmission && submissionStats) {
        const { grade, color } = getGradeFromAverage(submissionStats.averageScore)

        return (
            <AttenderLayout>
                <div className="min-h-screen bg-background">
                    <div className="max-w-7xl mx-auto p-6">
                        {/* Header with Gradient Background */}
                        <div className="relative mb-8">
                            <div className="bg-systech-gradient rounded-2xl p-8 text-white shadow-2xl">
                                <div className="absolute inset-0 bg-black/10 rounded-2xl"></div>
                                <div className="relative">
                                    <button
                                        onClick={handleBackToSubmissions}
                                        className="inline-flex items-center text-white/90 hover:text-white transition-colors mb-4 group"
                                    >
                                        <svg className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back to Submissions
                                    </button>
                                    <h1 className="text-4xl font-bold mb-2">Evaluation Report</h1>
                                    <div className="flex items-center space-x-4 text-white/90">
                                        <span className="inline-flex items-center">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Exam {selectedSubmission.examId}
                                        </span>
                                        <span className="inline-flex items-center">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m4 0H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z" />
                                            </svg>
                                            {formatDate(selectedSubmission.submittedAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Total Questions</p>
                                        <p className="text-3xl font-bold text-foreground">{submissionStats.totalQuestions}</p>
                                    </div>
                                    <div className="bg-primary/10 p-3 rounded-lg">
                                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                                        <p className="text-3xl font-bold text-primary">{submissionStats.totalMarks}</p>
                                    </div>
                                    <div className="bg-chart-2/10 p-3 rounded-lg">
                                        <svg className="w-6 h-6 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Correct Answers</p>
                                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{submissionStats.passedQuestions}</p>
                                    </div>
                                    <div className="bg-emerald-500/10 p-3 rounded-lg">
                                        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Overall Grade</p>
                                        <p className={`text-3xl font-bold ${color}`}>{grade}</p>
                                    </div>
                                    <div className="bg-accent/10 p-3 rounded-lg">
                                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Overview */}
                        <div className="bg-card border rounded-xl p-6 shadow-sm mb-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-foreground">Performance Overview</h2>
                                <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                    {submissionStats.passedQuestions} of {submissionStats.totalQuestions} correct
                                </span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Success Rate</span>
                                    <span className="font-medium">{((submissionStats.passedQuestions / submissionStats.totalQuestions) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full bg-systech-gradient transition-all duration-700 ease-out rounded-full relative overflow-hidden"
                                        style={{ width: `${(submissionStats.passedQuestions / submissionStats.totalQuestions) * 100}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Results */}
                        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-muted/30 px-6 py-4 border-b">
                                <h2 className="text-xl font-semibold text-foreground">Detailed Results</h2>
                            </div>

                            <div className="divide-y">
                                {selectedSubmission.parsedAnswers && Array.isArray(selectedSubmission.parsedAnswers) ? (
                                    selectedSubmission.parsedAnswers.map((result: QuestionResult, index: number) => (
                                        <div key={result.questionId} className="p-6 hover:bg-muted/20 transition-colors">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-3">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 bg-muted rounded-full text-sm font-medium text-muted-foreground mr-3">
                                                            {index + 1}
                                                        </span>
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getScoreColor(result.marks)}`}>
                                                            {result.marks > 0 ? (
                                                                <>
                                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Correct
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Incorrect
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-medium text-foreground leading-relaxed">
                                                        {stripHtmlTags(result.question)}
                                                    </h3>
                                                </div>
                                                <div className="text-right ml-6">
                                                    <div className="bg-muted/50 rounded-lg p-3 text-center min-w-[80px]">
                                                        <div className="text-2xl font-bold text-foreground">{result.marks}</div>
                                                        <div className="text-xs text-muted-foreground">marks</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {result.feedback && (
                                                <div className={`mt-4 p-4 rounded-lg border ${result.marks > 0
                                                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                                                    : 'bg-destructive/5 border-destructive/20'
                                                    }`}>
                                                    <div className="flex items-start">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${result.marks > 0 ? 'bg-emerald-500' : 'bg-destructive'
                                                            }`}>
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                {result.marks > 0 ? (
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                ) : (
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                )}
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className={`text-sm font-medium mb-2 ${result.marks > 0
                                                                ? 'text-emerald-800 dark:text-emerald-300'
                                                                : 'text-destructive'
                                                                }`}>
                                                                Feedback
                                                            </h4>
                                                            <p className={`text-sm leading-relaxed ${result.marks > 0
                                                                ? 'text-emerald-700 dark:text-emerald-200'
                                                                : 'text-destructive/90'
                                                                }`}>
                                                                {result.feedback}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6">
                                        <div className="flex items-center justify-center text-destructive">
                                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Error parsing submission: {selectedSubmission.parseError}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => window.print()}
                                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print Results
                            </button>
                        </div>
                    </div>
                </div>
            </AttenderLayout>
        )
    }

    // Show submissions list
    return (
        <AttenderLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto p-6">
                    {/* Header with Gradient Background */}
                    <div className="relative mb-8">
                        <div className="bg-systech-gradient rounded-2xl p-8 text-white shadow-2xl">
                            <div className="absolute inset-0 bg-black/10 rounded-2xl"></div>
                            <div className="relative">
                                <h1 className="text-4xl font-bold mb-2">Assessment Dashboard</h1>
                                <p className="text-white/90 text-lg">Track your exam performance and detailed evaluation reports</p>
                                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                                <div className="absolute -top-4 -left-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                            </div>
                        </div>
                    </div>

                    {/* Submissions Grid */}
                    <div className="grid gap-6">
                        {submissions.map((submission) => {
                            const stats = submission.parsedAnswers ? calculateStats(submission.parsedAnswers) : null
                            const { grade, color } = stats ? getGradeFromAverage(stats.averageScore) : { grade: 'N/A', color: 'text-muted-foreground' }

                            return (
                                <div key={submission.id} className="bg-card border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                                    <div className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                {/* Header */}
                                                <div className="flex items-center mb-4">
                                                    <div className="bg-primary/10 rounded-lg p-3 mr-4">
                                                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-foreground">
                                                            Exam {submission.examId}
                                                        </h3>
                                                        {stats && (
                                                            <div className="flex items-center mt-1">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color} bg-muted/50`}>
                                                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                                    </svg>
                                                                    Grade: {grade}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Metadata */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                    <div className="flex items-center text-sm text-muted-foreground">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m4 0H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z" />
                                                        </svg>
                                                        {formatDate(submission.submittedAt)}
                                                    </div>
                                                    {stats && (
                                                        <>
                                                            <div className="flex items-center text-sm text-muted-foreground">
                                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                                </svg>
                                                                Score: {stats.totalMarks}/{stats.totalQuestions}
                                                            </div>
                                                            <div className="flex items-center text-sm text-muted-foreground">
                                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Correct: {stats.passedQuestions} questions
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Performance Bar */}
                                                {stats && (
                                                    <div className="mb-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-sm font-medium text-muted-foreground">
                                                                Performance
                                                            </span>
                                                            <span className="text-sm font-semibold text-foreground">
                                                                {((stats.passedQuestions / stats.totalQuestions) * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="h-full bg-systech-gradient transition-all duration-700 ease-out rounded-full relative overflow-hidden"
                                                                style={{ width: `${(stats.passedQuestions / stats.totalQuestions) * 100}%` }}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <div className="ml-6 flex flex-col items-end">
                                                {submission.parsedAnswers ? (
                                                    <button
                                                        onClick={() => handleViewEvaluation(submission)}
                                                        className="group/btn inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                                    >
                                                        <svg className="w-4 h-4 mr-2 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        View Report
                                                        <svg className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 max-w-xs">
                                                        <div className="flex items-start">
                                                            <div className="bg-destructive/10 rounded-full p-1 mr-3 mt-0.5">
                                                                <svg className="w-4 h-4 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-destructive mb-1">
                                                                    Evaluation Error
                                                                </div>
                                                                <div className="text-xs text-destructive/80">
                                                                    {submission.parseError}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hover Effect Border */}
                                    <div className="h-1 bg-systech-gradient transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </AttenderLayout>
    )
}

export default ExaminerSubmissions;