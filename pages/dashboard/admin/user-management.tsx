import React, { useEffect, useState } from 'react';
import AdminLayout from './layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Users,
    Search,
    Filter,
    Calendar,
    Clock,
    Mail,
    UserCheck,
    UserX,
    Play,
    CheckCircle2,
    Circle,
    MoreVertical,
    CalendarClock,
    Sparkles,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

interface User {
    name?: string;
    email: string;
    is_active: boolean | number;
    schedule_start?: string;
    schedule_end?: string;
}

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

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

    // Function to determine user status based on your business logic
    const getUserStatus = (user: User): number => {
        if (user.is_active) {
            return 1; // Active
        } else if (user.schedule_start && user.schedule_end) {
            return 2; // Completed
        } else {
            return 0; // Inactive
        }
    };

    const getStatusInfo = (status: number) => {
        switch (status) {
            case 1:
                return {
                    label: 'Active',
                    icon: Play,
                    color: 'bg-blue-500 text-blue-50',
                    dotColor: 'bg-blue-500'
                };
            case 2:
                return {
                    label: 'Completed',
                    icon: CheckCircle2,
                    color: 'bg-green-500 text-green-50',
                    dotColor: 'bg-green-500'
                };
            default:
                return {
                    label: 'Inactive',
                    icon: Circle,
                    color: 'bg-gray-500 text-gray-50',
                    dotColor: 'bg-gray-400'
                };
        }
    };

    const filteredUsers = users.filter(user => {
        // Filter by status
        if (statusFilter !== null) {
            const userStatus = getUserStatus(user);
            if (userStatus !== statusFilter) return false;
        }

        // Filter by search term
        if (searchTerm && !user.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !user.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        return true;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status === 'all' ? null : parseInt(status));
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleCheckboxChange = (user: User) => {
        if (multiSelect) {
            setSelectedUsers((prev) =>
                prev.some((u) => u.email === user.email)
                    ? prev.filter((u) => u.email !== user.email)
                    : [...prev, user]
            );
        } else {
            setSelectedUser(user);
            setSelectedUsers([user]);
        }
        setScheduleModalOpen(true);
    };

    const handleScheduleSubmit = async () => {
        if (!startTime || !endTime) {
            alert("Please enter both start and end time.");
            return;
        }

        const userEmails = multiSelect ? selectedUsers.map(user => user.email) : [selectedUser?.email];
        const scheduleData = {
            useremails: userEmails,
            scheduleStart: startTime,
            scheduleEnd: endTime,
        };

        try {
            const response = await fetch('/api/admin/users/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scheduleData),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Schedule saved successfully:', data);
            closeModal();
            fetchUsers();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule. Please try again.');
        }
    };

    const closeModal = () => {
        setSelectedUser(null);
        setSelectedUsers([]);
        setStartTime('');
        setEndTime('');
        setMultiSelect(false);
        setScheduleModalOpen(false);
    };

    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return email ? email.slice(0, 2).toUpperCase() : 'U';
    };

    const formatDateTime = (dateTime?: string) => {
        if (!dateTime) return 'N/A';
        return new Date(dateTime).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Stats calculation
    const activeUsers = users.filter(user => getUserStatus(user) === 1).length;
    const completedUsers = users.filter(user => getUserStatus(user) === 2).length;
    const inactiveUsers = users.filter(user => getUserStatus(user) === 0).length;

    return (
        <AdminLayout>
            <div className="space-y-6 p-6">
                {/* Header Section */}
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-systech-gradient rounded-lg">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">Candidate Management</h1>
                            <Sparkles className="h-5 w-5 text-systech-primary animate-pulse" />
                        </div>
                        <p className="text-muted-foreground">
                            Manage exam candidates and schedules with advanced controls
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setMultiSelect(!multiSelect)}
                            className={multiSelect ? 'bg-systech-primary text-white' : ''}
                        >
                            <Calendar className="h-4 w-4 mr-2" />
                            {multiSelect ? 'Exit Multi-Select' : 'Bulk Schedule'}
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
                                    <p className="text-2xl font-bold text-systech-primary">{users.length}</p>
                                </div>
                                <Users className="h-8 w-8 text-systech-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                                    <p className="text-2xl font-bold text-blue-600">{activeUsers}</p>
                                </div>
                                <Play className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold text-green-600">{completedUsers}</p>
                                </div>
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                                    <p className="text-2xl font-bold text-gray-500">{inactiveUsers}</p>
                                </div>
                                <Circle className="h-8 w-8 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Search */}
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                            <div className="flex flex-1 items-center space-x-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search candidates..."
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        className="pl-10 border-border/50 focus:border-systech-primary"
                                    />
                                </div>

                                <Select value={statusFilter?.toString() || 'all'} onValueChange={handleStatusFilter}>
                                    <SelectTrigger className="w-[180px] border-border/50">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="1">Active</SelectItem>
                                        <SelectItem value="0">Inactive</SelectItem>
                                        <SelectItem value="2">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                Showing {currentUsers.length} of {filteredUsers.length} candidates
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Table */}
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Candidates List
                        </CardTitle>
                        <CardDescription>
                            {multiSelect ? 'Select multiple candidates to schedule exams in bulk' : 'Click on inactive candidates to schedule exams'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="space-y-4 p-6">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <Skeleton className="h-12 w-12 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-[200px]" />
                                            <Skeleton className="h-3 w-[160px]" />
                                        </div>
                                        <Skeleton className="h-4 w-[100px]" />
                                        <Skeleton className="h-6 w-[80px] rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                                <p className="text-muted-foreground text-center">
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
                                        <TableHead>Schedule</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentUsers.map((user, index) => {
                                        const userStatus = getUserStatus(user);
                                        const statusInfo = getStatusInfo(userStatus);
                                        const StatusIcon = statusInfo.icon;
                                        const isSelectable = !user.is_active;

                                        return (
                                            <TableRow key={index} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
                                                            <AvatarFallback className="bg-systech-gradient text-white font-semibold">
                                                                {getInitials(user.name, user.email)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold text-foreground">
                                                                {user.name || 'Unknown'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-foreground">{user.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {user.is_active ? (
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                                <span className="font-medium">Start:</span>
                                                                <span>{formatDateTime(user.schedule_start)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                                <span className="font-medium">End:</span>
                                                                <span>{formatDateTime(user.schedule_end)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            {isSelectable && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleCheckboxChange(user)}
                                                                    className={`
                        px-3 py-2 rounded-full border-2 border-dashed transition-all duration-200 hover:scale-105
                        ${multiSelect && selectedUsers.some((u) => u.email === user.email)
                                                                            ? 'border-systech-primary bg-systech-primary/10 text-systech-primary'
                                                                            : selectedUser?.email === user.email
                                                                                ? 'border-systech-primary bg-systech-primary/10 text-systech-primary'
                                                                                : 'border-gray-300 text-muted-foreground hover:border-systech-primary hover:text-systech-primary'
                                                                        }
                    `}
                                                                >
                                                                    <CalendarClock className="h-4 w-4 mr-2" />
                                                                    <span className="text-sm font-medium">
                                                                        {(multiSelect && selectedUsers.some((u) => u.email === user.email)) ||
                                                                            selectedUser?.email === user.email
                                                                            ? 'Selected'
                                                                            : 'Schedule'
                                                                        }
                                                                    </span>
                                                                </Button>
                                                            )}
                                                            {!isSelectable && (
                                                                <span className="text-muted-foreground text-sm italic">Not available</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={`${statusInfo.color} border-0`}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {statusInfo.label}
                                                    </Badge>
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
                                                            {/* <DropdownMenuItem>
                                                                <Mail className="h-4 w-4 mr-2" />
                                                                Send Email
                                                            </DropdownMenuItem> */}
                                                            {/* <DropdownMenuSeparator /> */}
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
                    <Card className="border-border/50">
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
                                        <ChevronLeft className="h-4 w-4" />
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
                                                className={currentPage === pageNum ? 'bg-systech-primary' : ''}
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
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Schedule Modal */}
                <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <div className="p-2 bg-systech-gradient rounded-lg">
                                    <CalendarClock className="h-4 w-4 text-white" />
                                </div>
                                Schedule Exam
                            </DialogTitle>
                            <DialogDescription>
                                Set the exam schedule for selected candidate{multiSelect && selectedUsers.length > 1 ? 's' : ''}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Selected Candidate{multiSelect && selectedUsers.length > 1 ? 's' : ''}</Label>
                                <div className="p-3 bg-muted/50 rounded-lg border max-h-32 overflow-y-auto">
                                    {multiSelect ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUsers.map((user, i) => (
                                                <Badge key={i} variant="secondary" className="bg-systech-primary text-white">
                                                    {user.name || user.email}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser?.email}`} />
                                                <AvatarFallback className="bg-systech-gradient text-white text-xs">
                                                    {getInitials(selectedUser?.name, selectedUser?.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-sm">{selectedUser?.name || 'Unnamed Candidate'}</div>
                                                <div className="text-xs text-muted-foreground">{selectedUser?.email}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startTime" className="text-sm font-medium">
                                        Start Time
                                    </Label>
                                    <Input
                                        id="startTime"
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="border-border/50 focus:border-systech-primary"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="endTime" className="text-sm font-medium">
                                        End Time
                                    </Label>
                                    <Input
                                        id="endTime"
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="border-border/50 focus:border-systech-primary"
                                    />
                                </div>
                            </div>

                            {startTime && endTime && (
                                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                                        Exam Duration
                                    </div>
                                    <div className="text-xs text-green-600 dark:text-green-300">
                                        {Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))} minutes
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleScheduleSubmit}
                                className="bg-systech-gradient hover:opacity-90"
                                disabled={!startTime || !endTime}
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule Exam
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default UsersPage;