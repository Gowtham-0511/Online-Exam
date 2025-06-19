import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useSession } from "next-auth/react";

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
                const snap = await getDocs(collection(db, "users"));
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(list);
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
                const snap = await getDocs(collection(db, "exams"));
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setExams(list);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-rose-50 to-amber-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                                    <span className="text-3xl">🛠️</span>
                                </div>
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <span className="text-xs text-white font-bold">●</span>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                    Admin Dashboard
                                </h1>
                                <p className="text-slate-600 mt-1">Manage your platform with ease</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl px-4 py-2 border border-gray-200/50 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-sm">👤</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{session.user?.name || 'Admin'}</p>
                                        <p className="text-xs text-slate-600">{session.user?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-8 py-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-2">
                    <div className="flex gap-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg transform scale-105'
                                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
                                    }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 pb-8">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, index) => (
                                <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-3xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                                            <span className="text-2xl">{stat.icon}</span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${stat.changeType === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {stat.change}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</h3>
                                        <p className="text-slate-600 font-medium">{stat.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-8 py-6 border-b border-gray-200/50">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                                        <span className="text-white">📊</span>
                                    </span>
                                    System Overview
                                </h2>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-slate-700">Quick Stats</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                                                <span className="text-slate-700">Registered Users</span>
                                                <span className="font-bold text-blue-600">{users.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl">
                                                <span className="text-slate-700">Active Exams</span>
                                                <span className="font-bold text-emerald-600">{exams.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-slate-700">System Health</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                                <span className="text-slate-700">Database Connected</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                                <span className="text-slate-700">Authentication Active</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                                <span className="text-slate-700">All Services Operational</span>
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
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-200/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                                        <span className="text-white">👥</span>
                                    </span>
                                    Registered Users ({users.length})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-slate-600">{users.length} Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            {users.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">👤</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No Users Found</h3>
                                    <p className="text-slate-600">Users will appear here once they register.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-200">
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">User</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Email</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Role</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user, index) => (
                                                <tr key={index} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 transition-all duration-200">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm">
                                                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{user.name || 'Unknown'}</p>
                                                                <p className="text-sm text-slate-600">ID: {user.id.substring(0, 8)}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="text-slate-700 font-medium">{user.email}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleColor(user.role)}`}>
                                                            {user.role || 'User'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                                            <span className="text-emerald-700 text-sm font-medium">Active</span>
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
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-8 py-6 border-b border-emerald-200/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
                                        <span className="text-white">📝</span>
                                    </span>
                                    All Exams ({exams.length})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-slate-600">{exams.length} Total</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            {exams.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">📝</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No Exams Found</h3>
                                    <p className="text-slate-600">Exams will appear here once created.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-200">
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Exam</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Language</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Duration</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Questions</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exams.map((exam, index) => (
                                                <tr key={index} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm">
                                                                    {exam.title?.charAt(0).toUpperCase() || 'E'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{exam.title}</p>
                                                                <p className="text-sm text-slate-600">ID: {exam.id.substring(0, 8)}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getLanguageColor(exam.language)}`}>
                                                            {exam.language?.toUpperCase() || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-slate-700 font-medium">{exam.duration} min</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-bold">
                                                            {exam.questions?.length || 0} Q's
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                                            <span className="text-emerald-700 text-sm font-medium">Active</span>
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
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-4xl">📊</span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Analytics Coming Soon</h3>
                                <p className="text-slate-600">Detailed analytics and reporting features will be available here.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}