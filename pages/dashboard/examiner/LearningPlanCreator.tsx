import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus, Trash2, Save, Users, BookOpen, Target, Calendar,
    CheckCircle, ArrowRight, ArrowLeft, Sparkles,
    Brain, Award, FileText, Loader2, Search, AlertCircle,
    Code,
    Play
} from 'lucide-react';
import useSWR from 'swr';
import ExaminerLayout from './ExaminerLayout';
import CodePlayground from '@/components/CodePlayground';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Week {
    id: number;
    topics: string[];
    goals: string[];
    resources: { title: string; url: string; type: string }[];
    assessments: string[];
}

interface User {
    id: string;
    email: string;
    name: string;
    type: 'employee' | 'external';
}

interface Question {
    id: string;
    weekNumber: number;
    questionText: string;
    language: string;
    difficulty: string;
    totalMarks: number;
    testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
    starterCode?: string;
    solution?: string;
    hints?: string[];
}

export default function LearningPlanCreator() {
    const { data: session } = useSession();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [planName, setPlanName] = useState('');
    const [planDescription, setPlanDescription] = useState('');
    const [duration, setDuration] = useState(4);
    const [language, setLanguage] = useState('python');
    const [difficulty, setDifficulty] = useState('intermediate');

    const [weeks, setWeeks] = useState<Week[]>([
        {
            id: 1,
            topics: [''],
            goals: [''],
            resources: [{ title: '', url: '', type: 'documentation' }],
            assessments: ['']
        }
    ]);

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [showPlayground, setShowPlayground] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
    const [generatingForWeek, setGeneratingForWeek] = useState<number | null>(null);

    // Fetch users
    const { data: usersData, error: usersError, isLoading: loadingUsers } = useSWR<User[]>(
        session?.user?.email ? ['/api/admin/employee', '/api/admin/external-users'] : null,
        async (urls: [string, string]) => {
            const [employeesRes, externalUsersRes] = await Promise.all([
                fetch(urls[0]),
                fetch(urls[1])
            ]);

            if (!employeesRes.ok || !externalUsersRes.ok) {
                throw new Error('Failed to fetch users');
            }

            const employees = await employeesRes.json();
            const externalUsers = await externalUsersRes.json();

            return [
                ...employees.map((emp: any) => ({
                    id: emp.Id || emp.id,
                    email: emp.Email || emp.email,
                    name: emp.Name || emp.name,
                    type: 'employee' as const
                })),
                ...externalUsers.map((user: any) => ({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    type: 'external' as const
                }))
            ];
        },
        { revalidateOnFocus: false }
    );

    const availableUsers = usersData || [];
    const filteredUsers = availableUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const addWeek = () => {
        setWeeks([...weeks, {
            id: weeks.length + 1,
            topics: [''],
            goals: [''],
            resources: [{ title: '', url: '', type: 'documentation' }],
            assessments: ['']
        }]);
    };

    const removeWeek = (weekId: number) => {
        setWeeks(weeks.filter(w => w.id !== weekId));
    };

    const updateWeek = (weekId: number, field: keyof Week, index: number, value: any) => {
        setWeeks(weeks.map(week => {
            if (week.id === weekId) {
                const newField = [...(week[field] as any[])];
                newField[index] = value;
                return { ...week, [field]: newField };
            }
            return week;
        }));
    };

    const updateResource = (weekId: number, index: number, field: 'title' | 'url' | 'type', value: string) => {
        setWeeks(weeks.map(week => {
            if (week.id === weekId) {
                const newResources = [...week.resources];
                newResources[index] = { ...newResources[index], [field]: value };
                return { ...week, resources: newResources };
            }
            return week;
        }));
    };

    const addItem = (weekId: number, field: keyof Week) => {
        setWeeks(weeks.map(week => {
            if (week.id === weekId) {
                if (field === 'resources') {
                    return { ...week, resources: [...week.resources, { title: '', url: '', type: 'documentation' }] };
                } else {
                    return { ...week, [field]: [...(week[field] as any[]), ''] };
                }
            }
            return week;
        }));
    };

    const removeItem = (weekId: number, field: keyof Week, index: number) => {
        setWeeks(weeks.map(week => {
            if (week.id === weekId) {
                return { ...week, [field]: (week[field] as any[]).filter((_, i) => i !== index) };
            }
            return week;
        }));
    };

    const addQuestion = (weekNumber: number) => {
        const newQuestion: Question = {
            id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            weekNumber,
            questionText: '',
            language: language,
            difficulty: difficulty,
            totalMarks: 10,
            testCases: [{ input: '', expectedOutput: '', isHidden: false }],
            starterCode: '',
            solution: ''
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (questionId: string, field: keyof Question, value: any) => {
        setQuestions(questions.map(q =>
            q.id === questionId ? { ...q, [field]: value } : q
        ));
    };

    const removeQuestion = (questionId: string) => {
        setQuestions(questions.filter(q => q.id !== questionId));
    };

    const addTestCase = (questionId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    testCases: [...q.testCases, { input: '', expectedOutput: '', isHidden: false }]
                };
            }
            return q;
        }));
    };

    const updateTestCase = (questionId: string, index: number, field: string, value: any) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                const newTestCases = [...q.testCases];
                newTestCases[index] = { ...newTestCases[index], [field]: value };
                return { ...q, testCases: newTestCases };
            }
            return q;
        }));
    };

    const removeTestCase = (questionId: string, index: number) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId) {
                return { ...q, testCases: q.testCases.filter((_, i) => i !== index) };
            }
            return q;
        }));
    };

    const generateAIPlan = async () => {
        if (!language || !difficulty || !duration) {
            toast.error('Please fill in all basic information first');
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch('/api/learning-plans/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language,
                    difficulty,
                    duration,
                    focusAreas: []
                })
            });

            if (!response.ok) throw new Error('Failed to generate plan');

            const data = await response.json();

            if (data.success && data.plan) {
                setWeeks(data.plan.weeks.map((week: any, index: number) => ({
                    id: index + 1,
                    topics: week.topics || [''],
                    goals: week.goals || [''],
                    resources: week.resources?.map((r: any) => ({
                        title: r.title || r,
                        url: r.url || '#',
                        type: r.type || 'documentation'
                    })) || [{ title: '', url: '', type: 'documentation' }],
                    assessments: week.assessments || ['']
                })));
                toast.success('AI plan generated successfully!');
            }
        } catch (error) {
            console.error('Error generating AI plan:', error);
            toast.error('Failed to generate AI plan');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSavePlan = async () => {
        if (!planName.trim()) {
            toast.error('Please enter a plan name');
            return;
        }

        if (!planDescription.trim()) {
            toast.error('Please enter a plan description');
            return;
        }

        if (selectedUsers.length === 0) {
            toast.error('Please select at least one user');
            return;
        }

        setIsSaving(true);

        try {
            const planData = {
                name: planName,
                description: planDescription,
                duration,
                language,
                difficulty,
                weeks: weeks.map((week, index) => ({
                    weekNumber: index + 1,
                    topics: week.topics.filter(t => t.trim() !== ''),
                    goals: week.goals.filter(g => g.trim() !== ''),
                    resources: week.resources.filter(r => r.title.trim() !== ''),
                    assessments: week.assessments.filter(a => a.trim() !== ''),
                    questions: questions.filter(q => q.weekNumber === week.id)
                })),
                assignedUsers: selectedUsers,
                createdBy: session?.user?.email
            };

            const response = await fetch('/api/learning-plans/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create plan');
            }

            const result = await response.json();

            toast.success('Learning plan created successfully!');
            // setTimeout(() => {
            //     router.push('/examiner/learning-plans');
            // }, 1500);

        } catch (error: any) {
            console.error('Error saving plan:', error);
            toast.error(error.message || 'Failed to save learning plan');
        } finally {
            setIsSaving(false);
        }
    };

    const generateQuestionsForWeek = async (weekNumber: number) => {
        const week = weeks.find(w => w.id === weekNumber);
        if (!week) return;

        setIsGeneratingQuestions(true);
        setGeneratingForWeek(weekNumber);

        try {
            const response = await fetch('/api/learning-plans/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    topics: week.topics.filter(t => t.trim()),
                    goals: week.goals.filter(g => g.trim()),
                    language,
                    difficulty,
                    questionCount: 3
                })
            });

            if (!response.ok) throw new Error('Failed to generate questions');

            const data = await response.json();

            if (data.success && data.questions) {
                const newQuestions = data.questions.map((q: any) => ({
                    id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    weekNumber,
                    questionText: q.questionText,
                    language,
                    difficulty: q.difficulty,
                    totalMarks: q.totalMarks,
                    testCases: q.testCases,
                    starterCode: q.starterCode,
                    solution: q.solution,
                    hints: q.hints || []
                }));

                setQuestions([...questions, ...newQuestions]);
                toast.success(`Generated ${newQuestions.length} questions for Week ${weekNumber}!`);
            }
        } catch (error) {
            console.error('Error generating questions:', error);
            toast.error('Failed to generate questions');
        } finally {
            setIsGeneratingQuestions(false);
            setGeneratingForWeek(null);
        }
    };

    const steps = [
        { number: 1, title: 'Basic Info', icon: FileText },
        { number: 2, title: 'Weekly Plan', icon: Calendar },
        { number: 3, title: 'Practice Questions', icon: Code },
        { number: 4, title: 'Assign Users', icon: Users },
        { number: 5, title: 'Review', icon: CheckCircle }
    ];

    const languageOptions = [
        { value: 'python', label: 'Python', icon: '🐍' },
        { value: 'sql', label: 'SQL', icon: '🗄️' },
        // { value: 'javascript', label: 'JavaScript', icon: '⚡' },
        // { value: 'java', label: 'Java', icon: '☕' }
    ];

    const difficultyOptions = [
        { value: 'beginner', label: 'Beginner', icon: '🌱' },
        { value: 'intermediate', label: 'Intermediate', icon: '🚀' },
        { value: 'advanced', label: 'Advanced', icon: '⚡' }
    ];

    const resourceTypes = [
        { value: 'documentation', label: 'Documentation' },
        { value: 'course', label: 'Course' },
        { value: 'tutorial', label: 'Tutorial' },
        { value: 'article', label: 'Article' },
        { value: 'practice', label: 'Practice' },
        { value: 'book', label: 'Book' }
    ];

    return (
        <ExaminerLayout>
            <Head>
                <title>Create Learning Plan - SysRank</title>
                <link rel="icon" href="/logo.png" />
            </Head>

            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <Brain className="w-8 h-8 text-primary" />
                        Create Learning Plan
                    </h1>
                    <p className="text-muted-foreground">
                        Design personalized learning paths for your students
                    </p>
                </div>

                {/* Progress Steps */}
                <Card className="border-border">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.number;
                                const isCompleted = currentStep > step.number;

                                return (
                                    <div key={step.number} className="flex items-center flex-1">
                                        <div className={`flex items-center gap-2 ${index < steps.length - 1 ? 'w-full' : ''}`}>
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${isActive
                                                ? 'bg-primary border-primary text-primary-foreground'
                                                : isCompleted
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-background border-border text-muted-foreground'
                                                }`}>
                                                {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>
                                            <span className={`text-sm font-medium hidden md:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                {step.title}
                                            </span>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`h-0.5 flex-1 mx-2 transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-border'
                                                }`}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(currentStep / steps.length) * 100}%` }}
                            ></div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Card */}
                <Card className="border-border">
                    <CardContent className="p-6">
                        {/* Step 1: Basic Information */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Basic Information</h2>
                                    <p className="text-sm text-muted-foreground">Set up your learning plan details</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="planName">Plan Name *</Label>
                                        <Input
                                            id="planName"
                                            type="text"
                                            value={planName}
                                            onChange={(e) => setPlanName(e.target.value)}
                                            placeholder="e.g., Python Mastery Program"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (weeks) *</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min="1"
                                            max="52"
                                            value={duration}
                                            onChange={(e) => setDuration(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="language">Programming Language *</Label>
                                        <select
                                            id="language"
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {languageOptions.map(lang => (
                                                <option key={lang.value} value={lang.value}>
                                                    {lang.icon} {lang.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="difficulty">Difficulty Level *</Label>
                                        <select
                                            id="difficulty"
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {difficultyOptions.map(diff => (
                                                <option key={diff.value} value={diff.value}>
                                                    {diff.icon} {diff.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <Label htmlFor="description">Description *</Label>
                                        <Textarea
                                            id="description"
                                            value={planDescription}
                                            onChange={(e) => setPlanDescription(e.target.value)}
                                            placeholder="Describe the learning objectives and what students will achieve..."
                                            rows={4}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={() => setCurrentStep(2)}
                                        disabled={!planName.trim() || !planDescription.trim()}
                                    >
                                        Next: Weekly Plan
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Weekly Plan */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground mb-1">Weekly Learning Plan</h2>
                                        <p className="text-sm text-muted-foreground">Define topics, goals, and resources for each week</p>
                                    </div>
                                    <Button
                                        onClick={generateAIPlan}
                                        disabled={isGenerating}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                AI Generate Plan
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {weeks.map((week, weekIndex) => (
                                        <Card key={week.id} className="border-2 border-border">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <Calendar className="w-5 h-5 text-primary" />
                                                        Week {week.id}
                                                    </CardTitle>
                                                    {weeks.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeWeek(week.id)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {/* Topics */}
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" />
                                                        Topics to Cover
                                                    </Label>
                                                    {week.topics.map((topic, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <Input
                                                                value={topic}
                                                                onChange={(e) => updateWeek(week.id, 'topics', idx, e.target.value)}
                                                                placeholder="Enter topic..."
                                                                className="flex-1"
                                                            />
                                                            {week.topics.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeItem(week.id, 'topics', idx)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addItem(week.id, 'topics')}
                                                        className="w-full"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Topic
                                                    </Button>
                                                </div>

                                                {/* Goals */}
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <Target className="w-4 h-4" />
                                                        Learning Goals
                                                    </Label>
                                                    {week.goals.map((goal, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <Input
                                                                value={goal}
                                                                onChange={(e) => updateWeek(week.id, 'goals', idx, e.target.value)}
                                                                placeholder="Enter learning goal..."
                                                                className="flex-1"
                                                            />
                                                            {week.goals.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeItem(week.id, 'goals', idx)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addItem(week.id, 'goals')}
                                                        className="w-full"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Goal
                                                    </Button>
                                                </div>

                                                {/* Resources */}
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        Learning Resources
                                                    </Label>
                                                    {week.resources.map((resource, idx) => (
                                                        <div key={idx} className="space-y-2 p-3 border border-border rounded-md">
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    value={resource.title}
                                                                    onChange={(e) => updateResource(week.id, idx, 'title', e.target.value)}
                                                                    placeholder="Resource title..."
                                                                    className="flex-1"
                                                                />
                                                                {week.resources.length > 1 && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeItem(week.id, 'resources', idx)}
                                                                        className="text-destructive"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <Input
                                                                    value={resource.url}
                                                                    onChange={(e) => updateResource(week.id, idx, 'url', e.target.value)}
                                                                    placeholder="URL..."
                                                                />
                                                                <select
                                                                    value={resource.type}
                                                                    onChange={(e) => updateResource(week.id, idx, 'type', e.target.value)}
                                                                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                                >
                                                                    {resourceTypes.map(type => (
                                                                        <option key={type.value} value={type.value}>
                                                                            {type.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addItem(week.id, 'resources')}
                                                        className="w-full"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Resource
                                                    </Button>
                                                </div>

                                                {/* Assessments */}
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <Award className="w-4 h-4" />
                                                        Weekly Assessments
                                                    </Label>
                                                    {week.assessments.map((assessment, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <Input
                                                                value={assessment}
                                                                onChange={(e) => updateWeek(week.id, 'assessments', idx, e.target.value)}
                                                                placeholder="Enter assessment or quiz..."
                                                                className="flex-1"
                                                            />
                                                            {week.assessments.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeItem(week.id, 'assessments', idx)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addItem(week.id, 'assessments')}
                                                        className="w-full"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Assessment
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    <Button
                                        variant="outline"
                                        onClick={addWeek}
                                        className="w-full border-dashed border-2"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Add Another Week
                                    </Button>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button onClick={() => setCurrentStep(4)}>
                                        Next: Assign Users
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Practice Questions */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground mb-1">Practice Questions</h2>
                                        <p className="text-sm text-muted-foreground">Add coding challenges for each week</p>
                                    </div>
                                    <Button
                                        onClick={async () => {
                                            for (const week of weeks) {
                                                if (week.topics.filter(t => t.trim()).length > 0) {
                                                    await generateQuestionsForWeek(week.id);
                                                    // Add small delay between requests
                                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                                }
                                            }
                                        }}
                                        disabled={isGeneratingQuestions}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        {isGeneratingQuestions ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Generating All...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Generate All Weeks
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {weeks.map((week) => {
                                        const weekQuestions = questions.filter(q => q.weekNumber === week.id);

                                        return (
                                            <Card key={week.id} className="border-2 border-border">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-base flex items-center gap-2">
                                                            <Calendar className="w-5 h-5 text-primary" />
                                                            Week {week.id} - Questions ({weekQuestions.length})
                                                        </CardTitle>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => generateQuestionsForWeek(week.id)}
                                                                disabled={isGeneratingQuestions || week.topics.filter(t => t.trim()).length === 0}
                                                            >
                                                                {isGeneratingQuestions && generatingForWeek === week.id ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Generating...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                                        AI Generate
                                                                    </>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addQuestion(week.id)}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Add Manual
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {weekQuestions.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground text-center py-4">
                                                            No questions added yet
                                                        </p>
                                                    ) : (
                                                        weekQuestions.map((question) => (
                                                            <Card key={question.id} className="border border-border">
                                                                <CardContent className="p-4 space-y-4">
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1 space-y-3">
                                                                            <div className="space-y-2">
                                                                                <Label>Question Title/Description</Label>
                                                                                <Textarea
                                                                                    value={question.questionText}
                                                                                    onChange={(e) => updateQuestion(question.id, 'questionText', e.target.value)}
                                                                                    placeholder="E.g., Write a function to reverse a string..."
                                                                                    rows={3}
                                                                                />
                                                                            </div>

                                                                            <div className="grid grid-cols-3 gap-3">
                                                                                <div className="space-y-2">
                                                                                    <Label>Difficulty</Label>
                                                                                    <select
                                                                                        value={question.difficulty}
                                                                                        onChange={(e) => updateQuestion(question.id, 'difficulty', e.target.value)}
                                                                                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                                                                                    >
                                                                                        <option value="beginner">Beginner</option>
                                                                                        <option value="intermediate">Intermediate</option>
                                                                                        <option value="advanced">Advanced</option>
                                                                                    </select>
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label>Total Marks</Label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        value={question.totalMarks}
                                                                                        onChange={(e) => updateQuestion(question.id, 'totalMarks', Number(e.target.value))}
                                                                                        min="1"
                                                                                    />
                                                                                </div>
                                                                                <div className="flex items-end">
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => {
                                                                                            setSelectedQuestion(question);
                                                                                            setShowPlayground(true);
                                                                                        }}
                                                                                        className="w-full"
                                                                                    >
                                                                                        <Play className="w-4 h-4 mr-2" />
                                                                                        Test
                                                                                    </Button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Test Cases */}
                                                                            <div className="space-y-2">
                                                                                <Label>Test Cases</Label>
                                                                                {question.testCases.map((testCase, idx) => (
                                                                                    <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                                                                                        <div className="col-span-5">
                                                                                            <Input
                                                                                                value={testCase.input}
                                                                                                onChange={(e) => updateTestCase(question.id, idx, 'input', e.target.value)}
                                                                                                placeholder="Input..."
                                                                                            />
                                                                                        </div>
                                                                                        <div className="col-span-5">
                                                                                            <Input
                                                                                                value={testCase.expectedOutput}
                                                                                                onChange={(e) => updateTestCase(question.id, idx, 'expectedOutput', e.target.value)}
                                                                                                placeholder="Expected output..."
                                                                                            />
                                                                                        </div>
                                                                                        <div className="col-span-1 flex items-center">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={testCase.isHidden}
                                                                                                onChange={(e) => updateTestCase(question.id, idx, 'isHidden', e.target.checked)}
                                                                                                className="w-4 h-4"
                                                                                                title="Hidden test case"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="col-span-1">
                                                                                            {question.testCases.length > 1 && (
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    onClick={() => removeTestCase(question.id, idx)}
                                                                                                    className="text-destructive"
                                                                                                >
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                </Button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => addTestCase(question.id)}
                                                                                    className="w-full"
                                                                                >
                                                                                    <Plus className="w-4 h-4 mr-2" />
                                                                                    Add Test Case
                                                                                </Button>
                                                                            </div>

                                                                            {/* Starter Code */}
                                                                            <div className="space-y-2">
                                                                                <Label>Starter Code (Optional)</Label>
                                                                                <Textarea
                                                                                    value={question.starterCode || ''}
                                                                                    onChange={(e) => updateQuestion(question.id, 'starterCode', e.target.value)}
                                                                                    placeholder="def function_name():\n    # Write your code here\n    pass"
                                                                                    rows={4}
                                                                                    className="font-mono text-sm"
                                                                                />
                                                                            </div>

                                                                            {question.hints && question.hints.length > 0 && (
                                                                                <div className="space-y-2">
                                                                                    <Label>Hints for Students</Label>
                                                                                    <div className="space-y-1">
                                                                                        {question.hints.map((hint, idx) => (
                                                                                            <div key={idx} className="flex items-start gap-2 text-sm bg-muted p-2 rounded">
                                                                                                <span className="font-semibold text-primary">💡</span>
                                                                                                <span className="text-foreground">{hint}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => removeQuestion(question.id)}
                                                                            className="text-destructive ml-2"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button onClick={() => setCurrentStep(3)}>
                                        Next: Assign Users
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Assign Users */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Assign to Users</h2>
                                    <p className="text-sm text-muted-foreground">Select users who will receive this learning plan</p>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search users by name or email..."
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {filteredUsers.length} users available
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedUsers(filteredUsers.map(u => u.email))}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedUsers([])}
                                        >
                                            Clear All
                                        </Button>
                                    </div>
                                </div>

                                {loadingUsers ? (
                                    <div className="text-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                                        <p className="text-muted-foreground">Loading users...</p>
                                    </div>
                                ) : usersError ? (
                                    <Alert variant="destructive">
                                        <AlertCircle className="w-4 h-4" />
                                        <AlertDescription>Failed to load users. Please try again.</AlertDescription>
                                    </Alert>
                                ) : (
                                    <>
                                        <div className="border border-border rounded-lg max-h-96 overflow-y-auto">
                                            <div className="divide-y divide-border">
                                                {filteredUsers.map(user => (
                                                    <div
                                                        key={user.email}
                                                        onClick={() => {
                                                            setSelectedUsers(prev =>
                                                                prev.includes(user.email)
                                                                    ? prev.filter(email => email !== user.email)
                                                                    : [...prev, user.email]
                                                            );
                                                        }}
                                                        className={`p-4 cursor-pointer transition-colors ${selectedUsers.includes(user.email)
                                                            ? 'bg-primary/10'
                                                            : 'hover:bg-muted'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedUsers.includes(user.email)
                                                                    ? 'bg-primary border-primary'
                                                                    : 'border-muted-foreground'
                                                                    }`}>
                                                                    {selectedUsers.includes(user.email) && (
                                                                        <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                                                    )}
                                                                </div>
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                                    {user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-foreground">
                                                                        {user.name}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {user.email}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline">
                                                                {user.type === 'employee' ? 'Employee' : 'External'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {selectedUsers.length > 0 && (
                                            <Alert>
                                                <CheckCircle className="w-4 h-4" />
                                                <AlertDescription>
                                                    <p className="font-medium mb-2">{selectedUsers.length} user(s) selected</p>
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(3)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => setCurrentStep(5)}
                                        disabled={selectedUsers.length === 0}
                                    >
                                        Next: Review
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Review */}
                        {currentStep === 5 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground mb-1">Review & Create</h2>
                                    <p className="text-sm text-muted-foreground">Review your learning plan before creating</p>
                                </div>

                                {/* Plan Summary */}
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-base">Plan Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Name</p>
                                                <p className="font-semibold text-foreground">{planName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                                                <p className="font-semibold text-foreground">{duration} weeks</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Language</p>
                                                <p className="font-semibold text-foreground capitalize">{language}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
                                                <p className="font-semibold text-foreground capitalize">{difficulty}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-xs text-muted-foreground mb-1">Description</p>
                                            <p className="text-sm text-foreground">{planDescription}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Weekly Breakdown */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-semibold text-foreground">
                                        Weekly Breakdown ({weeks.length} weeks)
                                    </h3>
                                    {weeks.map((week) => {
                                        const hasContent = week.topics.some(t => t.trim()) ||
                                            week.goals.some(g => g.trim()) ||
                                            week.resources.some(r => r.title.trim()) ||
                                            week.assessments.some(a => a.trim());

                                        if (!hasContent) return null;

                                        return (
                                            <Card key={week.id} className="border-border">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-primary" />
                                                        Week {week.id}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        {week.topics.some(t => t.trim()) && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground mb-2">Topics:</p>
                                                                <ul className="list-disc list-inside space-y-1">
                                                                    {week.topics.filter(t => t.trim()).map((topic, idx) => (
                                                                        <li key={idx} className="text-foreground">{topic}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {week.goals.some(g => g.trim()) && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground mb-2">Goals:</p>
                                                                <ul className="list-disc list-inside space-y-1">
                                                                    {week.goals.filter(g => g.trim()).map((goal, idx) => (
                                                                        <li key={idx} className="text-foreground">{goal}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {week.resources.some(r => r.title.trim()) && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground mb-2">Resources:</p>
                                                                <ul className="list-disc list-inside space-y-1">
                                                                    {week.resources.filter(r => r.title.trim()).map((resource, idx) => (
                                                                        <li key={idx} className="text-foreground">
                                                                            {resource.title} ({resource.type})
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {week.assessments.some(a => a.trim()) && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground mb-2">Assessments:</p>
                                                                <ul className="list-disc list-inside space-y-1">
                                                                    {week.assessments.filter(a => a.trim()).map((assessment, idx) => (
                                                                        <li key={idx} className="text-foreground">{assessment}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Assigned Users */}
                                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Users className="w-5 h-5 text-emerald-600" />
                                            Assigned Users ({selectedUsers.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUsers.map(userEmail => {
                                                const user = availableUsers.find(u => u.email === userEmail);
                                                return (
                                                    <div key={userEmail} className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-border">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                                                            {user?.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">{user?.name}</p>
                                                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(4)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSavePlan}
                                        disabled={isSaving}
                                        className="gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Creating Plan...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                Create Learning Plan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Code Playground Modal */}
            {showPlayground && selectedQuestion && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle>Code Playground - Test Question</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowPlayground(false);
                                        setSelectedQuestion(null);
                                    }}
                                >
                                    ✕
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-6">
                            <CodePlayground
                                question={selectedQuestion}
                                onClose={() => {
                                    setShowPlayground(false);
                                    setSelectedQuestion(null);
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}
        </ExaminerLayout>
    );
}