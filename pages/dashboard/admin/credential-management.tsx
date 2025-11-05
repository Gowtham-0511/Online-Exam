import React, { useState, useEffect } from 'react';
import { Database, Trash2, Edit, Plus, Search, Server, Eye, EyeOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';

interface Credential {
    id: string;
    serverType: string;
    host: string;
    port: number;
    username: string;
    database: string;
    examTitle: string;
    createdBy: string;
    createdAt: string;
    password?: string;
}

interface NewCredentialForm {
    serverType: string;
    host: string;
    port: string;
    username: string;
    password: string;
    database: string;
    examTitle: string;
    createdBy: string;
}

const CredentialManagement = () => {
    const { data: session } = useSession();
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [newCredential, setNewCredential] = useState<NewCredentialForm>({
        serverType: 'postgres',
        host: '',
        port: '5432',
        username: '',
        password: '',
        database: '',
        examTitle: '',
        createdBy: session?.user?.email || ''
    });

    useEffect(() => {
        fetchCredentials();
    }, []);

    const fetchCredentials = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/sql/list-credentials');
            const data = await response.json();
            setCredentials(data.credentials || []);
        } catch (error) {
            console.error('Error fetching credentials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (id: string) => {
        try {
            const response = await fetch(`/api/sql/get-credentials?credentialId=${id}`);
            const data = await response.json();
            setSelectedCredential(data);
            setIsModalOpen(true);
            setShowPassword(false);
        } catch (error) {
            console.error('Error fetching credential details:', error);
        }
    };

    const handleDelete = async () => {
        if (!credentialToDelete) return;

        try {
            const response = await fetch(`/api/sql/delete-credentials?credentialId=${credentialToDelete}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchCredentials();
                setIsDeleteModalOpen(false);
                setCredentialToDelete(null);
            }
        } catch (error) {
            console.error('Error deleting credential:', error);
        }
    };

    const handleTestConnection = async () => {
        setIsTestingConnection(true);
        setConnectionTestResult(null);

        try {
            const response = await fetch('/api/sql/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverType: newCredential.serverType,
                    credentials: {
                        host: newCredential.host,
                        port: newCredential.port,
                        username: newCredential.username,
                        password: newCredential.password,
                        database: newCredential.database,
                    },
                    saveCredentials: false,
                }),
            });

            const data = await response.json();
            setConnectionTestResult(data);
        } catch (error: any) {
            setConnectionTestResult({
                success: false,
                message: error.message || 'Connection test failed'
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleAddCredential = async () => {
        setIsTestingConnection(true);

        try {
            const response = await fetch('/api/sql/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverType: newCredential.serverType,
                    credentials: {
                        host: newCredential.host,
                        port: newCredential.port,
                        username: newCredential.username,
                        password: newCredential.password,
                        database: newCredential.database,
                    },
                    saveCredentials: true,
                    examTitle: newCredential.examTitle,
                    createdBy: newCredential.createdBy,
                }),
            });

            const data = await response.json();

            if (data.success) {
                fetchCredentials();
                setIsAddModalOpen(false);
                setNewCredential({
                    serverType: 'postgres',
                    host: '',
                    port: '5432',
                    username: '',
                    password: '',
                    database: '',
                    examTitle: '',
                    createdBy: ''
                });
                setConnectionTestResult(null);
            } else {
                setConnectionTestResult(data);
            }
        } catch (error: any) {
            setConnectionTestResult({
                success: false,
                message: error.message || 'Failed to add credential'
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const resetAddModal = () => {
        setIsAddModalOpen(false);
        setNewCredential({
            serverType: 'postgres',
            host: '',
            port: '5432',
            username: '',
            password: '',
            database: '',
            examTitle: '',
            createdBy: session?.user?.email || ''
        });
        setConnectionTestResult(null);
    };

    const filteredCredentials = credentials.filter(cred =>
        cred.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cred.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cred.database.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getServerIcon = (serverType: string) => {
        return <Database className="w-5 h-5" />;
    };

    return (
        <UnifiedDashboardLayout role="admin">
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto p-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground mb-2">SQL Credential Management</h1>
                        <p className="text-muted-foreground">Manage and monitor all database credentials</p>
                    </div>

                    {/* Search and Actions Bar */}
                    <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="relative flex-1 w-full sm:max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by exam title, host, or database..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <Plus className="w-5 h-5" />
                                Add Credential
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm mb-1">Total Credentials</p>
                                    <p className="text-3xl font-bold text-foreground">{credentials.length}</p>
                                </div>
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm mb-1">Active Connections</p>
                                    <p className="text-3xl font-bold text-foreground">{credentials.length}</p>
                                </div>
                                <div className="p-3 bg-accent/10 rounded-lg">
                                    <Server className="w-6 h-6 text-accent" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm mb-1">Server Types</p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {new Set(credentials.map(c => c.serverType)).size}
                                    </p>
                                </div>
                                <div className="p-3 bg-secondary/10 rounded-lg">
                                    <Database className="w-6 h-6 text-secondary-foreground" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Credentials Table */}
                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Exam Title
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Server Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Host
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Database
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Created By
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Created At
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                                Loading credentials...
                                            </td>
                                        </tr>
                                    ) : filteredCredentials.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                                No credentials found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCredentials.map((cred) => (
                                            <tr key={cred.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-md">
                                                            {getServerIcon(cred.serverType)}
                                                        </div>
                                                        <span className="font-medium text-foreground">{cred.examTitle}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                                                        {cred.serverType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                    {cred.host}:{cred.port}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                    {cred.database}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                    {cred.createdBy}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                    {new Date(cred.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewDetails(cred.id)}
                                                            className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setCredentialToDelete(cred.id);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* View Details Modal */}
                {isModalOpen && selectedCredential && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="border-b border-border p-6">
                                <h2 className="text-2xl font-bold text-foreground">Credential Details</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Exam Title</label>
                                        <p className="mt-1 text-foreground font-medium">{selectedCredential.examTitle}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Server Type</label>
                                        <p className="mt-1">
                                            <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                                                {selectedCredential.serverType}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Host</label>
                                        <p className="mt-1 text-foreground">{selectedCredential.host}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Port</label>
                                        <p className="mt-1 text-foreground">{selectedCredential.port}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Database</label>
                                        <p className="mt-1 text-foreground">{selectedCredential.database}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Username</label>
                                        <p className="mt-1 text-foreground">{selectedCredential.username}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium text-muted-foreground">Password</label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="flex-1 px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground">
                                                {showPassword ? selectedCredential.password : '••••••••••••'}
                                            </div>
                                            <button
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Created By</label>
                                        <p className="mt-1 text-foreground">{selectedCredential.createdBy}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Created At</label>
                                        <p className="mt-1 text-foreground">
                                            {new Date(selectedCredential.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-border p-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-foreground mb-4">Confirm Deletion</h2>
                                <p className="text-muted-foreground mb-6">
                                    Are you sure you want to delete this credential? This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setIsDeleteModalOpen(false);
                                            setCredentialToDelete(null);
                                        }}
                                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2 bg-destructive text-white rounded-md hover:opacity-90 transition-opacity"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Credential Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="border-b border-border p-6">
                                <h2 className="text-2xl font-bold text-foreground">Add New Credential</h2>
                                <p className="text-muted-foreground mt-1">Test and save database credentials</p>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Server Type */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Server Type <span className="text-destructive">*</span>
                                    </label>
                                    <select
                                        value={newCredential.serverType}
                                        onChange={(e) => setNewCredential({
                                            ...newCredential,
                                            serverType: e.target.value,
                                            port: e.target.value === 'postgres' ? '5432' : '1433'
                                        })}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="postgres">PostgreSQL</option>
                                        <option value="ssms">SQL Server (SSMS)</option>
                                    </select>
                                </div>

                                {/* Exam Title */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Title <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newCredential.examTitle}
                                        onChange={(e) => setNewCredential({ ...newCredential, examTitle: e.target.value })}
                                        placeholder="Enter title"
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>

                                {/* Host and Port */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Host <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newCredential.host}
                                            onChange={(e) => setNewCredential({ ...newCredential, host: e.target.value })}
                                            placeholder="localhost or IP address"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Port <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newCredential.port}
                                            onChange={(e) => setNewCredential({ ...newCredential, port: e.target.value })}
                                            placeholder="5432"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>

                                {/* Database */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Database <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newCredential.database}
                                        onChange={(e) => setNewCredential({ ...newCredential, database: e.target.value })}
                                        placeholder="Database name"
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>

                                {/* Username and Password */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Username <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newCredential.username}
                                            onChange={(e) => setNewCredential({ ...newCredential, username: e.target.value })}
                                            placeholder="Database username"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Password <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={newCredential.password}
                                            onChange={(e) => setNewCredential({ ...newCredential, password: e.target.value })}
                                            placeholder="Database password"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>

                                {/* Created By */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Created By <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newCredential.createdBy}
                                        onChange={(e) => setNewCredential({ ...newCredential, createdBy: e.target.value })}
                                        placeholder="Your name or email"
                                        disabled
                                        className="w-full px-3 py-2 bg-muted border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Connection Test Result */}
                                {connectionTestResult && (
                                    <div className={`p-4 rounded-md border ${connectionTestResult.success
                                        ? 'bg-accent/10 border-accent text-accent-foreground'
                                        : 'bg-destructive/10 border-destructive text-destructive'
                                        }`}>
                                        <p className="font-medium">{connectionTestResult.message}</p>
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-border p-6 flex justify-end gap-3">
                                <button
                                    onClick={resetAddModal}
                                    disabled={isTestingConnection}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleTestConnection}
                                    disabled={isTestingConnection || !newCredential.host || !newCredential.database || !newCredential.username || !newCredential.password}
                                    className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                                </button>
                                <button
                                    onClick={handleAddCredential}
                                    disabled={isTestingConnection || !newCredential.host || !newCredential.database || !newCredential.username || !newCredential.password || !newCredential.examTitle || !newCredential.createdBy}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isTestingConnection ? 'Saving...' : 'Save Credential'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </UnifiedDashboardLayout>
    );
};

export default CredentialManagement;