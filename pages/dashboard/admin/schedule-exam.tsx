import React, { useEffect, useState } from 'react'
import AdminLayout from './layout'
import {
    Calendar,
    Clock,
    Users,
    BookOpen,
    Save,
    CheckCircle2,
    Timer,
    GraduationCap,
    ArrowRight,
    Sparkles,
    Zap,
    Target,
    TrendingUp
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Assessment {
    id: number
    title: string
    language: string
    duration: number
    createdBy: string
    createdAt: string
    isExamProctored: boolean
    isGeneratedFromExcel: boolean
    questionConfig: string
    questions: string
    startTime: string | null
    endTime: string | null
    allowedUsers: string
}

interface Employee {
    Id: number
    EmployeeId: string
    Name: string
    Email: string
    Department: string
    Position: string
}

interface Batch {
    Id: number
    Name: string
    EmployeeCount: number
    Employees: string
    CreatedAt: string
    UpdatedAt: string | null
}

interface ScheduledExam {
    assessmentId: number
    batchIds: number[]
    startTime: string
    endTime: string
}

const ScheduleExam: React.FC = () => {
    const [assessments, setAssessments] = useState<Assessment[]>([])
    const [batches, setBatches] = useState<Batch[]>([])
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
    const [selectedBatches, setSelectedBatches] = useState<number[]>([])
    const [startDateTime, setStartDateTime] = useState('')
    const [endDateTime, setEndDateTime] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assessmentRes, batchRes] = await Promise.all([
                    fetch('/api/admin/assessment'),
                    fetch('/api/admin/batch')
                ])

                const assessmentData = await assessmentRes.json()
                const batchData = await batchRes.json()

                setAssessments(assessmentData)
                setBatches(batchData)
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const handleBatchToggle = (batchId: number) => {
        setSelectedBatches(prev =>
            prev.includes(batchId)
                ? prev.filter(id => id !== batchId)
                : [...prev, batchId]
        )
    }

    const handleScheduleExam = async () => {
        if (!selectedAssessment || selectedBatches.length === 0 || !startDateTime || !endDateTime) {
            return
        }

        setSaving(true)
        try {
            const examData: ScheduledExam = {
                assessmentId: selectedAssessment.id,
                batchIds: selectedBatches,
                startTime: startDateTime,
                endTime: endDateTime
            }

            const response = await fetch('/api/admin/schedule-exam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(examData)
            })

            if (response.ok) {
                setSelectedAssessment(null)
                setSelectedBatches([])
                setStartDateTime('')
                setEndDateTime('')
                setCurrentStep(1)
            }
        } catch (error) {
            console.error('Error scheduling exam:', error)
        } finally {
            setSaving(false)
        }
    }

    const isFormValid = selectedAssessment && selectedBatches.length > 0 && startDateTime && endDateTime
    const totalStudents = selectedBatches.reduce((total, batchId) => {
        const batch = batches.find(b => b.Id === batchId)
        return total + (batch?.EmployeeCount || 0)
    }, 0)

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <GraduationCap className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                    </div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-background">
                {/* Hero Header */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-systech-gradient"></div>
                    {/* <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div> */}

                    <div className="relative container mx-auto px-6 py-16">
                        <div className="text-center text-white">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm font-medium">SysRank Exam Scheduler</span>
                            </div>
                            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text">
                                Schedule Your Examination
                            </h1>
                            <p className="text-xl opacity-90 max-w-2xl mx-auto">
                                Create seamless exam experiences with intelligent scheduling and batch management
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="container mx-auto px-6 -mt-8 relative z-10">
                    <div className="bg-card/95 backdrop-blur-sm border rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between">
                            {[
                                { step: 1, label: 'Choose Assessment', icon: BookOpen, active: currentStep >= 1, complete: selectedAssessment },
                                { step: 2, label: 'Set Schedule', icon: Clock, active: currentStep >= 2, complete: startDateTime && endDateTime },
                                { step: 3, label: 'Select Batches', icon: Users, active: currentStep >= 3, complete: selectedBatches.length > 0 },
                                { step: 4, label: 'Finalize', icon: CheckCircle2, active: currentStep >= 4, complete: isFormValid }
                            ].map((item, index) => (
                                <div key={item.step} className="flex items-center">
                                    <div className={`flex items-center gap-3 ${item.active ? 'opacity-100' : 'opacity-50'}`}>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${item.complete
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : item.active
                                                ? 'border-primary text-primary'
                                                : 'border-muted text-muted-foreground'
                                            }`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span className={`font-medium hidden sm:block ${item.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    {index < 3 && (
                                        <ArrowRight className="w-5 h-5 text-muted-foreground mx-4 hidden lg:block" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-6 py-12">
                    <div className="grid xl:grid-cols-4 gap-8">
                        {/* Main Content */}
                        <div className="xl:col-span-3 space-y-8">

                            {/* Assessment Selection */}
                            <div className="group">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground">Choose Assessment</h2>
                                    <div className="h-px bg-gradient-to-r from-border to-transparent flex-1 ml-4"></div>
                                </div>

                                <div className="grid gap-4">
                                    {assessments.map((assessment) => {
                                        const parsedQuestions = JSON.parse(assessment.questions || '[]')
                                        const questionCount = parsedQuestions.length

                                        return (
                                            <div
                                                key={assessment.id}
                                                className={`group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${selectedAssessment?.id === assessment.id
                                                    ? 'border-primary bg-gradient-to-br from-primary/5 via-transparent to-accent/5 shadow-lg'
                                                    : 'border-border bg-card hover:border-accent/50 hover:bg-accent/5'
                                                    }`}
                                                onClick={() => {
                                                    setSelectedAssessment(assessment)
                                                    setCurrentStep(Math.max(currentStep, 2))
                                                }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <h3 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
                                                                {assessment.title}
                                                            </h3>
                                                            <div className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                                                                {assessment.language}
                                                            </div>
                                                            {selectedAssessment?.id === assessment.id && (
                                                                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-in zoom-in-50">
                                                                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-muted-foreground mb-4 leading-relaxed">
                                                            Created by {assessment.createdBy.split('@')[0]} • {assessment.isExamProctored ? 'Proctored' : 'Self-paced'}
                                                        </p>

                                                        <div className="flex items-center gap-6">
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full">
                                                                <Timer className="w-4 h-4 text-accent" />
                                                                <span className="text-sm font-medium">{assessment.duration} min</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full">
                                                                <Target className="w-4 h-4 text-secondary" />
                                                                <span className="text-sm font-medium">{questionCount} questions</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {selectedAssessment?.id === assessment.id && (
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-accent/10 pointer-events-none"></div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Time Scheduling */}
                            {selectedAssessment && (
                                <div className="animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-accent" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-foreground">Set Schedule</h2>
                                        <div className="h-px bg-gradient-to-r from-border to-transparent flex-1 ml-4"></div>
                                    </div>

                                    <div className="bg-card rounded-2xl border shadow-sm p-8">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <label className="block text-sm font-semibold text-foreground mb-3">
                                                        Exam Start Time
                                                    </label>
                                                    <div className="relative group">
                                                        <input
                                                            type="datetime-local"
                                                            value={startDateTime}
                                                            onChange={(e) => {
                                                                setStartDateTime(e.target.value)
                                                                setCurrentStep(Math.max(currentStep, 3))
                                                            }}
                                                            className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-foreground font-medium"
                                                        />
                                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <label className="block text-sm font-semibold text-foreground mb-3">
                                                        Exam End Time
                                                    </label>
                                                    <div className="relative group">
                                                        <input
                                                            type="datetime-local"
                                                            value={endDateTime}
                                                            onChange={(e) => setEndDateTime(e.target.value)}
                                                            className="w-full px-4 py-4 bg-background border-2 border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-foreground font-medium"
                                                        />
                                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {startDateTime && endDateTime && (
                                            <div className="mt-6 p-4 bg-gradient-to-r from-muted/50 to-accent/10 rounded-xl border border-accent/20 animate-in fade-in-50">
                                                <div className="flex items-center gap-3">
                                                    <Zap className="w-5 h-5 text-accent" />
                                                    <p className="font-medium text-foreground">
                                                        Duration: {Math.round((new Date(endDateTime).getTime() - new Date(startDateTime).getTime()) / (1000 * 60))} minutes
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Batch Selection */}
                            {startDateTime && endDateTime && (
                                <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                                            <Users className="w-4 h-4 text-secondary" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-foreground">Select Student Batches</h2>
                                        <div className="h-px bg-gradient-to-r from-border to-transparent flex-1 ml-4"></div>
                                    </div>

                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {batches.map((batch) => {
                                            const employees = JSON.parse(batch.Employees || '[]') as Employee[]
                                            const departments = [...new Set(employees.map(emp => emp.Department))]

                                            return (
                                                <div
                                                    key={batch.Id}
                                                    className={`group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${selectedBatches.includes(batch.Id)
                                                        ? 'border-primary bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 shadow-lg scale-105'
                                                        : 'border-border bg-card hover:border-secondary/50 hover:bg-secondary/5'
                                                        }`}
                                                    onClick={() => {
                                                        handleBatchToggle(batch.Id)
                                                        setCurrentStep(Math.max(currentStep, 4))
                                                    }}
                                                >
                                                    <div className="relative z-10">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
                                                                {batch.Name}
                                                            </h4>
                                                            {selectedBatches.includes(batch.Id) && (
                                                                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-in zoom-in-50">
                                                                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2 mb-4">
                                                            {departments.slice(0, 2).map((dept, index) => (
                                                                <div key={index} className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full inline-block mr-2">
                                                                    {dept.replace('Practices - ', '')}
                                                                </div>
                                                            ))}
                                                            {departments.length > 2 && (
                                                                <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full inline-block">
                                                                    +{departments.length - 2} more
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <GraduationCap className="w-5 h-5 text-accent" />
                                                                <span className="text-2xl font-bold text-foreground">{batch.EmployeeCount}</span>
                                                            </div>
                                                            <span className="text-sm text-muted-foreground">trainees</span>
                                                        </div>
                                                    </div>

                                                    {selectedBatches.includes(batch.Id) && (
                                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="xl:col-span-1">
                            <div className="sticky top-8 space-y-6">

                                {/* Live Preview Card */}
                                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 border-b">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                                                <TrendingUp className="w-5 h-5 text-primary-foreground" />
                                            </div>
                                            <h3 className="text-lg font-bold text-card-foreground">Live Preview</h3>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Assessment</span>
                                                <span className={`text-sm font-semibold ${selectedAssessment ? 'text-primary' : 'text-muted-foreground'}`}>
                                                    {selectedAssessment ? '✓ Selected' : 'Not selected'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Schedule</span>
                                                <span className={`text-sm font-semibold ${startDateTime && endDateTime ? 'text-accent' : 'text-muted-foreground'}`}>
                                                    {startDateTime && endDateTime ? '✓ Configured' : 'Pending'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Batches</span>
                                                <span className={`text-sm font-semibold ${selectedBatches.length > 0 ? 'text-secondary' : 'text-muted-foreground'}`}>
                                                    {selectedBatches.length} selected
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-border">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-foreground font-medium">Total Students</span>
                                                <span className="text-2xl font-bold text-primary">{totalStudents}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Assessment Details */}
                                {selectedAssessment && (
                                    <div className="bg-card rounded-2xl border shadow-sm animate-in slide-in-from-right-4 duration-500">
                                        <div className="bg-gradient-to-r from-accent/10 to-secondary/10 p-6 border-b">
                                            <div className="flex items-center gap-3">
                                                <div className="px-2 py-1 bg-accent/20 text-accent text-xs font-bold rounded-full uppercase tracking-wide">
                                                    {selectedAssessment.language}
                                                </div>
                                                <h3 className="text-lg font-bold text-card-foreground">{selectedAssessment.title}</h3>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>Created by:</span>
                                                    <span className="font-medium text-foreground">{selectedAssessment.createdBy.split('@')[0]}</span>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${selectedAssessment.isExamProctored
                                                        ? 'bg-destructive/10 text-destructive'
                                                        : 'bg-green-500/10 text-green-600'
                                                        }`}>
                                                        {selectedAssessment.isExamProctored ? 'Proctored' : 'Self-paced'}
                                                    </div>

                                                    {selectedAssessment.isGeneratedFromExcel && (
                                                        <div className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-xs font-medium">
                                                            Excel Generated
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="text-center p-4 bg-primary/5 rounded-xl">
                                                    <Timer className="w-6 h-6 text-primary mx-auto mb-2" />
                                                    <p className="text-lg font-bold text-foreground">{selectedAssessment.duration}</p>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Minutes</p>
                                                </div>
                                                <div className="text-center p-4 bg-accent/5 rounded-xl">
                                                    <Target className="w-6 h-6 text-accent mx-auto mb-2" />
                                                    <p className="text-lg font-bold text-foreground">{JSON.parse(selectedAssessment.questions || '[]').length}</p>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Questions</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    onClick={handleScheduleExam}
                                    disabled={!isFormValid || saving}
                                    className={`w-full group relative overflow-hidden transition-all duration-300 ${isFormValid && !saving
                                        ? 'bg-systech-gradient hover:shadow-2xl hover:-translate-y-1 active:scale-95'
                                        : 'bg-muted cursor-not-allowed'
                                        } rounded-2xl p-6 text-white font-bold text-lg`}
                                >
                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                        {saving ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Scheduling Exam...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
                                                <span>Schedule Examination</span>
                                            </>
                                        )}
                                    </div>

                                    {isFormValid && !saving && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                    )}
                                </button>

                                {!isFormValid && (
                                    <Alert className="border-destructive/20 bg-destructive/5">
                                        <AlertDescription className="text-sm">
                                            Please complete all required fields to schedule the exam.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Selected Batches Preview */}
                    {selectedBatches.length > 0 && (
                        <div className="mt-12 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">Selected Batches</h2>
                                <div className="h-px bg-gradient-to-r from-border to-transparent flex-1 ml-4"></div>
                            </div>

                            <div className="bg-card rounded-2xl border shadow-sm p-8">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedBatches.map((batchId, index) => {
                                        const batch = batches.find(b => b.Id === batchId)
                                        if (!batch) return null

                                        const employees = JSON.parse(batch.Employees || '[]') as Employee[]
                                        const departments = [...new Set(employees.map(emp => emp.Department))]

                                        return (
                                            <div
                                                key={batch.Id}
                                                className="relative group p-6 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl border border-primary/20 hover:shadow-lg transition-all duration-300"
                                                style={{ animationDelay: `${index * 100}ms` }}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-bold text-card-foreground group-hover:text-primary transition-colors">
                                                        {batch.Name}
                                                    </h4>
                                                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-4">
                                                    {departments.slice(0, 2).map((dept, deptIndex) => (
                                                        <div key={deptIndex} className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full inline-block mr-1">
                                                            {dept.replace('Practices - ', '')}
                                                        </div>
                                                    ))}
                                                    {departments.length > 2 && (
                                                        <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full inline-block">
                                                            +{departments.length - 2}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <GraduationCap className="w-4 h-4 text-accent" />
                                                        <span className="text-lg font-bold text-foreground">{batch.EmployeeCount}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Trainees</span>
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent rounded-b-2xl"></div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout >
    )
}

export default ScheduleExam