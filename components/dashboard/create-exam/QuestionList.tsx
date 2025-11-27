import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Code, CheckCircle2, AlertTriangle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
    id: string;
    question: string;
    difficulty?: string;
    marks?: number;
    type?: string;
    tags?: string[];
}

interface QuestionListProps {
    questions: Question[];
    onDelete: (id: string) => void;
    validationResults: { [key: number]: any };
}

export default function QuestionList({ questions, onDelete, validationResults }: QuestionListProps) {
    if (questions.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Code className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No questions added yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Use the AI generator or manually add questions to build your assessment.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {questions.map((q, index) => {
                const validation = validationResults[index];
                const isValid = validation?.isValid;
                const hasIssues = validation?.issues?.length > 0;

                return (
                    <Card key={q.id || index} className="group hover:shadow-md transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary">
                        <CardContent className="p-4 flex items-start gap-4">
                            <div className="mt-1 text-muted-foreground/50 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs font-mono">
                                                Q{index + 1}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-xs capitalize",
                                                    q.difficulty === 'easy' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                    q.difficulty === 'medium' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                                    q.difficulty === 'hard' && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                                )}
                                            >
                                                {q.difficulty || 'Medium'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {q.marks} pts
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-medium line-clamp-2">
                                            {q.question}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => onDelete(q.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize">{q.type}</span>
                                    <span>•</span>
                                    <div className="flex gap-1">
                                        {q.tags?.slice(0, 3).map(tag => (
                                            <span key={tag} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                                {tag}
                                            </span>
                                        ))}
                                        {q.tags && q.tags.length > 3 && (
                                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                                +{q.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Validation Status Indicator */}
                                {validation && (
                                    <div className={cn(
                                        "text-xs flex items-center gap-1.5 mt-2 p-2 rounded",
                                        isValid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
                                            "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                    )}>
                                        {isValid ? (
                                            <>
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Validated successfully</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>Validation issues found</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
