import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    History,
    BookOpen,
    Play,
    ChevronRight,
    Search,
    RefreshCw
} from 'lucide-react';
import { CompletedExamCard } from './CompletedExamCard';
import { CompletedExam } from '@/types/attender';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompletedExamsSectionProps {
    exams: CompletedExam[];
    isLoading: boolean;
    onExamClick: (examId: string, email: string) => void;
    onViewAll: () => void;
    userEmail: string;
}

export const CompletedExamsSection: React.FC<CompletedExamsSectionProps> = ({
    exams,
    isLoading,
    onExamClick,
    onViewAll,
    userEmail
}) => {
    if (isLoading) {
        return <LoadingState />;
    }

    if (exams.length === 0) {
        return <EmptyState onViewAll={onViewAll} />;
    }

    return (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col h-full shadow-sm">
            <ScrollArea className="h-[400px]">
                <div className="p-1 space-y-1">
                    {exams.map((exam, index) => (
                        <div key={exam.id} className={cn(
                            "animate-in fade-in slide-in-from-bottom-2 duration-300",
                            `delay-${index * 100}`
                        )}>
                            <CompletedExamCard
                                exam={exam}
                                onClick={() => onExamClick(exam.examId, userEmail)}
                            />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
};

const LoadingState = () => (
    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 p-3 rounded-lg border border-border/40 bg-card">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-12 rounded-md shrink-0" />
                </div>
            ))}
        </CardContent>
    </Card>
);

const EmptyState = ({ onViewAll }: { onViewAll: () => void }) => (
    <Card className="border-dashed border-2 border-muted bg-muted/5 shadow-none h-full flex flex-col justify-center">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
                <History className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No history found</h3>
            <p className="text-xs text-muted-foreground max-w-[220px] mb-4">
                Your past exam results and performance analytics will appear here.
            </p>
            <Button
                variant="outline"
                size="sm"
                onClick={onViewAll}
                className="gap-2 text-xs"
            >
                <Search className="h-3.5 w-3.5" />
                Explore Exams
            </Button>
        </CardContent>
    </Card>
);