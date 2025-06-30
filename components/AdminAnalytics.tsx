import { useEffect, useState } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    ArcElement, 
    LineElement, 
    PointElement
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, LineElement, PointElement);

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    type Stats = {
        totalUsers: number;
        totalExams: number;
        totalSubmissions: number;
        avgDuration: number;
        [key: string]: any;
    };
    const [stats, setStats] = useState<Stats | null>(null);
    const [examChartData, setExamChartData] = useState<any>(null);
    const [roleChartData, setRoleChartData] = useState<any>(null);
    const [disqRate, setDisqRate] = useState<any>(null);
    const [topExam, setTopExam] = useState<any>(null);
    const [timelineData, setTimelineData] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/analytics/stats");
                const data = await res.json();
                setStats(data);
            } catch (error) {
                console.error("Failed to load analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchChart = async () => {
            try {
                const res = await fetch("/api/analytics/submissions-by-exam");
                const data = await res.json();

                setExamChartData({
                    labels: data.map((item: { examTitle: any; }) => item.examTitle),
                    datasets: [
                        {
                            label: "Submissions",
                            data: data.map((item: { count: any; }) => item.count),
                            backgroundColor: "rgba(135, 206, 235, 0.8)",
                            borderColor: "#87CEEB",
                            borderWidth: 2,
                            borderRadius: 8,
                            borderSkipped: false,
                        },
                    ],
                });
            } catch (err) {
                console.error("Failed to load chart data:", err);
            }
        };

        const fetchRoleChart = async () => {
            try {
                const res = await fetch("/api/analytics/users-by-role");
                const data = await res.json();

                setRoleChartData({
                    labels: data.map((r: { role: any; }) => r.role),
                    datasets: [
                        {
                            label: "Users by Role",
                            data: data.map((r: { count: any; }) => r.count),
                            backgroundColor: [
                                "#87CEEB", // Sky Blue
                                "#B0E0E6", // Powder Blue
                                "#ADD8E6", // Light Blue
                            ],
                            borderColor: "#FFFFFF",
                            borderWidth: 3,
                            hoverOffset: 15,
                        },
                    ],
                });
            } catch (err) {
                console.error("Failed to fetch user role data:", err);
            }
        };

        fetch("/api/analytics/disqualification-rate")
            .then((res) => res.json())
            .then(setDisqRate)
            .catch((err) => console.error("Disq error", err));

        fetch("/api/analytics/top-exam")
            .then((res) => res.json())
            .then(setTopExam)
            .catch((err) => console.error("Top exam error", err));

        fetch("/api/analytics/submission-timeline")
            .then((res) => res.json())
            .then((data) => {
                setTimelineData({
                    labels: data.map((d: { date: any; }) => d.date),
                    datasets: [
                        {
                            label: "Submissions per Day",
                            data: data.map((d: { count: any; }) => d.count),
                            borderColor: "#87CEEB",
                            backgroundColor: "rgba(135, 206, 235, 0.1)",
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: "#87CEEB",
                            pointBorderColor: "#FFFFFF",
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                        },
                    ],
                });
            });

        fetchRoleChart();
        fetchChart();
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-400 mb-4"></div>
                    <p className="text-blue-400 text-lg font-medium">Loading analytics...</p>
                </div>
            </div>
        );
    }

    const exportToCSV = (data: any[], filename = "report.csv") => {
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map((row: { [s: string]: unknown; } | ArrayLike<unknown>) => Object.values(row).join(",")).join("\n");
        const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: '#6C757D',
                    font: {
                        size: 12,
                        weight: 500
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#6C757D',
                bodyColor: '#6C757D',
                borderColor: '#E0F6FF',
                borderWidth: 1,
                cornerRadius: 12,
                displayColors: false,
            }
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#6C757D',
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    color: '#E6F3FF',
                    lineWidth: 1,
                },
                ticks: {
                    color: '#6C757D',
                    font: {
                        size: 11
                    }
                }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: {
                    color: '#6C757D',
                    font: {
                        size: 12,
                        weight: 500
                    },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#6C757D',
                bodyColor: '#6C757D',
                borderColor: '#E0F6FF',
                borderWidth: 1,
                cornerRadius: 12,
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
                    <p className="text-gray-600">Comprehensive insights and performance metrics</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard 
                        label="Total Users" 
                        value={stats?.totalUsers || 0} 
                        icon="👥"
                        gradient="from-blue-100 to-blue-50"
                    />
                    <StatCard 
                        label="Total Exams" 
                        value={stats?.totalExams || 0} 
                        icon="📝"
                        gradient="from-cyan-100 to-cyan-50"
                    />
                    <StatCard 
                        label="Total Submissions" 
                        value={stats?.totalSubmissions || 0} 
                        icon="📊"
                        gradient="from-sky-100 to-sky-50"
                    />
                    <StatCard 
                        label="Avg Duration" 
                        value={`${stats?.avgDuration || 0} min`} 
                        icon="⏰"
                        gradient="from-indigo-100 to-indigo-50"
                    />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
                    {/* Bar Chart */}
                    <ChartCard title="📈 Submissions per Exam">
                        {examChartData ? (
                            <Bar data={examChartData} options={chartOptions} />
                        ) : (
                            <ChartLoader />
                        )}
                    </ChartCard>

                    {/* Pie Chart */}
                    <ChartCard title="🧑‍🤝‍🧑 Users by Role">
                        {roleChartData ? (
                            <div className="flex justify-center">
                                <div className="w-80 h-80">
                                    <Pie data={roleChartData} options={pieOptions} />
                                </div>
                            </div>
                        ) : (
                            <ChartLoader />
                        )}
                    </ChartCard>
                </div>

                {/* Bottom Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {/* Disqualification Rate */}
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-8 text-center border border-red-100 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="text-4xl mb-4">❌</div>
                        <h2 className="text-xl font-bold text-red-600 mb-3">Disqualification Rate</h2>
                        {disqRate ? (
                            <p className="text-4xl font-bold text-red-700 mb-2">{disqRate.percentage}%</p>
                        ) : (
                            <div className="animate-pulse bg-red-200 h-12 rounded-lg"></div>
                        )}
                        <p className="text-sm text-red-500">Critical metric to monitor</p>
                    </div>

                    {/* Top Exam */}
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-8 border border-amber-100 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="text-4xl mb-4 text-center">🥇</div>
                        <h2 className="text-xl font-bold text-amber-700 mb-3 text-center">Most Attempted Exam</h2>
                        {topExam?.title ? (
                            <>
                                <p className="text-lg font-bold text-amber-800 mb-2 text-center">{topExam.title}</p>
                                <p className="text-sm text-amber-600 text-center bg-amber-100 px-3 py-1 rounded-full inline-block">
                                    {topExam.submissionCount} submissions
                                </p>
                            </>
                        ) : (
                            <div className="animate-pulse bg-amber-200 h-16 rounded-lg"></div>
                        )}
                    </div>

                    {/* Export Button */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center">
                        <div className="text-4xl mb-4">📥</div>
                        <h2 className="text-xl font-bold text-green-700 mb-4">Export Data</h2>
                        <button 
                            onClick={() => stats && exportToCSV([stats], 'analytics_report.csv')}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 shadow-md hover:shadow-lg"
                        >
                            Download CSV
                        </button>
                    </div>
                </div>

                {/* Timeline Chart */}
                <ChartCard title="📈 Submission Timeline" className="mb-6">
                    {timelineData ? (
                        <Line data={timelineData} options={chartOptions} />
                    ) : (
                        <ChartLoader />
                    )}
                </ChartCard>
            </div>
        </div>
    );
}

type StatCardProps = {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    gradient: string;
};

function StatCard({ label, value, icon, gradient }: StatCardProps) {
    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg p-6 text-center border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
            <div className="text-3xl mb-3">{icon}</div>
            <div className="text-sm font-medium text-gray-600 mb-2">{label}</div>
            <div className="text-3xl font-bold text-blue-600">{value}</div>
        </div>
    );
}

type ChartCardProps = {
    title: string;
    children: React.ReactNode;
    className?: string;
};

function ChartCard({ title, children, className = "" }: ChartCardProps) {
    return (
        <div className={`bg-white rounded-2xl shadow-lg p-8 border border-blue-100 hover:shadow-xl transition-all duration-300 ${className}`}>
            <h2 className="text-xl font-bold text-gray-700 mb-6 text-center">{title}</h2>
            {children}
        </div>
    );
}

function ChartLoader() {
    return (
        <div className="flex justify-center items-center h-64">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-400 mb-4"></div>
                <p className="text-blue-400 font-medium">Loading chart...</p>
            </div>
        </div>
    );
}