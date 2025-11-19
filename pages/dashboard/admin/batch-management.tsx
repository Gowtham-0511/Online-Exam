import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Users, Search, Filter, Check, X, UserPlus, Building2, Mail, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout'
import Head from 'next/head'

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

    // Helper function to convert object keys to camelCase
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
                console.log('Employee data:', data);
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
                console.log('External users data:', data);
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

            // Get selected users from the appropriate list
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
            console.log(batches);
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

            // Get selected users from the appropriate list
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
        <UnifiedDashboardLayout role="admin">
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
                {/* Notification Alert */}
                {notification && (
                    <div className="fixed top-4 right-4 z-50 w-96">
                        <Alert className={`border-0 shadow-lg ${notification.type === 'success'
                            ? 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
                            }`}>
                            {notification.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                            <AlertDescription className={`${notification.type === 'success'
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-red-800 dark:text-red-200'
                                }`}>
                                {notification.message}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                <div className="container mx-auto p-6 space-y-8">
                    {/* Header */}
                    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Batch Management
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                Create and manage employee batches for SysRank operations
                            </p>
                        </div>

                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300">
                                    <Plus className="mr-2 h-5 w-5" />
                                    Create New Batch
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center text-2xl">
                                        <UserPlus className="mr-3 h-6 w-6 text-primary" />
                                        Create New Batch
                                    </DialogTitle>
                                    <DialogDescription>
                                        Create a new batch and assign employees from your Azure AD directory
                                    </DialogDescription>
                                </DialogHeader>

                                {/* User Type Toggle */}
                                <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                                    <Button
                                        type="button"
                                        variant={!showExternalUsers ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setShowExternalUsers(false)}
                                        className="flex-1"
                                    >
                                        Internal Users
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={showExternalUsers ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setShowExternalUsers(true)}
                                        className="flex-1"
                                    >
                                        External Users
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {/* Batch Name Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="batchName" className="text-base font-medium">
                                            Batch Name
                                        </Label>
                                        <Input
                                            id="batchName"
                                            placeholder="Enter batch name (e.g., Q4 2024 Training Batch)"
                                            value={batchName}
                                            onChange={(e) => setBatchName(e.target.value)}
                                            className="text-base"
                                        />
                                    </div>

                                    <Separator />

                                    {/* Employee Selection */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <Users className="mr-2 h-5 w-5 text-primary" />
                                                Select Employees
                                            </h3>
                                            <Badge variant="secondary" className="text-sm">
                                                {selectedEmployees.size} selected
                                            </Badge>
                                        </div>

                                        {/* Search and Filter */}
                                        <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search employees..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Filter className="h-4 w-4 text-muted-foreground" />
                                                <select
                                                    value={departmentFilter}
                                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[180px]"
                                                >
                                                    <option value="all">All Departments</option>
                                                    {departments.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Select All */}
                                        <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                                            <Checkbox
                                                id="selectAll"
                                                checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                                                onCheckedChange={handleSelectAll}
                                            />
                                            <Label htmlFor="selectAll" className="font-medium cursor-pointer">
                                                Select All ({filteredEmployees.length} employees)
                                            </Label>
                                        </div>

                                        {/* Employee List */}
                                        <ScrollArea className="h-[300px] rounded-lg border">
                                            <div className="space-y-2 p-4">
                                                {filteredEmployees.map((employee) => (
                                                    <div
                                                        key={employee.Id}
                                                        className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${selectedEmployees.has(employee.Id)
                                                            ? 'bg-primary/5 border-primary/20 shadow-sm'
                                                            : 'bg-card hover:bg-muted/50'
                                                            }`}
                                                        onClick={() => handleEmployeeToggle(employee.Id)}
                                                    >
                                                        <Checkbox
                                                            checked={selectedEmployees.has(employee.Id)}
                                                            onCheckedChange={() => handleEmployeeToggle(employee.Id)}
                                                        />
                                                        <Avatar className="h-12 w-12">
                                                            {/* <AvatarImage src={employee.Avatar} alt={employee.Name} /> */}
                                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                                {getInitials(employee.Name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center space-x-2">
                                                                <p className="font-medium text-foreground">{employee.Name}</p>
                                                                {/* <Badge variant="outline" className="text-xs">
                                                                    {employee.Department}
                                                                </Badge> */}
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                <div className="flex items-center space-x-1">
                                                                    <Mail className="h-3 w-3" />
                                                                    <span>{employee.Email}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                <div className="flex items-center space-x-1">
                                                                    <Building2 className="h-3 w-3" />
                                                                    <span>{employee.Position}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                <Badge variant="outline" className="flex items-center space-x-1">
                                                                    <span>{employee.Department}</span>
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        {selectedEmployees.has(employee.Id) && (
                                                            <div className="text-primary">
                                                                <Check className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {filteredEmployees.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                                        <p>No employees found matching your criteria</p>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>

                                <DialogFooter className="flex-col space-y-2 md:flex-row md:space-y-0">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsCreateDialogOpen(false)}
                                        className="w-full md:w-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateBatch}
                                        disabled={!batchName.trim() || selectedEmployees.size === 0 || isLoading}
                                        className="w-full md:w-auto"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Batch ({selectedEmployees.size} employees)
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center text-2xl">
                                        <Users className="mr-3 h-6 w-6 text-primary" />
                                        {selectedBatchForView?.name}
                                    </DialogTitle>
                                    <DialogDescription>
                                        View all employees in this batch
                                    </DialogDescription>
                                </DialogHeader>

                                {selectedBatchForView && (
                                    <div className="space-y-6">
                                        {/* Batch Info */}
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">Created</p>
                                                <p className="font-medium">{new Date(selectedBatchForView.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-sm text-muted-foreground">Total Members</p>
                                                <p className="font-medium">{selectedBatchForView.employeeCount} employees</p>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Employee List */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <Users className="mr-2 h-5 w-5 text-primary" />
                                                Batch Members
                                            </h3>

                                            <ScrollArea className="h-[400px] rounded-lg border">
                                                <div className="space-y-2 p-4">
                                                    {selectedBatchForView.employees.map((employee) => (
                                                        <div
                                                            key={employee.Id}
                                                            className="flex items-center space-x-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all duration-200"
                                                        >
                                                            <Avatar className="h-12 w-12">
                                                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                                    {getInitials(employee.Name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 space-y-1">
                                                                <p className="font-medium text-foreground">{employee.Name}</p>
                                                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                    <div className="flex items-center space-x-1">
                                                                        <Mail className="h-3 w-3" />
                                                                        <span>{employee.Email}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                    <div className="flex items-center space-x-1">
                                                                        <Building2 className="h-3 w-3" />
                                                                        <span>{employee.Position}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                    <Badge variant="outline" className="flex items-center space-x-1">
                                                                        <span>{employee.Department}</span>
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {selectedBatchForView.employees.length === 0 && (
                                                        <div className="text-center py-8 text-muted-foreground">
                                                            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                                            <p>No employees in this batch</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsViewDetailsDialogOpen(false)}
                                        className="w-full md:w-auto"
                                    >
                                        Close
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center text-2xl">
                                        <UserPlus className="mr-3 h-6 w-6 text-primary" />
                                        Edit Batch
                                    </DialogTitle>
                                    <DialogDescription>
                                        Update batch name and modify employee assignments
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6">
                                    {/* Batch Name Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="editBatchName" className="text-base font-medium">
                                            Batch Name
                                        </Label>
                                        <Input
                                            id="editBatchName"
                                            placeholder="Enter batch name"
                                            value={editBatchName}
                                            onChange={(e) => setEditBatchName(e.target.value)}
                                            className="text-base"
                                        />
                                    </div>

                                    <Separator />

                                    {/* Employee Selection */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <Users className="mr-2 h-5 w-5 text-primary" />
                                                Select Employees
                                            </h3>
                                            <Badge variant="secondary" className="text-sm">
                                                {editSelectedEmployees.size} selected
                                            </Badge>
                                        </div>

                                        {/* Search and Filter */}
                                        <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search employees..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Filter className="h-4 w-4 text-muted-foreground" />
                                                <select
                                                    value={departmentFilter}
                                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[180px]"
                                                >
                                                    <option value="all">All Departments</option>
                                                    {departments.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Select All */}
                                        <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/30">
                                            <Checkbox
                                                id="editSelectAll"
                                                checked={editSelectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                                                onCheckedChange={handleEditSelectAll}
                                            />
                                            <Label htmlFor="editSelectAll" className="font-medium cursor-pointer">
                                                Select All ({filteredEmployees.length} employees)
                                            </Label>
                                        </div>

                                        {/* Employee List */}
                                        <ScrollArea className="h-[300px] rounded-lg border">
                                            <div className="space-y-2 p-4">
                                                {filteredEmployees.map((employee) => (
                                                    <div
                                                        key={employee.Id}
                                                        className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${editSelectedEmployees.has(employee.Id)
                                                            ? 'bg-primary/5 border-primary/20 shadow-sm'
                                                            : 'bg-card hover:bg-muted/50'
                                                            }`}
                                                        onClick={() => handleEditEmployeeToggle(employee.Id)}
                                                    >
                                                        <Checkbox
                                                            checked={editSelectedEmployees.has(employee.Id)}
                                                            onCheckedChange={() => handleEditEmployeeToggle(employee.Id)}
                                                        />
                                                        <Avatar className="h-12 w-12">
                                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                                {getInitials(employee.Name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center space-x-2">
                                                                <p className="font-medium text-foreground">{employee.Name}</p>
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                <div className="flex items-center space-x-1">
                                                                    <Mail className="h-3 w-3" />
                                                                    <span>{employee.Email}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                <div className="flex items-center space-x-1">
                                                                    <Building2 className="h-3 w-3" />
                                                                    <span>{employee.Position}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                                <Badge variant="outline" className="flex items-center space-x-1">
                                                                    <span>{employee.Department}</span>
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        {editSelectedEmployees.has(employee.Id) && (
                                                            <div className="text-primary">
                                                                <Check className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {filteredEmployees.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                                        <p>No employees found matching your criteria</p>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>

                                <DialogFooter className="flex-col space-y-2 md:flex-row md:space-y-0">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsEditDialogOpen(false)}
                                        className="w-full md:w-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpdateBatch}
                                        disabled={!editBatchName.trim() || editSelectedEmployees.size === 0 || isLoading}
                                        className="w-full md:w-auto"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Update Batch ({editSelectedEmployees.size} employees)
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Existing Batches */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-1 bg-primary rounded-full" />
                            <h2 className="text-2xl font-semibold text-foreground">Active Batches</h2>
                            <Badge variant="secondary" className="text-sm">
                                {batches.length} total
                            </Badge>
                        </div>

                        {batches.length === 0 ? (
                            <Card className="border-dashed border-2 border-muted-foreground/25">
                                <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                                    <div className="rounded-full bg-muted p-6">
                                        <Users className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-semibold text-foreground">No batches created yet</h3>
                                        <p className="text-muted-foreground max-w-md">
                                            Create your first batch to start organizing employees for training, projects, or other activities in SysRank.
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
                                {batches.map((batch) => (
                                    <Card key={batch.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-card/50 backdrop-blur-sm">
                                        <CardHeader className="space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1 flex-1">
                                                    <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {batch.name}
                                                    </CardTitle>
                                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>Created {new Date(batch.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <Badge className="bg-primary/10 text-primary border-primary/20">
                                                    {batch.employeeCount} members
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-muted-foreground">Team Members</span>
                                                    <span className="text-sm text-muted-foreground">{batch.employees?.length || 0} employees</span>
                                                </div>
                                                <div className="flex -space-x-2">
                                                    {(batch.employees || []).slice(0, 4).map((employee) => (
                                                        <Avatar key={employee.Id} className="h-8 w-8 border-2 border-background">
                                                            {/* <AvatarImage src={employee.Avatar} alt={employee.Name} /> */}
                                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                                                {getInitials(employee.Name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                    {(batch.employees?.length || 0) > 4 && (
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
                                                            +{(batch.employees?.length || 0) - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex space-x-2 pt-2">
                                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewDetails(batch)}>
                                                    View Details
                                                </Button>
                                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditBatch(batch)}>
                                                    Edit Batch
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </UnifiedDashboardLayout>
    )
}

export default BatchManagementPage