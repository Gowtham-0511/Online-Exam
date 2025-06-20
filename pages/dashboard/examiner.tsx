import { useState } from "react";
import { db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function ExaminerDashboard() {
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("python");
    const [duration, setDuration] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { data: session } = useSession();
    const [questions, setQuestions] = useState([
        { id: "q1", question: "", expectedOutput: "" }
    ]);
    const router = useRouter();

    type Question = {
        id: string;
        question: string;
        expectedOutput: string;
    };


    const handleCreateExam = async () => {
        // Check if title exists and at least one question has content
        const hasValidQuestions = questions.some(q => q.question.trim() !== "");

        if (!title || !hasValidQuestions) {
            // Show custom error alert
            const errorAlert = document.getElementById('error-alert');
            if (errorAlert) {
                errorAlert.classList.remove('opacity-0', 'translate-y-2');
                errorAlert.classList.add('opacity-100', 'translate-y-0');
                setTimeout(() => {
                    errorAlert.classList.add('opacity-0', 'translate-y-2');
                    errorAlert.classList.remove('opacity-100', 'translate-y-0');
                }, 3000);
            }
            return;
        }

        setIsLoading(true);

        try {
            const examId = title.toLowerCase().replace(/\s+/g, "-");

            await setDoc(doc(db, "exams", examId), {
                title,
                language,
                duration,
                createdBy: session?.user?.email,
                createdAt: new Date().toISOString(),
                questions: questions.filter(q => q.question.trim() !== ""),
            });

            // Show success animation
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setTitle("");
                setLanguage("python");
                setDuration(10);
                setQuestions([{ id: "q1", question: "", expectedOutput: "" }]);
            }, 2000);

        } catch (error) {
            console.error("Error creating exam:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const languageOptions = [
        { value: "python", label: "Python", icon: "🐍", color: "from-yellow-400 to-blue-500" },
        { value: "sql", label: "SQL", icon: "🗄️", color: "from-blue-400 to-purple-500" },
        { value: "javascript", label: "JavaScript", icon: "⚡", color: "from-yellow-400 to-orange-500" },
        { value: "java", label: "Java", icon: "☕", color: "from-red-400 to-orange-500" },
    ];

    const addQuestion = () => {
        setQuestions([...questions, { id: `q${questions.length + 1}`, question: "", expectedOutput: "" }]);
    };

    const removeQuestion = (index: number) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    const selectedLanguage = languageOptions.find(lang => lang.value === language);

    const updateQuestion = (
        index: number,
        field: keyof Question,
        value: string
    ) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };


    // Check if form is valid for submission
    const isFormValid = title.trim() !== "" && questions.some(q => q.question.trim() !== "");

    const handleViewSubmissions = () => {
        router.push('/dashboard/examiner-submissions');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
            {/* Floating Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full opacity-60 blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-violet-100 to-purple-100 rounded-full opacity-50 blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full opacity-40 blur-2xl animate-pulse delay-500"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                    ExamCraft
                                </h1>
                                <p className="text-xs text-slate-500 font-medium">Examiner Portal</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* <div className="hidden sm:flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-4 py-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium">Active</span>
                            </div> */}
                            <div 
                                className=" bg-gradient-to-br from-violet-500 to-purple-600 rounded-full p-2 flex items-center justify-center text-white font-semibold text-sm shadow-lg"
                            >
                                {session?.user?.name}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Create Assessment</span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                            Design Your Exam
                        </span>
                    </h2>

                    <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        Create comprehensive assessments with our intuitive builder. Configure settings, add questions, and launch in minutes.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-violet-100/50 to-purple-100/50 rounded-full blur-xl"></div>

                    <div className="relative z-10">
                        {/* Form Header */}
                        <div className="text-center mb-8">
                            <div className={`w-16 h-16 bg-gradient-to-br ${selectedLanguage?.color || 'from-emerald-500 to-teal-600'} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                                <span className="text-2xl">{selectedLanguage?.icon || '📝'}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Exam Configuration</h3>
                            <p className="text-slate-600">Fill in the details below to create your assessment</p>
                        </div>

                        {/* Basic Settings */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Exam Title <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Python Programming Assessment"
                                        className="w-full px-4 py-4 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-200/50 focus:border-emerald-400 transition-all duration-200 text-slate-800 placeholder-slate-400"
                                        disabled={isLoading}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Programming Language
                                </label>
                                <div className="relative">
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full px-4 py-4 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-200/50 focus:border-emerald-400 transition-all duration-200 text-slate-800 appearance-none cursor-pointer"
                                        disabled={isLoading}
                                    >
                                        {languageOptions.map((lang) => (
                                            <option key={lang.value} value={lang.value}>
                                                {lang.icon} {lang.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {selectedLanguage && (
                                    <div className="mt-3 inline-flex items-center space-x-2 bg-slate-50 rounded-full px-3 py-1">
                                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${selectedLanguage.color}`}></div>
                                        <span className="text-sm text-slate-600 font-medium">
                                            {selectedLanguage.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Duration (minutes)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        max={300}
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full px-4 py-4 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-200/50 focus:border-emerald-400 transition-all duration-200 text-slate-800"
                                        disabled={isLoading}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Questions Section */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h4 className="text-xl font-semibold text-slate-800 mb-1">Exam Questions</h4>
                                    <p className="text-sm text-slate-600">Add all your questions below. At least one question is required.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addQuestion}
                                    className="inline-flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                                    disabled={isLoading}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>Add Question</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {questions.map((q, i) => (
                                    <div key={q.id} className="bg-slate-50/80 border border-slate-200 rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                                                <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                    {i + 1}
                                                </div>
                                                <span>Question {i + 1}</span>
                                            </label>
                                            {questions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(i)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors duration-200"
                                                    disabled={isLoading}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">
                                                    Question Description *
                                                </label>
                                                <textarea
                                                    value={q.question}
                                                    onChange={(e) => updateQuestion(i, "question", e.target.value)}
                                                    placeholder="Enter your question here... Describe the problem statement, requirements, and expected deliverables."
                                                    rows={4}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all duration-200 text-slate-800 placeholder-slate-400 resize-none"
                                                    disabled={isLoading}
                                                />
                                                <div className="mt-1 text-xs text-slate-400">
                                                    {q.question.length}/1000 characters
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">
                                                    Expected Output (Optional)
                                                </label>
                                                <textarea
                                                    value={q.expectedOutput}
                                                    onChange={(e) => updateQuestion(i, "expectedOutput", e.target.value)}
                                                    placeholder="Describe the expected output or solution format (optional)..."
                                                    rows={2}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all duration-200 text-slate-800 placeholder-slate-400 resize-none"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleCreateExam}
                                disabled={isLoading || !isFormValid}
                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-200/50 flex items-center justify-center space-x-3"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Creating...</span>
                                    </>
                                ) : showSuccess ? (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Created!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Create Exam</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleViewSubmissions}
                                className="sm:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-slate-200/50 flex items-center justify-center space-x-3"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                <span>View Submissions</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl transform animate-bounce max-w-sm w-full">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Success!</h3>
                            <p className="text-slate-600">Your exam has been created successfully</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Alert (hidden by default) */}
            <div
                id="error-alert"
                className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 opacity-0 translate-y-2 transition-all duration-300"
            >
                <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Please fill in the exam title and at least one question.</span>
                </div>
            </div>
        </div>
    );
}