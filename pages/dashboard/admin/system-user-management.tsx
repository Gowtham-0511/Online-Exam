import React, { useEffect, useState } from 'react'
import AdminLayout from './layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Users,
    Search,
    Filter,
    Plus,
    MoreVertical,
    Clock,
    Mail,
    UserCheck,
    UserX,
    Grid3X3,
    List,
    Download,
    Sparkles
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface User {
    name?: string;
    email: string;
    is_active: boolean | number;
    schedule_start?: string;
    schedule_end?: string;
    role?: string;
}

const SystemUserPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/system-user');
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

    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return email ? email.slice(0, 2).toUpperCase() : 'U';
    };

    const formatTime = (time?: string) => {
        if (!time) return 'Not set';
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' ||
            (filterStatus === 'active' && (user.is_active === true || user.is_active === 1)) ||
            (filterStatus === 'inactive' && (user.is_active === false || user.is_active === 0 || user.is_active === null));
        return matchesSearch && matchesFilter;
    });

    console.log(users);

    const activeUsers = users.filter(user => user.is_active === true || user.is_active === 1).length;
    const inactiveUsers = users.filter(user => user.is_active === false || user.is_active === 0 || user.is_active === null).length;

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setNewRole(user.role || '');
        setEditModalOpen(true);
    };

    const handleSaveRole = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(`/api/admin/system-user/${selectedUser.email}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role: newRole
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update user role');
            }

            // Update local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.email === selectedUser.email
                        ? { ...user, role: newRole }
                        : user
                )
            );

            setEditModalOpen(false);
            setSelectedUser(null);
            setNewRole('');
        } catch (error) {
            console.error('Failed to update user role:', error);
        }
    };

    const UserCard = ({ user }: { user: User }) => {
        const isActive = user.is_active === true || user.is_active === 1;

        return (
            <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-border/50 hover:border-systech-primary/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12 ring-2 ring-systech-primary/20">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
                                <AvatarFallback className="bg-systech-gradient text-white font-semibold">
                                    {getInitials(user.name, user.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-lg group-hover:text-systech-primary transition-colors">
                                    {user.name || 'Unnamed User'}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                </CardDescription>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem>
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                    {isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status</span>
                            <Badge
                                variant={isActive ? "default" : "secondary"}
                                className={isActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}
                            >
                                {isActive ? (
                                    <>
                                        <UserCheck className="h-3 w-3 mr-1" />
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <UserX className="h-3 w-3 mr-1" />
                                        Inactive
                                    </>
                                )}
                            </Badge>
                            <span className="text-sm font-medium">Role</span>
                            <Badge
                                variant={isActive ? "default" : "secondary"}
                                className={isActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}
                            >
                                {isActive ? (
                                    <>
                                        <UserCheck className="h-3 w-3 mr-1" />
                                        {user.role || 'No Role Assigned'}
                                    </>
                                ) : (
                                    <>
                                        <UserX className="h-3 w-3 mr-1" />
                                        {user.role || 'No Role Assigned'}
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const UserListItem = ({ user }: { user: User }) => {
        const isActive = user.is_active === true || user.is_active === 1;

        return (
            <Card className="hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
                                <AvatarFallback className="bg-systech-gradient text-white">
                                    {getInitials(user.name, user.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-foreground">
                                        {user.name || 'Unnamed User'}
                                    </h3>
                                    <Badge
                                        variant={isActive ? "default" : "secondary"}
                                        className={`${isActive ? "bg-green-500" : "bg-gray-500"} text-xs`}
                                    >
                                        {isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem>
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive">
                                        {isActive ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

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
                            <h1 className="text-3xl font-bold text-foreground">System Users</h1>
                            <Sparkles className="h-5 w-5 text-systech-primary animate-pulse" />
                        </div>
                        <p className="text-muted-foreground">
                            Manage and monitor your system users with advanced controls
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button className="bg-systech-gradient hover:opacity-90">
                            <Plus className="h-4 w-4 mr-2" />
                            Add User
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
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
                                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                                    <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
                                </div>
                                <UserCheck className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Inactive Users</p>
                                    <p className="text-2xl font-bold text-gray-500">{inactiveUsers}</p>
                                </div>
                                <UserX className="h-8 w-8 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Controls */}
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                            <div className="flex flex-1 items-center space-x-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 border-border/50 focus:border-systech-primary"
                                    />
                                </div>

                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-[180px] border-border/50">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        <SelectItem value="active">Active Only</SelectItem>
                                        <SelectItem value="inactive">Inactive Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className={viewMode === 'grid' ? 'bg-systech-primary' : ''}
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className={viewMode === 'list' ? 'bg-systech-primary' : ''}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Display */}
                {loading ? (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="border-border/50">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center space-x-3">
                                        <Skeleton className="h-12 w-12 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[120px]" />
                                            <Skeleton className="h-3 w-[160px]" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-16 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <Card className="border-border/50">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No users found</h3>
                            <p className="text-muted-foreground text-center">
                                {searchQuery || filterStatus !== 'all'
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'Get started by adding your first system user'
                                }
                            </p>
                            {!searchQuery && filterStatus === 'all' && (
                                <Button className="mt-4 bg-systech-gradient">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First User
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {filteredUsers.map((user, index) => (
                            viewMode === 'grid' ? (
                                <UserCard key={`${user.email}-${index}`} user={user} />
                            ) : (
                                <UserListItem key={`${user.email}-${index}`} user={user} />
                            )
                        ))}
                    </div>
                )}

                {/* Edit User Role Modal */}
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <div className="p-2 bg-systech-gradient rounded-lg">
                                    <Users className="h-4 w-4 text-white" />
                                </div>
                                Edit User Role
                            </DialogTitle>
                            <DialogDescription>
                                Update the role for {selectedUser?.name || selectedUser?.email}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="user-info" className="text-sm font-medium">
                                    User Information
                                </Label>
                                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser?.email}`} />
                                        <AvatarFallback className="bg-systech-gradient text-white">
                                            {getInitials(selectedUser?.name, selectedUser?.email)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{selectedUser?.name || 'Unnamed User'}</div>
                                        <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-sm font-medium">
                                    User Role
                                </Label>
                                <Select value={newRole} onValueChange={setNewRole}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="examiner">Examiner</SelectItem>
                                        <SelectItem value="attender">Attender</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedUser?.role && (
                                <div className="text-xs text-muted-foreground">
                                    Current role: <span className="font-medium capitalize">{selectedUser.role}</span>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setEditModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveRole}
                                className="bg-systech-gradient hover:opacity-90"
                                disabled={!newRole}
                            >
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    )
}

export default SystemUserPage