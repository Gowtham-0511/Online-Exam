import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";

export default function EditExamPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { examId } = router.query;

    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [formErrors, setFormErrors] = useState<any>({});

    useEffect(() => {
        if (!examId) return;

        const fetchExam = async () => {
            const ref = doc(db, "exams", examId as string);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                if (data.createdBy === session?.user?.email) {
                    setExam(data);
                } else {
                    toast.error("Unauthorized access.");
                    router.push("/dashboard/examiner");
                }
            } else {
                toast.error("Exam not found.");
                router.push("/dashboard/examiner");
            }
            setLoading(false);
        };

        fetchExam();
    }, [examId, session, router]);

    const validateForm = () => {
        const errors: any = {};

        if (!exam.title?.trim()) {
            errors.title = "Title is required";
        } else if (exam.title.length < 3) {
            errors.title = "Title must be at least 3 characters";
        }

        if (!exam.duration || exam.duration < 1) {
            errors.duration = "Duration must be at least 1 minute";
        } else if (exam.duration > 300) {
            errors.duration = "Duration cannot exceed 300 minutes";
        }

        if (!exam.language) {
            errors.language = "Please select a language";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;

        setUpdating(true);
        try {
            const ref = doc(db, "exams", examId as string);
            await updateDoc(ref, {
                title: exam.title,
                duration: exam.duration,
                language: exam.language,
                updatedAt: new Date().toISOString(),
            });
            toast.success("Exam updated successfully!");
            router.push("/dashboard/view-exams");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update exam.");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
                <div className="text-center">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"
                        style={{ backgroundColor: '#87CEEB' }}
                    >
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-lg font-medium" style={{ color: '#6C757D' }}>
                        Loading exam details...
                    </p>
                </div>
            </div>
        );
    }

    if (!exam) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
            <div className="max-w-2xl mx-auto p-8">
                {/* Header Section */}
                <div className="mb-8 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <button
                            onClick={() => router.push("/dashboard/view-exams")}
                            className="p-2 rounded-lg transition-all duration-200 hover:shadow-md"
                            style={{ backgroundColor: '#E6F3FF' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#CCE7FF';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#E6F3FF';
                            }}
                        >
                            <span style={{ color: '#6C757D' }}>← Back</span>
                        </button>
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: '#87CEEB' }}
                        >
                            ✏️
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold" style={{ color: '#6C757D' }}>
                                Edit Exam
                            </h1>
                            <p className="text-sm" style={{ color: '#6C757D', opacity: 0.7 }}>
                                Update your exam details
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div
                    className="rounded-2xl border p-8 animate-slide-up"
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E9ECEF',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
                    }}
                >
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-6">
                        {/* Title Field */}
                        <div className="space-y-2">
                            <label
                                className="block text-sm font-semibold"
                                style={{ color: '#6C757D' }}
                            >
                                📝 Exam Title
                            </label>
                            <input
                                type="text"
                                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 ${formErrors.title ? 'border-red-300 focus:ring-red-200' : 'focus:ring-opacity-50'
                                    }`}
                                style={{
                                    backgroundColor: '#F8F9FA',
                                    border: formErrors.title ? '2px solid #FF6B6B' : `2px solid ${exam.title ? '#87CEEB' : '#E9ECEF'}`,
                                    color: '#6C757D'
                                }}
                                value={exam.title || ''}
                                onChange={(e) => {
                                    setExam({ ...exam, title: e.target.value });
                                    if (formErrors.title) {
                                        setFormErrors({ ...formErrors, title: null });
                                    }
                                }}
                                placeholder="Enter exam title..."
                                onFocus={(e) => {
                                    e.target.style.backgroundColor = '#FFFFFF';
                                    e.target.style.transform = 'scale(1.01)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.backgroundColor = '#F8F9FA';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            />
                            {formErrors.title && (
                                <p className="text-sm text-red-500 animate-shake">
                                    {formErrors.title}
                                </p>
                            )}
                        </div>

                        {/* Duration Field */}
                        <div className="space-y-2">
                            <label
                                className="block text-sm font-semibold"
                                style={{ color: '#6C757D' }}
                            >
                                ⏱️ Duration (minutes)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="300"
                                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 ${formErrors.duration ? 'border-red-300 focus:ring-red-200' : 'focus:ring-opacity-50'
                                    }`}
                                style={{
                                    backgroundColor: '#F8F9FA',
                                    border: formErrors.duration ? '2px solid #FF6B6B' : `2px solid ${exam.duration ? '#87CEEB' : '#E9ECEF'}`,
                                    color: '#6C757D'
                                }}
                                value={exam.duration || ''}
                                onChange={(e) => {
                                    setExam({ ...exam, duration: Number(e.target.value) });
                                    if (formErrors.duration) {
                                        setFormErrors({ ...formErrors, duration: null });
                                    }
                                }}
                                placeholder="60"
                                onFocus={(e) => {
                                    e.target.style.backgroundColor = '#FFFFFF';
                                    e.target.style.transform = 'scale(1.01)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.backgroundColor = '#F8F9FA';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            />
                            {formErrors.duration && (
                                <p className="text-sm text-red-500 animate-shake">
                                    {formErrors.duration}
                                </p>
                            )}
                            <p className="text-xs" style={{ color: '#6C757D', opacity: 0.6 }}>
                                Recommended: 30-120 minutes
                            </p>
                        </div>

                        {/* Language Field */}
                        <div className="space-y-2">
                            <label
                                className="block text-sm font-semibold"
                                style={{ color: '#6C757D' }}
                            >
                                🌐 Programming Language
                            </label>
                            <select
                                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 appearance-none cursor-pointer ${formErrors.language ? 'border-red-300 focus:ring-red-200' : 'focus:ring-opacity-50'
                                    }`}
                                style={{
                                    backgroundColor: '#F8F9FA',
                                    border: formErrors.language ? '2px solid #FF6B6B' : `2px solid ${exam.language ? '#87CEEB' : '#E9ECEF'}`,
                                    color: '#6C757D',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236C757D' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 12px center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '16px'
                                }}
                                value={exam.language || ''}
                                onChange={(e) => {
                                    setExam({ ...exam, language: e.target.value });
                                    if (formErrors.language) {
                                        setFormErrors({ ...formErrors, language: null });
                                    }
                                }}
                                onFocus={(e) => {
                                    e.target.style.backgroundColor = '#FFFFFF';
                                    e.target.style.transform = 'scale(1.01)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.backgroundColor = '#F8F9FA';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            >
                                <option value="">Select a language...</option>
                                <option value="python">🐍 Python</option>
                                <option value="sql">🗃️ SQL</option>
                            </select>
                            {formErrors.language && (
                                <p className="text-sm text-red-500 animate-shake">
                                    {formErrors.language}
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6">
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard/view-exams")}
                                className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
                                style={{
                                    backgroundColor: '#E9ECEF',
                                    color: '#6C757D',
                                    border: '2px solid #DEE2E6'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#DEE2E6';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#E9ECEF';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={updating}
                                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2 ${updating ? 'cursor-not-allowed opacity-75' : 'hover:shadow-md'
                                    }`}
                                style={{
                                    backgroundColor: updating ? '#B0E0E6' : '#87CEEB',
                                    color: '#FFFFFF',
                                    border: '2px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (!updating) {
                                        e.currentTarget.style.backgroundColor = '#6BB6DB';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!updating) {
                                        e.currentTarget.style.backgroundColor = '#87CEEB';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                {updating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        💾 Update Exam
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }

                .animate-fade-in {
                    animation: fade-in 0.6s ease-out;
                }

                .animate-slide-up {
                    animation: slide-up 0.8s ease-out;
                }

                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
}