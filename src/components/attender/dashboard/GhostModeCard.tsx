import { Ghost, ChevronRight, Sparkles, Shield, Zap } from 'lucide-react';
// import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const GhostModeCard = () => {
    const router = useRouter();

    return (
        <Card className="bg-slate-500/5 border-slate-500/20 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 group-hover:bg-slate-500/20 transition-colors">
                            <Ghost className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Ghost Mode</h3>
                            <p className="text-xs text-muted-foreground">Practice without pressure</p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 border-slate-500/20">
                        Beta
                    </Badge>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    Learn and practice freely without saving any data. Perfect for stress-free experimentation.
                </p>

                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs py-0.5 h-5 bg-background/50 border-slate-200 dark:border-slate-800 text-muted-foreground">
                        <Shield className="w-3 h-3 mr-1" /> No Save
                    </Badge>
                    <Badge variant="outline" className="text-xs py-0.5 h-5 bg-background/50 border-slate-200 dark:border-slate-800 text-muted-foreground">
                        <Sparkles className="w-3 h-3 mr-1" /> AI-Powered
                    </Badge>
                </div>

                <Button
                    className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                    onClick={() => router.push('/ghost-mode')}
                >
                    <span>Enter Ghost Mode</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </CardContent>
        </Card>
    );
};

export default GhostModeCard;