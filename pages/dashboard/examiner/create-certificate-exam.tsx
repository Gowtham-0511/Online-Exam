import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import toast from "react-hot-toast";
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Plus, Trash2, Save, ArrowLeft, CheckCircle, AlertCircle,
    FileText, Clock, Target, Award, Code, List, Settings,
    ChevronRight, Eye, LayoutTemplate, MoveUp, MoveDown
} from "lucide-react";

// Types
interface Question {
    id: string;
    text: string;
    type: 'MCQ' | 'CODING' | 'TEXT';
    options?: string[];
    correctAnswer?: string;
    points: number;
}

interface ExamForm {
    title: string;
    description: string;
    duration: number;
    passingScore: number;
    isPublished: boolean;
}

export default function CreateCertificateExam() {
    const { data: session } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("details");
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<ExamForm>({
        title: "",
        description: "",
        duration: 60,
        passingScore: 70,
        isPublished: false
    });

    const [questions, setQuestions] = useState<Question[]>([]);

    // Handlers
    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: crypto.randomUUID(),
            text: "",
            type: "MCQ",
            options: ["", "", "", ""],
            correctAnswer: "",
            points: 10
        };
        setQuestions([...questions, newQuestion]);
    };

    const handleRemoveQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, field: keyof Question, value: any) => {
        setQuestions(questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        ));
    };

    const updateOption = (qId: string, index: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id === qId && q.options) {
                const newOptions = [...q.options];
                newOptions[index] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const handleSave = async () => {
        if (!formData.title) {
            toast.error("Please enter an exam title");
            return;
        }
        if (questions.length === 0) {
            toast.error("Please add at least one question");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/certificate/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    questions
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create exam');
            }

            toast.success("Certificate Exam Created Successfully!");
            router.push("/dashboard/examiner/view-exams");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create exam");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <UnifiedDashboardLayout role="examiner">
            <Head>
                <title>Create Certificate Exam | SysRank</title>
            </Head>

            <div className="min-h-screen bg-background/50 pb-20">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.back()}
                                    className="hover:bg-muted/50"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                                        Create Certificate Exam
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        Design a new certification challenge
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => router.back()}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={isLoading}>
                                    {isLoading ? "Saving..." : "Create Exam"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                            <TabsTrigger value="details">Exam Details</TabsTrigger>
                            <TabsTrigger value="questions">Questions</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        {/* Exam Details Tab */}
                        <TabsContent value="details" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                    <CardDescription>
                                        Set the core details for your certificate exam.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Exam Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g. Advanced React Certification"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Describe what this exam covers..."
                                            className="min-h-[120px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="duration">Duration (minutes)</Label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="duration"
                                                    type="number"
                                                    className="pl-9"
                                                    value={formData.duration}
                                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="passingScore">Passing Score (%)</Label>
                                            <div className="relative">
                                                <Target className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="passingScore"
                                                    type="number"
                                                    className="pl-9"
                                                    max={100}
                                                    value={formData.passingScore}
                                                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Questions Tab */}
                        <TabsContent value="questions" className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
                                <Button onClick={handleAddQuestion} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Question
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {questions.length === 0 ? (
                                    <Card className="border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="p-4 rounded-full bg-muted/50 mb-4">
                                                <List className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium">No questions added</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Start building your exam by adding questions.
                                            </p>
                                            <Button onClick={handleAddQuestion} variant="outline">
                                                Add Your First Question
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    questions.map((q, index) => (
                                        <Card key={q.id} className="relative group">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                                            {index + 1}
                                                        </Badge>
                                                        <Select
                                                            value={q.type}
                                                            onValueChange={(val: any) => updateQuestion(q.id, 'type', val)}
                                                        >
                                                            <SelectTrigger className="w-[140px] h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="MCQ">Multiple Choice</SelectItem>
                                                                <SelectItem value="CODING">Coding</SelectItem>
                                                                <SelectItem value="TEXT">Short Answer</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded text-xs">
                                                            <Award className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <Input
                                                                type="number"
                                                                className="h-6 w-12 text-center p-0 border-none bg-transparent focus-visible:ring-0"
                                                                value={q.points}
                                                                onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value))}
                                                            />
                                                            <span className="text-muted-foreground">pts</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleRemoveQuestion(q.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <Textarea
                                                    placeholder="Enter your question here..."
                                                    className="resize-none"
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                                />

                                                {q.type === 'MCQ' && (
                                                    <div className="space-y-3 pl-4 border-l-2 border-muted">
                                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Options</Label>
                                                        {q.options?.map((opt, optIndex) => (
                                                            <div key={optIndex} className="flex items-center gap-3">
                                                                <div
                                                                    className={`w-4 h-4 rounded-full border cursor-pointer flex items-center justify-center ${q.correctAnswer === opt && opt !== "" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}
                                                                    onClick={() => updateQuestion(q.id, 'correctAnswer', opt)}
                                                                >
                                                                    {q.correctAnswer === opt && opt !== "" && <CheckCircle className="w-3 h-3" />}
                                                                </div>
                                                                <Input
                                                                    placeholder={`Option ${optIndex + 1}`}
                                                                    className="h-9"
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'CODING' && (
                                                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-center">
                                                        <Code className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                                                        <p className="text-sm text-muted-foreground">
                                                            Coding environment will be provided to candidates.
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        {/* Settings Tab */}
                        <TabsContent value="settings" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Certificate Settings</CardTitle>
                                    <CardDescription>
                                        Configure how the certificate is issued.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Publish Immediately</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Make this exam available to candidates upon creation.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.isPublished}
                                            onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="space-y-2">
                                        <Label>Certificate Template</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                            {['Modern', 'Classic', 'Tech'].map((template) => (
                                                <div key={template} className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-2">
                                                    <div className="aspect-video bg-muted rounded flex items-center justify-center">
                                                        <Award className="w-8 h-8 text-muted-foreground" />
                                                    </div>
                                                    <p className="font-medium text-sm">{template}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </UnifiedDashboardLayout>
    );
}
