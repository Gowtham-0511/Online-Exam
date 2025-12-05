// import React, { useState, useMemo } from 'react';
// import { useSession } from 'next-auth/react';
// import useSWR from 'swr';
// import { useRouter } from "next/router";
// import Head from 'next/head';
// import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
// import { useExamReadiness } from '@/hooks/useExamReadiness';
// import { ReadinessBadge } from '@/components/attender/ReadinessBadge';
// import { ExamInsightsCard } from '@/components/attender/ExamInsightsCard';
// import { ExamStrategyModal } from '@/components/attender/ExamStrategyModal';
// import { ExamRequirementsModal } from '@/components/attender/ExamRequirementsModal';

// // UI Components
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Input } from '@/components/ui/input';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Label } from '@/components/ui/label';
// import { Separator } from '@/components/ui/separator';
// import { ScrollArea } from '@/components/ui/scroll-area';

// // Icons
// import {
//     Search,
//     Filter,
//     Clock,
//     Code,
//     Calendar,
//     User,
//     Play,
//     Shield,
//     FileText,
//     Star,
//     Zap,
//     Target,
//     Brain,
//     Award,
//     Lock,
//     ChevronRight,
//     Activity,
//     Code2,
//     Layers,
//     Timer,
//     CheckCircle2,
//     AlertCircle,
//     X
// } from 'lucide-react';

// // Types
// interface Exam {
//     id: number;
//     title: string;
//     language: string;
//     duration: number;
//     createdBy: string;
//     createdAt: string;
//     isExamProctored: boolean;
//     isGeneratedFromExcel: boolean;
//     questionConfig: string;
//     questions: string;
//     startTime: string | null;
//     endTime: string | null;
//     allowedUsers: string;
//     participants: number;
// }

// interface Question {
//     id: string;
//     question: string;
//     expectedOutput: string;
//     difficulty: 'easy' | 'medium' | 'hard';
//     marks: number;
// }

// const fetcher = (url: string) => fetch(url).then(res => res.json());

// const ViewExams: React.FC = () => {
//     const { data: session } = useSession();
//     const router = useRouter();

//     // State
//     const [searchQuery, setSearchQuery] = useState('');
//     const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
//     const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
//     const [selectedLanguage, setSelectedLanguage] = useState<string[]>([]);
//     const [selectedExamForStrategy, setSelectedExamForStrategy] = useState<{
//         examId: string;
//         email: string;
//     } | null>(null);
//     const [selectedExamForRequirements, setSelectedExamForRequirements] = useState<Exam | null>(null);

//     // Popup states (kept from original)
//     const [showExamPopup, setShowExamPopup] = useState(false);
//     const [examData, setExamData] = useState<Exam | null>(null);
//     const [fullScreenEnabled, setFullScreenEnabled] = useState(false);
//     const [cameraEnabled, setCameraEnabled] = useState(false);
//     const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

//     // Data Fetching
//     const { data: exams = [], error, isLoading } = useSWR<Exam[]>(
//         session?.user?.email
//             ? `/api/attender/allowed-exam?email=${encodeURIComponent(session.user.email)}`
//             : null,
//         fetcher,
//         { revalidateOnFocus: false }
//     );

//     const { readinessData, isLoading: readinessLoading } = useExamReadiness(
//         session?.user?.email,
//         exams
//     );

//     // Helpers
//     const getLanguageConfig = (language: string) => {
//         const configs = {
//             python: { icon: Code2, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200' },
//             javascript: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200' },
//             java: { icon: Activity, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200' },
//             cpp: { icon: Layers, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200' },
//             c: { icon: Code, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30', border: 'border-gray-200' }
//         };
//         return configs[language.toLowerCase() as keyof typeof configs] || configs.c;
//     };

//     const getDifficultyConfig = (difficulty: string) => {
//         const configs = {
//             easy: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
//             medium: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
//             hard: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
//         };
//         return configs[difficulty.toLowerCase() as keyof typeof configs] || configs.easy;
//     };

