"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMsal } from "@azure/msal-react";
import {
    Ghost,
    ArrowLeft,
    Send,
    Activity,
    ShieldAlert,
    FlaskConical,
    FileSearch,
    Database,
    Loader2,
    CheckCircle2,
    XCircle,
    Info,
    Terminal,
    Code as CodeIcon,
    RefreshCw,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface CaseScenario {
    title: string;
    scenario: string;
    logs: string;
    dataPreview: string;
    pipelineCode: string;
    hint: string;
    rootCause: string;
}

interface Evaluation {
    score: number;
    feedback: string;
    deepDive: string;
    isCorrect: boolean;
}

const PipelinePathologist = () => {
    const router = useRouter();
    const { accounts } = useMsal();
    const session = accounts[0];

    const [currentCase, setCurrentCase] = useState<CaseScenario | null>(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [showExitWarning, setShowExitWarning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Initial load - generate first case
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
        setDiagnosis('');
        try {
            const res = await fetch('/api/attender/ghost-mode/pipeline-pathologist', {
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

    const handleDiagnosis = async () => {
        if (!diagnosis.trim() || isEvaluating) return;
        setIsEvaluating(true);
        try {
            const res = await fetch('/api/attender/ghost-mode/pipeline-pathologist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'evaluate',
                    currentCase,
                    userDiagnosis: diagnosis
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

    const confirmExit = () => {
        router.push('/ghost-mode');
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-background flex flex-col font-sans overflow-hidden relative">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            {/* Header */}
            <header className="flex-none h-16 border-b border-border/40 bg-background/80 backdrop-blur-md z-20 px-6">
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold tracking-tight">Pipeline Pathologist</h1>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Diagnostic Terminal</span>
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
                            New Case
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

            <main className="flex-1 flex gap-6 p-6 max-w-screen-2xl mx-auto w-full z-10 overflow-hidden min-h-0">

                {/* Left Section: Mission Briefing */}
                <div className="w-1/3 flex flex-col gap-6 animate-in">
                    <Card className="flex-1 bg-card/40 backdrop-blur-sm border-border/40 overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-border/40 bg-muted/20">
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-600 bg-orange-500/5">CRITICAL MISSION</Badge>
                                <span className="text-[10px] text-muted-foreground font-mono">CASE #{currentCase?.title.slice(0, 4).toUpperCase() || 'NEW'}</span>
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tight">{currentCase?.title || 'Loading Scenario...'}</CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-6">
                                <section>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5" />
                                        Case Description
                                    </h3>
                                    <p className="text-sm text-foreground/80 leading-relaxed font-sans">
                                        {currentCase?.scenario}
                                    </p>
                                </section>

                                {evaluation && (
                                    <section className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 animate-in">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">Evaluation Report</h3>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="text-3xl font-black text-orange-500">{evaluation.score}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase leading-tight">Mastery<br />Score</div>
                                        </div>
                                        <p className="text-sm text-foreground/90 font-medium mb-4">{evaluation.feedback}</p>
                                        <div className="p-3 bg-background/50 rounded-lg border border-border/40">
                                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Deep Dive</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{evaluation.deepDive}</p>
                                        </div>
                                    </section>
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>

                {/* Middle Section: Evidence Labs */}
                <div className="flex-1 flex flex-col gap-6 animate-in">
                    <Tabs defaultValue="logs" className="flex-1 flex flex-col">
                        <TabsList className="bg-muted/40 p-1 border border-border/40 w-fit">
                            <TabsTrigger value="logs" className="gap-2 px-6"><Activity className="w-4 h-4" /> System Logs</TabsTrigger>
                            <TabsTrigger value="data" className="gap-2 px-6"><Database className="w-4 h-4" /> Data Preview</TabsTrigger>
                            <TabsTrigger value="code" className="gap-2 px-6"><CodeIcon className="w-4 h-4" /> Pipeline Logic</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 mt-6 relative">
                            {isGenerating && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center">
                                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                                    <h3 className="text-xl font-bold">Initializing Laboratory</h3>
                                    <p className="text-sm text-muted-foreground">AI is architecting a new data bug scenario...</p>
                                </div>
                            )}

                            <TabsContent value="logs" className="m-0 h-full">
                                <Card className="h-full bg-slate-950 border-slate-800 text-slate-300 font-mono text-xs overflow-hidden flex flex-col shadow-2xl">
                                    <div className="border-b border-slate-800 px-4 py-2 bg-slate-900/50 flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-slate-500" /> std_out.log</span>
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1 p-4">
                                        <pre className="whitespace-pre-wrap leading-relaxed opacity-90 drop-shadow-sm">
                                            {currentCase?.logs}
                                        </pre>
                                    </ScrollArea>
                                </Card>
                            </TabsContent>

                            <TabsContent value="data" className="m-0 h-full">
                                <Card className="h-full bg-card/60 backdrop-blur-sm border-border/40 overflow-hidden flex flex-col shadow-xl">
                                    <div className="border-b border-border/40 px-4 py-3 flex items-center gap-2">
                                        <Search className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Messedup_Data_Sample.json</span>
                                    </div>
                                    <ScrollArea className="flex-1 p-6">
                                        <div className="font-mono text-sm leading-relaxed p-4 bg-muted/30 rounded-lg border border-border/40">
                                            {currentCase?.dataPreview}
                                        </div>
                                    </ScrollArea>
                                </Card>
                            </TabsContent>

                            <TabsContent value="code" className="m-0 h-full">
                                <Card className="h-full bg-[#1e1e1e] border-border/20 text-[#d4d4d4] font-mono text-sm overflow-hidden flex flex-col shadow-2xl">
                                    <div className="border-b border-[#2d2d2d] px-4 py-2 bg-[#252526] flex items-center justify-between">
                                        <span className="flex items-center gap-2"><FlaskConical className="w-3.5 h-3.5 text-blue-400" /> production_pipeline.py</span>
                                        <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">READ ONLY</Badge>
                                    </div>
                                    <ScrollArea className="flex-1 p-4">
                                        <pre className="whitespace-pre-wrap leading-relaxed">
                                            {currentCase?.pipelineCode}
                                        </pre>
                                    </ScrollArea>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Right Section: Diagnosis Terminal */}
                <div className="w-96 flex flex-col animate-in">
                    <Card className="flex-1 flex flex-col border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden shadow-2xl">
                        <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                            <CardTitle className="text-lg font-black flex items-center gap-3">
                                <FileSearch className="w-6 h-6 text-orange-500" />
                                Submit Diagnosis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col p-6 gap-6">
                            <div className="text-xs text-muted-foreground leading-relaxed italic p-4 bg-orange-500/5 rounded-xl border border-orange-500/20">
                                <span className="text-orange-500 font-bold not-italic block mb-1">INSTRUCTIONS</span>
                                "The patient (pipeline) is failing silently. Explain exactly why the data is corrupted based on the evidence."
                            </div>

                            {!evaluation ? (
                                <>
                                    <div className="flex-1 flex flex-col gap-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Root Cause Analysis</label>
                                        <Textarea
                                            placeholder="Example: The join on 'user_id' caused a Cartesian product because..."
                                            className="flex-1 bg-background/50 border-border/60 focus:border-orange-500/50 resize-none font-sans text-sm leading-relaxed p-4 rounded-xl transition-all"
                                            value={diagnosis}
                                            onChange={(e) => setDiagnosis(e.target.value)}
                                            disabled={isEvaluating}
                                        />
                                    </div>
                                    <Button
                                        className="w-full h-14 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-bold text-base transition-all active:scale-[0.98]"
                                        onClick={handleDiagnosis}
                                        disabled={!diagnosis.trim() || isEvaluating}
                                    >
                                        {isEvaluating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                                Analyzing Evidence...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5 mr-3" />
                                                Verify Logic
                                            </>
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col gap-6">
                                    <div className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${evaluation.isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                        {evaluation.isCorrect ? (
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                                                <XCircle className="w-6 h-6 text-rose-500" />
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-black uppercase tracking-tight">{evaluation.isCorrect ? 'Logic Confirmed' : 'Logic Flawed'}</span>
                                            <span className="text-xs text-muted-foreground font-medium">Confidence Level: {evaluation.score}%</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-5 bg-muted/30 rounded-2xl border border-border/40 overflow-y-auto max-h-[300px]">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-3 ml-1 tracking-widest">Your Analysis</span>
                                        <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-orange-500/30 pl-4">"{diagnosis}"</p>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        className="w-full h-12 font-bold"
                                        onClick={generateNewCase}
                                    >
                                        Next Patient Case
                                    </Button>
                                </div>
                            )}
                        </CardContent>
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
                        <DialogTitle className="text-center text-xl">Abandon Case?</DialogTitle>
                        <DialogDescription className="text-center">
                            The laboratory will be closed and all current diagnostic data will be shredded.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0 mt-4">
                        <Button variant="outline" onClick={() => setShowExitWarning(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmExit}>
                            Abandon
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PipelinePathologist;
