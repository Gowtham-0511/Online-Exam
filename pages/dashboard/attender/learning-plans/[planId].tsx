import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen, Calendar, Target, Award, CheckCircle,
    Circle, ArrowLeft, FileText, Code, Play, Lock,
    Clock, Trophy, Star, ChevronRight, ExternalLink, Loader2
} from 'lucide-react';
import useSWR from 'swr';
import AttenderLayout from '../AttenderLayout';
import CodePlayground from '@/components/CodePlayground';
import toast from 'react-hot-toast';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function LearningPlanDetail() {
    const { data: session } = useSession();
    const router = useRouter();
    const { planId } = router.query;

    const [activeWeek, setActiveWeek] = useState(1);
    const [showPlayground, setShowPlayground] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

    const { data, error, isLoading, mutate } = useSWR(
        planId && session?.user?.email ? `/api/attender/learning-plans/${planId}` : null,
        fetcher
    );

    const markTopicComplete = async (weekNumber: number, topic: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'topic',
                    value: topic
                })
            });
            mutate();
            toast.success('Topic completed!');
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const markResourceComplete = async (weekNumber: number, resourceTitle: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'resource',
                    value: resourceTitle
                })
            });
            mutate();
            toast.success('Resource completed!');
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const markGoalComplete = async (weekNumber: number, goal: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'goal',
                    value: goal
                })
            });
            mutate();
            toast.success('Goal completed!');
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const markAssessmentComplete = async (weekNumber: number, assessment: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'assessment',
                    value: assessment
                })
            });
            mutate();
            toast.success('Assessment completed!');
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    if (isLoading) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </UnifiedDashboardLayout>
        );
    }

    if (!data?.plan) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <Card className="p-6">
                        <p className="text-foreground">Learning plan not found</p>
                    </Card>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    const { plan, userProgress } = data;

    // Calculate total and earned points
    const totalPoints = plan.weeks.reduce((acc: number, week: any) => {
        return acc + (week.questions?.reduce((sum: number, q: any) => sum + (q.totalMarks || 0), 0) || 0);
    }, 0);

    const earnedPoints = plan.weeks.reduce((acc: number, week: any) => {
        const weekProg = userProgress.progress.find((p: any) => p.weekId === week.weekNumber);
        if (!weekProg) return acc;

        return acc + (week.questions?.reduce((sum: number, q: any) => {
            // Check if question is solved (you might need to adjust this based on your data structure)
            const isSolved = weekProg.completedAssessments?.some((a: any) =>
                typeof a === 'string' ? a.includes(q.questionText) : a.title?.includes(q.questionText)
            );
            return sum + (isSolved ? (q.totalMarks || 0) : 0);
        }, 0) || 0);
    }, 0);

    // Set active week to current week on mount
    if (activeWeek === 1 && userProgress.currentWeek > 1) {
        setActiveWeek(userProgress.currentWeek);
    }

    const currentWeek = plan.weeks.find((w: any) => w.weekNumber === activeWeek) || plan.weeks[0];
    const weekProgress = userProgress.progress.find((p: any) => p.weekId === currentWeek.weekNumber) || {
        completedTopics: [],
        completedGoals: [],
        completedResources: [],
        completedAssessments: []
    };

    return (
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>{plan.name} - SysRank</title>
                <link rel="icon" href="/logo.png" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* <div className="border-b border-border bg-card">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => router.back()}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Plans
                            </Button>
                            <div className="h-6 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" />
                                <span className="font-semibold text-foreground">{earnedPoints}</span>
                                <span className="text-sm text-muted-foreground">/ {totalPoints} points</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                                <Star className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">Learning Path</span>
                            </div>
                            <Badge className="bg-primary text-primary-foreground capitalize">
                                {plan.difficulty}
                            </Badge>
                        </div>
                    </div>
                </div> */}

                {/* Main Content */}
                <div className="container mx-auto px-4 py-6">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground mb-2">{plan.name}</h1>
                                <p className="text-muted-foreground max-w-3xl">{plan.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <Badge variant="outline" className="capitalize border-primary/20 text-primary">
                                {plan.language}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                                {plan.difficulty}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{plan.duration} weeks</span>
                            </div>
                        </div>

                        {/* Progress Overview Card */}
                        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-foreground">Overall Progress</span>
                                    <span className="text-2xl font-bold text-primary">{userProgress.overallProgress}%</span>
                                </div>
                                <Progress value={userProgress.overallProgress} className="h-3 bg-muted" />
                                <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                                    <span>Week {userProgress.currentWeek} of {plan.duration}</span>
                                    <span>{earnedPoints} / {totalPoints} points earned</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Week Navigation */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold text-foreground">Learning Path</h2>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {plan.weeks.map((week: any) => {
                                const weekProg = userProgress.progress.find((p: any) => p.weekId === week.weekNumber);
                                const weekProgressPercent = weekProg
                                    ? Math.round(
                                        ((weekProg.completedTopics?.length || 0) +
                                            (weekProg.completedGoals?.length || 0) +
                                            (weekProg.completedResources?.length || 0)) /
                                        ((week.topics?.length || 0) +
                                            (week.goals?.length || 0) +
                                            (week.resources?.length || 0)) * 100
                                    )
                                    : 0;

                                const isLocked = week.weekNumber > userProgress.currentWeek + 1;

                                return (
                                    <Button
                                        key={week.weekNumber}
                                        variant={activeWeek === week.weekNumber ? "default" : "outline"}
                                        className={`flex-shrink-0 min-w-[140px] justify-between ${isLocked ? 'opacity-60' : ''
                                            }`}
                                        onClick={() => !isLocked && setActiveWeek(week.weekNumber)}
                                        disabled={isLocked}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isLocked ? (
                                                <Lock className="w-4 h-4" />
                                            ) : weekProgressPercent === 100 ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : (
                                                <Circle className="w-4 h-4" />
                                            )}
                                            <span>Week {week.weekNumber}</span>
                                        </div>
                                        {!isLocked && (
                                            <span className="text-xs opacity-70">{weekProgressPercent}%</span>
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Week Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Topics & Questions */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Topics Card */}
                            <Card>
                                <CardHeader className="border-b border-border bg-muted/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                        Topics to Learn
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Week {currentWeek.weekNumber} • {currentWeek.topics?.length || 0} topics
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        {currentWeek.topics?.map((topic: string, idx: number) => {
                                            const isCompleted = weekProgress.completedTopics?.includes(topic);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer
                                                        ${isCompleted
                                                            ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                                            : 'bg-card border-border hover:bg-muted/50'
                                                        }`}
                                                    onClick={() => markTopicComplete(currentWeek.weekNumber, topic)}
                                                >
                                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                                                        ${isCompleted ? 'bg-primary' : 'bg-muted'}`}>
                                                        {isCompleted ? (
                                                            <CheckCircle className="w-4 h-4 text-primary-foreground" />
                                                        ) : (
                                                            <span className="text-xs font-medium text-muted-foreground">{idx + 1}</span>
                                                        )}
                                                    </div>
                                                    <span className={`flex-1 font-medium ${isCompleted ? 'text-foreground' : 'text-foreground'
                                                        }`}>
                                                        {topic}
                                                    </span>
                                                    {isCompleted && (
                                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                                            Completed
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Practice Questions Card */}
                            {currentWeek.questions && currentWeek.questions.length > 0 && (
                                <Card>
                                    <CardHeader className="border-b border-border bg-muted/30">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Code className="w-5 h-5 text-primary" />
                                            Practice Challenges
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="space-y-3">
                                            {currentWeek.questions.map((question: any, idx: number) => {
                                                const isSolved = weekProgress.completedAssessments?.some((a: any) =>
                                                    typeof a === 'string'
                                                        ? a.includes(question.questionText)
                                                        : a.title?.includes(question.questionText)
                                                );

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0
                                                                ${isSolved ? 'bg-primary' : 'bg-muted'}`}>
                                                                {isSolved ? (
                                                                    <CheckCircle className="w-5 h-5 text-primary-foreground" />
                                                                ) : (
                                                                    <Code className="w-5 h-5 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-medium text-foreground mb-1 line-clamp-1">
                                                                    {question.questionText}
                                                                </h3>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs
                                                                            ${question.difficulty === 'Easy' || question.difficulty === 'easy'
                                                                                ? 'border-green-500/30 text-green-600 dark:text-green-400' : ''}
                                                                            ${question.difficulty === 'Medium' || question.difficulty === 'medium'
                                                                                ? 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400' : ''}
                                                                            ${question.difficulty === 'Hard' || question.difficulty === 'hard'
                                                                                ? 'border-red-500/30 text-red-600 dark:text-red-400' : ''}
                                                                        `}
                                                                    >
                                                                        {question.difficulty}
                                                                    </Badge>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {question.totalMarks} points
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant={isSolved ? "outline" : "default"}
                                                            className="ml-4"
                                                            onClick={() => {
                                                                setSelectedQuestion(question);
                                                                setShowPlayground(true);
                                                            }}
                                                        >
                                                            {isSolved ? (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                                    Review
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Play className="w-4 h-4 mr-2" />
                                                                    Solve
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column - Resources & Goals */}
                        <div className="space-y-6">
                            {/* Learning Goals */}
                            <Card>
                                <CardHeader className="border-b border-border bg-muted/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Target className="w-5 h-5 text-primary" />
                                        Learning Goals
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        {currentWeek.goals?.map((goal: string, idx: number) => {
                                            const isCompleted = weekProgress.completedGoals?.includes(goal);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => markGoalComplete(currentWeek.weekNumber, goal)}
                                                >
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                    )}
                                                    <span className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                        {goal}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Resources */}
                            <Card>
                                <CardHeader className="border-b border-border bg-muted/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Resources
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        {currentWeek.resources?.map((resource: any, idx: number) => {
                                            const isCompleted = weekProgress.completedResources?.includes(resource.title);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="group flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => markResourceComplete(currentWeek.weekNumber, resource.title)}
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {isCompleted ? (
                                                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {resource.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">{resource.type}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(resource.url, '_blank');
                                                        }}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Assessments */}
                            {/* <Card>
                                <CardHeader className="border-b border-border bg-muted/30">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Award className="w-5 h-5 text-primary" />
                                        Assessments
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        {currentWeek.assessments?.map((assessment: string, idx: number) => {
                                            const isCompleted = weekProgress.completedAssessments?.some(
                                                (a: any) => a.title === assessment || a === assessment
                                            );

                                            return (
                                                <Button
                                                    key={idx}
                                                    variant="outline"
                                                    className="w-full justify-between h-auto py-3"
                                                    onClick={() => markAssessmentComplete(currentWeek.weekNumber, assessment)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isCompleted && <CheckCircle className="w-4 h-4 text-primary" />}
                                                        <span className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                                            {assessment}
                                                        </span>
                                                    </div>
                                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Code Playground Modal */}
            {showPlayground && selectedQuestion && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-border">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-foreground">Code Playground</CardTitle>
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
        </UnifiedDashboardLayout>
    );
}