//     const parseQuestions = (questionsStr: string): Question[] => {
//         try { return JSON.parse(questionsStr); } catch { return []; }
//     };

//     const calculateTotalMarks = (questions: Question[]) => questions.reduce((total, q) => total + q.marks, 0);

//     const formatDuration = (minutes: number) => {
//         const hours = Math.floor(minutes / 60);
//         const mins = minutes % 60;
//         return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
//     };

//     const isExamActive = (exam: Exam): boolean => {
//         if (!exam.startTime || !exam.endTime) return true;
//         const now = new Date();
//         // Adjust for IST if needed, or use UTC. Assuming server sends ISO strings.
//         // Keeping original logic's intent but simplifying if ISO.
//         // Original logic had manual IST offset, assuming dates are UTC but treated as local?
//         // Let's stick to standard Date comparison for now, assuming consistent timezones.
//         // If original had specific IST logic, I'll preserve the offset check just in case.
//         const istOffset = 5.5 * 60 * 60 * 1000;
//         const nowIST = new Date(now.getTime() + istOffset);
//         const start = new Date(exam.startTime);
//         const startIST = new Date(start.getTime() - istOffset);
//         const end = new Date(exam.endTime);
//         const endIST = new Date(end.getTime() - istOffset);
//         return nowIST >= startIST && nowIST <= endIST;
//     };

//     const getExamStatus = (exam: Exam) => {
//         if (!exam.startTime || !exam.endTime) return { status: 'Available', color: 'text-green-600', bg: 'bg-green-100' };
//         const now = new Date();
//         const start = new Date(exam.startTime);
//         const end = new Date(exam.endTime);
//         if (now < start) return { status: 'Upcoming', color: 'text-blue-600', bg: 'bg-blue-100' };
//         if (now > end) return { status: 'Expired', color: 'text-gray-600', bg: 'bg-gray-100' };
//         return { status: 'Active', color: 'text-green-600', bg: 'bg-green-100' };
//     };

//     const handleStartExam = (examId: number) => {
//         const exam = exams.find((e: Exam) => e.id === examId);
//         if (exam) {
//             setSelectedExamForRequirements(exam);
//         }
//     };

//     const handleProceedToExam = () => {
//         if (selectedExamForRequirements) {
//             router.push(`/exam/${selectedExamForRequirements.title}`);
//             setSelectedExamForRequirements(null);
//         }
//     };

//     // Filtering Logic
//     const filteredExams = useMemo(() => {
//         return exams.filter((exam: Exam) => {
//             const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());

//             const status = getExamStatus(exam).status;
//             const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(status);

//             const matchesLanguage = selectedLanguage.length === 0 || selectedLanguage.includes(exam.language.toLowerCase());

//             // Difficulty is tricky as it's per question. We'll check if exam has ANY question of selected difficulty
//             const questions = parseQuestions(exam.questions);
//             const difficulties = new Set(questions.map(q => q.difficulty));
//             const matchesDifficulty = selectedDifficulty.length === 0 || selectedDifficulty.some(d => difficulties.has(d as any));

//             return matchesSearch && matchesStatus && matchesLanguage && matchesDifficulty;
//         });
//     }, [exams, searchQuery, selectedStatus, selectedLanguage, selectedDifficulty]);

//     // Extract unique languages for filter
//     const uniqueLanguages = useMemo(() => {
//         const langs = new Set(exams.map((e: Exam) => e.language.toLowerCase()));
//         return Array.from(langs);
//     }, [exams]);

//     if (isLoading) {
//         return (
//             <UnifiedDashboardLayout role="attender">
//                 <div className="max-w-7xl mx-auto space-y-6 p-6">
//                     <Skeleton className="h-12 w-1/3" />
//                     <div className="grid grid-cols-12 gap-6">
//                         <div className="col-span-3 space-y-4">
//                             <Skeleton className="h-64 w-full" />
//                         </div>
//                         <div className="col-span-9 space-y-4">
//                             {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
//                         </div>
//                     </div>
//                 </div>
//             </UnifiedDashboardLayout>
//         );
//     }

