"use client";

import { Ghost, ChevronRight, Sparkles, Shield, EyeOff, Terminal } from 'lucide-react';
import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const GhostModeCard = () => {
    const router = useRouter();
    const containerRef = useRef(null);
    const glowRef1 = useRef(null);
    const glowRef2 = useRef(null);
    const iconRef = useRef(null);

    useGSAP(() => {
        // Floating background animation
        gsap.to([glowRef1.current, glowRef2.current], {
            y: "20px",
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: 0.5
        });

        // Hover effect setup is handled via CSS group-hover for simplicity in React, 
        // but we can add entrance animations here
        gsap.from(containerRef.current, {
            autoAlpha: 0,
            y: 20,
            duration: 0.8,
            ease: "power2.out"
        });

        gsap.from(".ghost-feature-tag", {
            autoAlpha: 0,
            x: -10,
            duration: 0.5,
            stagger: 0.1,
            delay: 0.3,
            ease: "power2.out",
            scope: containerRef
        });

    }, { scope: containerRef });

    return (
        <Card ref={containerRef} className="relative overflow-hidden border-border bg-card text-card-foreground shadow-lg group isolate">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-indigo-500/5 dark:from-violet-950/20 dark:to-indigo-950/20" />
                <div ref={glowRef1} className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                <div ref={glowRef2} className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-[0.03] text-foreground" />
            </div>

            <CardContent className="relative z-10 p-0">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 p-6 lg:p-8">

                    {/* Left Section: Icon & Main Text */}
                    <div className="flex items-start gap-6">
                        <div className="relative group/icon">
                            <div className="absolute inset-0 bg-violet-500/20 dark:bg-violet-500/10 blur-xl rounded-full opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500" />
                            <div ref={iconRef} className="relative h-16 w-16 rounded-2xl bg-muted/50 border border-border backdrop-blur-md flex items-center justify-center shadow-sm group-hover/icon:scale-105 transition-transform duration-300">
                                <Ghost className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                            </div>
                            <Badge
                                variant="secondary"
                                className="absolute -top-2 -right-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 backdrop-blur-sm"
                            >
                                Beta
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                    Ghost Mode
                                </h2>
                                <span className="flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                            </div>
                            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                                Enter the shadows. Practice coding challenges anonymously without affecting your rank or public profile. Experiments stay local.
                            </p>

                            <div className="flex flex-wrap gap-2 pt-1">
                                <FeatureTag icon={Shield} text="No Trace" />
                                <FeatureTag icon={EyeOff} text="Incognito" />
                                <FeatureTag icon={Terminal} text="Sandboxed" />
                            </div>
                        </div>
                    </div>

                    {/* Right Section: Action */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 lg:pl-6 lg:border-l border-border/50">
                        <div className="hidden lg:block text-right space-y-1">
                            <div className="text-sm font-medium text-foreground">Ready to vanish?</div>
                            <div className="text-xs text-muted-foreground">Session resets on exit</div>
                        </div>

                        <Button
                            onClick={() => router.push('/ghost-mode')}
                            size="lg"
                            className="w-full sm:w-auto min-w-[160px] h-12 shadow-md hover:shadow-lg transition-all duration-300 group/btn relative overflow-hidden"
                            variant="default"
                        >
                            <span className="relative z-10 flex items-center">
                                Enter Mode
                                <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

function FeatureTag({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="ghost-feature-tag flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors hover:text-foreground cursor-default">
            <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>{text}</span>
        </div>
    );
}

export default GhostModeCard;