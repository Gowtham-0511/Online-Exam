"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    Plus,
    Users,
    Search,
    Filter,
    Check,
    X,
    UserPlus,
    Building2,
    Mail,
    Calendar,
    MoreHorizontal,
    Edit2,
    Trash2,
    Briefcase,
    UserCircle,
    Globe
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Employee {
    Id: string
    Name: string
    Email: string
    Department: string
    Position: string
    Avatar?: string
    isSelected?: boolean
}

interface ExternalUser {
    id: string
    name: string
    email: string
    role: string
    created_at: string
    updated_at: string
}

interface Batch {
    id: string
    name: string
    createdAt: string
    employeeCount: number
    employees: Employee[]
}

interface NotificationState {
    type: 'success' | 'error'
    message: string
}

const BatchManagementPage: React.FC = () => {
    const [batchName, setBatchName] = useState<string>('')
    const [employees, setEmployees] = useState<Employee[]>([])
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
    const [batches, setBatches] = useState<Batch[]>([])
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [notification, setNotification] = useState<NotificationState | null>(null)

    const [selectedBatchForView, setSelectedBatchForView] = useState<Batch | null>(null)
    const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState<boolean>(false)

    const [selectedBatchForEdit, setSelectedBatchForEdit] = useState<Batch | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false)
    const [editBatchName, setEditBatchName] = useState<string>('')
    const [editSelectedEmployees, setEditSelectedEmployees] = useState<Set<string>>(new Set())

    const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([])
    const [showExternalUsers, setShowExternalUsers] = useState<boolean>(false)

    const toCamelCase = (str: string) => {
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word: string, index: number) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase();
            })
            .replace(/\s+/g, '')
            .replace(/[_-]/g, '');
    };

    const convertKeysToCamelCase = (obj: any[] | null): any => {
        if (Array.isArray(obj)) {
            return obj.map(convertKeysToCamelCase);
        } else if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((result: { [key: string]: any }, key) => {
                const camelKey = toCamelCase(key);
                result[camelKey] = convertKeysToCamelCase(obj[key]);
                return result;
            }, {} as { [key: string]: any });
        }
        return obj;
    };

    useEffect(() => {
        const getEmployee = async () => {
            try {
                const res = await fetch('/api/admin/employee', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    credentials: 'same-origin'
                });

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();
                setEmployees(data || []);
            } catch (error) {
                console.error('Error fetching employees:', error);
                setEmployees([]);
            }
        };

        const getExternalUsers = async () => {
            try {
                const res = await fetch('/api/admin/external-users', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    credentials: 'same-origin'
                });

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();
                setExternalUsers(data.recordset || data || []);
            } catch (error) {
                console.error('Error fetching external users:', error);
                setExternalUsers([]);
            }
        };
        getExternalUsers();

        const getBatch = async () => {
            try {
                const res = await fetch('/api/admin/batch', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    credentials: 'same-origin'
                })

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();

                let camelCaseData = convertKeysToCamelCase(data);

                camelCaseData = camelCaseData.map((batch: { employees: string | any[] }) => ({
                    ...batch,
                    employees: typeof batch.employees === 'string'
                        ? JSON.parse(batch.employees)
                        : (Array.isArray(batch.employees) ? batch.employees : [])
                }));

                setBatches(camelCaseData);
            } catch (error) {
                console.error('Error fetching batch:', error);
                setBatches([]);
            }
        }

        getBatch();
        getEmployee();
    }, []);

    const departments = Array.from(new Set([
        ...employees.map(emp => emp.Department),
        ...externalUsers.map(user => user.role)
    ]))

    const displayUsers = showExternalUsers
        ? externalUsers.map(user => ({
            Id: user.id,
            Name: user.name,
            Email: user.email,
            Department: user.role,
            Position: user.role
        }))
        : employees;

    const filteredEmployees = displayUsers.filter(user => {
        const matchesSearch = user.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.Email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesDepartment = departmentFilter === 'all' || user.Department === departmentFilter
        return matchesSearch && matchesDepartment
    })

    const handleEmployeeToggle = (employeeId: string) => {
        const newSelected = new Set(selectedEmployees)
        if (newSelected.has(employeeId)) {
            newSelected.delete(employeeId)
        } else {
            newSelected.add(employeeId)
        }
        setSelectedEmployees(newSelected)
    }

    const handleSelectAll = () => {
        if (selectedEmployees.size === filteredEmployees.length) {
            setSelectedEmployees(new Set())
        } else {
            setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.Id)))
        }
    }

    const handleCreateBatch = async () => {
        if (!batchName.trim()) {
            setNotification({ type: 'error', message: 'Please enter a batch name' })
            setTimeout(() => setNotification(null), 5000)
            return
        }

        if (selectedEmployees.size === 0) {
            setNotification({ type: 'error', message: 'Please select at least one employee' })
            setTimeout(() => setNotification(null), 5000)
            return
        }

        setIsLoading(true)

        try {
            await new Promise(resolve => setTimeout(resolve, 1500))

            const selectedUsersList = showExternalUsers
                ? externalUsers
                    .filter(user => selectedEmployees.has(user.id))
                    .map(user => ({
                        Id: user.id,
                        Name: user.name,
                        Email: user.email,
                        Department: user.role,
                        Position: user.role
                    }))
                : employees.filter(emp => selectedEmployees.has(emp.Id));

            const newBatch: Batch = {
                id: Date.now().toString(),
                name: batchName,
                createdAt: new Date().toISOString(),
                employeeCount: selectedEmployees.size,
                employees: selectedUsersList
            }

            const response = await fetch('/api/admin/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newBatch)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const createdBatch = await response.json()

            const convertedBatch = {
                id: createdBatch.Id,
                name: createdBatch.Name,
                createdAt: createdBatch.CreatedAt,
                employeeCount: createdBatch.EmployeeCount,
                employees: typeof createdBatch.Employees === 'string'
                    ? JSON.parse(createdBatch.Employees)
                    : createdBatch.Employees
            }

            setBatches(prev => [convertedBatch, ...prev])
            setBatchName('')
            setSelectedEmployees(new Set())
            setIsCreateDialogOpen(false)

            setNotification({
                type: 'success',
                message: `Batch "${batchName}" created successfully with ${selectedEmployees.size} ${showExternalUsers ? 'external users' : 'employees'}`
            })
            setTimeout(() => setNotification(null), 5000)
        } catch (error) {
            setNotification({ type: 'error', message: 'Failed to create batch. Please try again.' })
            setTimeout(() => setNotification(null), 5000)
        } finally {
            setIsLoading(false)
        }
    }

    const getInitials = (name: string): string => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    const handleViewDetails = (batch: Batch) => {
        setSelectedBatchForView(batch)
        setIsViewDetailsDialogOpen(true)
    }

    const handleEditBatch = (batch: Batch) => {
        setSelectedBatchForEdit(batch)
        setEditBatchName(batch.name)
        setEditSelectedEmployees(new Set(batch.employees.map(emp => emp.Id)))
        setIsEditDialogOpen(true)
    }

    const handleEditEmployeeToggle = (employeeId: string) => {
        const newSelected = new Set(editSelectedEmployees)
        if (newSelected.has(employeeId)) {
            newSelected.delete(employeeId)
        } else {
            newSelected.add(employeeId)
        }
        setEditSelectedEmployees(newSelected)
    }

    const handleEditSelectAll = () => {
        if (editSelectedEmployees.size === filteredEmployees.length) {
            setEditSelectedEmployees(new Set())
        } else {
            setEditSelectedEmployees(new Set(filteredEmployees.map(emp => emp.Id)))
        }
    }

    const handleUpdateBatch = async () => {
        if (!editBatchName.trim()) {
            setNotification({ type: 'error', message: 'Please enter a batch name' })
            setTimeout(() => setNotification(null), 5000)
            return
        }

        if (editSelectedEmployees.size === 0) {
            setNotification({ type: 'error', message: 'Please select at least one employee' })
            setTimeout(() => setNotification(null), 5000)
            return
        }

        setIsLoading(true)

        try {
            await new Promise(resolve => setTimeout(resolve, 1500))

            const selectedUsersList = showExternalUsers
                ? externalUsers
                    .filter(user => editSelectedEmployees.has(user.id))
                    .map(user => ({
                        Id: user.id,
                        Name: user.name,
                        Email: user.email,
                        Department: user.role,
                        Position: user.role
                    }))
                : employees.filter(emp => editSelectedEmployees.has(emp.Id));

            const updatedBatch: Batch = {
                ...selectedBatchForEdit!,
                name: editBatchName,
                employeeCount: editSelectedEmployees.size,
                employees: selectedUsersList
            }

            const response = await fetch(`/api/admin/batch/${selectedBatchForEdit!.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedBatch)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const updatedBatchResponse = await response.json()

            setBatches(prev => prev.map(batch =>
                batch.id === selectedBatchForEdit!.id ? updatedBatchResponse : batch
            ))

            setEditBatchName('')
            setEditSelectedEmployees(new Set())
            setSelectedBatchForEdit(null)
            setIsEditDialogOpen(false)

            setNotification({
                type: 'success',
                message: `Batch "${editBatchName}" updated successfully with ${editSelectedEmployees.size} ${showExternalUsers ? 'external users' : 'employees'}`
            })
            setTimeout(() => setNotification(null), 5000)
        } catch (error) {
            setNotification({ type: 'error', message: 'Failed to update batch. Please try again.' })
            setTimeout(() => setNotification(null), 5000)
        } finally {
            setIsLoading(false)
        }
    }

    return (


        <div className="space-y-6 animate-in fade-in duration-500">
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
                        Batch Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Organize and manage employee groups for assessments
                    </p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="shadow-lg hover:shadow-primary/20 transition-all duration-300 bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-5 w-5" />
                            Create New Batch
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-2 border-b bg-muted/30">
                            <DialogTitle className="flex items-center text-xl">
                                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                                    <UserPlus className="h-5 w-5 text-primary" />
                                </div>
                                Create New Batch
                            </DialogTitle>
                            <DialogDescription>
                                Create a new batch and assign employees from your directory
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* User Type Toggle */}
                            <div className="flex justify-center">
                                <div className="inline-flex items-center p-1 rounded-lg border bg-muted/50">
                                    <Button
                                        type="button"
                                        variant={!showExternalUsers ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setShowExternalUsers(false)}
                                        className="w-32"
                                    >
                                        <Building2 className="w-4 h-4 mr-2" />
                                        Internal
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={showExternalUsers ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setShowExternalUsers(true)}
                                        className="w-32"
                                    >
                                        <Globe className="w-4 h-4 mr-2" />
                                        External
                                    </Button>
                                </div>
                            </div>

                            {/* Batch Name Input */}
                            <div className="space-y-2">
                                <Label htmlFor="batchName">Batch Name</Label>
                                <Input
                                    id="batchName"
                                    placeholder="e.g., Q4 2024 Engineering Batch"
                                    value={batchName}
                                    onChange={(e) => setBatchName(e.target.value)}
                                    className="h-11"
                                />
                            </div>

                            <Separator />

                            {/* Employee Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold flex items-center text-muted-foreground uppercase tracking-wider">
                                        Select Members
                                    </h3>
                                    <Badge variant="secondary" className="px-3 py-1">
                                        {selectedEmployees.size} selected
                                    </Badge>
                                </div>

                                {/* Search and Filter */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Select
                                        value={departmentFilter}
                                        onValueChange={setDepartmentFilter}
                                    >
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map(dept => (
                                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Select All */}
                                <div className="flex items-center space-x-2 p-3 rounded-lg border border-dashed bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <Checkbox
                                        id="selectAll"
                                        checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                                        onCheckedChange={handleSelectAll}
                                    />
                                    <Label htmlFor="selectAll" className="font-medium cursor-pointer flex-1">
                                        Select All ({filteredEmployees.length} available)
                                    </Label>
                                </div>

                                {/* Employee List */}
                                <ScrollArea className="h-[300px] rounded-lg border bg-background">
                                    <div className="p-2 space-y-1">
                                        {filteredEmployees.map((employee) => (
                                            <div
                                                key={employee.Id}
                                                className={`group flex items-center space-x-4 p-3 rounded-md border transition-all duration-200 cursor-pointer ${selectedEmployees.has(employee.Id)
                                                    ? 'bg-primary/5 border-primary/20'
                                                    : 'border-transparent hover:bg-muted/50'
                                                    }`}
                                                onClick={() => handleEmployeeToggle(employee.Id)}
                                            >
                                                <Checkbox
                                                    checked={selectedEmployees.has(employee.Id)}
                                                    onCheckedChange={() => handleEmployeeToggle(employee.Id)}
                                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                                <Avatar className="h-10 w-10 border">
                                                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                        {getInitials(employee.Name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-sm truncate">{employee.Name}</p>
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                                                            {employee.Department}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                                        <Mail className="h-3 w-3 mr-1" />
                                                        <span className="truncate">{employee.Email}</span>
                                                    </div>
                                                </div>
                                                {selectedEmployees.has(employee.Id) && (
                                                    <Check className="h-4 w-4 text-primary animate-in zoom-in duration-200" />
                                                )}
                                            </div>
                                        ))}
                                        {filteredEmployees.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                <Users className="h-10 w-10 mb-3 opacity-20" />
                                                <p className="text-sm">No users found</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                        <DialogFooter className="p-6 border-t bg-muted/30">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateBatch}
                                disabled={!batchName.trim() || selectedEmployees.size === 0 || isLoading}
                                className="min-w-[140px]"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Batch
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Batches</p>
                            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{batches.length}</h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                            <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                                {batches.reduce((acc, curr) => acc + (curr.employeeCount || 0), 0)}
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg. Batch Size</p>
                            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                {batches.length > 0 ? Math.round(batches.reduce((acc, curr) => acc + (curr.employeeCount || 0), 0) / batches.length) : 0}
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <UserCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Batches Grid */}
            {batches.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="rounded-full bg-muted p-6 animate-in zoom-in duration-500">
                            <Users className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="text-center space-y-2 max-w-md">
                            <h3 className="text-xl font-semibold">No batches created yet</h3>
                            <p className="text-muted-foreground">
                                Create your first batch to start organizing employees for training, projects, or other activities.
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            size="lg"
                            className="mt-4"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Create Your First Batch
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {batches.map((batch, index) => (
                        <Card
                            key={batch.id}
                            className="group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                                            {batch.name}
                                        </CardTitle>
                                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>Created {new Date(batch.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-background">
                                        {batch.employeeCount} members
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Team Preview</span>
                                        <span>View All</span>
                                    </div>
                                    <div className="flex -space-x-2 overflow-hidden py-1">
                                        {(batch.employees || []).slice(0, 5).map((employee) => (
                                            <Avatar key={employee.Id} className="h-8 w-8 border-2 border-background ring-1 ring-muted transition-transform hover:scale-110 hover:z-10">
                                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                                    {getInitials(employee.Name)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                        {(batch.employees?.length || 0) > 5 && (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-muted">
                                                +{(batch.employees?.length || 0) - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(batch)} className="w-full">
                                        View Details
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEditBatch(batch)} className="w-full hover:bg-primary/5 hover:text-primary">
                                        <Edit2 className="w-3 h-3 mr-2" />
                                        Edit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* View Details Dialog */}
            <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="flex items-center text-xl">
                            <Users className="mr-3 h-5 w-5 text-primary" />
                            {selectedBatchForView?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Batch Details & Members List
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBatchForView && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="grid grid-cols-2 gap-4 p-6 bg-muted/20">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Created Date</p>
                                    <p className="font-medium flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                                        {new Date(selectedBatchForView.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Members</p>
                                    <p className="font-medium flex items-center">
                                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                        {selectedBatchForView.employeeCount} employees
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                                    Members List
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedBatchForView.employees.map((employee) => (
                                        <div
                                            key={employee.Id}
                                            className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                        >
                                            <Avatar className="h-10 w-10 border">
                                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                    {getInitials(employee.Name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{employee.Name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{employee.Email}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">
                                                        {employee.Department}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="p-4 border-t bg-muted/10">
                        <Button
                            variant="outline"
                            onClick={() => setIsViewDetailsDialogOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Batch Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b bg-muted/30">
                        <DialogTitle className="flex items-center text-xl">
                            <div className="p-2 bg-primary/10 rounded-lg mr-3">
                                <Edit2 className="h-5 w-5 text-primary" />
                            </div>
                            Edit Batch
                        </DialogTitle>
                        <DialogDescription>
                            Update batch name and modify employee assignments
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Batch Name Input */}
                        <div className="space-y-2">
                            <Label htmlFor="editBatchName">Batch Name</Label>
                            <Input
                                id="editBatchName"
                                value={editBatchName}
                                onChange={(e) => setEditBatchName(e.target.value)}
                                className="h-11"
                            />
                        </div>

                        <Separator />

                        {/* Employee Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold flex items-center text-muted-foreground uppercase tracking-wider">
                                    Manage Members
                                </h3>
                                <Badge variant="secondary" className="px-3 py-1">
                                    {editSelectedEmployees.size} selected
                                </Badge>
                            </div>

                            {/* Search and Filter */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search employees..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select
                                    value={departmentFilter}
                                    onValueChange={setDepartmentFilter}
                                >
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map(dept => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Select All */}
                            <div className="flex items-center space-x-2 p-3 rounded-lg border border-dashed bg-muted/20 hover:bg-muted/40 transition-colors">
                                <Checkbox
                                    id="editSelectAll"
                                    checked={editSelectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                                    onCheckedChange={handleEditSelectAll}
                                />
                                <Label htmlFor="editSelectAll" className="font-medium cursor-pointer flex-1">
                                    Select All ({filteredEmployees.length} available)
                                </Label>
                            </div>

                            {/* Employee List */}
                            <ScrollArea className="h-[300px] rounded-lg border bg-background">
                                <div className="p-2 space-y-1">
                                    {filteredEmployees.map((employee) => (
                                        <div
                                            key={employee.Id}
                                            className={`group flex items-center space-x-4 p-3 rounded-md border transition-all duration-200 cursor-pointer ${editSelectedEmployees.has(employee.Id)
                                                ? 'bg-primary/5 border-primary/20'
                                                : 'border-transparent hover:bg-muted/50'
                                                }`}
                                            onClick={() => handleEditEmployeeToggle(employee.Id)}
                                        >
                                            <Checkbox
                                                checked={editSelectedEmployees.has(employee.Id)}
                                                onCheckedChange={() => handleEditEmployeeToggle(employee.Id)}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <Avatar className="h-10 w-10 border">
                                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                    {getInitials(employee.Name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-medium text-sm truncate">{employee.Name}</p>
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                                                        {employee.Department}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                                    <Mail className="h-3 w-3 mr-1" />
                                                    <span className="truncate">{employee.Email}</span>
                                                </div>
                                            </div>
                                            {editSelectedEmployees.has(employee.Id) && (
                                                <Check className="h-4 w-4 text-primary animate-in zoom-in duration-200" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t bg-muted/30">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateBatch}
                            disabled={!editBatchName.trim() || editSelectedEmployees.size === 0 || isLoading}
                            className="min-w-[140px]"
                        >
                            {isLoading ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Update Batch
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default BatchManagementPage