//     if (error) {
//         return (
//             <UnifiedDashboardLayout role="attender">
//                 <div className="flex items-center justify-center h-[50vh]">
//                     <Alert variant="destructive" className="max-w-md">
//                         <AlertCircle className="h-4 w-4" />
//                         <AlertDescription>Failed to load exams. Please try again later.</AlertDescription>
//                     </Alert>
//                 </div>
//             </UnifiedDashboardLayout>
//         );
//     }

//     return (
//         <UnifiedDashboardLayout role="attender">
//             <Head>
//                 <title>Assessments | SysRank</title>
//             </Head>

//             <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in-up">
//                 {/* Header */}
//                 <div className="flex flex-col gap-2">
//                     <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
//                     <p className="text-muted-foreground">
//                         Browse and participate in coding challenges to test your skills.
//                     </p>
//                 </div>

//                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

//                     {/* Sidebar Filters */}
//                     <div className="lg:col-span-3 space-y-6">
//                         <div className="sticky top-6 space-y-6">
//                             {/* Search */}
//                             <div className="relative">
//                                 <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
//                                 <Input
//                                     placeholder="Search exams..."
//                                     className="pl-9"
//                                     value={searchQuery}
//                                     onChange={(e) => setSearchQuery(e.target.value)}
//                                 />
//                             </div>

//                             {/* Filters Card */}
//                             <Card className="border-border/50 shadow-sm">
//                                 <CardHeader className="pb-3">
//                                     <div className="flex items-center justify-between">
//                                         <CardTitle className="text-base">Filters</CardTitle>
//                                         <Button
//                                             variant="ghost"
//                                             size="sm"
//                                             className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
//                                             onClick={() => {
//                                                 setSelectedStatus([]);
//                                                 setSelectedDifficulty([]);
//                                                 setSelectedLanguage([]);
//                                                 setSearchQuery('');
//                                             }}
//                                         >
//                                             Reset
//                                         </Button>
//                                     </div>
//                                 </CardHeader>
//                                 <CardContent className="space-y-6">
//                                     {/* Status */}
//                                     <div className="space-y-3">
//                                         <Label className="text-xs uppercase text-muted-foreground font-bold">Status</Label>
//                                         <div className="space-y-2">
//                                             {['Available', 'Active', 'Upcoming', 'Expired'].map(status => (
//                                                 <div key={status} className="flex items-center space-x-2">
//                                                     <Checkbox
//                                                         id={`status-${status}`}
//                                                         checked={selectedStatus.includes(status)}
//                                                         onCheckedChange={(checked) => {
//                                                             if (checked) setSelectedStatus([...selectedStatus, status]);
//                                                             else setSelectedStatus(selectedStatus.filter(s => s !== status));
//                                                         }}
//                                                     />
//                                                     <label htmlFor={`status-${status}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
//                                                         {status}
//                                                     </label>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                     <Separator />

//                                     {/* Difficulty */}
//                                     <div className="space-y-3">
//                                         <Label className="text-xs uppercase text-muted-foreground font-bold">Difficulty</Label>
//                                         <div className="space-y-2">
//                                             {['Easy', 'Medium', 'Hard'].map(diff => (
//                                                 <div key={diff} className="flex items-center space-x-2">
//                                                     <Checkbox
//                                                         id={`diff-${diff}`}
//                                                         checked={selectedDifficulty.includes(diff.toLowerCase())}
//                                                         onCheckedChange={(checked) => {
//                                                             if (checked) setSelectedDifficulty([...selectedDifficulty, diff.toLowerCase()]);
//                                                             else setSelectedDifficulty(selectedDifficulty.filter(d => d !== diff.toLowerCase()));
//                                                         }}
//                                                     />
//                                                     <label htmlFor={`diff-${diff}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
//                                                         {diff}
//                                                     </label>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                     <Separator />

