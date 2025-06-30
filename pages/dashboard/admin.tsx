import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import AdminAnalytics from "@/components/AdminAnalytics";

const MySwal = withReactContent(Swal);

export default function AdminDashboard() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!session) {
            return;
        }

        const allowedAdmins = ["gowthamr@systechusa.com"];
        if (!allowedAdmins.includes(session.user?.email || "")) {
            alert("Access denied: Admins only");
            return;
        }

        setLoading(false);
    }, [session]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/admin/users");
                const data = await res.json();
                setUsers(data);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        if (!loading) {
            fetchUsers();
        }
    }, [loading]);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await fetch("/api/admin/exams");
                const data = await res.json();
                setExams(data);
            } catch (error) {
                console.error("Error fetching exams:", error);
            }
        };


        if (!loading) {
            fetchExams();
        }
    }, [loading]);

    if (!session || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-rose-50 to-amber-50 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-12">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-violet-300/30 rounded-full"></div>
                            <div className="absolute inset-0 w-20 h-20 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Loading Dashboard</h3>
                            <p className="text-slate-600">Authenticating and preparing your admin panel...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const stats = [
        {
            title: "Total Users",
            value: users.length,
            icon: "👥",
            color: "from-blue-500 to-indigo-500",
            bgColor: "from-blue-50 to-indigo-50",
            change: "+12%",
            changeType: "positive"
        },
        {
            title: "Active Exams",
            value: exams.length,
            icon: "📝",
            color: "from-emerald-500 to-teal-500",
            bgColor: "from-emerald-50 to-teal-50",
            change: "+8%",
            changeType: "positive"
        },
        {
            title: "Total Sessions",
            value: "2.4k",
            icon: "⚡",
            color: "from-amber-500 to-orange-500",
            bgColor: "from-amber-50 to-orange-50",
            change: "+23%",
            changeType: "positive"
        },
        {
            title: "Success Rate",
            value: "94%",
            icon: "🎯",
            color: "from-rose-500 to-pink-500",
            bgColor: "from-rose-50 to-pink-50",
            change: "+5%",
            changeType: "positive"
        }
    ];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'exams', label: 'Exams', icon: '📝' },
        { id: 'analytics', label: 'Analytics', icon: '📈' }
    ];

    const getRoleColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
            case 'teacher':
            case 'instructor':
                return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
            case 'student':
            case 'attender':
                return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
            default:
                return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
        }
    };

    const getLanguageColor = (language: string) => {
        const colors = {
            'javascript': 'bg-gradient-to-r from-yellow-400 to-amber-500',
            'python': 'bg-gradient-to-r from-blue-500 to-cyan-500',
            'java': 'bg-gradient-to-r from-orange-500 to-red-500',
            'cpp': 'bg-gradient-to-r from-purple-500 to-indigo-500',
            'c': 'bg-gradient-to-r from-gray-600 to-slate-600',
        };
        return colors[language?.toLowerCase() as keyof typeof colors] || 'bg-gradient-to-r from-gray-500 to-slate-500';
    };

    const handleViewQuestions = (exam: { questions: any; title: any; }) => {
        const questionList = Array.isArray(exam.questions)
            ? exam.questions
            : JSON.parse(exam.questions || "[]");


        if (!questionList.length) {
            return Swal.fire("No questions found", "", "info");
        }

        MySwal.fire({
            title: `Questions (${exam.title})`,
            html: `
                <div style="max-height: 400px; overflow-y: auto; text-align: left;">
                    ${questionList
                    .map(
                        (q: { question: any; expectedOutput: any; }, i: number) =>
                            `<div style="margin-bottom: 16px;">
                                    <strong>Q${i + 1}:</strong> ${q.question || "(no text)"}<br/>
                                    <small><em>Expected Output:</em> ${q.expectedOutput || "N/A"}</small>
                                </div>`
                    )
                    .join("")
                }
                </div>
            `,
            width: "600px",
            showCloseButton: true,
            confirmButtonText: "Close",
        });
    };


    return (
        <div className="min-h-screen" style={{ backgroundColor: '#E0F6FF' }}>
            {/* Header */}
            <div className="sticky top-0 z-50 border-b-2" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCE7FF' }}>
                <div className="max-w-7xl mx-auto px-2 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border-2" style={{ backgroundColor: '#87CEEB', borderColor: '#B0E0E6' }}>
                                    <span className="text-4xl">🛠️</span>
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#ADD8E6' }}>
                                    <span className="text-sm font-bold" style={{ color: '#6C757D' }}>●</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold mb-2" style={{ color: '#6C757D' }}>
                                    Admin Dashboard
                                </h1>
                                <p className="text-xl" style={{ color: '#6C757D' }}>Manage your platform with ease</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="rounded-3xl px-6 py-4 border-2 shadow-lg" style={{ backgroundColor: '#F8F9FA', borderColor: '#CCE7FF' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#87CEEB' }}>
                                        <span className="text-white text-lg">👤</span>
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold" style={{ color: '#6C757D' }}>{session.user?.name || 'Admin'}</p>
                                        <p className="text-sm" style={{ color: '#6C757D' }}>{session.user?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-8 py-8">
                <div className="rounded-3xl shadow-2xl border-2 p-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCE7FF' }}>
                    <div className="flex gap-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-4 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 text-lg ${activeTab === tab.id ? 'transform scale-105 shadow-lg' : 'hover:scale-102'
                                    }`}
                                style={activeTab === tab.id
                                    ? { backgroundColor: '#87CEEB', color: '#FFFFFF' }
                                    : { backgroundColor: 'transparent', color: '#6C757D' }
                                }
                            >
                                <span className="text-2xl">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 pb-8">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-10">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {stats.map((stat, index) => (
                                <div key={index} className="rounded-3xl p-8 border-2 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCE7FF' }}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#87CEEB' }}>
                                            <span className="text-3xl">{stat.icon}</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-full text-sm font-bold" style={{
                                            backgroundColor: stat.changeType === 'positive' ? '#E6F3FF' : '#F8F9FA',
                                            color: '#6C757D'
                                        }}>
                                            {stat.change}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-bold mb-2" style={{ color: '#6C757D' }}>{stat.value}</h3>
                                        <p className="text-lg font-medium" style={{ color: '#6C757D' }}>{stat.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Activity */}
                        <div className="rounded-3xl shadow-2xl border-2 overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCE7FF' }}>
                            <div className="px-10 py-8 border-b-2" style={{ backgroundColor: '#F8F9FA', borderColor: '#CCE7FF' }}>
                                <h2 className="text-3xl font-bold flex items-center gap-4" style={{ color: '#6C757D' }}>
                                    <span className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#87CEEB' }}>
                                        <span className="text-white text-2xl">📊</span>
                                    </span>
                                    System Overview
                                </h2>
                            </div>
                            <div className="p-10">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h3 className="text-2xl font-semibold" style={{ color: '#6C757D' }}>Quick Stats</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-6 rounded-3xl border-2" style={{ backgroundColor: '#E6F3FF', borderColor: '#CCE7FF' }}>
                                                <span className="text-lg" style={{ color: '#6C757D' }}>Registered Users</span>
                                                <span className="font-bold text-2xl" style={{ color: '#87CEEB' }}>{users.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-6 rounded-3xl border-2" style={{ backgroundColor: '#E6F3FF', borderColor: '#CCE7FF' }}>
                                                <span className="text-lg" style={{ color: '#6C757D' }}>Active Exams</span>
                                                <span className="font-bold text-2xl" style={{ color: '#87CEEB' }}>{exams.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-2xl font-semibold" style={{ color: '#6C757D' }}>System Health</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#ADD8E6' }}></div>
                                                <span className="text-lg" style={{ color: '#6C757D' }}>Database Connected</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#ADD8E6' }}></div>
                                                <span className="text-lg" style={{ color: '#6C757D' }}>Authentication Active</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#ADD8E6' }}></div>
                                                <span className="text-lg" style={{ color: '#6C757D' }}>All Services Operational</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="rounded-3xl shadow-2xl border-2 overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCE7FF' }}>
                        <div className="px-10 py-8 border-b-2" style={{ backgroundColor: '#F8F9FA', borderColor: '#CCE7FF' }}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-bold flex items-center gap-4" style={{ color: '#6C757D' }}>
                                    <span className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#87CEEB' }}>
                                        <span className="text-white text-2xl">👥</span>
                                    </span>
                                    Registered Users ({users.length})
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#ADD8E6' }}></div>
                                    <span className="text-lg" style={{ color: '#6C757D' }}>{users.length} Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-10">
                            {users.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ backgroundColor: '#F8F9FA' }}>
                                        <span className="text-5xl">👤</span>
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-3" style={{ color: '#6C757D' }}>No Users Found</h3>
                                    <p className="text-lg" style={{ color: '#6C757D' }}>Users will appear here once they register.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2" style={{ borderColor: '#CCE7FF' }}>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>User</th>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Email</th>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Role</th>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user, index) => (
                                                <tr key={index} className="border-b transition-all duration-200" style={{
                                                    borderColor: '#E6F3FF',
                                                    backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#E0F6FF'
                                                }}>
                                                    <td className="py-6 px-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#87CEEB' }}>
                                                                <span className="text-white font-bold text-lg">
                                                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-lg" style={{ color: '#6C757D' }}>{user.name || 'Unknown'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 px-8">
                                                        <span className="font-medium text-lg" style={{ color: '#6C757D' }}>{user.email}</span>
                                                    </td>
                                                    <td className="py-6 px-8">
                                                        <select
                                                            value={user.role}
                                                            onChange={async (e) => {
                                                                const newRole = e.target.value;
                                                                try {
                                                                    const res = await fetch("/api/admin/update-user", {
                                                                        method: "PUT",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ email: user.email, role: newRole })
                                                                    });

                                                                    const result = await res.json();
                                                                    if (res.ok) {
                                                                        toast.success(`Updated role to ${newRole}`);
                                                                        setUsers((prev) =>
                                                                            prev.map((u) => (u.email === user.email ? { ...u, role: newRole } : u))
                                                                        );
                                                                    } else {
                                                                        toast.error(result.error || "Failed to update role");
                                                                    }
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toast.error("Error updating user role");
                                                                }
                                                            }}
                                                            disabled={user.email === session?.user?.email}
                                                            className="rounded-xl border-2 px-4 py-2 text-base font-medium shadow-sm"
                                                            style={{ borderColor: '#CCE7FF', backgroundColor: '#FFFFFF', color: '#6C757D' }}
                                                        >
                                                            <option value="attender">Attender</option>
                                                            <option value="examiner">Examiner</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-6 px-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ADD8E6' }}></div>
                                                            <span className="text-base font-medium" style={{ color: '#6C757D' }}>Active</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Exams Tab */}
                {activeTab === 'exams' && (
                    <div className="rounded-3xl shadow-2xl border-2 overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCE7FF' }}>
                        <div className="px-10 py-8 border-b-2" style={{ backgroundColor: '#F8F9FA', borderColor: '#CCE7FF' }}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-bold flex items-center gap-4" style={{ color: '#6C757D' }}>
                                    <span className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#87CEEB' }}>
                                        <span className="text-white text-2xl">📝</span>
                                    </span>
                                    All Exams ({exams.length})
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#ADD8E6' }}></div>
                                    <span className="text-lg" style={{ color: '#6C757D' }}>{exams.length} Total</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-10">
                            {exams.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ backgroundColor: '#F8F9FA' }}>
                                        <span className="text-5xl">📝</span>
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-3" style={{ color: '#6C757D' }}>No Exams Found</h3>
                                    <p className="text-lg" style={{ color: '#6C757D' }}>Exams will appear here once created.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2" style={{ borderColor: '#CCE7FF' }}>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Exam</th>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Language</th>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Duration</th>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Questions</th>
                                                <th className="text-left py-6 px-8 font-semibold text-xl" style={{ color: '#6C757D' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exams.map((exam, index) => (
                                                <tr key={index} className="border-b transition-all duration-200" style={{ 
                                                    borderColor: '#E6F3FF',
                                                    backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#E0F6FF'
                                                }}>
                                                    <td className="py-6 px-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#87CEEB' }}>
                                                                <span className="text-white font-bold text-lg">
                                                                    {exam.title?.charAt(0).toUpperCase() || 'E'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-lg" style={{ color: '#6C757D' }}>{exam.title}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 px-8">
                                                        <span
                                                            className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm border-2 ${getLanguageColor(exam.language)}`}
                                                            style={{ borderColor: '#CCE7FF' }}
                                                        >
                                                            {exam.language?.toUpperCase() || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="py-6 px-8">
                                                        <div className="flex items-center gap-3">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#6C757D' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="font-medium text-lg" style={{ color: '#6C757D' }}>{exam.duration} min</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 px-8">
                                                        <span className="px-4 py-2 rounded-full text-sm font-bold shadow-sm border-2" style={{ 
                                                            backgroundColor: '#E6F3FF',
                                                            color: '#6C757D',
                                                            borderColor: '#CCE7FF'
                                                        }}>
                                                            {exam.questions?.length || 0} Q's
                                                        </span>
                                                    </td>
                                                    <td className="py-6 px-8">
                                                        <div className="space-y-3">
                                                            <button
                                                                onClick={() => handleViewQuestions(exam)}
                                                                className="px-6 py-3 rounded-xl text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                                                                style={{ backgroundColor: '#87CEEB', color: '#FFFFFF' }}
                                                            >
                                                                View Questions
                                                            </button>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ADD8E6' }}></div>
                                                                <span className="text-base font-medium" style={{ color: '#6C757D' }}>Active</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-amber-200/50">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <span className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center">
                                    <span className="text-white">📈</span>
                                </span>
                                Analytics & Insights
                            </h2>
                        </div>
                        <div className="p-8">
                            <AdminAnalytics />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}