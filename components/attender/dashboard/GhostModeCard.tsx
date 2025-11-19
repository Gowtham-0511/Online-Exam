import { Ghost, ChevronRight, Sparkles, Shield, Zap } from 'lucide-react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const GhostModeCard = () => {
    const router = useRouter();

    return (
        <Card
            className="group relative overflow-hidden rounded-2xl border-none cursor-pointer transition-all duration-300 hover:shadow-2xl"
            onClick={() => router.push('/dashboard/attender/ghost-mode')}
        >
            {/* Background gradient using CSS variables */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary" />

            {/* Animated overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Decorative circles */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary-foreground/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />

            <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {/* Icon container */}
                        <div className="relative">
                            <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary-foreground/30 group-hover:ring-primary-foreground/50 transition-all duration-300 group-hover:scale-110">
                                <Ghost className="w-7 h-7 text-primary-foreground" />
                            </div>
                            {/* Pulsing indicator */}
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-primary-foreground animate-pulse" />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-primary-foreground mb-1 group-hover:translate-x-1 transition-transform duration-300">
                                Ghost Mode
                            </h3>
                            <p className="text-sm text-primary-foreground/80 font-medium">
                                Practice without pressure
                            </p>
                        </div>
                    </div>

                    {/* Arrow icon */}
                    <div className="w-10 h-10 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary-foreground/30 group-hover:translate-x-1 transition-all duration-300">
                        <ChevronRight className="w-5 h-5 text-primary-foreground" />
                    </div>
                </div>

                {/* Description */}
                <p className="text-primary-foreground/90 text-base leading-relaxed mb-6">
                    Learn and practice freely without saving any data. Perfect for stress-free experimentation,
                    trying new concepts, and building confidence!
                </p>

                {/* Features grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <Badge
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-2 bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all duration-300 text-primary-foreground"
                    >
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium truncate">Nothing Saved</span>
                    </Badge>
                    <Badge
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-2 bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all duration-300 text-primary-foreground"
                    >
                        <Sparkles className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium truncate">AI-Powered</span>
                    </Badge>
                    <Badge
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-2 bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all duration-300 text-primary-foreground"
                    >
                        <Zap className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium truncate">Instant Feedback</span>
                    </Badge>
                </div>

                {/* CTA Button */}
                <Button
                    variant="secondary"
                    className="inline-flex items-center gap-2 bg-card text-card-foreground px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                    <span>Enter Ghost Mode</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>

                {/* Info badge */}
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-primary-foreground/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span>All progress deleted on exit</span>
                </div>
            </div>
        </Card>
    );
};

export default GhostModeCard;