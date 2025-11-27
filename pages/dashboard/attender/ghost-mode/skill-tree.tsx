import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
    Target,
    Lock,
    CheckCircle2,
    ArrowLeft,
    Ghost,
    Zap,
    Trophy,
    Star,
    Sparkles,
    Code2,
    Database,
    Cpu,
    Globe,
    Shield,
    Layers,
    Clock,
    Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface SkillNode {
    id: string;
    title: string;
    description: string;
    icon: any;
    status: 'locked' | 'available' | 'completed';
    level: number;
    xp: number;
    maxXp: number;
    prerequisites: string[];
    challenges: number;
    color: string;
}

const SkillTreeExplorer = () => {
    const router = useRouter();
    const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
    const [showNodeDialog, setShowNodeDialog] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [skillNodes, setSkillNodes] = useState<SkillNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load skill tree from API
    useEffect(() => {
        const loadSkillTree = async () => {
            try {
                const response = await fetch('/api/attender/ghost-mode/skill-tree');
                const data = await response.json();
                if (data.skillNodes) {
                    setSkillNodes(data.skillNodes);
                }
            } catch (error) {
                console.error('Failed to load skill tree:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSkillTree();
    }, []);

    const handleNodeClick = (node: SkillNode) => {
        setSelectedNode(node);
        setShowNodeDialog(true);
        setChallenges([]);
    };

    const handleStartChallenges = async () => {
        if (!selectedNode) return;

        setIsGenerating(true);
        try {
            const response = await fetch('/api/attender/ghost-mode/generate-challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    skillTitle: selectedNode.title,
                    skillDescription: selectedNode.description,
                    difficulty: selectedNode.level === 1 ? 'easy' : selectedNode.level === 2 ? 'medium' : 'hard',
                    count: 3
                })
            });

            const data = await response.json();
            if (data.challenges) {
                setChallenges(data.challenges);
            }
        } catch (error) {
            console.error('Failed to generate challenges:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const getNodeColor = (color: string, status: string) => {
        if (status === 'locked') return 'bg-muted border-muted-foreground/20';
        if (status === 'completed') return `bg-${color}-100 dark:bg-${color}-900/30 border-${color}-500`;
        return `bg-${color}-50 dark:bg-${color}-950/30 border-${color}-400`;
    };

    const getIconColor = (color: string, status: string) => {
        if (status === 'locked') return 'text-muted-foreground';
        if (status === 'completed') return `text-${color}-600 dark:text-${color}-400`;
        return `text-${color}-600 dark:text-${color}-500`;
    };

    const totalXp = skillNodes.reduce((sum, node) => sum + node.xp, 0);
    const maxTotalXp = skillNodes.reduce((sum, node) => sum + node.maxXp, 0);
    const overallProgress = maxTotalXp > 0 ? (totalXp / maxTotalXp) * 100 : 0;

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Skill Tree Explorer - Ghost Mode</title>
                    <link rel="icon" href="/logo3.png" />
                </Head>
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                        <p className="text-muted-foreground animate-pulse">Loading skill tree...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Skill Tree Explorer - Ghost Mode</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-emerald-50/30 dark:from-slate-950 dark:via-background dark:to-emerald-950/30">
                {/* Header */}
                <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push('/dashboard/attender/ghost-mode')}
                                    className="gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>
                                <Separator orientation="vertical" className="h-6" />
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                                        <Target className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold">Skill Tree Explorer</h1>
                                        <p className="text-xs text-muted-foreground">Visual learning progression</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="gap-1.5 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                                    <Ghost className="w-3 h-3" />
                                    Ghost Mode
                                </Badge>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-medium">Total XP</p>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {totalXp} / {maxTotalXp}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Skill Tree Visualization */}
                        <div className="lg:col-span-3 space-y-8">
                            {/* Progress Overview */}
                            <Card className="border-border/50 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-amber-500" />
                                            <h3 className="font-semibold">Overall Progress</h3>
                                        </div>
                                        <Badge variant="secondary">{overallProgress.toFixed(0)}%</Badge>
                                    </div>
                                    <Progress value={overallProgress} className="h-3" />
                                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                        <span>Beginner</span>
                                        <span>Intermediate</span>
                                        <span>Advanced</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Skill Tree Levels */}
                            <div className="space-y-12">
                                {/* Level 1 */}
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Badge className="bg-emerald-600">Level 1</Badge>
                                        <h2 className="text-xl font-bold">Foundations</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {skillNodes.filter(n => n.level === 1).map((node) => (
                                            <Card
                                                key={node.id}
                                                onClick={() => handleNodeClick(node)}
                                                className={`
                                                    border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl
                                                    ${node.status === 'locked' ? 'opacity-50' : ''}
                                                    ${node.status === 'completed' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : ''}
                                                    ${node.status === 'available' ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : ''}
                                                    ${node.status === 'locked' ? 'border-muted' : ''}
                                                `}
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`
                                                            w-14 h-14 rounded-xl flex items-center justify-center
                                                            ${node.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''}
                                                            ${node.status === 'available' ? 'bg-blue-100 dark:bg-blue-900/50' : ''}
                                                            ${node.status === 'locked' ? 'bg-muted' : ''}
                                                        `}>
                                                            {node.status === 'locked' ? (
                                                                <Lock className="w-7 h-7 text-muted-foreground" />
                                                            ) : node.status === 'completed' ? (
                                                                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                                            ) : (
                                                                <node.icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-bold mb-1">{node.title}</h3>
                                                            <p className="text-sm text-muted-foreground mb-3">{node.description}</p>
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-muted-foreground">Progress</span>
                                                                    <span className="font-medium">{node.xp}/{node.maxXp} XP</span>
                                                                </div>
                                                                <Progress value={(node.xp / node.maxXp) * 100} className="h-2" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>

                                {/* Connection Lines */}
                                <div className="flex justify-center">
                                    <div className="w-1 h-12 bg-gradient-to-b from-emerald-300 to-purple-300 dark:from-emerald-700 dark:to-purple-700 rounded-full" />
                                </div>

                                {/* Level 2 */}
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Badge className="bg-purple-600">Level 2</Badge>
                                        <h2 className="text-xl font-bold">Intermediate</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {skillNodes.filter(n => n.level === 2).map((node) => (
                                            <Card
                                                key={node.id}
                                                onClick={() => handleNodeClick(node)}
                                                className={`
                                                    border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl
                                                    ${node.status === 'locked' ? 'opacity-50' : ''}
                                                    ${node.status === 'completed' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : ''}
                                                    ${node.status === 'available' ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/20' : ''}
                                                    ${node.status === 'locked' ? 'border-muted' : ''}
                                                `}
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`
                                                            w-14 h-14 rounded-xl flex items-center justify-center
                                                            ${node.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''}
                                                            ${node.status === 'available' ? 'bg-purple-100 dark:bg-purple-900/50' : ''}
                                                            ${node.status === 'locked' ? 'bg-muted' : ''}
                                                        `}>
                                                            {node.status === 'locked' ? (
                                                                <Lock className="w-7 h-7 text-muted-foreground" />
                                                            ) : node.status === 'completed' ? (
                                                                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                                            ) : (
                                                                <node.icon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-bold mb-1">{node.title}</h3>
                                                            <p className="text-sm text-muted-foreground mb-3">{node.description}</p>
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-muted-foreground">Progress</span>
                                                                    <span className="font-medium">{node.xp}/{node.maxXp} XP</span>
                                                                </div>
                                                                <Progress value={(node.xp / node.maxXp) * 100} className="h-2" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>

                                {/* Connection Lines */}
                                <div className="flex justify-center">
                                    <div className="w-1 h-12 bg-gradient-to-b from-purple-300 to-rose-300 dark:from-purple-700 dark:to-rose-700 rounded-full" />
                                </div>

                                {/* Level 3 */}
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Badge className="bg-rose-600">Level 3</Badge>
                                        <h2 className="text-xl font-bold">Advanced</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {skillNodes.filter(n => n.level === 3).map((node) => (
                                            <Card
                                                key={node.id}
                                                onClick={() => handleNodeClick(node)}
                                                className={`
                                                    border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl
                                                    ${node.status === 'locked' ? 'opacity-50' : ''}
                                                    ${node.status === 'completed' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : ''}
                                                    ${node.status === 'available' ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20' : ''}
                                                    ${node.status === 'locked' ? 'border-muted' : ''}
                                                `}
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`
                                                            w-14 h-14 rounded-xl flex items-center justify-center
                                                            ${node.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''}
                                                            ${node.status === 'available' ? 'bg-rose-100 dark:bg-rose-900/50' : ''}
                                                            ${node.status === 'locked' ? 'bg-muted' : ''}
                                                        `}>
                                                            {node.status === 'locked' ? (
                                                                <Lock className="w-7 h-7 text-muted-foreground" />
                                                            ) : node.status === 'completed' ? (
                                                                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                                            ) : (
                                                                <node.icon className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-bold mb-1">{node.title}</h3>
                                                            <p className="text-sm text-muted-foreground mb-3">{node.description}</p>
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-muted-foreground">Progress</span>
                                                                    <span className="font-medium">{node.xp}/{node.maxXp} XP</span>
                                                                </div>
                                                                <Progress value={(node.xp / node.maxXp) * 100} className="h-2" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Stats Card */}
                            <Card className="border-border/50 shadow-lg animate-in fade-in slide-in-from-right-4 duration-500">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-semibold">Your Stats</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-sm font-medium">Completed</span>
                                            </div>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {skillNodes.filter(n => n.status === 'completed').length}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                <span className="text-sm font-medium">Available</span>
                                            </div>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">
                                                {skillNodes.filter(n => n.status === 'available').length}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">Locked</span>
                                            </div>
                                            <span className="font-bold">
                                                {skillNodes.filter(n => n.status === 'locked').length}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Legend */}
                            <Card className="border-border/50 shadow-lg animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                                <CardContent className="p-6 space-y-4">
                                    <h3 className="font-semibold mb-4">Legend</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <span className="text-muted-foreground">Completed</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 flex items-center justify-center">
                                                <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <span className="text-muted-foreground">Available</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-muted border-2 border-muted-foreground/20 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <span className="text-muted-foreground">Locked</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Ghost Mode Notice */}
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                                        <Ghost className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                            Practice Mode
                                        </p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            Progress shown here is temporary and won't be saved to your profile.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Node Detail Dialog */}
                <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
                    <DialogContent className="sm:max-w-md">
                        {selectedNode && (
                            <>
                                <DialogHeader>
                                    <div className={`
                                        w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4
                                        ${selectedNode.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''}
                                        ${selectedNode.status === 'available' ? 'bg-blue-100 dark:bg-blue-900/50' : ''}
                                        ${selectedNode.status === 'locked' ? 'bg-muted' : ''}
                                    `}>
                                        {selectedNode.status === 'locked' ? (
                                            <Lock className="w-8 h-8 text-muted-foreground" />
                                        ) : (
                                            <selectedNode.icon className={`
                                                w-8 h-8
                                                ${selectedNode.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}
                                            `} />
                                        )}
                                    </div>
                                    <DialogTitle className="text-center">{selectedNode.title}</DialogTitle>
                                    <DialogDescription className="text-center">
                                        {selectedNode.description}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2 text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">{selectedNode.xp}/{selectedNode.maxXp} XP</span>
                                        </div>
                                        <Progress value={(selectedNode.xp / selectedNode.maxXp) * 100} className="h-2" />
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Details</p>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="p-2 rounded bg-muted/50">
                                                <p className="text-xs text-muted-foreground">Challenges</p>
                                                <p className="font-semibold">{selectedNode.challenges}</p>
                                            </div>
                                            <div className="p-2 rounded bg-muted/50">
                                                <p className="text-xs text-muted-foreground">Level</p>
                                                <p className="font-semibold">{selectedNode.level}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedNode.prerequisites.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Prerequisites</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedNode.prerequisites.map(prereq => (
                                                    <Badge key={prereq} variant="outline" className="text-xs">
                                                        {skillNodes.find(n => n.id === prereq)?.title}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {challenges.length > 0 && (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        <Separator />
                                        <p className="text-sm font-medium">Generated Challenges</p>
                                        {challenges.map((challenge, index) => (
                                            <Card key={index} className="border-border/50">
                                                <CardContent className="p-4 space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <h4 className="font-semibold text-sm">{challenge.title}</h4>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {challenge.xpReward} XP
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {challenge.description}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {challenge.timeEstimate} min
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {challenge.difficulty}
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                <DialogFooter>
                                    {selectedNode.status === 'available' && (
                                        <Button
                                            className="w-full gap-2"
                                            onClick={handleStartChallenges}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4" />
                                                    {challenges.length > 0 ? 'Regenerate Challenges' : 'Start Challenges'}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    {selectedNode.status === 'locked' && (
                                        <Button variant="outline" className="w-full" disabled>
                                            <Lock className="w-4 h-4 mr-2" />
                                            Complete Prerequisites
                                        </Button>
                                    )}
                                    {selectedNode.status === 'completed' && (
                                        <Button variant="outline" className="w-full gap-2">
                                            <Trophy className="w-4 h-4" />
                                            Review Challenges
                                        </Button>
                                    )}
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
};

export default SkillTreeExplorer;
