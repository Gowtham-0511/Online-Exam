import { ReactNode } from 'react';
import { Clock, AlertTriangle, Save, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface ExamLayoutProps {
    children: ReactNode;
    examTitle: string;
    timeLeft: number;
    totalTime: number;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    violations: number;
    isOnline: boolean;
    lastSaved: Date | null;
    isSaving: boolean;
}

export default function ExamLayout({
    children,
    examTitle,
    timeLeft,
    totalTime,
    theme,
    onThemeToggle,
    violations,
    isOnline,
    lastSaved,
    isSaving,
}: ExamLayoutProps) {
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const timePercentage = (timeLeft / totalTime) * 100;
    const isTimeWarning = timePercentage < 20;
    const isTimeCritical = timePercentage < 10;

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Top Navigation Bar */}
            <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">EX</span>
                        </div>
                        <h1 className="font-semibold text-foreground text-lg">{examTitle}</h1>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <Badge variant="outline" className="font-mono">
                        Live Exam
                    </Badge>
                </div>

                <div className="flex items-center gap-4">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isTimeCritical
                            ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                            : isTimeWarning
                                ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                                : 'bg-muted'
                        }`}>
                        <Clock className={`w-4 h-4 ${isTimeCritical ? 'animate-pulse' : ''}`} />
                        <span className="font-mono font-semibold text-sm">
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    {/* Violations Warning */}
                    {violations > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-semibold text-sm">{violations} violations</span>
                        </div>
                    )}

                    {/* Save Status */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isSaving ? (
                            <>
                                <Save className="w-4 h-4 animate-pulse" />
                                <span>Saving...</span>
                            </>
                        ) : lastSaved ? (
                            <>
                                <Save className="w-4 h-4 text-green-500" />
                                <span>Saved</span>
                            </>
                        ) : null}
                    </div>

                    {/* Online Status */}
                    <div className="flex items-center gap-2">
                        {isOnline ? (
                            <Wifi className="w-4 h-4 text-green-500" />
                        ) : (
                            <WifiOff className="w-4 h-4 text-red-500" />
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={onThemeToggle}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        {theme === 'dark' ? '🌙' : '☀️'}
                    </button>
                </div>
            </header>

            {/* Time Progress Bar */}
            <div className="h-1">
                <Progress
                    value={timePercentage}
                    className={`h-full ${isTimeCritical
                            ? '[&>div]:bg-red-500'
                            : isTimeWarning
                                ? '[&>div]:bg-yellow-500'
                                : ''
                        }`}
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}