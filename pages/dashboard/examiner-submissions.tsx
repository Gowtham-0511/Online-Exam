import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function ExaminerSubmissions() {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const snap = await getDocs(collection(db, "submissions"));
                const list = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSubmissions(list);
            } catch (error) {
                console.error("Error fetching submissions:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-slate-200 rounded-lg w-64"></div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-12 bg-slate-100 rounded-lg"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                            <span className="text-white text-lg">📥</span>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            Exam Submissions
                        </h1>
                    </div>
                    <p className="text-slate-600 ml-13">
                        Manage and review all exam submissions from candidates
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            Total Submissions: {submissions.length}
                        </span>
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            Disqualified: {submissions.filter(s => s.disqualified).length}
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                {submissions.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📄</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No submissions yet</h3>
                        <p className="text-slate-500">
                            Submissions will appear here once candidates start taking exams.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-slate-700">
                                <div className="col-span-2">Exam ID</div>
                                <div className="col-span-3">Candidate Email</div>
                                <div className="col-span-2">Submitted</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-3">Actions</div>
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-slate-100">
                            {submissions.map((s, i) => (
                                <div
                                    key={i}
                                    className="px-6 py-4 hover:bg-slate-50 transition-colors duration-200"
                                >
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        {/* Exam ID */}
                                        <div className="col-span-2">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800">
                                                {s.examId}
                                            </span>
                                        </div>

                                        {/* Email */}
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                                    {s.email?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-sm text-slate-700 truncate">
                                                    {s.email}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Submitted At */}
                                        <div className="col-span-2">
                                            <div className="text-sm text-slate-600">
                                                {s.submittedAt?.seconds
                                                    ? new Date(s.submittedAt.seconds * 1000).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })
                                                    : "N/A"}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {s.submittedAt?.seconds
                                                    ? new Date(s.submittedAt.seconds * 1000).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : ""}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.disqualified
                                                ? 'bg-red-100 text-red-800 border border-red-200'
                                                : 'bg-green-100 text-green-800 border border-green-200'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.disqualified ? 'bg-red-500' : 'bg-green-500'
                                                    }`}></div>
                                                {s.disqualified ? 'Disqualified' : 'Qualified'}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-3">
                                            <button
                                                onClick={() => downloadAsFile(s)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function downloadAsFile(submission: { examId: string; email: string; submittedAt: { seconds: number; }; disqualified: any; answersWithQuestionIds: string | any[]; answers: any[]; answer: any; }) {
    const examId = submission.examId || '';
    const email = submission.email || 'unknown';

    // Determine file extension based on exam ID
    const isPython = examId.toLowerCase().includes('python');
    const fileExtension = isPython ? '.py' : '.sql';
    const filename = `${examId}-${email}${fileExtension}`;

    let content = '';

    // Add header as comment
    const commentChar = isPython ? '#' : '--';
    content += `${commentChar} ========================================\n`;
    content += `${commentChar} EXAM SUBMISSION\n`;
    content += `${commentChar} ========================================\n`;
    content += `${commentChar} Exam ID: ${submission.examId || 'N/A'}\n`;
    content += `${commentChar} Candidate: ${submission.email || 'N/A'}\n`;
    content += `${commentChar} Submitted: ${submission.submittedAt?.seconds
        ? new Date(submission.submittedAt.seconds * 1000).toLocaleString()
        : 'N/A'}\n`;
    content += `${commentChar} Status: ${submission.disqualified ? 'Disqualified' : 'Qualified'}\n`;
    content += `${commentChar} ========================================\n\n`;

    // Process answers based on available data structure
    if (submission.answersWithQuestionIds && submission.answersWithQuestionIds.length > 0) {
        // Sort by originalIndex to maintain question order
        const sortedAnswers = [...submission.answersWithQuestionIds].sort((a, b) =>
            (a.originalIndex || 0) - (b.originalIndex || 0)
        );

        sortedAnswers.forEach((item, index) => {
            content += `${commentChar} Question ${index + 1} (ID: ${item.questionId || 'N/A'})\n`;
            content += `${commentChar} ${'-'.repeat(40)}\n`;
            content += `${item.answer || 'No answer provided'}\n\n`;

            if (index < sortedAnswers.length - 1) {
                content += `${commentChar} ${'~'.repeat(50)}\n\n`;
            }
        });
    } else if (submission.answers && submission.answers.length > 0) {
        // Handle simple answers array
        submission.answers.forEach((answer, index) => {
            content += `${commentChar} Answer ${index + 1}\n`;
            content += `${commentChar} ${'-'.repeat(20)}\n`;
            content += `${answer || 'No answer provided'}\n\n`;

            if (index < submission.answers.length - 1) {
                content += `${commentChar} ${'~'.repeat(50)}\n\n`;
            }
        });
    } else if (submission.answer) {
        // Handle single answer field
        content += `${commentChar} Answer\n`;
        content += `${commentChar} ${'-'.repeat(10)}\n`;
        content += `${submission.answer}\n\n`;
    } else {
        content += `${commentChar} No answers found in submission\n`;
    }

    // Create and download the file
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}