import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";

interface Question {
    solution: any;
    id: string;
    question: string;
    expectedOutput?: string;
    answer?: string;
    difficulty?: string;
    marks?: number;
}

export default function ExaminerDashboard() {
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("python");
    const [duration, setDuration] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { data: session } = useSession();
    const [questions, setQuestions] = useState<Question[]>([
        {
            id: "q1", question: "", expectedOutput: "", difficulty: undefined, marks: undefined,
            solution: undefined
        }
    ]);
    const router = useRouter();
    const [uploadedQuestions, setUploadedQuestions] = useState<any[]>([]);
    const [showQuestionConfig, setShowQuestionConfig] = useState(false);
    const [questionConfig, setQuestionConfig] = useState({
        beginner: { count: 0, marks: 0 },
        intermediate: { count: 0, marks: 0 },
        hard: { count: 0, marks: 0 }
    });
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [useExcelQuestions, setUseExcelQuestions] = useState(false);
    const [isExamProctored, setIsExamProctored] = useState(false);

    const [questionBank, setQuestionBank] = useState<any[]>([]);
    const [showQuestionBank, setShowQuestionBank] = useState(false);
    const [selectedBankQuestions, setSelectedBankQuestions] = useState<string[]>([]);
    const [isLoadingQuestionBank, setIsLoadingQuestionBank] = useState(false);

    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [allowedUsersRaw, setAllowedUsersRaw] = useState("");
    const [currentStep, setCurrentStep] = useState(1);

    const [beginnerCount, setBeginnerCount] = useState(0);
    const [intermediateCount, setIntermediateCount] = useState(0);
    const [expertCount, setExpertCount] = useState(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');


    const resetForm = () => {
        setTitle("");
        setLanguage("python");
        setDuration(10);
        setIsExamProctored(false);
        setQuestions([{
            id: "q1",
            question: "",
            expectedOutput: "",
            difficulty: undefined,
            marks: undefined,
            solution: undefined
        }]);
        setUploadedQuestions([]);
        setUseExcelQuestions(false);
        setGeneratedQuestions([]);
        setQuestionConfig({
            beginner: { count: 0, marks: 0 },
            intermediate: { count: 0, marks: 0 },
            hard: { count: 0, marks: 0 }
        });
    };

    const handleCreateExam = useCallback(async () => {
        const validQuestions = questions.filter(q => q.question && q.question.trim() !== "");

        if (!title || !title.trim()) {
            toast.error("Exam title is required.");
            return;
        }

        if (validQuestions.length === 0) {
            toast.error("Please add at least one question or generate questions from Excel.");
            return;
        }

        setIsLoading(true);

        try {
            const examId = title.toLowerCase().replace(/\s+/g, "-");

            const examData = {
                examId,
                title,
                language,
                duration,
                createdBy: session?.user?.email,
                questions: validQuestions,
                isExamProctored,
                useExcelQuestions,
                questionConfig,
                startTime,
                endTime,
                allowedUsers: allowedUsersRaw
                    .split(",")
                    .map((email) => email.trim())
                    .filter(Boolean),
            };

            console.log('Exam data being saved:', examData);

            try {
                const response = await fetch("/api/assessment/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(examData),
                });

                if (response.status === 409) {
                    toast.error("An exam with this title already exists. Please choose a different title.");
                    return;
                }

                if (!response.ok) throw new Error("Failed to create exam");

                resetForm();
            } catch (error) {
                console.error("Error saving exam data:", error);
                toast.error("Failed to save exam data. Please try again.");
                return;
            }

        } catch (error) {
            console.error("Error creating exam:", error);
            toast.error("Error creating exam. Please try again.");
        } finally {
            setIsLoading(false);
            setCurrentStep(1);
        }
    }, [title, questions, language, duration, session]);

    const languageOptions = [
        { value: "python", label: "Python", icon: "🐍", color: "from-yellow-400 to-blue-500" },
        { value: "sql", label: "SQL", icon: "🗄️", color: "from-blue-400 to-purple-500" },
        { value: "javascript", label: "JavaScript", icon: "⚡", color: "from-yellow-400 to-orange-500" },
        { value: "java", label: "Java", icon: "☕", color: "from-red-400 to-orange-500" },
    ];

    const isFormValid = title.trim() !== "" && questions.some(q =>
        q &&
        typeof q.question === 'string' &&
        q.question.trim() !== ""
    );

    const fetchQuestions = async () => {
        if (beginnerCount + intermediateCount + expertCount === 0) {
            setError('Please select at least one question');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/question-bank?language=${language}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const allQuestions = await res.json();

            console.log(allQuestions);

            const beginner = allQuestions
                .filter((q: { difficulty: string; }) => q.difficulty === "easy")
                .slice(0, beginnerCount);

            const intermediate = allQuestions
                .filter((q: { difficulty: string; }) => q.difficulty === "medium")
                .slice(0, intermediateCount);

            const expert = allQuestions
                .filter((q: { difficulty: string; }) => q.difficulty === "hard")
                .slice(0, expertCount);

            const selectedQuestions = [...beginner, ...intermediate, ...expert];

            const mappedQuestions = selectedQuestions.map((q, index) => ({
                id: `generated-q${index + 1}`,
                question: q.questionText ?? q.question,
                expectedOutput: q.expectedOutput ? q.expectedOutput.toString().trim() : '',
                difficulty: q.difficulty,
                marks: q.marks,
                solution: q.solution !== undefined ? q.solution : undefined
            }));

            console.log('Fetched questions:', mappedQuestions);
            setQuestions(mappedQuestions);

        } catch (err) {
            console.error('Error fetching questions:', err);
            if (err instanceof Error) {
                setError(`Failed to fetch questions: ${err.message}`);
            } else {
                setError('Failed to fetch questions: Unknown error');
            }
        } finally {
            setLoading(false);
        }
    };

    const clearQuestions = () => {
        setQuestions([]);
        setError('');
    };

    const resetCounts = () => {
        setBeginnerCount(0);
        setIntermediateCount(0);
        setExpertCount(0);
        setError('');
    };


    return (
        <>
            <Head>
                <title>SysRank</title>
                <link rel="icon" href="/logo.png" />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
                <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-[#E6F3FF] to-[#E0F6FF] relative">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#CCE7FF] rounded-full opacity-40 blur-2xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#B0E0E6] rounded-full opacity-30 blur-2xl"></div>
                    </div>

                    <nav className="relative z-10 bg-white/60 backdrop-blur-md border-b border-[#E9ECEF]">
                        <div className="max-w-6xl mx-auto px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-[#87CEEB] rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-semibold text-[#6C757D]">SysRank</h1>
                                        <p className="text-xs text-[#6C757D]/60">Examiner Portal</p>
                                    </div>
                                </div>
                                <div className="bg-[#87CEEB] text-white px-4 py-2 rounded-full text-sm font-medium">
                                    {session?.user?.name}
                                </div>
                            </div>
                        </div>
                    </nav>

                    <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center space-x-2 bg-[#E6F3FF] text-[#6C757D] px-4 py-2 rounded-full text-sm font-medium mb-4">
                                <div className="w-2 h-2 bg-[#87CEEB] rounded-full"></div>
                                <span>Create Assessment</span>
                            </div>
                            <h2 className="text-3xl font-light mb-3 text-[#6C757D]">Design Your Exam</h2>
                            <p className="text-[#6C757D]/70 max-w-xl mx-auto">
                                Create comprehensive assessments with our intuitive builder
                            </p>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center justify-center space-x-4 mb-6">
                                {[
                                    { number: 1, title: 'Basic Info', active: currentStep === 1 },
                                    { number: 2, title: 'Questions', active: currentStep === 2 },
                                    { number: 3, title: 'Review', active: currentStep === 3 }
                                ].map((step, index) => (
                                    <div key={step.number} className="flex items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${step.active
                                            ? 'bg-[#87CEEB] text-white'
                                            : 'bg-[#E9ECEF] text-[#6C757D]'
                                            }`}>
                                            {step.number}
                                        </div>
                                        <span className={`ml-2 text-sm font-medium ${step.active ? 'text-[#87CEEB]' : 'text-[#6C757D]/60'
                                            }`}>
                                            {step.title}
                                        </span>
                                        {index < 2 && (
                                            <div className={`w-12 h-px mx-4 ${step.active ? 'bg-[#87CEEB]' : 'bg-[#E9ECEF]'
                                                }`}></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-sm border border-[#E9ECEF] rounded-2xl shadow-sm p-8">
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <div className="w-12 h-12 bg-[#E6F3FF] rounded-xl mx-auto mb-3 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-[#87CEEB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-medium text-[#6C757D] mb-1">Basic Information</h3>
                                        <p className="text-[#6C757D]/60 text-sm">Set up your exam details</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-2">
                                                Exam Title *
                                            </label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g., Python Programming Assessment"
                                                className="w-full px-4 py-3 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D] placeholder-[#6C757D]/40"
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-2">
                                                Programming Language
                                            </label>
                                            <select
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D] appearance-none"
                                                disabled={isLoading}
                                            >
                                                {languageOptions.map((lang) => (
                                                    <option key={lang.value} value={lang.value}>
                                                        {lang.icon} {lang.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-2">
                                                Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={300}
                                                value={duration}
                                                onChange={(e) => setDuration(Number(e.target.value))}
                                                className="w-full px-4 py-3 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D]"
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-2">
                                                Exam Proctoring
                                            </label>
                                            <div className="bg-white border border-[#E9ECEF] rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-[#6C757D]">
                                                        {isExamProctored ? 'Proctored' : 'Non-Proctored'}
                                                    </span>
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isExamProctored}
                                                            onChange={(e) => setIsExamProctored(e.target.checked)}
                                                            className="sr-only"
                                                        />
                                                        <div
                                                            onClick={() => setIsExamProctored(!isExamProctored)}
                                                            className={`w-10 h-6 rounded-full cursor-pointer transition-all duration-200 ${isExamProctored ? 'bg-[#87CEEB]' : 'bg-[#E9ECEF]'
                                                                }`}
                                                        >
                                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 mt-1 ${isExamProctored ? 'translate-x-5' : 'translate-x-1'
                                                                }`}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-2">
                                                Start Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D]"
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-2">
                                                End Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D]"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#6C757D] mb-2">
                                            Allowed Users (optional)
                                        </label>
                                        <textarea
                                            placeholder="Enter comma-separated emails or leave empty for all users"
                                            value={allowedUsersRaw}
                                            onChange={(e) => setAllowedUsersRaw(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D] placeholder-[#6C757D]/40 resize-none"
                                            rows={3}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            disabled={!title.trim()}
                                            className="bg-[#87CEEB] hover:bg-[#ADD8E6] disabled:bg-[#E9ECEF] disabled:text-[#6C757D]/40 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            Next: Questions
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <div className="w-12 h-12 bg-[#E6F3FF] rounded-xl mx-auto mb-3 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-[#87CEEB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-medium text-[#6C757D] mb-1">Exam Questions</h3>
                                        <p className="text-[#6C757D]/60 text-sm">Add questions manually or import from your question bank</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <label className="block text-sm font-medium text-green-800 mb-2">
                                                🟢 Beginner Questions:
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={beginnerCount}
                                                onChange={(e) => setBeginnerCount(Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            />
                                        </div>

                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <label className="block text-sm font-medium text-yellow-800 mb-2">
                                                🟡 Intermediate Questions:
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={intermediateCount}
                                                onChange={(e) => setIntermediateCount(Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                        </div>

                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <label className="block text-sm font-medium text-red-800 mb-2">
                                                🔴 Expert Questions:
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={expertCount}
                                                onChange={(e) => setExpertCount(Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mb-4">
                                        <button
                                            onClick={fetchQuestions}
                                            disabled={loading}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Fetching...
                                                </>
                                            ) : (
                                                'Fetch Questions'
                                            )}
                                        </button>

                                        <button
                                            onClick={resetCounts}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Reset
                                        </button>

                                        {questions.length > 0 && (
                                            <button
                                                onClick={clearQuestions}
                                                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                Clear Questions
                                            </button>
                                        )}
                                    </div>

                                    {(beginnerCount + intermediateCount + expertCount > 0) && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                            Total questions to fetch: <span className="font-semibold">{beginnerCount + intermediateCount + expertCount}</span>
                                            {' '}({beginnerCount} beginner, {intermediateCount} intermediate, {expertCount} expert)
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                {error}
                                            </div>
                                        </div>
                                    )}

                                    {questions.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-lg font-semibold text-gray-800">
                                                    Fetched Questions ({questions.length})
                                                </h2>
                                                <div className="text-sm text-gray-600">
                                                    Language: <span className="font-medium text-blue-600">{language}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {questions.map((q, index) => (
                                                    <div key={q.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${q.difficulty === 'easy' ? 'bg-green-500' :
                                                                    q.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}>
                                                                    {index + 1}
                                                                </div>
                                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${q.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                                    q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {q.difficulty}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <h3 className="font-medium text-gray-800 mb-2">Question:</h3>
                                                                <div className="bg-white border border-gray-200 rounded-md p-3 text-sm text-gray-700">
                                                                    {q.question || 'No question text available'}
                                                                </div>
                                                            </div>

                                                            {q.expectedOutput && (
                                                                <div>
                                                                    <h3 className="font-medium text-gray-800 mb-2">Expected Output:</h3>
                                                                    <div className="bg-white border border-gray-200 rounded-md p-3 text-sm text-gray-700">
                                                                        {q.expectedOutput}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {q.solution && (
                                                                <div>
                                                                    <h3 className="font-medium text-gray-800 mb-2">Solution:</h3>
                                                                    <div className="bg-gray-900 text-green-400 rounded-md p-3 text-sm font-mono overflow-x-auto">
                                                                        <pre>{q.solution}</pre>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-4">
                                        <button
                                            onClick={() => setCurrentStep(1)}
                                            className="text-[#6C757D] hover:text-[#87CEEB] px-6 py-3 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={() => setCurrentStep(3)}
                                            disabled={!questions.some(q => q.question?.trim())}
                                            className="bg-[#87CEEB] hover:bg-[#ADD8E6] disabled:bg-[#E9ECEF] disabled:text-[#6C757D]/40 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            Next: Review
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <div className="w-12 h-12 bg-[#E6F3FF] rounded-xl mx-auto mb-3 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-[#87CEEB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-medium text-[#6C757D] mb-1">Review & Create</h3>
                                        <p className="text-[#6C757D]/60 text-sm">Review your exam details before creating</p>
                                    </div>

                                    {/* Review content */}
                                    <div className="bg-[#F8F9FA] rounded-xl p-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-sm font-medium text-[#6C757D]">Title:</span>
                                                <p className="text-[#6C757D]/70">{title}</p>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-[#6C757D]">Language:</span>
                                                <p className="text-[#6C757D]/70">{languageOptions.find(l => l.value === language)?.label}</p>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-[#6C757D]">Duration:</span>
                                                <p className="text-[#6C757D]/70">{duration} minutes</p>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-[#6C757D]">Questions:</span>
                                                <p className="text-[#6C757D]/70">{questions.filter(q => q.question.trim()).length} questions</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="text-[#6C757D] hover:text-[#87CEEB] px-6 py-3 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleCreateExam}
                                            disabled={isLoading || !isFormValid}
                                            className="bg-[#87CEEB] hover:bg-[#ADD8E6] disabled:bg-[#E9ECEF] disabled:text-[#6C757D]/40 text-white px-8 py-3 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            {isLoading ? 'Creating...' : 'Create Exam'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* Success Modal */}
                {showSuccess && (
                    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-[#87CEEB] rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-medium text-[#6C757D] mb-2">Success!</h3>
                                <p className="text-[#6C757D]/60 text-sm">Your exam has been created successfully</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}