//                                     {/* Language */}
//                                     <div className="space-y-3">
//                                         <Label className="text-xs uppercase text-muted-foreground font-bold">Language</Label>
//                                         <ScrollArea className="h-32 pr-2">
//                                             <div className="space-y-2">
//                                                 {uniqueLanguages.map(lang => (
//                                                     <div key={lang} className="flex items-center space-x-2">
//                                                         <Checkbox
//                                                             id={`lang-${lang}`}
//                                                             checked={selectedLanguage.includes(lang)}
//                                                             onCheckedChange={(checked) => {
//                                                                 if (checked) setSelectedLanguage([...selectedLanguage, lang]);
//                                                                 else setSelectedLanguage(selectedLanguage.filter(l => l !== lang));
//                                                             }}
//                                                         />
//                                                         <label htmlFor={`lang-${lang}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">
//                                                             {lang}
//                                                         </label>
//                                                     </div>
//                                                 ))}
//                                             </div>
//                                         </ScrollArea>
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         </div>
//                     </div>

//                     {/* Main Content - Exam List */}
//                     <div className="lg:col-span-9 space-y-4">
//                         <div className="flex items-center justify-between pb-2">
//                             <h2 className="text-lg font-semibold">{filteredExams.length} Assessments Found</h2>
//                         </div>

//                         {filteredExams.length === 0 ? (
//                             <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
//                                 <div className="p-4 rounded-full bg-muted mb-4">
//                                     <Search className="w-8 h-8 text-muted-foreground" />
//                                 </div>
//                                 <h3 className="text-lg font-semibold">No exams found</h3>
//                                 <p className="text-muted-foreground max-w-sm mt-1">
//                                     Try adjusting your filters or search query to find what you're looking for.
//                                 </p>
//                                 <Button
//                                     variant="link"
//                                     onClick={() => {
//                                         setSelectedStatus([]);
//                                         setSelectedDifficulty([]);
//                                         setSelectedLanguage([]);
//                                         setSearchQuery('');
//                                     }}
//                                 >
//                                     Clear all filters
//                                 </Button>
//                             </div>
//                         ) : (
//                             <div className="space-y-4">
//                                 {filteredExams.map((exam: Exam) => {
//                                     const questions = parseQuestions(exam.questions);
//                                     const totalMarks = calculateTotalMarks(questions);
//                                     const status = getExamStatus(exam);
//                                     const langConfig = getLanguageConfig(exam.language);
//                                     const LangIcon = langConfig.icon;
//                                     const readiness = readinessData?.examReadiness?.[exam.id];
//                                     const isActive = isExamActive(exam);

//                                     return (
//                                         <Card key={exam.id} className="group hover:shadow-md transition-all duration-200 border-border/50 overflow-hidden">
//                                             <div className="flex flex-col md:flex-row">
//                                                 {/* Left Status Strip */}
//                                                 <div className={`w-full md:w-1.5 h-1 md:h-auto ${status.bg.replace('/10', '').replace('/30', '')} bg-opacity-50`} />

//                                                 <div className="flex-1 p-5">
//                                                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
//                                                         <div className="space-y-3 flex-1">
//                                                             <div className="flex items-center gap-3">
//                                                                 <div className={`p-2 rounded-lg ${langConfig.bg} ${langConfig.color}`}>
//                                                                     <LangIcon className="w-5 h-5" />
//                                                                 </div>
//                                                                 <div>
//                                                                     <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
//                                                                         {exam.title}
//                                                                     </h3>
//                                                                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                                                                         <User className="w-3 h-3" />
//                                                                         <span>{exam.createdBy}</span>
//                                                                         <span>•</span>
//                                                                         <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
//                                                                     </div>
//                                                                 </div>
//                                                             </div>

