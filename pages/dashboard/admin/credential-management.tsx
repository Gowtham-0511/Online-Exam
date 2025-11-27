import React, { useState, useEffect } from 'react';
import {
    Database,
    Trash2,
    Edit,
    Plus,
    Search,
    Server,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Copy,
    MoreHorizontal,
    Shield,
    Key,
    Globe
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
        if (session?.user?.email) {
            setNewCredential(prev => ({ ...prev, createdBy: session.user?.email || '' }));
        }
        fetchCredentials();
    }, [session]);

    const fetchCredentials = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/sql/list-credentials');
            const data = await response.json();
            // Simulate network delay for smooth loading animation
            setTimeout(() => {
                setCredentials(data.credentials || []);
                setLoading(false);
            }, 800);
        } catch (error) {
            console.error('Error fetching credentials:', error);
            setLoading(false);
        }
    };

    const handleViewDetails = async (id: string) => {
        try {
            const response = await fetch(`/api/sql/get-credentials?credentialId=${id}`);
            const data = await response.json();
            setSelectedCredential(data);
            setShowPassword(false);
        } catch (error) {
            console.error('Error fetching credential details:', error);
            setNotification({ type: 'error', message: 'Failed to fetch credential details' });
        }
    };

    const handleDelete = async () => {
        if (!credentialToDelete) return;

        try {
            const response = await fetch(`/api/sql/delete-credentials?credentialId=${credentialToDelete}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setCredentials(credentials.filter(c => c.id !== credentialToDelete));
                setIsDeleteModalOpen(false);
                setCredentialToDelete(null);
                setNotification({ type: 'success', message: 'Credential deleted successfully' });
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting credential:', error);
            setNotification({ type: 'error', message: 'Failed to delete credential' });
        }
        setTimeout(() => setNotification(null), 3000);
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
                    createdBy: session?.user?.email || ''
                });
                setConnectionTestResult(null);
                setNotification({ type: 'success', message: 'Credential added successfully' });
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
            setTimeout(() => setNotification(null), 3000);
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setNotification({ type: 'success', message: 'Copied to clipboard' });
        setTimeout(() => setNotification(null), 2000);
    };

    return (
        <UnifiedDashboardLayout role="admin">
            <Head>
                <title>SQL Credentials - SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Notification Alert */}
                {notification && (
                    <div className="fixed top-6 right-6 z-50 w-96 animate-in slide-in-from-right-10 duration-300">
                        <Alert className={`border shadow-lg ${notification.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                            }`}>
                            {notification.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            )}
                            <AlertDescription className={`${notification.type === 'success'
                                ? 'text-emerald-800 dark:text-emerald-200'
                                : 'text-rose-800 dark:text-rose-200'
                                }`}>
                                {notification.message}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            SQL Credentials
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            Manage and monitor your database connections
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        size="lg"
                        className="shadow-lg hover:shadow-primary/20 transition-all duration-300 bg-primary hover:bg-primary/90"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Credential
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Credentials</p>
                                    <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                                        {loading ? <Skeleton className="h-8 w-16" /> : credentials.length}
                                    </h3>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent hover:border-purple-500/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Connections</p>
                                    <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                                        {loading ? <Skeleton className="h-8 w-16" /> : credentials.length}
                                    </h3>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <Server className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Server Types</p>
                                    <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                                        {loading ? <Skeleton className="h-8 w-16" /> : new Set(credentials.map(c => c.serverType)).size}
                                    </h3>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search by exam title, host, or database..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-background"
                        />
                    </div>
                </div>

                {/* Credentials Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="h-[200px] animate-pulse">
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/4" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : filteredCredentials.length === 0 ? (
                    <Card className="border-dashed border-2 bg-muted/10">
                        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="rounded-full bg-muted p-6 animate-in zoom-in duration-500">
                                <Database className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <div className="text-center space-y-2 max-w-md">
                                <h3 className="text-xl font-semibold">No credentials found</h3>
                                <p className="text-muted-foreground">
                                    {searchTerm
                                        ? 'Try adjusting your search criteria.'
                                        : 'Get started by adding your first database credential.'}
                                </p>
                            </div>
                            <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Credential
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCredentials.map((cred, index) => (
                            <Card
                                key={cred.id}
                                className="group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <CardHeader className="pb-3 bg-muted/20 border-b">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                                {cred.examTitle}
                                            </CardTitle>
                                            <Badge variant="outline" className="bg-background font-mono text-xs">
                                                {cred.serverType}
                                            </Badge>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleViewDetails(cred.id)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setCredentialToDelete(cred.id);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> Host
                                            </span>
                                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{cred.host}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Database className="w-3 h-3" /> Database
                                            </span>
                                            <span className="font-medium">{cred.database}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Server className="w-3 h-3" /> Port
                                            </span>
                                            <span className="font-mono text-xs">{cred.port}</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => handleViewDetails(cred.id)}
                                    >
                                        View Details
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* View Details Dialog */}
            <Dialog open={!!selectedCredential} onOpenChange={() => setSelectedCredential(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Database className="w-6 h-6 text-primary" />
                            Credential Details
                        </DialogTitle>
                        <DialogDescription>
                            Connection information for {selectedCredential?.examTitle}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCredential && (
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Server Type</Label>
                                    <div className="font-medium flex items-center gap-2">
                                        <Badge variant="secondary">{selectedCredential.serverType}</Badge>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Port</Label>
                                    <div className="font-mono bg-muted/50 px-3 py-1 rounded-md inline-block">
                                        {selectedCredential.port}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Host</Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-muted rounded-md border font-mono text-sm">
                                        {selectedCredential.host}
                                    </code>
                                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(selectedCredential.host)}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Database Name</Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-muted rounded-md border font-mono text-sm">
                                        {selectedCredential.database}
                                    </code>
                                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(selectedCredential.database)}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Username</Label>
                                    <div className="p-2 bg-muted/30 rounded-md border text-sm font-medium">
                                        {selectedCredential.username}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Password</Label>
                                    <div className="relative">
                                        <div className="p-2 bg-muted/30 rounded-md border text-sm font-mono pr-10">
                                            {showPassword ? selectedCredential.password : '••••••••••••'}
                                        </div>
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                                <span>Created by {selectedCredential.createdBy}</span>
                                <span>{new Date(selectedCredential.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add Credential Dialog */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Add New Credential</DialogTitle>
                        <DialogDescription>
                            Enter database connection details to create a new credential.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Server Type <span className="text-destructive">*</span></Label>
                                <Select
                                    value={newCredential.serverType}
                                    onValueChange={(value) => setNewCredential({
                                        ...newCredential,
                                        serverType: value,
                                        port: value === 'postgres' ? '5432' : '1433'
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select server type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="postgres">PostgreSQL</SelectItem>
                                        <SelectItem value="ssms">SQL Server (SSMS)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Exam Title <span className="text-destructive">*</span></Label>
                                <Input
                                    value={newCredential.examTitle}
                                    onChange={(e) => setNewCredential({ ...newCredential, examTitle: e.target.value })}
                                    placeholder="e.g. Final Assessment DB"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Host <span className="text-destructive">*</span></Label>
                                <Input
                                    value={newCredential.host}
                                    onChange={(e) => setNewCredential({ ...newCredential, host: e.target.value })}
                                    placeholder="localhost or IP address"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Port <span className="text-destructive">*</span></Label>
                                <Input
                                    value={newCredential.port}
                                    onChange={(e) => setNewCredential({ ...newCredential, port: e.target.value })}
                                    placeholder="5432"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Database Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={newCredential.database}
                                onChange={(e) => setNewCredential({ ...newCredential, database: e.target.value })}
                                placeholder="Database name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username <span className="text-destructive">*</span></Label>
                                <Input
                                    value={newCredential.username}
                                    onChange={(e) => setNewCredential({ ...newCredential, username: e.target.value })}
                                    placeholder="Database username"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={newCredential.password}
                                        onChange={(e) => setNewCredential({ ...newCredential, password: e.target.value })}
                                        placeholder="Database password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {connectionTestResult && (
                            <Alert variant={connectionTestResult.success ? "default" : "destructive"} className={connectionTestResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200" : ""}>
                                {connectionTestResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <AlertDescription>
                                    {connectionTestResult.message}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={resetAddModal} disabled={isTestingConnection}>
                            Cancel
                        </Button>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="secondary"
                                onClick={handleTestConnection}
                                disabled={isTestingConnection || !newCredential.host || !newCredential.database || !newCredential.username || !newCredential.password}
                                className="flex-1 sm:flex-none"
                            >
                                {isTestingConnection ? 'Testing...' : 'Test Connection'}
                            </Button>
                            <Button
                                onClick={handleAddCredential}
                                disabled={isTestingConnection || !newCredential.host || !newCredential.database || !newCredential.username || !newCredential.password || !newCredential.examTitle}
                                className="flex-1 sm:flex-none"
                            >
                                {isTestingConnection ? 'Saving...' : 'Save Credential'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this credential? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </UnifiedDashboardLayout>
    );
};

export default CredentialManagement;