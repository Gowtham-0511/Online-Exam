import React, { useEffect, useState } from 'react'
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
    Mail,
    UserCheck,
    UserX,
    Grid3X3,
    List,
    Download,
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
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout'

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

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' ||
            (filterStatus === 'active' && (user.is_active === true || user.is_active === 1)) ||
            (filterStatus === 'inactive' && (user.is_active === false || user.is_active === 0 || user.is_active === null));
        return matchesSearch && matchesFilter;
    });

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
            const response = await fetch(`/api/admin/update-user/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: selectedUser.email,
                    role: newRole
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update user role');
            }

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
            <Card className="group hover:shadow-md transition-all border-border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-border">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                    {getInitials(user.name, user.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base group-hover:text-primary transition-colors">
                                    {user.name || 'Unnamed User'}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1 text-xs">
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
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Status</span>
                            <Badge
                                variant={isActive ? "default" : "secondary"}
                                className="text-xs"
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
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Role</span>
                            <Badge variant="outline" className="text-xs capitalize">
                                {user.role || 'No Role'}
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
            <Card className="hover:shadow-sm transition-all border-border">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-9 w-9 border-2 border-border">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {getInitials(user.name, user.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-sm text-foreground">
                                        {user.name || 'Unnamed User'}
                                    </h3>
                                    <Badge
                                        variant={isActive ? "default" : "secondary"}
                                        className="text-xs"
                                    >
                                        {isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {user.role || 'No Role'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>

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
                </CardContent>
            </Card>
        );
    };

    return (
        <UnifiedDashboardLayout role="admin">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">System Users</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage and monitor your system users
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add User
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Total Users</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Active Users</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{activeUsers}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Inactive Users</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{inactiveUsers}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                                    <UserX className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Controls */}
                <Card className="border-border">
                    <CardContent className="p-4">
                        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                            <div className="flex flex-1 items-center gap-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-[180px]">
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

                            <div className="flex items-center gap-2">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className="px-3"
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className="px-3"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Display */}
                {loading ? (
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="border-border">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[120px]" />
                                            <Skeleton className="h-3 w-[160px]" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-16 w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <Card className="border-2 border-dashed border-border">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No users found</h3>
                            <p className="text-muted-foreground text-sm text-center mb-4">
                                {searchQuery || filterStatus !== 'all'
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'Get started by adding your first system user'
                                }
                            </p>
                            {!searchQuery && filterStatus === 'all' && (
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First User
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
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
                            <DialogTitle>Edit User Role</DialogTitle>
                            <DialogDescription>
                                Update the role for {selectedUser?.name || selectedUser?.email}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    User Information
                                </Label>
                                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser?.email}`} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                            {getInitials(selectedUser?.name, selectedUser?.email)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-sm">{selectedUser?.name || 'Unnamed User'}</div>
                                        <div className="text-xs text-muted-foreground">{selectedUser?.email}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
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
                                disabled={!newRole}
                            >
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </UnifiedDashboardLayout>
    )
}

export default SystemUserPage