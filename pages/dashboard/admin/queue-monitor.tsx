import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, Clock, CheckCircle, XCircle, Users, Database, Code } from 'lucide-react';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import Head from 'next/head';

interface QueueStats {
    python: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        queueLength: number;
    };
    sql: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        queueLength: number;
    };
    docker?: {
        activeContainers: number;
    };
    redis?: {
        connected: boolean;
        memoryUsed: string;
    };
}

interface RecentJob {
    id: string;
    type: 'python' | 'sql';
    userEmail: string;
    timestamp: string;
    status: 'success' | 'failed' | 'pending';
    executionTime?: number;
}

export default function QueueMonitor() {
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const [isClearing, setIsClearing] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{
        type: string;
        action: () => Promise<void>;
        message: string;
    } | null>(null);

    // Fetch queue statistics
    const fetchStats = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:5000'}/queue-stats`);
            const data = await response.json();
            setStats(data);
            setLastUpdate(new Date());
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            setLoading(false);
        }
    };

    // Fetch recent jobs
    const fetchRecentJobs = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:5000'}/recent-jobs`);
            const data = await response.json();
            setRecentJobs(data.jobs || []);
        } catch (error) {
            console.error('Failed to fetch recent jobs:', error);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchRecentJobs();

        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchStats();
                fetchRecentJobs();
            }, 3000); // Refresh every 3 seconds

            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const calculateSuccessRate = (completed: number, failed: number) => {
        const total = completed + failed;
        if (total === 0) return 100;
        return ((completed / total) * 100).toFixed(1);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-600 dark:text-green-400';
            case 'failed': return 'text-red-600 dark:text-red-400';
            case 'pending': return 'text-yellow-600 dark:text-yellow-400';
            default: return 'text-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-4 h-4" />;
            case 'failed': return <XCircle className="w-4 h-4" />;
            case 'pending': return <Clock className="w-4 h-4" />;
            default: return null;
        }
    };

    // Clear queue handler
    const handleClearQueue = async (queueType: 'python' | 'sql' | 'all') => {
        setIsClearing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:5000'}/clear-queue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueType }),
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ ${data.message}`);
                fetchStats();
            } else {
                alert(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            alert('❌ Failed to clear queue');
            console.error(error);
        } finally {
            setIsClearing(false);
            setShowConfirmDialog(false);
            setActionToConfirm(null);
        }
    };

    // Clear history handler
    const handleClearHistory = async (historyType: 'python' | 'sql' | 'all') => {
        setIsClearing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:5000'}/clear-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ historyType }),
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ ${data.message}`);
                fetchRecentJobs();
            } else {
                alert(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            alert('❌ Failed to clear history');
            console.error(error);
        } finally {
            setIsClearing(false);
            setShowConfirmDialog(false);
            setActionToConfirm(null);
        }
    };

    // Reset stats handler
    const handleResetStats = async () => {
        setIsClearing(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:5000'}/reset-stats`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Statistics reset successfully');
                fetchStats();
            } else {
                alert(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            alert('❌ Failed to reset statistics');
            console.error(error);
        } finally {
            setIsClearing(false);
            setShowConfirmDialog(false);
            setActionToConfirm(null);
        }
    };

    // Confirmation dialog helper
    const confirmAction = (type: string, action: () => Promise<void>, message: string) => {
        setActionToConfirm({ type, action, message });
        setShowConfirmDialog(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <UnifiedDashboardLayout role='admin'>
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="min-h-screen bg-background p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-foreground mb-2">Queue Monitor</h1>
                            <p className="text-muted-foreground">Real-time monitoring of exam execution queues</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                                Last update: {lastUpdate.toLocaleTimeString()}
                            </div>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${autoRefresh
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                <RefreshCw className={`w-4 h-4 inline mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                            </button>
                            <button
                                onClick={() => {
                                    fetchStats();
                                    fetchRecentJobs();
                                }}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Refresh Now
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mb-8 p-6 bg-card border border-border rounded-xl">
                        <h2 className="text-lg font-semibold mb-4 text-foreground">Admin Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Clear Python Queue */}
                            <button
                                onClick={() => confirmAction(
                                    'Clear Python Queue',
                                    () => handleClearQueue('python'),
                                    'This will remove all pending Python jobs from the queue. Active jobs will continue.'
                                )}
                                disabled={isClearing}
                                className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Code className="w-4 h-4" />
                                Clear Python Queue
                            </button>

                            {/* Clear SQL Queue */}
                            <button
                                onClick={() => confirmAction(
                                    'Clear SQL Queue',
                                    () => handleClearQueue('sql'),
                                    'This will remove all pending SQL jobs from the queue. Active jobs will continue.'
                                )}
                                disabled={isClearing}
                                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Database className="w-4 h-4" />
                                Clear SQL Queue
                            </button>

                            {/* Clear All Queues */}
                            <button
                                onClick={() => confirmAction(
                                    'Clear All Queues',
                                    () => handleClearQueue('all'),
                                    'This will remove all pending jobs from both Python and SQL queues. Active jobs will continue.'
                                )}
                                disabled={isClearing}
                                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Clear All Queues
                            </button>

                            {/* Clear History */}
                            <button
                                onClick={() => confirmAction(
                                    'Clear History',
                                    () => handleClearHistory('all'),
                                    'This will clear all recent activity history. Statistics will not be affected.'
                                )}
                                disabled={isClearing}
                                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Clear History
                            </button>

                            {/* Reset Statistics */}
                            <button
                                onClick={() => confirmAction(
                                    'Reset Statistics',
                                    handleResetStats,
                                    'This will reset completed and failed counts to zero. Use with caution!'
                                )}
                                disabled={isClearing}
                                className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Activity className="w-4 h-4" />
                                Reset Stats
                            </button>
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Python Queue</p>
                                        <p className="text-3xl font-bold text-foreground">
                                            {stats?.python.waiting || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {stats?.python.active || 0} active
                                        </p>
                                    </div>
                                    <Code className="w-12 h-12 text-blue-500 opacity-20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">SQL Queue</p>
                                        <p className="text-3xl font-bold text-foreground">
                                            {stats?.sql.waiting || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {stats?.sql.active || 0} active
                                        </p>
                                    </div>
                                    <Database className="w-12 h-12 text-purple-500 opacity-20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Docker Containers</p>
                                        <p className="text-3xl font-bold text-foreground">
                                            {stats?.docker?.activeContainers || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">running</p>
                                    </div>
                                    <Activity className="w-12 h-12 text-green-500 opacity-20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Redis Status</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {stats?.redis?.connected ? 'Connected' : 'Offline'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {stats?.redis?.memoryUsed || 'N/A'}
                                        </p>
                                    </div>
                                    <Database className="w-12 h-12 text-red-500 opacity-20" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Statistics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Python Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Code className="w-5 h-5 text-blue-500" />
                                    Python Execution Stats
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <span className="text-sm text-muted-foreground">Waiting in Queue</span>
                                        <span className="text-lg font-bold text-yellow-600">
                                            {stats?.python.waiting || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <span className="text-sm text-muted-foreground">Currently Executing</span>
                                        <span className="text-lg font-bold text-blue-600">
                                            {stats?.python.active || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <span className="text-sm text-muted-foreground">Completed</span>
                                        <span className="text-lg font-bold text-green-600">
                                            {stats?.python.completed || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <span className="text-sm text-muted-foreground">Failed</span>
                                        <span className="text-lg font-bold text-red-600">
                                            {stats?.python.failed || 0}
                                        </span>
                                    </div>
                                    <div className="pt-4 border-t border-border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Success Rate</span>
                                            <span className="text-2xl font-bold text-primary">
                                                {calculateSuccessRate(
                                                    stats?.python.completed || 0,
                                                    stats?.python.failed || 0
                                                )}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* SQL Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="w-5 h-5 text-purple-500" />
                                    SQL Execution Stats
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <span className="text-sm text-muted-foreground">Waiting in Queue</span>
                                        <span className="text-lg font-bold text-yellow-600">
                                            {stats?.sql.waiting || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <span className="text-sm text-muted-foreground">Currently Executing</span>
                                        <span className="text-lg font-bold text-purple-600">
                                            {stats?.sql.active || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <span className="text-sm text-muted-foreground">Completed</span>
                                        <span className="text-lg font-bold text-green-600">
                                            {stats?.sql.completed || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <span className="text-sm text-muted-foreground">Failed</span>
                                        <span className="text-lg font-bold text-red-600">
                                            {stats?.sql.failed || 0}
                                        </span>
                                    </div>
                                    <div className="pt-4 border-t border-border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Success Rate</span>
                                            <span className="text-2xl font-bold text-primary">
                                                {calculateSuccessRate(
                                                    stats?.sql.completed || 0,
                                                    stats?.sql.failed || 0
                                                )}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Jobs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {recentJobs.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                                ) : (
                                    recentJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={getStatusColor(job.status)}>
                                                    {getStatusIcon(job.status)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-foreground">
                                                            {job.type === 'python' ? '🐍 Python' : '🔷 SQL'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {job.userEmail}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(job.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                                                    {job.status.toUpperCase()}
                                                </div>
                                                {job.executionTime && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {job.executionTime}ms
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Health Indicators */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className={
                            (stats?.python.waiting || 0) > 30
                                ? 'border-yellow-500'
                                : (stats?.python.waiting || 0) > 50
                                    ? 'border-red-500'
                                    : 'border-green-500'
                        }>
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-2">Python Queue Health</h3>
                                <p className="text-sm text-muted-foreground">
                                    {(stats?.python.waiting || 0) <= 30
                                        ? '✅ Healthy - Queue is moving smoothly'
                                        : (stats?.python.waiting || 0) <= 50
                                            ? '⚠️ Warning - Queue building up'
                                            : '🚨 Critical - Queue overloaded'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={
                            (stats?.sql.waiting || 0) > 30
                                ? 'border-yellow-500'
                                : (stats?.sql.waiting || 0) > 50
                                    ? 'border-red-500'
                                    : 'border-green-500'
                        }>
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-2">SQL Queue Health</h3>
                                <p className="text-sm text-muted-foreground">
                                    {(stats?.sql.waiting || 0) <= 30
                                        ? '✅ Healthy - Queue is moving smoothly'
                                        : (stats?.sql.waiting || 0) <= 50
                                            ? '⚠️ Warning - Queue building up'
                                            : '🚨 Critical - Queue overloaded'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-primary">
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-2">System Status</h3>
                                <p className="text-sm text-muted-foreground">
                                    {stats?.redis?.connected
                                        ? '✅ All systems operational'
                                        : '🚨 Redis connection lost'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Confirmation Dialog */}
                {showConfirmDialog && actionToConfirm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
                            <h3 className="text-xl font-bold text-foreground mb-3">
                                Confirm {actionToConfirm.type}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {actionToConfirm.message}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmDialog(false);
                                        setActionToConfirm(null);
                                    }}
                                    disabled={isClearing}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={actionToConfirm.action}
                                    disabled={isClearing}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isClearing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Confirm'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </UnifiedDashboardLayout>
    );
}