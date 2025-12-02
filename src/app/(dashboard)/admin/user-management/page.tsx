"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Alert,
    AlertDescription,
} from '@/components/ui/alert';
import {
    Users,
    Search,
    Mail,
    UserX,
    Play,
    CheckCircle2,
    Circle,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';
// import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import Head from 'next/head';

interface User {
    name?: string;
    email: string;
    is_active: boolean | number;
    schedule_start?: string;
    schedule_end?: string;
}

interface UploadResult {
    success: boolean;
    message: string;
    inserted?: number;
    failed?: number;
    errors?: string[];
}

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];
            if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setUploadFile(file);
                setUploadResult(null);
            } else {
                setUploadResult({
                    success: false,
                    message: 'Please upload a valid Excel file (.xlsx or .xls)'
                });
            }
        }
    };

    const handleBulkUpload = async () => {
        if (!uploadFile) return;

        setUploading(true);
        setUploadResult(null);

        const formData = new FormData();
        formData.append('file', uploadFile);

        try {
            const response = await fetch('/api/admin/users/bulk-upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                setUploadResult({
                    success: true,
                    message: result.message,
                    inserted: result.inserted,
                    failed: result.failed
                });
                fetchUsers();
            } else {
                setUploadResult({
                    success: false,
                    message: result.message || 'Upload failed',
                    errors: result.errors
                });
            }
        } catch (error) {
            setUploadResult({
                success: false,
                message: 'An error occurred during upload. Please try again.'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleCloseDialog = () => {
        setUploadDialogOpen(false);
        setUploadFile(null);
        setUploadResult(null);
    };

    const getUserStatus = (user: User): number => {
        if (user.is_active) {
            return 1;
        } else if (user.schedule_start && user.schedule_end) {
            return 2;
        } else {
            return 0;
        }
    };

    const getStatusInfo = (status: number) => {
        switch (status) {
            case 1:
                return {
                    label: 'Active',
                    icon: Play,
                    color: 'bg-primary text-primary-foreground',
                    dotColor: 'bg-primary'
                };
            case 2:
                return {
                    label: 'Completed',
                    icon: CheckCircle2,
                    color: 'bg-emerald-500 text-white dark:bg-emerald-600',
                    dotColor: 'bg-emerald-500 dark:bg-emerald-600'
                };
            default:
                return {
                    label: 'Inactive',
                    icon: Circle,
                    color: 'bg-secondary text-secondary-foreground',
                    dotColor: 'bg-muted-foreground'
                };
        }
    };

    const filteredUsers = users.filter(user => {
        if (statusFilter !== null) {
            const userStatus = getUserStatus(user);
            if (userStatus !== statusFilter) return false;
        }
        if (searchTerm && !user.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !user.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        return true;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return email ? email.slice(0, 2).toUpperCase() : 'U';
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Candidate Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage exam candidates and schedules
                    </p>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                </Button>
            </div>

            {/* Filters and Search */}
            <Card className="border-border">
                <CardContent className="p-4">
                    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search candidates..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="pl-10"
                            />
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Showing {currentUsers.length} of {filteredUsers.length} candidates
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Candidates List
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-4 p-6">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[200px]" />
                                        <Skeleton className="h-3 w-[160px]" />
                                    </div>
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            ))}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                            <p className="text-muted-foreground text-sm text-center">
                                {searchTerm || statusFilter !== null
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'No candidates have been registered yet'
                                }
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Candidate</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentUsers.map((user, index) => {
                                    const userStatus = getUserStatus(user);
                                    const statusInfo = getStatusInfo(userStatus);
                                    const StatusIcon = statusInfo.icon;

                                    return (
                                        <TableRow key={index} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border-2 border-border">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
                                                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                                            {getInitials(user.name, user.email)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm text-foreground">
                                                            {user.name || 'Unknown'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-foreground">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive">
                                                            <UserX className="h-4 w-4 mr-2" />
                                                            Remove Candidate
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <Card className="border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>

                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => paginate(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bulk Upload Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            Bulk Upload Users
                        </DialogTitle>
                        <DialogDescription>
                            Upload an Excel file with columns: Name, Email, Phone Number
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Select Excel File
                            </label>
                            <Input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                disabled={uploading}
                                className="cursor-pointer"
                            />
                            {uploadFile && (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4" />
                                    {uploadFile.name}
                                </p>
                            )}
                        </div>

                        {uploadResult && (
                            <Alert variant={uploadResult.success ? "default" : "destructive"}>
                                {uploadResult.success ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                <AlertDescription>
                                    {uploadResult.message}
                                    {uploadResult.inserted !== undefined && (
                                        <div className="mt-2 text-sm">
                                            <p>Successfully inserted: {uploadResult.inserted}</p>
                                            {uploadResult.failed! > 0 && (
                                                <p>Failed: {uploadResult.failed}</p>
                                            )}
                                        </div>
                                    )}
                                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                                        <div className="mt-2 text-sm space-y-1">
                                            {uploadResult.errors.slice(0, 5).map((error, idx) => (
                                                <p key={idx}>• {error}</p>
                                            ))}
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="bg-muted/50 p-4 rounded-lg border border-border">
                            <p className="text-sm font-medium mb-2">Excel Format:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Column 1: Name (Full name of the user)</li>
                                <li>• Column 2: Email (Valid email address)</li>
                                <li>• Column 3: Phone Number (Will be used as password)</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCloseDialog}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkUpload}
                            disabled={!uploadFile || uploading}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UsersPage;