"use client";

import React from 'react';
import { useMsal } from "@azure/msal-react";
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Play, CheckCircle2, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PracticeSetPage() {
    const params = useParams();
    const router = useRouter();
    const setId = params.id;
    const { accounts } = useMsal();
    const email = accounts[0]?.username;

    const { data, isLoading } = useSWR(setId && email ? `/api/attender/practice/get-set-questions?setId=${setId}&email=${encodeURIComponent(email)}` : null, fetcher);

    if (isLoading) return (
        <div className="min-h-screen bg-background p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
            <Skeleton className="h-8 w-32" />
            <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
            </div>
            <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
        </div>
    );

    if (!data || !data.set) return (
        <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center">
            <h1 className="text-2xl font-bold">Session Not Found</h1>
            <Button onClick={() => router.push('/attender/practice')} className="mt-4">Back to Practice</Button>
        </div>
    );

    const { set, questions } = data;

    // Determine completion status
    const solvedCount = questions.filter((q: any) => q.hasPassed).length;
    const progress = Math.round((solvedCount / questions.length) * 100) || 0;

    return (
        <div className="min-h-screen bg-background p-6 lg:p-8 animate-in fade-in duration-500">
            <div className="max-w-5xl mx-auto space-y-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/attender/practice')}
                    className="gap-2 pl-0 hover:bg-transparent hover:text-primary -ml-2"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Sessions
                </Button>

                <div className="space-y-6 border-b border-border/50 pb-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-sm capitalize px-3 py-1 border-primary/20 bg-primary/5 text-primary">
                                {set.difficulty}
                            </Badge>
                            <Badge variant="secondary" className="text-sm capitalize px-3 py-1">
                                {set.questionType === 'mcq' ? 'Multiple Choice' : 'Coding Challenge'}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                                <Calendar className="w-4 h-4" />
                                {new Date(set.createdAt).toLocaleDateString()}
                            </div>
                        </div>

                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{set.title}</h1>
                            <p className="text-muted-foreground text-lg mt-2">
                                {set.topic} &bull; {questions.length} Questions
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-muted-foreground">{solvedCount} / {questions.length} Solved</span>
                            <span className="text-primary">{progress}% Complete</span>
                        </div>
                        <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                            <div
                                className="h-full bg-primary transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid gap-4">
                    {questions.map((q: any, i: number) => (
                        <div
                            key={q.id}
                            className="group relative flex items-center md:gap-6 gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                            onClick={() => router.push(`/practice/${q.id}`)}
                        >
                            <div className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-circle border-2 font-bold transition-colors shadow-sm",
                                q.hasPassed
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-background border-muted text-muted-foreground group-hover:border-primary group-hover:text-primary"
                            )}>
                                {q.hasPassed ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate pr-4 group-hover:text-primary transition-colors">
                                    {q.questionTitle || `Question ${i + 1}`}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    <Badge variant="outline" className="text-xs h-5 px-1.5 font-normal border-border">
                                        {q.language}
                                    </Badge>
                                    <span className="truncate">{q.weakArea || "General"}</span>
                                </div>
                            </div>

                            <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-5 h-5 text-primary fill-primary/20" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
