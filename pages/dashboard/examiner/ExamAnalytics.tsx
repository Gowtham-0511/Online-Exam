import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from 'swr';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    PieChart,
    Activity,
    Award,
    FileText,
    Filter,
    ChevronDown,
    ChevronUp,
    Percent,
    Hash,
    Loader2,
    Trophy
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ExaminerLayout from "./ExaminerLayout";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Submission {
    ai_feedback: any;
    userName: string;
    examId: string;
    email: string;
    submittedAt: string;
    disqualified: boolean;
    answersWithQuestionIds?: any[];
}

interface QuestionAnalytics {
    questionId: string;
    questionText: string;
    questionType: string;
    totalMarks: number;
    avgScore: number;
    successRate: number;
    totalAttempts: number;
    correctAnswers: number;
    incorrectAnswers: number;
    partialCredit: number;
    avgTimeTaken?: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    commonMistakes: string[];
    topPerformers: string[];
}

export default function ExamAnalytics() {
    const { data: session } = useSession();
    const [selectedExam, setSelectedExam] = useState("all");
    const [sortBy, setSortBy] = useState<'successRate' | 'avgScore' | 'attempts'>('successRate');
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');

    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'questions' | 'students'>('questions');

    const [compareStudent1, setCompareStudent1] = useState<string>("");
    const [compareStudent2, setCompareStudent2] = useState<string>("");

    const { data: submissions = [], error, isLoading } = useSWR(
        session?.user?.email
            ? `/api/submissions/by-examiner?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const [studentAnalysis, setStudentAnalysis] = useState<{
        [email: string]: {
            strengths: Array<{ topic: string; score: number; description: string }>;
            weaknesses: Array<{ topic: string; score: number; description: string }>;
            recommendations: string[];
            loading: boolean;
        };
    }>({});

    const [showAIInsights, setShowAIInsights] = useState(false);
    const [aiInsights, setAiInsights] = useState<{
        [key: string]: any;
    }>({});
    const [loadingInsights, setLoadingInsights] = useState<{
        [key: string]: boolean;
    }>({});

    const fetchStudentAnalysis = async (student: any) => {
        if (studentAnalysis[student.email] && !studentAnalysis[student.email].loading) {
            return; // Already analyzed
        }

        setStudentAnalysis(prev => ({
            ...prev,
            [student.email]: { strengths: [], weaknesses: [], recommendations: [], loading: true }
        }));

        try {
            const response = await fetch('/api/analyze-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentData: {
                        userName: student.userName,
                        questionDetails: student.questionDetails
                    }
                })
            });

            const analysis = await response.json();

            setStudentAnalysis(prev => ({
                ...prev,
                [student.email]: { ...analysis, loading: false }
            }));
        } catch (error) {
            console.error('Failed to analyze student:', error);
            setStudentAnalysis(prev => ({
                ...prev,
                [student.email]: {
                    strengths: [],
                    weaknesses: [],
                    recommendations: ['Analysis unavailable'],
                    loading: false
                }
            }));
        }
    };

    const parseFeedback = (feedbackString: string | null | any) => {
        if (!feedbackString) return [];
        if (typeof feedbackString === 'object') {
            return Array.isArray(feedbackString) ? feedbackString : [feedbackString];
        }
        try {
            return JSON.parse(feedbackString.trim());
        } catch (e) {
            return [];
        }
    };

    const parseAnswers = (answersData: any) => {
        if (!answersData) return [];
        if (Array.isArray(answersData)) return answersData;
        if (typeof answersData === 'string') {
            try {
                return JSON.parse(answersData);
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    const getStudentsForQuestion = (questionId: string) => {
        const studentsData: Array<{
            email: string;
            userName: string;
            score: number;
            maxMarks: number;
            feedback: string;
            submittedAt: string;
            examId: string;
            answer: string;
        }> = [];

        filteredSubmissions.forEach((submission: Submission) => {
            const answers = parseAnswers(submission.answersWithQuestionIds);
            const feedback = parseFeedback(submission.ai_feedback);

            const answer = answers.find((a: any) => (a.questionId || a.id) === questionId);
            if (answer) {
                const feedbackItem = feedback.find((f: any) => f.questionId === questionId);
                studentsData.push({
                    email: submission.email,
                    userName: submission.userName || submission.email,
                    score: feedbackItem?.marks || 0,
                    maxMarks: answer.marks || 0,
                    feedback: feedbackItem?.feedback || 'No feedback',
                    submittedAt: submission.submittedAt,
                    examId: submission.examId,
                    answer: answer.answer || answer.selectedOptionText || 'No answer'
                });
            }
        });

        return studentsData.sort((a, b) => b.score - a.score);
    };

    const examList = useMemo(() => {
        const exams = new Set<string>();
        submissions.forEach((s: Submission) => exams.add(s.examId));
        return Array.from(exams);
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        if (selectedExam === "all") return submissions;
        return submissions.filter((s: Submission) => s.examId === selectedExam);
    }, [submissions, selectedExam]);

    const questionAnalytics = useMemo(() => {
        const questionsMap = new Map<string, QuestionAnalytics>();

        filteredSubmissions.forEach((submission: Submission) => {
            const answers = parseAnswers(submission.answersWithQuestionIds);
            const feedback = parseFeedback(submission.ai_feedback);

            answers.forEach((answer: any) => {
                const questionId = answer.questionId || answer.id;
                const feedbackItem = feedback.find((f: any) => f.questionId === questionId);

                if (!questionsMap.has(questionId)) {
                    questionsMap.set(questionId, {
                        questionId,
                        questionText: answer.question || 'Unknown Question',
                        questionType: answer.type || 'unknown',
                        totalMarks: answer.marks || 0,
                        avgScore: 0,
                        successRate: 0,
                        totalAttempts: 0,
                        correctAnswers: 0,
                        incorrectAnswers: 0,
                        partialCredit: 0,
                        difficulty: 'Medium',
                        commonMistakes: [],
                        topPerformers: []
                    });
                }

                const q = questionsMap.get(questionId)!;
                q.totalAttempts++;

                if (feedbackItem) {
                    const score = feedbackItem.marks || 0;
                    const maxMarks = answer.marks || 1;

                    q.avgScore += score;

                    if (score === maxMarks) {
                        q.correctAnswers++;
                    } else if (score === 0) {
                        q.incorrectAnswers++;
                    } else {
                        q.partialCredit++;
                    }

                    if (score === maxMarks && q.topPerformers.length < 3) {
                        q.topPerformers.push(submission.userName || submission.email);
                    }
                }
            });
        });

        questionsMap.forEach((q) => {
            if (q.totalAttempts > 0) {
                q.avgScore = q.avgScore / q.totalAttempts;
                q.successRate = (q.correctAnswers / q.totalAttempts) * 100;

                if (q.successRate >= 70) q.difficulty = 'Easy';
                else if (q.successRate >= 40) q.difficulty = 'Medium';
                else q.difficulty = 'Hard';
            }
        });

        return Array.from(questionsMap.values());
    }, [filteredSubmissions]);

    const studentAnalytics = useMemo(() => {
        const studentsMap = new Map<string, any>();

        filteredSubmissions.forEach((submission: Submission) => {
            const studentKey = submission.email;
            const answers = parseAnswers(submission.answersWithQuestionIds);
            const feedback = parseFeedback(submission.ai_feedback);

            if (!studentsMap.has(studentKey)) {
                studentsMap.set(studentKey, {
                    email: submission.email,
                    userName: submission.userName,
                    totalSubmissions: 0,
                    totalQuestions: 0,
                    correctAnswers: 0,
                    incorrectAnswers: 0,
                    partialCredit: 0,
                    totalScore: 0,
                    totalPossibleScore: 0,
                    avgScore: 0,
                    successRate: 0,
                    disqualified: submission.disqualified,
                    submissions: [],
                    strongAreas: [] as string[],
                    weakAreas: [] as string[],
                    questionDetails: [] as any[]
                });
            }

            const student = studentsMap.get(studentKey)!;
            student.totalSubmissions++;
            student.submissions.push({
                examId: submission.examId,
                submittedAt: submission.submittedAt
            });

            answers.forEach((answer: any) => {
                const feedbackItem = feedback.find((f: any) => f.questionId === (answer.questionId || answer.id));
                const score = feedbackItem?.marks || 0;
                const maxMarks = answer.marks || 0;

                student.totalQuestions++;
                student.totalScore += score;
                student.totalPossibleScore += maxMarks;

                if (score === maxMarks) {
                    student.correctAnswers++;
                } else if (score === 0) {
                    student.incorrectAnswers++;
                } else {
                    student.partialCredit++;
                }

                student.questionDetails.push({
                    questionId: answer.questionId || answer.id,
                    questionText: answer.question,
                    questionType: answer.type,
                    score: score,
                    maxMarks: maxMarks,
                    feedback: feedbackItem?.feedback || 'No feedback',
                    examId: submission.examId
                });

                // Track strong and weak areas
                if (score === maxMarks && student.strongAreas.length < 5) {
                    student.strongAreas.push(answer.type || 'unknown');
                } else if (score === 0 && student.weakAreas.length < 5) {
                    student.weakAreas.push(answer.type || 'unknown');
                }
            });
        });

        studentsMap.forEach((student) => {
            if (student.totalQuestions > 0) {
                student.avgScore = (student.totalScore / student.totalPossibleScore) * 100;
                student.successRate = (student.correctAnswers / student.totalQuestions) * 100;
            }
        });

        return Array.from(studentsMap.values()).sort((a, b) => b.successRate - a.successRate);
    }, [filteredSubmissions]);

    const sortedQuestions = useMemo(() => {
        let sorted = [...questionAnalytics];

        if (filterDifficulty !== 'all') {
            sorted = sorted.filter(q => q.difficulty === filterDifficulty);
        }

        sorted.sort((a, b) => {
            if (sortBy === 'successRate') return b.successRate - a.successRate;
            if (sortBy === 'avgScore') return b.avgScore - a.avgScore;
            if (sortBy === 'attempts') return b.totalAttempts - a.totalAttempts;
            return 0;
        });

        return sorted;
    }, [questionAnalytics, sortBy, filterDifficulty]);

    const overallStats = useMemo(() => {
        const totalQuestions = questionAnalytics.length;
        const avgSuccessRate = questionAnalytics.reduce((sum, q) => sum + q.successRate, 0) / (totalQuestions || 1);
        const totalAttempts = questionAnalytics.reduce((sum, q) => sum + q.totalAttempts, 0);
        const easyQuestions = questionAnalytics.filter(q => q.difficulty === 'Easy').length;
        const mediumQuestions = questionAnalytics.filter(q => q.difficulty === 'Medium').length;
        const hardQuestions = questionAnalytics.filter(q => q.difficulty === 'Hard').length;

        return {
            totalQuestions,
            avgSuccessRate,
            totalAttempts,
            easyQuestions,
            mediumQuestions,
            hardQuestions
        };
    }, [questionAnalytics]);

    // 1. Predict Question Difficulty
    const predictDifficulty = async (question: QuestionAnalytics) => {
        const key = `difficulty-${question.questionId}`;
        setLoadingInsights(prev => ({ ...prev, [key]: true }));

        try {
            const response = await fetch('/api/ai/predict-difficulty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionText: question.questionText,
                    questionType: question.questionType,
                    totalMarks: question.totalMarks
                })
            });
            const data = await response.json();
            setAiInsights(prev => ({ ...prev, [key]: data }));
        } catch (error) {
            console.error('Failed to predict difficulty:', error);
        } finally {
            setLoadingInsights(prev => ({ ...prev, [key]: false }));
        }
    };

    // 2. Analyze Common Mistakes
    const analyzeQuestionMistakes = async (question: QuestionAnalytics) => {
        const key = `mistakes-${question.questionId}`;
        setLoadingInsights(prev => ({ ...prev, [key]: true }));

        const studentsData = getStudentsForQuestion(question.questionId);
        const studentAnswers = studentsData.map(s => ({
            answer: s.answer,
            score: s.score,
            maxMarks: s.maxMarks,
            feedback: s.feedback
        }));

        try {
            const response = await fetch('/api/ai/analyze-mistakes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionText: question.questionText,
                    studentAnswers
                })
            });
            const data = await response.json();
            setAiInsights(prev => ({ ...prev, [key]: data }));
        } catch (error) {
            console.error('Failed to analyze mistakes:', error);
        } finally {
            setLoadingInsights(prev => ({ ...prev, [key]: false }));
        }
    };

    // 3. Generate Study Plan
    const generateStudyPlanForStudent = async (student: any) => {
        const key = `studyplan-${student.email}`;
        setLoadingInsights(prev => ({ ...prev, [key]: true }));

        try {
            const response = await fetch('/api/ai/generate-study-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentData: {
                        userName: student.userName,
                        weaknesses: studentAnalysis[student.email]?.weaknesses || [],
                        strengths: studentAnalysis[student.email]?.strengths || [],
                        totalQuestions: student.totalQuestions,
                        successRate: student.successRate
                    }
                })
            });
            const data = await response.json();
            setAiInsights(prev => ({ ...prev, [key]: data }));
        } catch (error) {
            console.error('Failed to generate study plan:', error);
        } finally {
            setLoadingInsights(prev => ({ ...prev, [key]: false }));
        }
    };

    // 4. Predict Future Performance
    const predictStudentPerformance = async (student: any) => {
        const key = `performance-${student.email}`;
        setLoadingInsights(prev => ({ ...prev, [key]: true }));

        const history = student.submissions.map((sub: any) => ({
            examId: sub.examId,
            score: student.totalScore / student.submissions.length,
            totalPossible: student.totalPossibleScore / student.submissions.length,
            date: sub.submittedAt
        }));

        try {
            const response = await fetch('/api/ai/predict-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentHistory: history })
            });
            const data = await response.json();
            setAiInsights(prev => ({ ...prev, [key]: data }));
        } catch (error) {
            console.error('Failed to predict performance:', error);
        } finally {
            setLoadingInsights(prev => ({ ...prev, [key]: false }));
        }
    };

    // 5. Compare Two Students
    const compareStudentsAI = async (student1: any, student2: any) => {
        const key = `compare-${student1.email}-${student2.email}`;
        setLoadingInsights(prev => ({ ...prev, [key]: true }));

        try {
            const response = await fetch('/api/ai/compare-students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student1: {
                        userName: student1.userName,
                        successRate: student1.successRate,
                        strengths: studentAnalysis[student1.email]?.strengths.map((s: any) => s.topic) || [],
                        weaknesses: studentAnalysis[student1.email]?.weaknesses.map((w: any) => w.topic) || []
                    },
                    student2: {
                        userName: student2.userName,
                        successRate: student2.successRate,
                        strengths: studentAnalysis[student2.email]?.strengths.map((s: any) => s.topic) || [],
                        weaknesses: studentAnalysis[student2.email]?.weaknesses.map((w: any) => w.topic) || []
                    }
                })
            });
            const data = await response.json();
            setAiInsights(prev => ({ ...prev, [key]: data }));
        } catch (error) {
            console.error('Failed to compare students:', error);
        } finally {
            setLoadingInsights(prev => ({ ...prev, [key]: false }));
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';
            case 'Medium': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';
            case 'Hard': return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30';
            default: return 'text-muted-foreground bg-muted';
        }
    };

    const getSuccessRateColor = (rate: number) => {
        if (rate >= 70) return 'text-emerald-600 dark:text-emerald-400';
        if (rate >= 40) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    const getProgressBarColor = (rate: number) => {
        if (rate >= 70) return 'bg-emerald-500';
        if (rate >= 40) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    if (isLoading) {
        return (
            <ExaminerLayout>
                <div className="min-h-screen bg-background p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-64" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-32" />
                            ))}
                        </div>
                        <Skeleton className="h-96" />
                    </div>
                </div>
            </ExaminerLayout>
        );
    }

    if (error) {
        return (
            <ExaminerLayout>
                <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-rose-600 dark:text-rose-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load analytics</h3>
                        <p className="text-muted-foreground mb-4">Please try again later</p>
                        <Button onClick={() => window.location.reload()} variant="outline">
                            Retry
                        </Button>
                    </div>
                </div>
            </ExaminerLayout>
        );
    }

    return (
        <ExaminerLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto p-6 space-y-6">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-primary" />
                            Exam Analytics
                        </h1>
                        <p className="text-muted-foreground">
                            Comprehensive question-level insights and student performance analysis
                        </p>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">Total Questions</p>
                            <p className="text-3xl font-bold text-foreground">{overallStats.totalQuestions}</p>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <Percent className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">Avg Success Rate</p>
                            <p className="text-3xl font-bold text-foreground">{overallStats.avgSuccessRate.toFixed(1)}%</p>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                                <Hash className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">Total Attempts</p>
                            <p className="text-3xl font-bold text-foreground">{overallStats.totalAttempts}</p>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-primary" />
                                </div>
                                <PieChart className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">Difficulty Mix</p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-xs px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-medium">
                                    {overallStats.easyQuestions}E
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-medium">
                                    {overallStats.mediumQuestions}M
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-medium">
                                    {overallStats.hardQuestions}H
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Filter className="w-4 h-4" />
                                <span className="font-medium">Filters</span>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <select
                                    value={selectedExam}
                                    onChange={(e) => setSelectedExam(e.target.value)}
                                    className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                                >
                                    <option value="all">All Exams</option>
                                    {examList.map(examId => (
                                        <option key={examId} value={examId}>{examId}</option>
                                    ))}
                                </select>

                                <select
                                    value={filterDifficulty}
                                    onChange={(e) => setFilterDifficulty(e.target.value as any)}
                                    className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                                >
                                    <option value="all">All Difficulty</option>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                                >
                                    <option value="successRate">Sort by Success Rate</option>
                                    <option value="avgScore">Sort by Avg Score</option>
                                    <option value="attempts">Sort by Attempts</option>
                                </select>
                            </div>

                            <div className="flex gap-2 border-l border-border pl-3 ml-3">
                                <button
                                    onClick={() => setViewMode('questions')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'questions'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background border border-border text-foreground hover:bg-muted'
                                        }`}
                                >
                                    <FileText className="w-4 h-4 inline mr-2" />
                                    Questions
                                </button>
                                <button
                                    onClick={() => setViewMode('students')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'students'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background border border-border text-foreground hover:bg-muted'
                                        }`}
                                >
                                    <Users className="w-4 h-4 inline mr-2" />
                                    Students
                                </button>
                            </div>
                        </div>
                    </div>

                    {viewMode === 'questions' ? (
                        sortedQuestions.length === 0 ? (
                            <div className="bg-card border-2 border-dashed border-border rounded-lg p-12 text-center">
                                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">No analytics available</h3>
                                <p className="text-muted-foreground">
                                    Analytics will appear once students start submitting exams
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedQuestions.map((question, index) => (
                                    <div
                                        key={question.questionId}
                                        className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all"
                                    >
                                        <div
                                            className="p-5 cursor-pointer"
                                            onClick={() => setExpandedQuestion(
                                                expandedQuestion === question.questionId ? null : question.questionId
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                                            {index + 1}
                                                        </span>
                                                        <h3
                                                            className="font-semibold text-foreground flex-1"
                                                            dangerouslySetInnerHTML={{ __html: question.questionText }}
                                                        />
                                                        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                                            {question.difficulty}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-4 h-4" />
                                                            {question.totalAttempts} attempts
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Award className="w-4 h-4" />
                                                            {question.totalMarks} marks
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-4 h-4" />
                                                            {question.questionType.toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs text-muted-foreground">Success Rate</span>
                                                                <span className={`text-sm font-bold ${getSuccessRateColor(question.successRate)}`}>
                                                                    {question.successRate.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all ${getProgressBarColor(question.successRate)}`}
                                                                    style={{ width: `${question.successRate}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <div className="text-center px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                                                <p className="text-xs text-muted-foreground mb-1">Correct</p>
                                                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {question.correctAnswers}
                                                                </p>
                                                            </div>
                                                            <div className="text-center px-3 py-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                                                                <p className="text-xs text-muted-foreground mb-1">Incorrect</p>
                                                                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                                                                    {question.incorrectAnswers}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                                                    {expandedQuestion === question.questionId ? (
                                                        <ChevronUp className="w-5 h-5 text-foreground" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-foreground" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {expandedQuestion === question.questionId && (
                                            <div className="border-t border-border bg-muted/30 p-5 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Target className="w-4 h-4 text-primary" />
                                                            <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                                                        </div>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {question.avgScore.toFixed(2)}/{question.totalMarks}
                                                        </p>
                                                    </div>

                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Activity className="w-4 h-4 text-primary" />
                                                            <p className="text-sm font-medium text-muted-foreground">Partial Credit</p>
                                                        </div>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {question.partialCredit}
                                                        </p>
                                                    </div>

                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                            <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                                                        </div>
                                                        <p className={`text-2xl font-bold ${getSuccessRateColor(question.successRate)}`}>
                                                            {question.successRate.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                </div>

                                                {question.topPerformers.length > 0 && (
                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Award className="w-4 h-4 text-primary" />
                                                            <h4 className="font-semibold text-foreground">Top Performers</h4>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {question.topPerformers.map((name, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                                                                >
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="bg-card border border-border rounded-lg p-4">
                                                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        Response Distribution
                                                    </h4>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle className="w-4 h-4" />
                                                                Correct Answers
                                                            </span>
                                                            <span className="font-bold">{question.correctAnswers}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                                                <AlertCircle className="w-4 h-4" />
                                                                Partial Credit
                                                            </span>
                                                            <span className="font-bold">{question.partialCredit}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                                                <XCircle className="w-4 h-4" />
                                                                Incorrect Answers
                                                            </span>
                                                            <span className="font-bold">{question.incorrectAnswers}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* NEW: Students who attempted this question */}
                                                <div className="bg-card border border-border rounded-lg p-4">
                                                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                                        <Users className="w-4 h-4" />
                                                        Students Who Attempted ({getStudentsForQuestion(question.questionId).length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                                        {getStudentsForQuestion(question.questionId).map((student, idx) => {
                                                            const percentage = (student.score / student.maxMarks) * 100;
                                                            return (
                                                                <div key={idx} className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                                                                                {student.userName.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-semibold text-foreground truncate">
                                                                                    {student.userName}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground truncate">
                                                                                    {student.email}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0">
                                                                            <p className={`text-lg font-bold ${getSuccessRateColor(percentage)}`}>
                                                                                {student.score}/{student.maxMarks}
                                                                            </p>
                                                                            <p className={`text-xs font-medium ${getSuccessRateColor(percentage)}`}>
                                                                                {percentage.toFixed(0)}%
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Score bar */}
                                                                    <div className="mb-3">
                                                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full transition-all ${getProgressBarColor(percentage)}`}
                                                                                style={{ width: `${percentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Student's answer preview */}
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-medium text-muted-foreground">Answer:</span>
                                                                            <span className="text-xs text-foreground bg-background px-2 py-1 rounded border border-border">
                                                                                {student.answer.length > 100
                                                                                    ? student.answer.substring(0, 100) + '...'
                                                                                    : student.answer}
                                                                            </span>
                                                                        </div>

                                                                        {/* AI Feedback */}
                                                                        <div className="p-2 bg-background rounded border border-border">
                                                                            <div className="flex items-start gap-2">
                                                                                <Activity className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                                                                        AI Feedback:
                                                                                    </p>
                                                                                    <p className="text-xs text-foreground">
                                                                                        {student.feedback}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Metadata */}
                                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className="w-3 h-3" />
                                                                                {new Date(student.submittedAt).toLocaleDateString()}
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <FileText className="w-3 h-3" />
                                                                                {student.examId}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-5">
                                                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                                        <Activity className="w-5 h-5 text-purple-600" />
                                                        AI-Powered Question Insights
                                                    </h4>

                                                    <div className="flex flex-wrap gap-3 mb-4">
                                                        <Button
                                                            onClick={() => predictDifficulty(question)}
                                                            disabled={loadingInsights[`difficulty-${question.questionId}`]}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            {loadingInsights[`difficulty-${question.questionId}`] ? (
                                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                                                            ) : (
                                                                <><Target className="w-4 h-4 mr-2" />Predict Difficulty</>
                                                            )}
                                                        </Button>

                                                        <Button
                                                            onClick={() => analyzeQuestionMistakes(question)}
                                                            disabled={loadingInsights[`mistakes-${question.questionId}`]}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            {loadingInsights[`mistakes-${question.questionId}`] ? (
                                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                                                            ) : (
                                                                <><AlertCircle className="w-4 h-4 mr-2" />Analyze Mistakes</>
                                                            )}
                                                        </Button>
                                                    </div>

                                                    {/* Difficulty Prediction Results */}
                                                    {aiInsights[`difficulty-${question.questionId}`] && (
                                                        <div className="bg-card border border-border rounded-lg p-4 mb-3">
                                                            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                                                <Target className="w-4 h-4 text-primary" />
                                                                Difficulty Prediction
                                                            </h5>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                                                <div className="text-center p-3 bg-muted rounded-lg">
                                                                    <p className="text-xs text-muted-foreground mb-1">Predicted</p>
                                                                    <p className={`text-lg font-bold ${getDifficultyColor(aiInsights[`difficulty-${question.questionId}`].predictedDifficulty)}`}>
                                                                        {aiInsights[`difficulty-${question.questionId}`].predictedDifficulty}
                                                                    </p>
                                                                </div>
                                                                <div className="text-center p-3 bg-muted rounded-lg">
                                                                    <p className="text-xs text-muted-foreground mb-1">Actual</p>
                                                                    <p className={`text-lg font-bold ${getDifficultyColor(question.difficulty)}`}>
                                                                        {question.difficulty}
                                                                    </p>
                                                                </div>
                                                                <div className="text-center p-3 bg-muted rounded-lg">
                                                                    <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                                                                    <p className="text-lg font-bold text-foreground">
                                                                        {aiInsights[`difficulty-${question.questionId}`].confidence}%
                                                                    </p>
                                                                </div>
                                                                <div className="text-center p-3 bg-muted rounded-lg">
                                                                    <p className="text-xs text-muted-foreground mb-1">Est. Success</p>
                                                                    <p className="text-lg font-bold text-foreground">
                                                                        {aiInsights[`difficulty-${question.questionId}`].estimatedSuccessRate}%
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                                <p className="text-xs font-medium text-muted-foreground mb-1">Reasoning:</p>
                                                                <p className="text-sm text-foreground">{aiInsights[`difficulty-${question.questionId}`].reasoning}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Common Mistakes Results */}
                                                    {aiInsights[`mistakes-${question.questionId}`] && (
                                                        <div className="bg-card border border-border rounded-lg p-4">
                                                            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                                                Common Mistakes Analysis
                                                            </h5>

                                                            {aiInsights[`mistakes-${question.questionId}`].commonMistakes.length > 0 && (
                                                                <div className="mb-4">
                                                                    <p className="text-sm font-medium text-muted-foreground mb-2">Common Patterns:</p>
                                                                    <div className="space-y-2">
                                                                        {aiInsights[`mistakes-${question.questionId}`].commonMistakes.map((mistake: any, idx: number) => (
                                                                            <div key={idx} className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                                                                                <div className="flex items-start justify-between mb-1">
                                                                                    <p className="text-sm font-medium text-foreground">{mistake.pattern}</p>
                                                                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                                                                        {mistake.frequency}%
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-xs text-muted-foreground mt-1">💡 {mistake.suggestion}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {aiInsights[`mistakes-${question.questionId}`].insights.length > 0 && (
                                                                <div className="mb-4">
                                                                    <p className="text-sm font-medium text-muted-foreground mb-2">Key Insights:</p>
                                                                    <ul className="space-y-1">
                                                                        {aiInsights[`mistakes-${question.questionId}`].insights.map((insight: string, idx: number) => (
                                                                            <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                                                                                <span className="text-primary mt-1">•</span>
                                                                                <span>{insight}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {aiInsights[`mistakes-${question.questionId}`].improvementTips.length > 0 && (
                                                                <div>
                                                                    <p className="text-sm font-medium text-muted-foreground mb-2">Teaching Tips:</p>
                                                                    <div className="space-y-2">
                                                                        {aiInsights[`mistakes-${question.questionId}`].improvementTips.map((tip: string, idx: number) => (
                                                                            <div key={idx} className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border-l-2 border-emerald-500">
                                                                                <p className="text-sm text-foreground">{tip}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        studentAnalytics.length === 0 ? (
                            <div className="bg-card border-2 border-dashed border-border rounded-lg p-12 text-center">
                                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">No student data available</h3>
                                <p className="text-muted-foreground">
                                    Student analytics will appear once submissions are received
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {studentAnalytics.map((student, index) => (
                                    <div
                                        key={student.email}
                                        className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all"
                                    >
                                        <div
                                            className="p-5 cursor-pointer"
                                            onClick={() => setSelectedStudent(
                                                selectedStudent === student.email ? null : student.email
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                                            {(student.userName || student.email).charAt(0).toUpperCase()}
                                                        </span>
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-foreground">
                                                                {student.userName || student.email}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground">{student.email}</p>
                                                        </div>
                                                        {student.disqualified && (
                                                            <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                                                                <XCircle className="w-3 h-3 inline mr-1" />
                                                                Disqualified
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-4 h-4" />
                                                            {student.totalQuestions} questions
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Target className="w-4 h-4" />
                                                            {student.totalSubmissions} submissions
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Award className="w-4 h-4" />
                                                            {student.totalScore}/{student.totalPossibleScore} marks
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs text-muted-foreground">Success Rate</span>
                                                                <span className={`text-sm font-bold ${getSuccessRateColor(student.successRate)}`}>
                                                                    {student.successRate.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all ${getProgressBarColor(student.successRate)}`}
                                                                    style={{ width: `${student.successRate}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <div className="text-center px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                                                <p className="text-xs text-muted-foreground mb-1">Correct</p>
                                                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {student.correctAnswers}
                                                                </p>
                                                            </div>
                                                            <div className="text-center px-3 py-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                                                                <p className="text-xs text-muted-foreground mb-1">Incorrect</p>
                                                                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                                                                    {student.incorrectAnswers}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                                                    {selectedStudent === student.email ? (
                                                        <ChevronUp className="w-5 h-5 text-foreground" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-foreground" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {selectedStudent === student.email && (
                                            <div className="border-t border-border bg-muted/30 p-5 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Trophy className="w-4 h-4 text-primary" />
                                                            <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                                                        </div>
                                                        <p className={`text-2xl font-bold ${getSuccessRateColor(student.avgScore)}`}>
                                                            {student.avgScore.toFixed(1)}%
                                                        </p>
                                                    </div>

                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Activity className="w-4 h-4 text-primary" />
                                                            <p className="text-sm font-medium text-muted-foreground">Partial Credit</p>
                                                        </div>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {student.partialCredit}
                                                        </p>
                                                    </div>

                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                            <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                                                        </div>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {((student.correctAnswers + student.incorrectAnswers + student.partialCredit) / student.totalQuestions * 100).toFixed(0)}%
                                                        </p>
                                                    </div>

                                                    {/* Study Plan Generator */}
                                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                                        <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                                            <FileText className="w-4 h-4 text-blue-600" />
                                                            Personalized Study Plan
                                                        </h5>
                                                        <Button
                                                            onClick={() => generateStudyPlanForStudent(student)}
                                                            disabled={loadingInsights[`studyplan-${student.email}`]}
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                        >
                                                            {loadingInsights[`studyplan-${student.email}`] ? (
                                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                                                            ) : (
                                                                <>Generate Plan</>
                                                            )}
                                                        </Button>

                                                        {aiInsights[`studyplan-${student.email}`] && (
                                                            <div className="mt-4 space-y-3">
                                                                <div className="p-3 bg-card border border-border rounded-lg">
                                                                    <p className="text-xs font-medium text-muted-foreground mb-2">Priority Topics:</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {aiInsights[`studyplan-${student.email}`].priorityTopics.map((topic: string, idx: number) => (
                                                                            <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                                                                                {topic}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 bg-card border border-border rounded-lg">
                                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Estimated Improvement Time:</p>
                                                                    <p className="text-sm font-bold text-foreground">{aiInsights[`studyplan-${student.email}`].estimatedImprovementTime}</p>
                                                                </div>
                                                                <div className="max-h-64 overflow-y-auto space-y-2">
                                                                    {aiInsights[`studyplan-${student.email}`].weeklyPlan.map((day: any, idx: number) => (
                                                                        <div key={idx} className="p-3 bg-card border border-border rounded-lg">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <p className="text-sm font-medium text-foreground">{day.day}</p>
                                                                                <span className="text-xs text-muted-foreground">{day.duration}</span>
                                                                            </div>
                                                                            <p className="text-xs font-medium text-primary mb-1">{day.topic}</p>
                                                                            <ul className="text-xs text-muted-foreground space-y-1">
                                                                                {day.activities.map((activity: string, aidx: number) => (
                                                                                    <li key={aidx} className="flex items-start gap-1">
                                                                                        <span>•</span>
                                                                                        <span>{activity}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Performance Predictor */}
                                                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                                        <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                                            <TrendingUp className="w-4 h-4 text-amber-600" />
                                                            Performance Prediction
                                                        </h5>
                                                        <Button
                                                            onClick={() => predictStudentPerformance(student)}
                                                            disabled={loadingInsights[`performance-${student.email}`]}
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                        >
                                                            {loadingInsights[`performance-${student.email}`] ? (
                                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Predicting...</>
                                                            ) : (
                                                                <>Predict Future Performance</>
                                                            )}
                                                        </Button>

                                                        {aiInsights[`performance-${student.email}`] && (
                                                            <div className="mt-4 space-y-3">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="p-3 bg-card border border-border rounded-lg text-center">
                                                                        <p className="text-xs text-muted-foreground mb-1">Predicted Score</p>
                                                                        <p className="text-2xl font-bold text-foreground">
                                                                            {aiInsights[`performance-${student.email}`].predictedScore.toFixed(0)}%
                                                                        </p>
                                                                    </div>
                                                                    <div className="p-3 bg-card border border-border rounded-lg text-center">
                                                                        <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                                                                        <p className="text-2xl font-bold text-foreground">
                                                                            {aiInsights[`performance-${student.email}`].confidence}%
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 bg-card border border-border rounded-lg">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <p className="text-xs font-medium text-muted-foreground">Trend</p>
                                                                        <span className={`text-sm font-bold ${aiInsights[`performance-${student.email}`].trend === 'improving' ? 'text-emerald-600' :
                                                                            aiInsights[`performance-${student.email}`].trend === 'declining' ? 'text-rose-600' :
                                                                                'text-amber-600'
                                                                            }`}>
                                                                            {aiInsights[`performance-${student.email}`].trend === 'improving' && <TrendingUp className="w-4 h-4 inline" />}
                                                                            {aiInsights[`performance-${student.email}`].trend === 'declining' && <TrendingDown className="w-4 h-4 inline" />}
                                                                            {' '}{aiInsights[`performance-${student.email}`].trend}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-xs text-muted-foreground">Risk Level:</p>
                                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${aiInsights[`performance-${student.email}`].riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700' :
                                                                            aiInsights[`performance-${student.email}`].riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-rose-100 text-rose-700'
                                                                            }`}>
                                                                            {aiInsights[`performance-${student.email}`].riskLevel}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 bg-card border border-border rounded-lg">
                                                                    <p className="text-xs font-medium text-muted-foreground mb-2">Insights:</p>
                                                                    <ul className="space-y-1">
                                                                        {aiInsights[`performance-${student.email}`].insights.map((insight: string, idx: number) => (
                                                                            <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                                                                                <span className="text-primary">•</span>
                                                                                <span>{insight}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-5">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                                                            <Activity className="w-5 h-5 text-primary" />
                                                            AI-Powered Performance Analysis
                                                        </h4>
                                                        <Button
                                                            onClick={() => fetchStudentAnalysis(student)}
                                                            disabled={studentAnalysis[student.email]?.loading}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            {studentAnalysis[student.email]?.loading ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    Analyzing...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Activity className="w-4 h-4 mr-2" />
                                                                    {studentAnalysis[student.email] ? 'Refresh Analysis' : 'Analyze Performance'}
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>

                                                    {studentAnalysis[student.email] && !studentAnalysis[student.email].loading && (
                                                        <div className="space-y-4">
                                                            {/* Radar Chart */}
                                                            {(studentAnalysis[student.email].strengths.length > 0 ||
                                                                studentAnalysis[student.email].weaknesses.length > 0) && (
                                                                    <div className="bg-card border border-border rounded-lg p-4">
                                                                        <h5 className="font-medium text-foreground mb-3">Skills Overview</h5>
                                                                        <ResponsiveContainer width="100%" height={300}>
                                                                            <RadarChart data={[
                                                                                ...studentAnalysis[student.email].strengths.map(s => ({
                                                                                    subject: s.topic,
                                                                                    score: s.score,
                                                                                    fullMark: 100,
                                                                                    type: 'strength'
                                                                                })),
                                                                                ...studentAnalysis[student.email].weaknesses.map(w => ({
                                                                                    subject: w.topic,
                                                                                    score: w.score,
                                                                                    fullMark: 100,
                                                                                    type: 'weakness'
                                                                                }))
                                                                            ]}>
                                                                                <PolarGrid />
                                                                                <PolarAngleAxis dataKey="subject" />
                                                                                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                                                                <Radar
                                                                                    name="Performance"
                                                                                    dataKey="score"
                                                                                    stroke="hsl(var(--primary))"
                                                                                    fill="hsl(var(--primary))"
                                                                                    fillOpacity={0.6}
                                                                                />
                                                                                <Legend />
                                                                            </RadarChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                )}

                                                            {/* Strengths and Weaknesses Side by Side */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Strengths */}
                                                                <div className="bg-card border border-border rounded-lg p-4">
                                                                    <h5 className="font-medium text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                                                                        <TrendingUp className="w-4 h-4" />
                                                                        Strengths ({studentAnalysis[student.email].strengths.length})
                                                                    </h5>
                                                                    <div className="space-y-2">
                                                                        {studentAnalysis[student.email].strengths.map((strength, idx) => (
                                                                            <div key={idx} className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <span className="font-medium text-sm text-foreground capitalize">
                                                                                        {strength.topic}
                                                                                    </span>
                                                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                                        {strength.score}%
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-xs text-muted-foreground">{strength.description}</p>
                                                                                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-emerald-500"
                                                                                        style={{ width: `${strength.score}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Weaknesses */}
                                                                <div className="bg-card border border-border rounded-lg p-4">
                                                                    <h5 className="font-medium text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
                                                                        <TrendingDown className="w-4 h-4" />
                                                                        Areas for Improvement ({studentAnalysis[student.email].weaknesses.length})
                                                                    </h5>
                                                                    <div className="space-y-2">
                                                                        {studentAnalysis[student.email].weaknesses.map((weakness, idx) => (
                                                                            <div key={idx} className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <span className="font-medium text-sm text-foreground capitalize">
                                                                                        {weakness.topic}
                                                                                    </span>
                                                                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                                                                        {weakness.score}%
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-xs text-muted-foreground">{weakness.description}</p>
                                                                                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-rose-500"
                                                                                        style={{ width: `${weakness.score}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Recommendations */}
                                                            {studentAnalysis[student.email].recommendations.length > 0 && (
                                                                <div className="bg-card border border-border rounded-lg p-4">
                                                                    <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                                                        <Target className="w-4 h-4 text-primary" />
                                                                        Personalized Recommendations
                                                                    </h5>
                                                                    <ul className="space-y-2">
                                                                        {studentAnalysis[student.email].recommendations.map((rec, idx) => (
                                                                            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                                                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                                                                                    {idx + 1}
                                                                                </span>
                                                                                <span>{rec}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Question-wise breakdown */}
                                                <div className="bg-card border border-border rounded-lg p-4">
                                                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                        <BarChart3 className="w-4 h-4" />
                                                        Question-wise Performance
                                                    </h4>
                                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                                        {student.questionDetails.map((q: any, idx: number) => (
                                                            <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-sm font-medium text-foreground">
                                                                        Question {idx + 1} ({q.questionType})
                                                                    </span>
                                                                    <span className={`text-sm font-bold ${getSuccessRateColor((q.score / q.maxMarks) * 100)}`}>
                                                                        {q.score}/{q.maxMarks}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">{q.feedback}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {viewMode === 'students' && studentAnalytics.length >= 2 && (
                        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/20 dark:to-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-5 mt-6">
                            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-violet-600" />
                                Compare Students
                            </h4>
                            <div className="flex gap-3 mb-4">
                                <select
                                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                                    onChange={(e) => setCompareStudent1(e.target.value)}
                                >
                                    <option value="">Select Student 1</option>
                                    {studentAnalytics.map(s => (
                                        <option key={s.email} value={s.email}>{s.userName}</option>
                                    ))}
                                </select>
                                <select
                                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                                    onChange={(e) => setCompareStudent2(e.target.value)}
                                >
                                    <option value="">Select Student 2</option>
                                    {studentAnalytics.map(s => (
                                        <option key={s.email} value={s.email}>{s.userName}</option>
                                    ))}
                                </select>
                                <Button
                                    onClick={() => {
                                        const s1 = studentAnalytics.find(s => s.email === compareStudent1);
                                        const s2 = studentAnalytics.find(s => s.email === compareStudent2);
                                        if (s1 && s2) compareStudentsAI(s1, s2);
                                    }}
                                    disabled={!compareStudent1 || !compareStudent2 || loadingInsights[`compare-${compareStudent1}-${compareStudent2}`]}
                                >
                                    {loadingInsights[`compare-${compareStudent1}-${compareStudent2}`] ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Comparing...</>
                                    ) : (
                                        <>Compare</>
                                    )}
                                </Button>
                            </div>

                            {compareStudent1 && compareStudent2 && aiInsights[`compare-${compareStudent1}-${compareStudent2}`] && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-card border border-border rounded-lg">
                                        <h5 className="font-medium text-foreground mb-2">Comparison Summary</h5>
                                        <p className="text-sm text-muted-foreground">{aiInsights[`compare-${compareStudent1}-${compareStudent2}`].comparison}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Student 1 Recommendations */}
                                        <div className="p-4 bg-card border border-border rounded-lg">
                                            <h5 className="font-medium text-foreground mb-3">
                                                Recommendations for {studentAnalytics.find(s => s.email === compareStudent1)?.userName}
                                            </h5>
                                            <ul className="space-y-2">
                                                {aiInsights[`compare-${compareStudent1}-${compareStudent2}`].recommendations.forStudent1.map((rec: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                                                        <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Student 2 Recommendations */}
                                        <div className="p-4 bg-card border border-border rounded-lg">
                                            <h5 className="font-medium text-foreground mb-3">
                                                Recommendations for {studentAnalytics.find(s => s.email === compareStudent2)?.userName}
                                            </h5>
                                            <ul className="space-y-2">
                                                {aiInsights[`compare-${compareStudent1}-${compareStudent2}`].recommendations.forStudent2.map((rec: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                                                        <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Peer Learning Opportunities */}
                                    {aiInsights[`compare-${compareStudent1}-${compareStudent2}`].peerLearningOpportunities.length > 0 && (
                                        <div className="p-4 bg-card border border-border rounded-lg">
                                            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                                <Award className="w-4 h-4 text-primary" />
                                                Peer Learning Opportunities
                                            </h5>
                                            <ul className="space-y-2">
                                                {aiInsights[`compare-${compareStudent1}-${compareStudent2}`].peerLearningOpportunities.map((opp: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                            {idx + 1}
                                                        </span>
                                                        <span>{opp}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </ExaminerLayout>
    );
}