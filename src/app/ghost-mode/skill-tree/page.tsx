"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import {
    Target,
    Zap,
    BookOpen,
    CheckCircle2,
    Lock,
    Unlock,
    ChevronRight,
    Trophy,
    RefreshCw,
    ArrowLeft,
    Search,
    Ghost,
    ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'react-hot-toast';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Types matches API response
type SkillType = {
    id: string;
    name: string;
    description: string;
    category: string;
    status: "locked" | "unlocked" | "completed";
    prerequisites: string[];
    resources: Array<{ title: string; url: string; type: "video" | "article" | "course" }>;
    challenge: {
        question: string;
        options?: string[];
        correctAnswer: string;
    };
};

type TierType = {
    tier: number;
    title: string;
    skills: SkillType[];
};

type SkillTreeData = {
    topic: string;
    description: string;
    tiers: TierType[];
};

export default function SkillTreePage() {
    const router = useRouter();
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [treeData, setTreeData] = useState<SkillTreeData | null>(null);
    const [selectedSkill, setSelectedSkill] = useState<SkillType | null>(null);
    const [showChallenge, setShowChallenge] = useState(false);
    const [challengeAnswer, setChallengeAnswer] = useState<string | null>(null);
    const [showExitWarning, setShowExitWarning] = useState(false);

    const containerRef = useRef(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Animation for Header
    useGSAP(() => {
        gsap.from(".ui-element", {
            y: -20,
            opacity: 0,
            stagger: 0.1,
            duration: 0.6,
            ease: "power2.out"
        });
    }, { scope: containerRef });

    // Animation when tree data loads
    useGSAP(() => {
        if (treeData) {
            gsap.from(".tier-container", {
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: "power3.out"
            });
        }
    }, { dependencies: [treeData], scope: containerRef });

    // Auto-Sequence: Ensure progression rules apply to ALL tiers retroactively
    useEffect(() => {
        if (!treeData) return;

        let hasUpdates = false;
        // Clone checks to avoid mutation during read
        // We only clone if we need to write, but to iterate we need to know status.
        // We'll calculate indices that need updates first.

        const tiersToUnlock: number[] = [];

        treeData.tiers.forEach((tier, index) => {
            // If satisfied current tier
            const isTierComplete = tier.skills.every(s => s.status === 'completed');

            // Check next tier existence
            if (isTierComplete && index < treeData.tiers.length - 1) {
                const nextTier = treeData.tiers[index + 1];
                // If next tier has ANY locked skills, it implies it hasn't been fully unlocked/accessed
                const hasLockedSkills = nextTier.skills.some(s => s.status === 'locked');

                if (hasLockedSkills) {
                    tiersToUnlock.push(index + 1);
                }
            }
        });

        if (tiersToUnlock.length > 0) {
            const newTree: SkillTreeData = JSON.parse(JSON.stringify(treeData));

            tiersToUnlock.forEach(tierIndex => {
                newTree.tiers[tierIndex].skills.forEach(s => {
                    if (s.status === 'locked') s.status = 'unlocked';
                });
            });

            setTreeData(newTree);
            toast.success("Syncing progression... Next tiers unlocked!", { icon: '🔓' });
        }
    }, [treeData]);

    const handleGenerate = async () => {
        if (!topic.trim()) return;

        setLoading(true);
        // Don't clear treeData immediately to avoid flash if we want to show loading overlay
        // But here we want to switch views, so we might want to clear or show a loading state

        try {
            const res = await fetch('/api/ghost-mode/skill-tree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, userLevel: 'Beginner' })
            });

            if (!res.ok) throw new Error("Failed to generate tree");

            const data = await res.json();
            setTreeData(data);
            toast.success("Skill Tree Generated!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate skill tree. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setTreeData(null);
        setTopic('');
    };

    const handleSkillClick = (skill: SkillType) => {
        setSelectedSkill(skill);
        setShowChallenge(false);
        setChallengeAnswer(null);
    };

    const submitAnswer = () => {
        if (!selectedSkill || !challengeAnswer) return;

        if (challengeAnswer === selectedSkill.challenge.correctAnswer) {
            toast.success("Correct! Skill Unlocked/Mastered.");

            // Deep clone to ensure state updates trigger correctly
            const newTree: SkillTreeData = JSON.parse(JSON.stringify(treeData));
            let currentTierIndex = -1;

            // 1. Mark skill as completed
            newTree.tiers.forEach((tier, tIndex) => {
                tier.skills.forEach(s => {
                    if (s.id === selectedSkill.id) {
                        s.status = 'completed';
                        currentTierIndex = tIndex;
                    }
                });
            });

            // 2. Check for Tier Progression
            if (currentTierIndex !== -1) {
                const currentTier = newTree.tiers[currentTierIndex];
                const allSkillsCompleted = currentTier.skills.every(s => s.status === 'completed');

                if (allSkillsCompleted) {
                    // Unlock next tier if it exists
                    const nextTierIndex = currentTierIndex + 1;
                    if (nextTierIndex < newTree.tiers.length) {
                        newTree.tiers[nextTierIndex].skills.forEach(s => {
                            if (s.status === 'locked') s.status = 'unlocked';
                        });
                        toast.success(`Level Up! ${newTree.tiers[nextTierIndex].title} Unlocked!`, {
                            icon: '🎉',
                            duration: 4000
                        });
                    }
                }
            }

            setTreeData(newTree);
            setShowChallenge(false);
        } else {
            toast.error("Incorrect. Try again!");
        }
    };

    const confirmExit = () => {
        router.push('/ghost-mode');
    };

    return (
        <div ref={containerRef} className="h-screen bg-background flex flex-col font-sans overflow-hidden relative selection:bg-emerald-500/30">

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />
            </div>

            {/* Header */}
            <header className="flex-none h-16 border-b border-border/40 bg-background/80 backdrop-blur-md z-20 ui-element">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                            <Target className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold tracking-tight text-foreground">Skill Tree Architect</h1>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] text-muted-foreground font-mono uppercase">AI Connected</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {treeData && (
                            <Button onClick={handleReset} variant="outline" size="sm" className="h-8 text-xs border-dashed">
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                New Tree
                            </Button>
                        )}
                        <Button
                            onClick={() => setShowExitWarning(true)}
                            variant="destructive"
                            size="sm"
                            className="h-8 text-xs font-medium px-3 shadow-none bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                            Exit
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative z-10 overflow-hidden min-h-0">
                <ScrollArea ref={scrollRef} className="flex-1 min-h-0 w-full">
                    <div className="p-6 md:p-12 min-h-full flex flex-col">

                        {!treeData ? (
                            // Empty State / Input View
                            <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                <div className="text-center space-y-4 max-w-2xl px-4">
                                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10 ring-1 ring-white/10 mb-6">
                                        <Zap className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
                                        What do you want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">master?</span>
                                    </h2>
                                    <p className="text-lg text-muted-foreground">
                                        Enter a topic, and we'll construct a personalized, gamified learning path just for you.
                                    </p>
                                </div>

                                <div className="w-full max-w-xl relative group">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    <div className="relative flex gap-2 p-2 bg-card/50 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl">
                                        <div className="pl-3 flex items-center pointer-events-none text-muted-foreground">
                                            <Search className="w-5 h-5" />
                                        </div>
                                        <Input
                                            placeholder="e.g. Advanced Rust, System Design, Digital Marketing..."
                                            className="h-12 text-lg bg-transparent border-none focus-visible:ring-0 shadow-none"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                            autoFocus
                                        />
                                        <Button
                                            size="lg"
                                            onClick={handleGenerate}
                                            disabled={loading || !topic.trim()}
                                            className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all hover:scale-105 active:scale-95"
                                        >
                                            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex gap-2 text-sm text-muted-foreground">
                                    <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setTopic("Python for Data Science")}>Python Data Science</Badge>
                                    <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setTopic("React Performance")}>React Performance</Badge>
                                    <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setTopic("Blockchain Basics")}>Blockchain</Badge>
                                </div>
                            </div>
                        ) : (
                            // Tree View
                            <div className="max-w-5xl mx-auto w-full pb-20">
                                <div className="text-center space-y-2 mb-12 animate-in slide-in-from-bottom-5 fade-in duration-700">
                                    <Badge variant="outline" className="mb-2 border-emerald-500/30 text-emerald-500">Generated Roadmap</Badge>
                                    <h2 className="text-3xl font-bold tracking-tight">{treeData.topic}</h2>
                                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{treeData.description}</p>
                                </div>

                                <div className="relative space-y-16">
                                    {/* Vertical Connecting Line */}
                                    <div className="absolute left-1/2 top-10 bottom-10 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-transparent -translate-x-1/2 z-0 hidden lg:block" />

                                    {treeData.tiers.map((tier, i) => (
                                        <div key={tier.tier} className="tier-container relative z-10 group">

                                            {/* Tier Label */}
                                            <div className="flex items-center justify-center mb-8">
                                                <div className="bg-background border border-emerald-500/30 text-emerald-500 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ring-4 ring-background">
                                                    Tier {tier.tier} &bull; {tier.title}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                                                {tier.skills.map((skill) => (
                                                    <Card
                                                        key={skill.id}
                                                        onClick={() => handleSkillClick(skill)}
                                                        className={`w-full max-w-[320px] cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl border-t-[3px] backdrop-blur-sm
                                                            ${skill.status === 'completed' ? 'border-t-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border-border/50' :
                                                                skill.status === 'unlocked' ? 'border-t-amber-400 bg-card/80 border-border/60 hover:border-amber-400/50' :
                                                                    'border-t-zinc-700 bg-zinc-900/40 opacity-60 hover:opacity-100 border-border/30'}
                                                        `}
                                                    >
                                                        <CardHeader className="p-5">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <Badge variant={skill.status === 'completed' ? 'default' : 'secondary'} className={`text-[10px] bg-opacity-20 hover:bg-opacity-30 border-0 ${skill.status === 'completed' ? 'bg-emerald-500 text-emerald-500' :
                                                                    skill.status === 'unlocked' ? 'bg-amber-500 text-amber-500' :
                                                                        'bg-zinc-500 text-zinc-500'
                                                                    }`}>
                                                                    {skill.category}
                                                                </Badge>

                                                                {skill.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                                                                    skill.status === 'unlocked' ? <Unlock className="w-4 h-4 text-amber-500" /> :
                                                                        <Lock className="w-4 h-4 text-zinc-500" />}
                                                            </div>
                                                            <CardTitle className="text-lg leading-tight mb-2">{skill.name}</CardTitle>
                                                            <CardDescription className="line-clamp-2 text-xs">
                                                                {skill.description}
                                                            </CardDescription>
                                                        </CardHeader>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                {/* Visual fading for scroll area */}
                <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
            </main>

            {/* EXIT DIALOG */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 items-center justify-center flex mb-3">
                            <Ghost className="w-6 h-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center text-xl">Terminate Session?</DialogTitle>
                        <DialogDescription className="text-center">
                            Your current progression tree will be lost if you exit.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmExit}>
                            Exit Mode
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Skill Detail Dialog */}
            <Dialog open={!!selectedSkill} onOpenChange={(open) => !open && setSelectedSkill(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto gap-0 p-0 bg-card border-border/60 shadow-2xl">
                    {selectedSkill && (
                        <>
                            {/* Header Banner */}
                            <div className={`h-32 w-full relative flex items-end p-6 ${selectedSkill.status === 'completed' ? 'bg-gradient-to-br from-emerald-600 to-teal-600' :
                                selectedSkill.status === 'unlocked' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                                    'bg-gradient-to-br from-zinc-700 to-zinc-900'
                                }`}>
                                <div className="absolute right-6 top-6 opacity-20">
                                    <Target className="w-24 h-24" />
                                </div>
                                <div className="relative z-10 text-white">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                                            {selectedSkill.category}
                                        </Badge>
                                        <Badge className={`bg-black/30 text-white border-none backdrop-blur-md ${selectedSkill.status === 'completed' ? 'flex' : 'hidden'}`}>
                                            Mastered
                                        </Badge>
                                    </div>
                                    <DialogTitle className="text-2xl font-bold">{selectedSkill.name}</DialogTitle>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <DialogDescription className="text-muted-foreground leading-relaxed">
                                    {selectedSkill.description}
                                </DialogDescription>

                                {/* Resources */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center">
                                        <BookOpen className="w-3.5 h-3.5 mr-2" /> Learning Resources
                                    </h4>
                                    <div className="grid gap-2">
                                        {selectedSkill.resources.map((res, idx) => {
                                            const validUrl = (!res.url || res.url === '#' || res.url.includes('example.com'))
                                                ? `https://www.google.com/search?q=${encodeURIComponent(res.title + " " + selectedSkill.name + " tutorial")}`
                                                : res.url;

                                            return (
                                                <a
                                                    key={idx}
                                                    href={validUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/50 hover:border-emerald-500/30 transition-all group"
                                                >
                                                    <div className="p-2 rounded-lg bg-background text-foreground mr-3 group-hover:text-emerald-500 transition-colors">
                                                        {res.type === 'video' ? <Zap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm group-hover:text-primary transition-colors">{res.title}</div>
                                                        <div className="text-[10px] text-muted-foreground capitalize">{res.type}</div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Challenge Section */}
                                <div className="bg-muted/30 p-5 rounded-xl border border-border/50 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10" />

                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center relative z-10">
                                        <Trophy className="w-3.5 h-3.5 mr-2" />
                                        {selectedSkill.status === 'completed' ? 'Challenge Completed' : 'Skill Check'}
                                    </h4>

                                    {!showChallenge ? (
                                        <div className="relative z-10">
                                            {selectedSkill.status === 'completed' ? (
                                                <div className="flex items-center gap-3 text-emerald-500">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span className="font-medium">You have mastered this node!</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-sm text-foreground/80">Ready to prove your mastery? Complete this quick check to unlock this node.</p>
                                                    <Button onClick={() => setShowChallenge(true)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                                        Start Challenge
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 relative z-10">
                                            <p className="font-medium text-base">{selectedSkill.challenge.question}</p>
                                            <div className="space-y-2">
                                                {selectedSkill.challenge.options?.map((opt, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setChallengeAnswer(opt)}
                                                        className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${challengeAnswer === opt
                                                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                                                            : 'border-border hover:border-emerald-500/30 hover:bg-card'
                                                            }`}
                                                    >
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                onClick={submitAnswer}
                                                disabled={!challengeAnswer}
                                                className="w-full mt-2"
                                            >
                                                Submit & Unlock
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
