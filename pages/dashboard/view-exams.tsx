import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

export default function ViewExamsPage() {
    const { data: session } = useSession();
    const [exams, setExams] = useState<any[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchExams = async () => {
            if (!session?.user?.email) return;

            try {
                const res = await fetch(`/api/exams/by-user?email=${session.user.email}`);
                const data = await res.json();
                setExams(data);
            } catch (error) {
                console.error("Failed to fetch exams", error);
            }
        };

        fetchExams();
    }, [session]);


    const handleDelete = async (examId: string) => {

        try {
            await fetch(`/api/exams/delete/${examToDelete}`, {
                method: "DELETE"
            });
            toast.success("Exam deleted successfully.");
            setExams(prev => prev.filter(exam => exam.id !== examToDelete));
        } catch (err) {
            toast.error("Failed to delete exam.");
            console.error(err);
        }

        setShowConfirm(false);
        setExamToDelete(null);
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="p-8 max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: '#87CEEB' }}
                        >
                            📚
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold" style={{ color: '#6C757D' }}>
                                My Exams
                            </h1>
                            <p className="text-sm" style={{ color: '#6C757D' }}>
                                Manage and organize your created examinations
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                {exams.length === 0 ? (
                    <div
                        className="text-center py-16 rounded-2xl border"
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E9ECEF',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}
                    >
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
                            style={{ backgroundColor: '#E6F3FF' }}
                        >
                            📝
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{ color: '#6C757D' }}>
                            No Exams Created Yet
                        </h3>
                        <p style={{ color: '#6C757D', opacity: 0.7 }}>
                            Start by creating your first exam to see it listed here.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {exams.map((exam) => (
                            <div
                                key={exam.id}
                                className="rounded-2xl border transition-all duration-300 hover:shadow-lg group"
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E9ECEF',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                                }}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between group-hover:bg-gray-50 transition-colors duration-200">
                                        <div className="flex-1">
                                            {/* Exam Title */}
                                            <h2
                                                className="text-xl font-bold mb-3 group-hover:opacity-80 transition-opacity"
                                                style={{ color: '#6C757D' }}
                                            >
                                                {exam.title}
                                            </h2>

                                            {/* Exam Details */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                                    style={{ backgroundColor: '#E6F3FF' }}
                                                >
                                                    <span className="text-sm">🌐</span>
                                                    <span className="text-sm font-medium" style={{ color: '#6C757D' }}>
                                                        {exam.language}
                                                    </span>
                                                </div>

                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                                    style={{ backgroundColor: '#CCE7FF' }}
                                                >
                                                    <span className="text-sm">⏱️</span>
                                                    <span className="text-sm font-medium" style={{ color: '#6C757D' }}>
                                                        {exam.duration} minutes
                                                    </span>
                                                </div>

                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                                    style={{ backgroundColor: '#E0F6FF' }}
                                                >
                                                    <span className="text-sm">📅</span>
                                                    <span className="text-sm font-medium" style={{ color: '#6C757D' }}>
                                                        {new Date(exam.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Created Date - Full */}
                                            <p className="text-xs" style={{ color: '#6C757D', opacity: 0.6 }}>
                                                Created on {new Date(exam.createdAt).toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-3 ml-6">
                                            <button
                                                onClick={() => router.push(`/dashboard/edit-exam/${exam.id}`)}
                                                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                                                style={{
                                                    backgroundColor: '#87CEEB',
                                                    color: '#FFFFFF'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#6BB6DB';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#87CEEB';
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setExamToDelete(exam.id);
                                                    setShowConfirm(true);
                                                }}
                                                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                                                style={{
                                                    backgroundColor: '#FF6B6B',
                                                    color: '#FFFFFF'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#E55555';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#FF6B6B';
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Confirmation Modal */}
                {showConfirm && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    >
                        <div
                            className="rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100"
                            style={{ backgroundColor: '#FFFFFF' }}
                        >
                            <div className="p-6">
                                {/* Modal Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                                        style={{ backgroundColor: '#FFE6E6' }}
                                    >
                                        ⚠️
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold" style={{ color: '#6C757D' }}>
                                            Delete Exam
                                        </h2>
                                        <p className="text-sm" style={{ color: '#6C757D', opacity: 0.7 }}>
                                            This action cannot be undone
                                        </p>
                                    </div>
                                </div>

                                {/* Modal Content */}
                                <p className="mb-6" style={{ color: '#6C757D' }}>
                                    Are you sure you want to permanently delete this exam? All associated data will be lost.
                                </p>

                                {/* Modal Actions */}
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-sm"
                                        style={{
                                            backgroundColor: '#E9ECEF',
                                            color: '#6C757D',
                                            border: `1px solid #DEE2E6`
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#DEE2E6';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#E9ECEF';
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => { handleDelete(examToDelete as string); }}
                                        className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md"
                                        style={{
                                            backgroundColor: '#FF6B6B',
                                            color: '#FFFFFF'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#E55555';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#FF6B6B';
                                        }}
                                    >
                                        Delete Exam
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}