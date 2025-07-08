import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import JobPositionsPage from "./job-positions";
import SkillsetConfigPage from "./skillset-config";
import QuestionBankPage from "./question-bank";

export default function AdminDashboard() {
    const { data: session } = useSession();
    type Exam = {
        title?: string;
        language?: string;
        duration?: number;
        questions?: any[];
        // add other properties as needed
    };
    const [users, setUsers] = useState<any[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (!session) {
            return;
        }

        console.log(session.user?.email);

        const allowedAdmins = ["gowthamr@systechusa.com", "kalaiselvanj@systechusa.com"];
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

    const scheduleUser = (user: { name: any; }) => {
        const dateTime = window.prompt(`Schedule ${user.name} - Enter date & time (YYYY-MM-DD HH:mm):`);
        if (dateTime) {
            console.log(`Scheduled ${user.name} at ${dateTime}`);
            // You can now call your API or store this value
        }
    };


    if (!session || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-200/50 p-12">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
                            <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
            color: "from-blue-400 to-blue-600",
            bgColor: "from-blue-50 to-sky-50",
            borderColor: "border-blue-200",
            change: "+12%",
            changeType: "positive"
        },
        {
            title: "Active Exams",
            value: exams.length,
            icon: "📝",
            color: "from-sky-400 to-sky-600",
            bgColor: "from-sky-50 to-blue-50",
            borderColor: "border-sky-200",
            change: "+8%",
            changeType: "positive"
        },
        {
            title: "Total Sessions",
            value: "2.4k",
            icon: "⚡",
            color: "from-blue-500 to-blue-700",
            bgColor: "from-blue-50 to-sky-100",
            borderColor: "border-blue-300",
            change: "+23%",
            changeType: "positive"
        },
        {
            title: "Success Rate",
            value: "94%",
            icon: "🎯",
            color: "from-sky-500 to-blue-500",
            bgColor: "from-sky-50 to-blue-50",
            borderColor: "border-sky-300",
            change: "+5%",
            changeType: "positive"
        }
    ];

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: '📊', description: 'Dashboard overview' },
        { id: 'users', label: 'User Management', icon: '👥', description: 'Manage all users' },
        { id: 'exams', label: 'Exam Management', icon: '📝', description: 'Manage all exams' },
        { id: 'jobpositions', label: 'Job Positions', icon: '🏢', description: 'Manage job roles' },
        { id: 'skillsets', label: 'Skillset Config', icon: '🧠', description: 'Map skills to jobs' },
        { id: 'questions', label: 'Questions', icon: '❓', description: 'Manage questions' },
        { id: 'analytics', label: 'Analytics', icon: '📈', description: 'View insights' },
        { id: 'reports', label: 'Reports', icon: '📊', description: 'Generate reports' },
        { id: 'settings', label: 'Settings', icon: '⚙️', description: 'System settings' }
    ];

    const getRoleColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';
            case 'teacher':
            case 'instructor':
                return 'bg-gradient-to-r from-sky-500 to-sky-600 text-white';
            case 'student':
            case 'attender':
                return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white';
            default:
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
        }
    };

    interface LanguageColors {
        [key: string]: string;
    }

    const getLanguageColor = (language: string | undefined): string => {
        const colors: LanguageColors = {
            'javascript': 'bg-gradient-to-r from-blue-400 to-sky-500',
            'python': 'bg-gradient-to-r from-sky-500 to-blue-600',
            'java': 'bg-gradient-to-r from-blue-500 to-blue-700',
            'cpp': 'bg-gradient-to-r from-sky-400 to-blue-500',
            'c': 'bg-gradient-to-r from-blue-600 to-sky-700',
        };
        return colors[language?.toLowerCase() ?? ''] || 'bg-gradient-to-r from-gray-400 to-gray-500';
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, index) => (
                                <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-3xl p-6 border ${stat.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center shadow-md`}>
                                            <span className="text-2xl">{stat.icon}</span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${stat.changeType === 'positive' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
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
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-8 py-6 border-b border-blue-200/50">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center">
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
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl border border-blue-200/50">
                                                <span className="text-slate-700">Registered Users</span>
                                                <span className="font-bold text-blue-600">{users.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl border border-sky-200/50">
                                                <span className="text-slate-700">Active Exams</span>
                                                <span className="font-bold text-sky-600">{exams.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-slate-700">System Health</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                                <span className="text-slate-700">Database Connected</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-sky-500 rounded-full animate-pulse"></div>
                                                <span className="text-slate-700">Authentication Active</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                                <span className="text-slate-700">All Services Operational</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'users':
                return (
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-8 py-6 border-b border-blue-200/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center">
                                        <span className="text-white">👥</span>
                                    </span>
                                    Registered Users ({users.length})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-slate-600">{users.length} Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            {users.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                                        <span className="text-4xl">👤</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No Users Found</h3>
                                    <p className="text-slate-600">Users will appear here once they register.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-blue-200">
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">User</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Email</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Role</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Schedule</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user, index) => (
                                                <tr key={index} className="border-b border-blue-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 transition-all duration-200">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm">
                                                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{user.name || 'Unknown'}</p>
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
                                                        <input
                                                            type="checkbox"
                                                            className="form-checkbox h-4 w-4 text-blue-600"
                                                            // checked={user.role === 'Admin'} // or any logic you want
                                                            // onChange={(e) => handleRoleChange(e, user)} // Define this function to handle changes
                                                        />
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                            <span className="text-blue-700 text-sm font-medium">Active</span>
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
                );

            case 'exams':
                return (
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-8 py-6 border-b border-sky-200/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <span className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-500 rounded-2xl flex items-center justify-center">
                                        <span className="text-white">📝</span>
                                    </span>
                                    All Exams ({exams.length})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-slate-600">{exams.length} Total</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                            {exams.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gradient-to-br from-sky-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-200">
                                        <span className="text-4xl">📝</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No Exams Found</h3>
                                    <p className="text-slate-600">Exams will appear here once created.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-sky-200">
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Exam</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Language</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Duration</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Questions</th>
                                                <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exams.map((exam, index) => (
                                                <tr key={index} className="border-b border-sky-100 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 transition-all duration-200">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm">
                                                                    {exam.title?.charAt(0).toUpperCase() || 'E'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{exam.title}</p>
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
                                                        <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-sky-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                                                            {exam.questions?.length || 0} Q's
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                            <span className="text-blue-700 text-sm font-medium">Active</span>
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
                );

            case 'jobpositions':
                return <JobPositionsPage />;

            case 'skillsets':
                return <SkillsetConfigPage />;

            case 'questions':
                return <QuestionBankPage />;

            case 'analytics':
                return (
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-8 py-6 border-b border-blue-200/50">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center">
                                    <span className="text-white">📈</span>
                                </span>
                                Analytics & Insights
                            </h2>
                        </div>
                        <div className="p-8">
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                                    <span className="text-4xl">📊</span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Analytics Coming Soon</h3>
                                <p className="text-slate-600">Detailed analytics and reporting features will be available here.</p>
                            </div>
                        </div>
                    </div>
                );

            case 'reports':
                return (
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-8 py-6 border-b border-sky-200/50">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <span className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-500 rounded-2xl flex items-center justify-center">
                                    <span className="text-white">📊</span>
                                </span>
                                Reports & Data Export
                            </h2>
                        </div>
                        <div className="p-8">
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-sky-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-200">
                                    <span className="text-4xl">📋</span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Reports Module</h3>
                                <p className="text-slate-600">Generate and export detailed reports from your data.</p>
                            </div>
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-8 py-6 border-b border-blue-200/50">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center">
                                    <span className="text-white">⚙️</span>
                                </span>
                                System Settings
                            </h2>
                        </div>
                        <div className="p-8">
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                                    <span className="text-4xl">🔧</span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Settings Panel</h3>
                                <p className="text-slate-600">Configure your application settings and preferences.</p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 flex">
            {/* Sidebar */}
            <div className={`${sidebarCollapsed ? 'w-20' : 'w-80'} transition-all duration-300 bg-white/90 backdrop-blur-xl border-r border-blue-200/50 shadow-xl flex flex-col`}>
                {/* Sidebar Header */}
                <div className="p-6 border-b border-blue-200/50">
                    <div className="flex items-center justify-between">
                        {!sidebarCollapsed && (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <span className="text-2xl">🛠️</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                                        Admin Panel
                                    </h2>
                                    <p className="text-sm text-slate-600">Control Center</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 rounded-xl bg-gradient-to-r from-blue-100 to-sky-100 hover:from-blue-200 hover:to-sky-200 transition-all duration-200 border border-blue-200/50"
                        >
                            <span className="text-lg text-blue-600">{sidebarCollapsed ? '→' : '←'}</span>
                        </button>
                    </div>
                </div>

                {/* User Info */}
                {!sidebarCollapsed && (
                    <div className="p-6 border-b border-blue-200/50">
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                        {session?.user?.email?.charAt(0).toUpperCase() || 'A'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">
                                        {session?.user?.name || 'Admin User'}
                                    </h3>
                                    <p className="text-sm text-slate-600 truncate">
                                        {session?.user?.email}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Menu */}
                <nav className="flex-1 p-6 overflow-y-auto">
                    <div className="space-y-2">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${activeTab === item.id
                                        ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg'
                                        : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 hover:text-blue-700'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {!sidebarCollapsed && (
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">{item.label}</div>
                                        <div className="text-xs opacity-75">{item.description}</div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Sidebar Footer */}
                {!sidebarCollapsed && (
                    <div className="p-6 border-t border-blue-200/50">
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200/50">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-sm text-slate-600">System Status: Online</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-white/90 backdrop-blur-xl border-b border-blue-200/50 shadow-sm">
                    <div className="px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                                    {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                                </h1>
                                <p className="text-slate-600 mt-1">
                                    {menuItems.find(item => item.id === activeTab)?.description || 'Welcome to your admin dashboard'}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl border border-blue-200/50">
                                    <span className="text-sm font-medium text-slate-700">
                                        {new Date().toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <button className="p-3 rounded-2xl bg-gradient-to-r from-blue-100 to-sky-100 hover:from-blue-200 hover:to-sky-200 transition-all duration-200 border border-blue-200/50">
                                    <span className="text-xl">🔔</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}