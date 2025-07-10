import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import * as XLSX from 'xlsx';
import Head from "next/head";
import toast from "react-hot-toast";

interface Question {
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
        { id: "q1", question: "", expectedOutput: "", difficulty: undefined, marks: undefined }
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

    const [previewMode, setPreviewMode] = useState(false);

    const [questionBank, setQuestionBank] = useState<any[]>([]);
    const [showQuestionBank, setShowQuestionBank] = useState(false);
    const [selectedBankQuestions, setSelectedBankQuestions] = useState<string[]>([]);
    const [isLoadingQuestionBank, setIsLoadingQuestionBank] = useState(false);

    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [allowedUsersRaw, setAllowedUsersRaw] = useState("");
    const [currentStep, setCurrentStep] = useState(1);


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
            marks: undefined
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
                const response = await fetch("/api/exams/create", {
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

    const addQuestion = () => {
        setQuestions([...questions, { id: `q${questions.length + 1}`, question: "", expectedOutput: "", difficulty: undefined, marks: undefined }]);
    };

    const removeQuestion = (index: number) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    const selectedLanguage = languageOptions.find(lang => lang.value === language);

    const updateQuestion = (
        index: number,
        field: 'question' | 'expectedOutput',
        value: string
    ) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    const isFormValid = title.trim() !== "" && questions.some(q => q.question.trim() !== "");

    const handleViewSubmissions = () => {
        router.push('/dashboard/examiner-submissions');
    };

    const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {

        try {
            const file = event.target.files?.[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size too large. Maximum 5MB allowed.');
            }

            if (!file.name.match(/\.(xlsx|xls)$/)) {
                throw new Error('Invalid file type. Only Excel files allowed.');
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const validatedData = jsonData.map((row: any, index) => ({
                        id: `excel-q${index + 1}`,
                        question: row['Question'] || row['question'] || '',
                        answer: row['Answer'] || row['answer'] || '',
                        difficulty: (row['Difficulty'] || row['difficulty'] || 'beginner').toLowerCase(),
                        marks: parseInt(row['Marks'] || row['marks'] || '1')
                    }));

                    setUploadedQuestions(validatedData);
                    setShowQuestionConfig(true);
                    setUseExcelQuestions(true);
                } catch (error) {
                    console.error('Error reading Excel file:', error);
                    alert('Error reading Excel file. Please check the format.');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error handling Excel upload:', error);
            toast('Error handling Excel upload. Please try again.');
            return;
        }
    };

    const generateQuestionPaper = () => {
        const beginnerQuestions = uploadedQuestions.filter(q => q.difficulty === 'beginner');
        const intermediateQuestions = uploadedQuestions.filter(q => q.difficulty === 'intermediate');
        const hardQuestions = uploadedQuestions.filter(q => q.difficulty === 'hard');

        const selectedQuestions: any[] = [];

        // Select beginner questions
        const selectedBeginners = beginnerQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(questionConfig.beginner.count, beginnerQuestions.length))
            .map((q, index) => ({
                ...q,
                marks: questionConfig.beginner.marks,
                id: `beginner-q${index + 1}`
            }));

        // Select intermediate questions
        const selectedIntermediates = intermediateQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(questionConfig.intermediate.count, intermediateQuestions.length))
            .map((q, index) => ({
                ...q,
                marks: questionConfig.intermediate.marks,
                id: `intermediate-q${index + 1}`
            }));

        // Select hard questions
        const selectedHards = hardQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(questionConfig.hard.count, hardQuestions.length))
            .map((q, index) => ({
                ...q,
                marks: questionConfig.hard.marks,
                id: `hard-q${index + 1}`
            }));

        const finalQuestions = [
            ...selectedBeginners,
            ...selectedIntermediates,
            ...selectedHards
        ].map((q, index) => ({
            id: `generated-q${index + 1}`,
            question: q.question.toString().trim(),
            expectedOutput: q.answer ? q.answer.toString().trim() : '',
            difficulty: q.difficulty,
            marks: q.marks
        }));

        console.log('Generated questions:', finalQuestions);
        setGeneratedQuestions(finalQuestions);
        setQuestions(finalQuestions);
        setShowQuestionConfig(false);
    };

