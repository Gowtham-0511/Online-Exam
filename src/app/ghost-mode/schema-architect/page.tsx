"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import {
    Ghost,
    ArrowLeft,
    Send,
    LayoutTemplate,
    Database,
    Loader2,
    CheckCircle2,
    XCircle,
    Info,
    Terminal,
    Code as CodeIcon,
    RefreshCw,
    Search,
    Users,
    TrendingUp,
    DollarSign,
    Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface SchemaCase {
    title: string;
    stakeholder: string;
    businessRequest: string;
    constraints: string[];
    recommendedPlatform: string;
    evaluationCriteria: string;
}

interface SchemaEvaluation {
    score: number;
    feedback: string;
    performanceAnalysis: string;
    costImpact: string;
    isApproved: boolean;
}

const SchemaArchitect = () => {
    const router = useRouter();
    const { accounts } = useMsal();

    const [currentCase, setCurrentCase] = useState<SchemaCase | null>(null);
    const [userModel, setUserModel] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [evaluation, setEvaluation] = useState<SchemaEvaluation | null>(null);
    const [showExitWarning, setShowExitWarning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        generateNewCase();
    }, []);

    useGSAP(() => {
        gsap.from(".animate-in", {
            y: 20,
            opacity: 0,
            stagger: 0.1,
            duration: 0.6,
            ease: "power2.out"
        });
    }, { scope: containerRef, dependencies: [currentCase] });

    const generateNewCase = async () => {
        setIsGenerating(true);
        setEvaluation(null);
        setUserModel('');
        try {
            const res = await fetch('/api/attender/ghost-mode/schema-architect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate' })
            });
            const data = await res.json();
            setCurrentCase(data);
        } catch (error) {
            console.error('Failed to generate case:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleModeling = async () => {
        if (!userModel.trim() || isEvaluating) return;
        setIsEvaluating(true);
        try {
            const res = await fetch('/api/attender/ghost-mode/schema-architect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'evaluate',
                    currentCase,
                    userModel: userModel
                })
            });
            const data = await res.json();
            setEvaluation(data);
        } catch (error) {
            console.error('Failed to evaluate:', error);
        } finally {
            setIsEvaluating(false);
        }
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-background flex flex-col font-sans overflow-hidden relative">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            {/* Header */}
            <header className="flex-none h-16 border-b border-border/40 bg-background/80 backdrop-blur-md z-20 px-6">
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
                            <LayoutTemplate className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold tracking-tight">Schema Architect</h1>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Modeling Studio</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 font-medium"
                            onClick={generateNewCase}
                            disabled={isGenerating}
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            New Request
                        </Button>
                        <Button
                            onClick={() => setShowExitWarning(true)}
                            variant="destructive"
                            size="sm"
                            className="h-9 px-4 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Exit
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex gap-8 p-8 max-w-screen-2xl mx-auto w-full z-10 overflow-hidden min-h-0">

                {/* Left Section: Business Briefing */}
                <div className="w-2/5 flex flex-col gap-6 animate-in">
                    <Card className="flex-1 bg-card/40 backdrop-blur-sm border-border/40 overflow-hidden flex flex-col shadow-xl">
                        <CardHeader className="border-b border-border/40 bg-muted/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Users className="w-24 h-24" />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <Badge variant="secondary" className="px-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                    {currentCase?.recommendedPlatform} MISSION
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-mono">STAKEHOLDER: {currentCase?.stakeholder.toUpperCase()}</span>
                            </div>
                            <CardTitle className="text-3xl font-black tracking-tight leading-tight">
                                {currentCase?.title || 'Drafting Request...'}
                            </CardTitle>
                        </CardHeader>

                        <ScrollArea className="flex-1 p-8">
                            {isGenerating ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-4 bg-muted rounded w-full" />
                                    <div className="h-4 bg-muted rounded w-5/6" />
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            Business Requirement
                                        </h3>
                                        <p className="text-base text-foreground/90 leading-relaxed font-medium">
                                            "{currentCase?.businessRequest}"
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                                            <Box className="w-3.5 h-3.5" />
                                            Technical Constraints
                                        </h3>
                                        <ul className="space-y-3">
                                            {currentCase?.constraints.map((c, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                                    {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>

                                    <section className="p-5 bg-muted/30 rounded-2xl border border-border/40">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Success Criteria</h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                                            {currentCase?.evaluationCriteria}
                                        </p>
                                    </section>
                                </div>
                            )}
                        </ScrollArea>
                    </Card>
                </div>

                {/* Right Section: Modeling Canvas */}
                <div className="flex-1 flex flex-col gap-6 animate-in">
                    <Card className="flex-1 flex flex-col border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden shadow-2xl relative">
                        {isGenerating && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                <span className="text-sm font-bold tracking-widest uppercase">Consulting Stakeholders</span>
                            </div>
                        )}

                        {!evaluation ? (
                            <>
                                <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                                    <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-3">
                                        <CodeIcon className="w-5 h-5 text-blue-500" />
                                        Schema Blueprint
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col p-0">
                                    <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-slate-500">model_design.sql / .yaml</span>
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                                        </div>
                                    </div>
                                    <Textarea
                                        placeholder="Define your tables, relationships, and optimization strategies (clustering, partitioning)..."
                                        className="flex-1 bg-slate-950 border-none text-slate-300 font-mono text-sm leading-relaxed p-8 focus-visible:ring-0 resize-none"
                                        value={userModel}
                                        onChange={(e) => setUserModel(e.target.value)}
                                        disabled={isEvaluating}
                                    />
                                    <div className="p-6 border-t border-border/40 bg-background/50">
                                        <Button
                                            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 font-black text-base uppercase tracking-widest transition-all active:scale-[0.98]"
                                            onClick={handleModeling}
                                            disabled={!userModel.trim() || isEvaluating}
                                        >
                                            {isEvaluating ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Send className="w-5 h-5 mr-3" />}
                                            Submit for Peer Review
                                        </Button>
                                    </div>
                                </CardContent>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <CardHeader className="border-b border-border/40 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-black uppercase tracking-tighter">Architecture Review</CardTitle>
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className={`text-3xl font-black ${evaluation.isApproved ? 'text-emerald-500' : 'text-rose-500'}`}>{evaluation.score}</div>
                                                <div className="text-[8px] font-bold uppercase text-muted-foreground">Architect Score</div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEvaluation(null)}
                                            >
                                                Revise Model
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <ScrollArea className="flex-1 p-8">
                                    <div className="space-y-8">
                                        <div className={`p-6 rounded-2xl border-2 flex items-start gap-4 ${evaluation.isApproved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                            {evaluation.isApproved ? <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1" /> : <XCircle className="w-6 h-6 text-rose-500 mt-1" />}
                                            <div>
                                                <h4 className="font-bold mb-1 uppercase text-sm">{evaluation.isApproved ? 'Architecture Approved' : 'Review Failed'}</h4>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{evaluation.feedback}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-border/40 shadow-inner">
                                                <div className="flex items-center gap-2 mb-4 text-blue-500">
                                                    <TrendingUp className="w-4 h-4" />
                                                    <h5 className="text-[10px] font-black uppercase tracking-widest">Performance Profile</h5>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed italic">{evaluation.performanceAnalysis}</p>
                                            </div>
                                            <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-border/40 shadow-inner">
                                                <div className="flex items-center gap-2 mb-4 text-amber-500">
                                                    <DollarSign className="w-4 h-4" />
                                                    <h5 className="text-[10px] font-black uppercase tracking-widest">Cost Projection</h5>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed italic">{evaluation.costImpact}</p>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full h-12 bg-blue-600 font-bold"
                                            onClick={generateNewCase}
                                        >
                                            Accept Next Challenge
                                        </Button>
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </Card>
                </div>

            </main>

            {/* Exit Dialog */}
            <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 items-center justify-center flex mb-3">
                            <Ghost className="w-6 h-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center text-xl">Close Studio?</DialogTitle>
                        <DialogDescription className="text-center">
                            Your unsaved blueprints and modeling session will be permanently shredded.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Keep Designing
                        </Button>
                        <Button variant="destructive" onClick={() => router.push('/ghost-mode')}>
                            Close Studio
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SchemaArchitect;
