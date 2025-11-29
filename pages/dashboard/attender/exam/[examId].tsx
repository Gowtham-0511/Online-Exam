import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, ChevronLeft, ChevronRight, Flag, CheckCircle, AlertCircle, Menu, X, Save } from "lucide-react";
import Editor from "@monaco-editor/react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import toast from "react-hot-toast";

interface Question {
    id: string;
    question_text: string;
    question_type: "MCQ" | "CODING" | "TEXT";
    options?: string[];
    points: number;
}

interface Exam {
    id: string;
    title: string;
    duration_minutes: number;
}

export default function ExamPage() {
    const router = useRouter();
    const { examId } = router.query;

    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Fetch Exam Data
    useEffect(() => {
        if (!examId) return;

        const fetchExam = async () => {
            try {
                const response = await fetch(`/api/certificate/${examId}`);
                if (response.ok) {
                    const data = await response.json();
                    setExam(data.exam);
                    setQuestions(data.questions);
                    setTimeLeft(data.exam.duration_minutes * 60);
                } else {
                    toast.error("Failed to load exam");
                }
            } catch (error) {
                console.error("Error loading exam:", error);
                toast.error("Error loading exam");
            } finally {
                setIsLoading(false);
            }
        };

        fetchExam();
    }, [examId]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (value: any) => {
        const currentQ = questions[currentQuestionIndex];
        setAnswers(prev => ({
            ...prev,
            [currentQ.id]: value
        }));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/certificate/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    examId,
                    answers,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.passed) {
                    toast.success(data.message);
                    router.push(`/dashboard/attender/certificate/${data.certificateId}`);
                } else {
                    toast.error(data.message);
                    // Redirect to a "Failed" page or back to list
                    router.push("/dashboard/attender/certificate-exams");
                }
            } else {
                toast.error(data.message || "Submission failed");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error submitting exam:", error);
            toast.error("An error occurred while submitting.");
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="space-y-4 text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground">Loading Exam Environment...</p>
                </div>
            </div>
        );
    }

    if (!exam) return null;

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            <Head>
                <title>{exam.title} | Exam</title>
            </Head>

            {/* Header */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 p-0">
                            <QuestionList
                                questions={questions}
                                currentIndex={currentQuestionIndex}
                                answers={answers}
                                onSelect={(idx: number) => {
                                    setCurrentQuestionIndex(idx);
                                    setIsSidebarOpen(false);
                                }}
                            />
                        </SheetContent>
                    </Sheet>
                    <div>
                        <h1 className="font-semibold text-lg truncate max-w-[200px] md:max-w-md">{exam.title}</h1>
                        <p className="text-xs text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono font-medium ${timeLeft < 300 ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                        <Timer className="w-4 h-4" />
                        {formatTime(timeLeft)}
                    </div>
                    <Button onClick={handleSubmit} className="hidden sm:flex">Submit Test</Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar (Desktop) */}
                <div className="hidden lg:block w-64 border-r border-border bg-card/50">
                    <QuestionList
                        questions={questions}
                        currentIndex={currentQuestionIndex}
                        answers={answers}
                        onSelect={setCurrentQuestionIndex}
                    />
                </div>

                {/* Split View */}
                <div className="flex-1 flex flex-col min-w-0">
                    <ResizablePanelGroup direction="horizontal" className="flex-1">
                        {/* Left Panel: Question */}
                        <ResizablePanel defaultSize={40} minSize={30} className="flex flex-col">
                            <ScrollArea className="flex-1 p-6">
                                <div className="max-w-3xl mx-auto space-y-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <h2 className="text-xl font-semibold leading-tight">
                                            {currentQuestion.question_text}
                                        </h2>
                                        <Badge variant="outline" className="shrink-0">
                                            {currentQuestion.points} pts
                                        </Badge>
                                    </div>

                                    {currentQuestion.question_type === "MCQ" && (
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Select one option:</Label>
                                            <RadioGroup
                                                value={answers[currentQuestion.id] || ""}
                                                onValueChange={handleAnswerChange}
                                                className="space-y-3"
                                            >
                                                {currentQuestion.options?.map((option, idx) => (
                                                    <div key={idx} className={`flex items-center space-x-3 border rounded-lg p-4 transition-colors ${answers[currentQuestion.id] === option ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'}`}>
                                                        <RadioGroupItem value={option} id={`opt-${idx}`} />
                                                        <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer font-normal">
                                                            {option}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    )}

                                    {currentQuestion.question_type === "CODING" && (
                                        <div className="prose dark:prose-invert max-w-none">
                                            <p className="text-muted-foreground">
                                                Write your code in the editor to the right. Ensure your solution handles all edge cases.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Navigation Footer (Mobile/Tablet mainly, but useful everywhere) */}
                            <div className="p-4 border-t border-border flex justify-between items-center bg-card">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestionIndex === 0}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                                </Button>
                                <Button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                    disabled={currentQuestionIndex === questions.length - 1}
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Right Panel: Editor / Workspace */}
                        <ResizablePanel defaultSize={60} minSize={30}>
                            {currentQuestion.question_type === "CODING" ? (
                                <div className="h-full flex flex-col">
                                    <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-muted/30">
                                        <span className="text-xs font-medium text-muted-foreground">Python 3</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                                            <Save className="w-3 h-3 mr-1" /> Auto-saved
                                        </Button>
                                    </div>
                                    <div className="flex-1">
                                        <Editor
                                            height="100%"
                                            defaultLanguage="python"
                                            theme="vs-dark"
                                            value={answers[currentQuestion.id] || "# Write your code here\n"}
                                            onChange={handleAnswerChange}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center bg-muted/10 text-muted-foreground p-6 text-center">
                                    <div className="max-w-xs space-y-2">
                                        <CheckCircle className="w-12 h-12 mx-auto opacity-20" />
                                        <p>No coding required for this question.</p>
                                        <p className="text-sm opacity-60">Focus on selecting the correct option on the left.</p>
                                    </div>
                                </div>
                            )}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </div>
    );
}

interface QuestionListProps {
    questions: Question[];
    currentIndex: number;
    answers: Record<string, any>;
    onSelect: (index: number) => void;
}

const QuestionList = ({ questions, currentIndex, answers, onSelect }: QuestionListProps) => (
    <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
            <h3 className="font-semibold mb-1">Questions</h3>
            <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Current</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Answered</span>
            </div>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-4 gap-2">
                {questions.map((q: Question, idx: number) => {
                    const isAnswered = !!answers[q.id];
                    const isCurrent = idx === currentIndex;

                    return (
                        <button
                            key={q.id}
                            onClick={() => onSelect(idx)}
                            className={`
                                h-10 rounded-md flex items-center justify-center text-sm font-medium transition-all
                                ${isCurrent
                                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                                    : isAnswered
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'}
                            `}
                        >
                            {idx + 1}
                        </button>
                    );
                })}
            </div>
        </ScrollArea>
    </div>
);