    const saveToQuestionBank = async (question: Question) => {
        try {
            const questionData = {
                question: question.question,
                expectedOutput: question.expectedOutput,
                difficulty: question.difficulty || 'beginner',
                marks: question.marks || 1,
                language: language,
                createdBy: session?.user?.email,
                createdAt: new Date().toISOString(),
                tags: []
            };

            await fetch("/api/question-bank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(questionData),
            });
            toast.success("Question saved to bank successfully!");
        } catch (error) {
            console.error("Error saving to question bank:", error);
        }
    };

    const loadQuestionBank = async () => {
        setIsLoadingQuestionBank(true);
        try {
            const res = await fetch(`/api/question-bank?email=${session?.user?.email}&language=${language}`);
            const bankQuestions = await res.json();
            setQuestionBank(bankQuestions);
            setShowQuestionBank(true);
        } catch (error) {
            console.error("Error loading question bank:", error);
        } finally {
            setIsLoadingQuestionBank(false);
        }
    };

    const addFromQuestionBank = () => {
        const selectedQuestions = questionBank.filter(q =>
            selectedBankQuestions.includes(q.id)
        ).map((q, index) => ({
            id: `bank-q${questions.length + index + 1}`,
            question: q.questionText,
            expectedOutput: q.expectedOutput,
            difficulty: q.difficulty,
            marks: q.marks
        }));

        setQuestions([...questions, ...selectedQuestions]);
        setSelectedBankQuestions([]);
        setShowQuestionBank(false);
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

                                    {/* Question management buttons */}
                                    <div className="flex flex-wrap gap-3 justify-center">
                                        <button
                                            onClick={loadQuestionBank}
                                            disabled={isLoadingQuestionBank}
                                            className="inline-flex items-center space-x-2 bg-[#E6F3FF] hover:bg-[#CCE7FF] text-[#6C757D] px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            <span>Question Bank</span>
                                        </button>
                                        <button
                                            onClick={addQuestion}
                                            className="inline-flex items-center space-x-2 bg-[#87CEEB] hover:bg-[#ADD8E6] text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span>Add Question</span>
                                        </button>
                                        <label className="inline-flex items-center space-x-2 bg-[#B0E0E6] hover:bg-[#ADD8E6] text-white px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <span>Import Excel</span>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleExcelUpload}
                                                className="hidden"
                                                disabled={isLoading}
                                            />
                                        </label>
                                    </div>

                                    {/* Questions display */}
                                    <div className="space-y-4">
                                        {questions.map((q, i) => (
                                            <div key={q.id} className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-6 h-6 bg-[#87CEEB] text-white rounded-full flex items-center justify-center text-xs font-medium">
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-sm font-medium text-[#6C757D]">Question {i + 1}</span>
                                                    </div>
                                                    {questions.length > 1 && (
                                                        <button
                                                            onClick={() => removeQuestion(i)}
                                                            className="text-[#6C757D]/40 hover:text-red-500 p-1 rounded transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <textarea
                                                            value={q.question}
                                                            onChange={(e) => updateQuestion(i, "question", e.target.value)}
                                                            placeholder="Enter your question here..."
                                                            rows={3}
                                                            className="w-full px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D] placeholder-[#6C757D]/40 resize-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <textarea
                                                            value={q.expectedOutput}
                                                            onChange={(e) => updateQuestion(i, "expectedOutput", e.target.value)}
                                                            placeholder="Expected output (optional)..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87CEEB]/20 focus:border-[#87CEEB] transition-all text-[#6C757D] placeholder-[#6C757D]/40 resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <button
                                            onClick={() => setCurrentStep(1)}
                                            className="text-[#6C757D] hover:text-[#87CEEB] px-6 py-3 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={() => setCurrentStep(3)}
                                            disabled={!questions.some(q => q.question.trim())}
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

                {/* Error Alert (hidden by default) */}
                <div
                    id="error-alert"
                    className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg z-50 opacity-0 translate-y-2 transition-all duration-300"
                >
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Please fill in the exam title and at least one question.</span>
                    </div>
                </div>

                {/* Success Alert for Question Bank */}
                <div
                    id="success-alert"
                    className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl shadow-lg z-50 opacity-0 translate-y-2 transition-all duration-300"
                >
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">Question saved to bank!</span>
                    </div>
                </div>

                {/* Question Configuration Modal */}
                {showQuestionConfig && (
                    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-medium text-[#6C757D]">Configure Question Paper</h3>
                                <button
                                    onClick={() => setShowQuestionConfig(false)}
                                    className="text-[#6C757D]/40 hover:text-[#6C757D] p-1 rounded transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Beginner Questions */}
                                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                    <h4 className="font-medium text-green-800 mb-3">🟢 Beginner Questions</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-1">Count</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={uploadedQuestions.filter(q => q.difficulty === 'beginner').length}
                                                value={questionConfig.beginner.count}
                                                onChange={(e) => setQuestionConfig(prev => ({
                                                    ...prev,
                                                    beginner: { ...prev.beginner, count: parseInt(e.target.value) || 0 }
                                                }))}
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-1">Marks each</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={questionConfig.beginner.marks}
                                                onChange={(e) => setQuestionConfig(prev => ({
                                                    ...prev,
                                                    beginner: { ...prev.beginner, marks: parseInt(e.target.value) || 1 }
                                                }))}
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-green-600 mt-2">
                                        Available: {uploadedQuestions.filter(q => q.difficulty === 'beginner').length} questions
                                    </p>
                                </div>

                                {/* Intermediate Questions */}
                                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                    <h4 className="font-medium text-yellow-800 mb-3">🟡 Intermediate Questions</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-1">Count</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={uploadedQuestions.filter(q => q.difficulty === 'intermediate').length}
                                                value={questionConfig.intermediate.count}
                                                onChange={(e) => setQuestionConfig(prev => ({
                                                    ...prev,
                                                    intermediate: { ...prev.intermediate, count: parseInt(e.target.value) || 0 }
                                                }))}
                                                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-1">Marks each</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={questionConfig.intermediate.marks}
                                                onChange={(e) => setQuestionConfig(prev => ({
                                                    ...prev,
                                                    intermediate: { ...prev.intermediate, marks: parseInt(e.target.value) || 1 }
                                                }))}
                                                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-yellow-600 mt-2">
                                        Available: {uploadedQuestions.filter(q => q.difficulty === 'intermediate').length} questions
                                    </p>
                                </div>

                                {/* Hard Questions */}
                                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                    <h4 className="font-medium text-red-800 mb-3">🔴 Hard Questions</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-1">Count</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={uploadedQuestions.filter(q => q.difficulty === 'hard').length}
                                                value={questionConfig.hard.count}
                                                onChange={(e) => setQuestionConfig(prev => ({
                                                    ...prev,
                                                    hard: { ...prev.hard, count: parseInt(e.target.value) || 0 }
                                                }))}
                                                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#6C757D] mb-1">Marks each</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={questionConfig.hard.marks}
                                                onChange={(e) => setQuestionConfig(prev => ({
                                                    ...prev,
                                                    hard: { ...prev.hard, marks: parseInt(e.target.value) || 1 }
                                                }))}
                                                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-red-600 mt-2">
                                        Available: {uploadedQuestions.filter(q => q.difficulty === 'hard').length} questions
                                    </p>
                                </div>

                                {/* Total Summary */}
                                <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                                    <h4 className="font-medium text-[#6C757D] mb-2">📊 Summary</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-[#6C757D]/60">Total Questions: </span>
                                            <span className="font-medium text-[#6C757D]">
                                                {questionConfig.beginner.count + questionConfig.intermediate.count + questionConfig.hard.count}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[#6C757D]/60">Total Marks: </span>
                                            <span className="font-medium text-[#6C757D]">
                                                {(questionConfig.beginner.count * questionConfig.beginner.marks) +
                                                    (questionConfig.intermediate.count * questionConfig.intermediate.marks) +
                                                    (questionConfig.hard.count * questionConfig.hard.marks)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowQuestionConfig(false)}
                                    className="px-4 py-2 text-[#6C757D]/60 hover:text-[#6C757D] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={generateQuestionPaper}
                                    className="bg-[#87CEEB] hover:bg-[#87CEEB]/80 disabled:bg-[#6C757D]/20 disabled:text-[#6C757D]/40 text-white px-6 py-2 rounded-lg transition-colors"
                                    disabled={questionConfig.beginner.count + questionConfig.intermediate.count + questionConfig.hard.count === 0}
                                >
                                    Generate Question Paper
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Question Bank Modal */}
                {showQuestionBank && (
                    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-medium text-[#6C757D]">Question Bank</h3>
                                <button
                                    onClick={() => setShowQuestionBank(false)}
                                    className="text-[#6C757D]/40 hover:text-[#6C757D] p-1 rounded transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {questionBank.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-[#F8F9FA] rounded-xl mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-[#6C757D]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <p className="text-[#6C757D]/60">No questions in your bank for {language}</p>
                                    <p className="text-[#6C757D]/40 text-sm mt-1">Save questions to build your question bank</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <p className="text-sm text-[#6C757D]/60">
                                            {questionBank.length} questions available • {selectedBankQuestions.length} selected
                                        </p>
                                    </div>

                                    <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                                        {questionBank.map((q) => (
                                            <div key={q.id} className="p-4 border border-[#E9ECEF] rounded-xl hover:bg-[#F8F9FA] transition-colors">
                                                <div className="flex items-start space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBankQuestions.includes(q.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedBankQuestions([...selectedBankQuestions, q.id]);
                                                            } else {
                                                                setSelectedBankQuestions(selectedBankQuestions.filter(id => id !== q.id));
                                                            }
                                                        }}
                                                        className="mt-1 rounded border-[#E9ECEF] text-[#87CEEB] focus:ring-[#87CEEB] focus:ring-2"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${q.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                                                                q.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {q.difficulty}
                                                            </span>
                                                            <span className="px-2 py-1 bg-[#87CEEB]/10 text-[#87CEEB] rounded-full text-xs font-medium">
                                                                {q.marks} marks
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-[#6C757D] mb-1">{q.question}</p>
                                                        {q.expectedOutput && (
                                                            <p className="text-xs text-[#6C757D]/50">Expected: {q.expectedOutput}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => {
                                                const allIds = questionBank.map(q => q.id);
                                                setSelectedBankQuestions(
                                                    selectedBankQuestions.length === questionBank.length ? [] : allIds
                                                );
                                            }}
                                            className="text-sm text-[#6C757D]/60 hover:text-[#6C757D] transition-colors"
                                        >
                                            {selectedBankQuestions.length === questionBank.length ? 'Deselect All' : 'Select All'}
                                        </button>

                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => setShowQuestionBank(false)}
                                                className="px-4 py-2 text-[#6C757D]/60 hover:text-[#6C757D] transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={addFromQuestionBank}
                                                disabled={selectedBankQuestions.length === 0}
                                                className="bg-[#87CEEB] hover:bg-[#87CEEB]/80 disabled:bg-[#6C757D]/20 disabled:text-[#6C757D]/40 text-white px-6 py-2 rounded-lg transition-colors"
                                            >
                                                Add Selected ({selectedBankQuestions.length})
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}