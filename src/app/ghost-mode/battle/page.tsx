"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Swords,
    Trophy,
    Timer,
    Code,
    Cpu,
    Zap,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Play,
    Loader2,
    Skull
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import Editor from "@monaco-editor/react";
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type BattleState = 'lobby' | 'matching' | 'battle' | 'result';

export default function BattleArenaPage() {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [gameState, setGameState] = useState<BattleState>('lobby');
    const [difficulty, setDifficulty] = useState('medium');
    const [language, setLanguage] = useState('python');
    const [battleData, setBattleData] = useState<any>(null);
    const [code, setCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(600);
    const [opponentProgress, setOpponentProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    // GSAP Animations
    useGSAP(() => {
        if (gameState === 'lobby') {
            gsap.from(".lobby-item", {
                y: 20,
                opacity: 0,
                stagger: 0.1,
                duration: 0.6,
                ease: "power2.out"
            });
        } else if (gameState === 'battle') {
            gsap.from(".battle-ui", {
                y: 20,
                opacity: 0,
                stagger: 0.05,
                duration: 0.5,
                ease: "power2.out"
            });
        }
    }, { scope: containerRef, dependencies: [gameState] });

    // Timer and Opponent AI Logic
    useEffect(() => {
        if (gameState !== 'battle') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Simulate opponent progress
        // Randomly increment progress, aiming to finish near the end of the timer or slightly before
        const opponentInterval = setInterval(() => {
            setOpponentProgress(prev => {
                if (prev >= 100) return 100;
                // Random increment
                const increment = Math.random() * 2;
                // Boost speed if difficulty is hard
                const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'easy' ? 0.8 : 1;
                return Math.min(prev + (increment * multiplier), 100);
            });
        }, 2000);

        return () => {
            clearInterval(timer);
            clearInterval(opponentInterval);
        };
    }, [gameState, difficulty]);


    // Handlers
    const handleFindMatch = async () => {
        setGameState('matching');

        // Simulate searching visual
        await new Promise(r => setTimeout(r, 1500));

        try {
            const res = await fetch('/api/ghost-mode/battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty, language })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setBattleData(data);
            setCode(data.starterCode || '');
            setTimeLeft(data.timeLimit || 600);
            setOpponentProgress(0);
            setGameState('battle');

        } catch (error: any) {
            toast.error("Failed to find a match: " + error.message);
            setGameState('lobby');
        }
    };

    const handleTimeOut = () => {
        setResult({
            passed: false,
            score: 0,
            feedback: "Time limit exceeded. The Ghost caught you.",
            outcome: 'defeat'
        });
        setGameState('result');
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/ghost-mode/battle/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language,
                    question: battleData.description,
                    testCases: battleData.testCases
                })
            });
            const evaluation = await res.json();

            const isVictory = evaluation.passed && opponentProgress < 100;

            setResult({
                ...evaluation,
                outcome: isVictory ? 'victory' : 'defeat'
            });
            setGameState('result');

        } catch (error) {
            toast.error("Submission failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Helpers
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-background text-foreground font-sans selection:bg-rose-500/30">

            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-rose-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full h-16 border-b border-border/40 bg-background/80 backdrop-blur-md z-50 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/ghost-mode')} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                            <Swords className="w-5 h-5" />
                        </div>
                        <span className="font-bold tracking-tight">Battle Arena</span>
                    </div>
                </div>

                {gameState === 'battle' && (
                    <div className="flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                        <div className="flex flex-col items-center w-64 gap-1">
                            <div className="flex justify-between w-full text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                <span>You</span>
                                <span>Ghost Bot</span>
                            </div>
                            <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                {/* Opponent Bar (Right to Left) */}
                                <div
                                    className="absolute right-0 h-full bg-rose-500 transition-all duration-1000 ease-linear"
                                    style={{ width: `${opponentProgress}%` }}
                                />
                                {/* Player Bar (Left to Right) - Optional if we had real-time test passing */}
                                {/* For now we just show Opponent encroaching */}
                            </div>
                        </div>
                        <div className={`font-mono font-bold text-xl ${timeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-foreground'}`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="pt-16 min-h-screen flex flex-col relative z-10">

                {gameState === 'lobby' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-2xl mx-auto w-full">
                        <div className="text-center space-y-4 lobby-item">
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
                                    Anonymous PVP
                                </span>
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                Enter the colosseum. Challenge AI ghosts or random peers to algorithmic duels.
                            </p>
                        </div>

                        <Card className="w-full bg-card/50 backdrop-blur-sm border-border lobby-item">
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium uppercase text-muted-foreground">Difficulty</label>
                                        <Select value={difficulty} onValueChange={setDifficulty}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="easy">Easy</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="hard">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium uppercase text-muted-foreground">Language</label>
                                        <Select value={language} onValueChange={setLanguage}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="python">Python</SelectItem>
                                                <SelectItem value="sql">SQL (Standard)</SelectItem>
                                                <SelectItem value="pyspark">PySpark (Databricks)</SelectItem>
                                                <SelectItem value="snowflake">Snowflake SQL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                <Button
                                    size="lg"
                                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 shadow-lg shadow-rose-900/20"
                                    onClick={handleFindMatch}
                                >
                                    <Swords className="w-5 h-5 mr-3" />
                                    Find Match
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {gameState === 'matching' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping" />
                            <div className="relative bg-card border border-rose-500/30 p-8 rounded-full">
                                <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                            </div>
                        </div>
                        <h2 className="text-xl font-medium animate-pulse">Searching for opponent...</h2>
                    </div>
                )}

                {gameState === 'battle' && battleData && (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 h-[calc(100vh-64px)] overflow-hidden">
                        {/* Left: Problem */}
                        <div className="p-6 overflow-y-auto border-r border-border/40 bg-card/30 battle-ui">
                            <div className="max-w-xl mx-auto space-y-6">
                                <div>
                                    <Badge variant="outline" className="mb-4 border-rose-500/20 text-rose-500 bg-rose-500/5 uppercase tracking-wider">
                                        {battleData.difficulty} Challenge
                                    </Badge>
                                    <h2 className="text-2xl font-bold mb-2">{battleData.title}</h2>
                                    <div className="prose prose-invert prose-sm">
                                        <ReactMarkdown>{battleData.description}</ReactMarkdown>
                                    </div>
                                </div>

                                <Card className="bg-zinc-900/50 border-white/5">
                                    <CardContent className="p-4 space-y-4">
                                        <h3 className="font-medium text-sm text-zinc-400 uppercase tracking-wider">Test Cases</h3>
                                        {battleData.testCases.map((tc: any, i: number) => (
                                            !tc.isHidden && (
                                                <div key={i} className="text-xs font-mono space-y-1 bg-black/20 p-2 rounded">
                                                    <div className="text-zinc-500">Input: <span className="text-zinc-300">{tc.input}</span></div>
                                                    <div className="text-zinc-500">Expected: <span className="text-emerald-400">{tc.expectedOutput}</span></div>
                                                </div>
                                            )
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Right: Editor */}
                        <div className="flex flex-col bg-[#1e1e1e] battle-ui relative">
                            <Editor
                                height="100%"
                                language={language === 'pyspark' ? 'python' : (language === 'snowflake' ? 'sql' : language)}
                                value={code}
                                onChange={(val) => setCode(val || '')}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    padding: { top: 20 },
                                    scrollBeyondLastLine: false,
                                }}
                            />

                            <div className="absolute bottom-6 right-6 flex gap-3">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                                    Submit Solution
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'result' && result && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className={`p-8 rounded-full border-4 ${result.outcome === 'victory' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-red-500/10 border-red-500 text-red-500'}`}>
                            {result.outcome === 'victory' ? (
                                <Trophy className="w-16 h-16" />
                            ) : (
                                <Skull className="w-16 h-16" />
                            )}
                        </div>

                        <div className="text-center space-y-2">
                            <h1 className="text-4xl font-extrabold uppercase tracking-widest">{result.outcome}</h1>
                            <p className="text-muted-foreground">{result.outcome === 'victory' ? 'You defeated the Ghost Bot!' : 'Ghost Bot claimed this round.'}</p>
                        </div>

                        <Card className="w-full max-w-md bg-card/50 backdrop-blur-md">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Validation Score</span>
                                    <span className={`text-xl font-bold ${result.score > 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{result.score}%</span>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Feedback</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{result.feedback}</p>
                                </div>
                                {result.failedCase && (
                                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-xs font-mono">
                                        <div className="text-red-400 font-bold mb-1">Failed Case</div>
                                        <div>
                                            <span className="font-semibold text-zinc-500">Input:</span>{' '}
                                            {typeof result.failedCase.input === 'object' ? JSON.stringify(result.failedCase.input) : result.failedCase.input}
                                        </div>
                                        <div className="mt-1">
                                            <span className="font-semibold text-emerald-500/80">Expected:</span>{' '}
                                            {typeof result.failedCase.expected === 'object' ? JSON.stringify(result.failedCase.expected) : result.failedCase.expected}
                                        </div>
                                        <div className="mt-1">
                                            <span className="font-semibold text-red-500/80">Actual:</span>{' '}
                                            {typeof result.failedCase.actual === 'object' ? JSON.stringify(result.failedCase.actual) : result.failedCase.actual}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => router.push('/ghost-mode')}>Exit Battle</Button>
                            <Button onClick={() => setGameState('lobby')}>Play Again</Button>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