//                                                             <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
//                                                                 <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-md">
//                                                                     <Timer className="w-4 h-4" />
//                                                                     <span>{formatDuration(exam.duration)}</span>
//                                                                 </div>
//                                                                 <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-md">
//                                                                     <Star className="w-4 h-4" />
//                                                                     <span>{totalMarks} Marks</span>
//                                                                 </div>
//                                                                 <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-md">
//                                                                     <FileText className="w-4 h-4" />
//                                                                     <span>{questions.length} Questions</span>
//                                                                 </div>
//                                                             </div>

//                                                             <div className="flex flex-wrap gap-2">
//                                                                 {exam.isExamProctored && (
//                                                                     <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400">
//                                                                         <Shield className="w-3 h-3 mr-1" /> Proctored
//                                                                     </Badge>
//                                                                 )}
//                                                                 <Badge variant="outline" className={`${langConfig.bg} ${langConfig.color} border-0`}>
//                                                                     {exam.language}
//                                                                 </Badge>
//                                                             </div>
//                                                         </div>

//                                                         <div className="flex flex-col items-end gap-3 min-w-[140px]">
//                                                             <Badge className={`${status.bg} ${status.color} border-0 px-3 py-1`}>
//                                                                 {status.status}
//                                                             </Badge>

//                                                             <Button
//                                                                 className={`w-full gap-2 shadow-sm ${isActive ? 'bg-primary hover:bg-primary/90' : 'opacity-50 cursor-not-allowed'}`}
//                                                                 disabled={!isActive}
//                                                                 onClick={() => handleStartExam(exam.id)}
//                                                             >
//                                                                 {isActive ? (
//                                                                     <>
//                                                                         <span>Solve Challenge</span>
//                                                                         <ChevronRight className="w-4 h-4" />
//                                                                     </>
//                                                                 ) : (
//                                                                     <>
//                                                                         <Lock className="w-4 h-4" />
//                                                                         <span>Locked</span>
//                                                                     </>
//                                                                 )}
//                                                             </Button>

//                                                             <Button
//                                                                 variant="ghost"
//                                                                 size="sm"
//                                                                 className="w-full text-muted-foreground hover:text-primary"
//                                                                 onClick={() => setSelectedExamForStrategy({
//                                                                     examId: exam.title,
//                                                                     email: session?.user?.email || ''
//                                                                 })}
//                                                             >
//                                                                 <Brain className="w-4 h-4 mr-2" />
//                                                                 View Strategy
//                                                             </Button>
//                                                         </div>
//                                                     </div>

//                                                     {/* Readiness Footer */}
//                                                     {readiness && !readinessLoading && (
//                                                         <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
//                                                             <div className="flex items-center gap-2 text-xs">
//                                                                 <span className="text-muted-foreground">Readiness:</span>
//                                                                 <span className={`font-bold ${readiness.color.replace('text-', 'text-').split(' ')[0]}`}>
//                                                                     {readiness.readinessScore}% ({readiness.readinessLevel})
//                                                                 </span>
//                                                             </div>
//                                                             {readiness.readinessScore >= 80 && (
//                                                                 <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
//                                                                     <CheckCircle2 className="w-3 h-3" />
//                                                                     Recommended
//                                                                 </div>
//                                                             )}
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>
//                                         </Card>
//                                     );
//                                 })}
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* Strategy Modal */}
//             {selectedExamForStrategy && (
//                 <ExamStrategyModal
//                     isOpen={!!selectedExamForStrategy}
//                     onClose={() => setSelectedExamForStrategy(null)}
//                     examId={selectedExamForStrategy.examId}
//                     email={selectedExamForStrategy.email}
//                 />
//             )}

//             {/* Requirements Modal */}
//             {selectedExamForRequirements && (
//                 <ExamRequirementsModal
//                     isOpen={!!selectedExamForRequirements}
//                     onClose={() => setSelectedExamForRequirements(null)}
//                     exam={selectedExamForRequirements}
//                     onProceed={handleProceedToExam}
//                 />
//             )}
//         </UnifiedDashboardLayout>
//     );
// };

// export default ViewExams;

import React from 'react'

const ViewExams = () => {
    return (
        <div>view-exams</div>
    )
}

export default ViewExams