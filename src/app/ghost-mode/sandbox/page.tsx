"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
    ChevronLeft,
    Play,
    Terminal,
    Trash2,
    Code2,
    Cpu,
    Zap,
    Clock,
    AlertCircle,
    CheckCircle2,
    Maximize2,
    Minimize2,
    RotateCcw,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Editor, { OnMount } from "@monaco-editor/react";
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { toast } from 'react-hot-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ThemeToggle from '@/components/ThemeToggle';

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

// Available languages
const LANGUAGES = [
    { value: 'sql', label: 'SQL', icon: '💾' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'pyspark', label: 'PySpark', icon: '🔥' },
    { value: 'snowflake', label: 'Snowflake', icon: '❄️' },
];

const DEFAULT_CODE = {
    sql: `-- Standard SQL Query
SELECT 
    e.employee_id,
    e.first_name,
    e.last_name,
    d.department_name,
    e.salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 50000
ORDER BY e.salary DESC;`,

    python: `def analyze_data(data):
    """
    Sample function to analyze a list of numbers
    """
    if not data:
        return {"min": None, "max": None, "avg": None}
    
    return {
        "min": min(data),
        "max": max(data),
        "avg": sum(data) / len(data),
        "count": len(data)
    }

# Test data
dataset = [15, 22, 9, 34, 18, 95, 42, 11]
result = analyze_data(dataset)

print(f"Dataset: {dataset}")
print("-" * 30)
for key, value in result.items():
    print(f"{key.upper()}: {value}")`,

    pyspark: `# PySpark (Databricks style)
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, avg, count

# Initialize Spark Session
spark = SparkSession.builder.appName("SalesAnalysis").getOrCreate()

# Create sample data
data = [
    ("Electronics", 1200),
    ("Electronics", 800),
    ("Books", 25),
    ("Books", 15),
    ("Clothing", 45),
    ("Clothing", 100)
]
columns = ["Category", "Amount"]

# Create DataFrame
df = spark.createDataFrame(data, columns)

# Perform analysis
result = df.groupBy("Category").agg(
    avg("Amount").alias("avg_amount"),
    count("Amount").alias("transaction_count")
)

# Show results
print("PySpark DataFrame Output:")
result.show()`,

    snowflake: `-- Snowflake SQL
-- Create a temporary table
CREATE OR REPLACE TEMPORARY TABLE sales_data (
    transaction_id INT,
    product_name VARCHAR(50),
    amount DECIMAL(10, 2),
    transaction_date DATE
);

-- Insert sample records
INSERT INTO sales_data VALUES 
    (1, 'Laptop', 1200.00, '2024-01-01'),
    (2, 'Monitor', 300.50, '2024-01-02'),
    (3, 'Desk', 150.00, '2024-01-02');

-- Use Snowflake specific functions
SELECT 
    product_name,
    amount,
    -- Snowflake window function example
    RANK() OVER (ORDER BY amount DESC) as sales_rank,
    -- Date manipulation
    DATEADD(day, 30, transaction_date) as return_deadline
FROM sales_data
WHERE amount > 100
ORDER BY amount DESC;`
};

const SandboxPage = () => {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const [language, setLanguage] = useState<string>('python');
    const [code, setCode] = useState<string>(DEFAULT_CODE.python);
    const [output, setOutput] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [executionTime, setExecutionTime] = useState<string | null>(null);
    const [visualization, setVisualization] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("console");
    const [isRunning, setIsRunning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sessionId] = useState(`DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);

    // Initial Animation
    useGSAP(() => {
        gsap.from(".sandbox-ui", {
            y: 20,
            opacity: 0,
            stagger: 0.05,
            duration: 0.6,
            ease: "power2.out"
        });
    }, { scope: containerRef });

    const getMonacoLanguage = (lang: string) => {
        if (lang === 'pyspark') return 'python';
        if (lang === 'snowflake') return 'sql';
        return lang;
    };

    const handleLanguageChange = (value: string) => {
        setLanguage(value);
        // @ts-ignore
        setCode(DEFAULT_CODE[value] || "");
    };

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const handleRunCode = async () => {
        if (!code.trim()) return;

        setIsRunning(true);
        setOutput(null);
        setError(null);
        setVisualization(null);
        setExecutionTime(null);
        // Reset to console tab on new run
        setActiveTab("console");

        try {
            const response = await fetch('/api/ghost-mode/sandbox/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            });

            const data = await response.json();

            if (data.status === 'success') {
                setOutput(data.output);
                setExecutionTime(data.executionTime);
                if (data.visualization) {
                    setVisualization(data.visualization);
                    setActiveTab("visualize");
                }
            } else {
                setError(data.error || "An unknown error occurred.");
                setOutput(data.output);
            }
        } catch (err) {
            setError("Failed to reach execution server.");
        } finally {
            setIsRunning(false);
        }
    };

    const handleClearConsole = () => {
        setOutput(null);
        setError(null);
        setExecutionTime(null);
        setVisualization(null);
    };

    const handleResetCode = () => {
        // @ts-ignore
        setCode(DEFAULT_CODE[language] || "");
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Helper to render chart based on type
    const renderChart = () => {
        if (!visualization || !visualization.data) return null;

        const { type, data, xKey, yKey } = visualization;
        const commonProps = { data, margin: { top: 20, right: 30, left: 20, bottom: 5 } };
        const isDark = resolvedTheme === 'dark';
        const tooltipStyle = {
            backgroundColor: isDark ? '#18181b' : '#ffffff',
            borderColor: isDark ? '#27272a' : '#e4e4e7',
            color: isDark ? '#f4f4f5' : '#09090b',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        };

        return (
            <ResponsiveContainer width="100%" height="100%">
                {type === 'line' ? (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#e5e5e5"} />
                        <XAxis dataKey={xKey} stroke={isDark ? "#888" : "#666"} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke={isDark ? "#888" : "#666"} fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey={yKey} stroke="var(--primary)" strokeWidth={2} activeDot={{ r: 6, fill: 'var(--primary)' }} dot={{ r: 4, fill: 'var(--background)', strokeWidth: 2 }} />
                    </LineChart>
                ) : type === 'pie' ? (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey={yKey}
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={['var(--primary)', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'][index % 5]} />
                            ))}
                        </Pie>
                        <RechartsTooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                ) : type === 'area' ? (
                    <AreaChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#e5e5e5"} />
                        <XAxis dataKey={xKey} stroke={isDark ? "#888" : "#666"} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke={isDark ? "#888" : "#666"} fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Area type="monotone" dataKey={yKey} stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                    </AreaChart>
                ) : (
                    // Default to Bar Chart
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#e5e5e5"} />
                        <XAxis dataKey={xKey} stroke={isDark ? "#888" : "#666"} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke={isDark ? "#888" : "#666"} fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ fill: isDark ? '#27272a' : '#f4f4f5' }} contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey={yKey} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                )}
            </ResponsiveContainer>
        );
    };

    return (
        <div ref={containerRef} className="h-screen bg-background flex flex-col overflow-hidden font-sans selection:bg-primary/20">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            {/* Header */}
            <header className="flex-none h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl z-20 flex items-center justify-between px-4 sticky top-0">
                <div className="flex items-center gap-4 sandbox-ui">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.push('/ghost-mode')}>
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
                            <Code2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tracking-tight">Code Playground</span>
                            <span className="text-[10px] text-muted-foreground font-mono leading-none">INTERACTIVE ENVIRONMENT</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sandbox-ui">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 mr-2">
                        <Badge variant="secondary" className="text-[10px] h-5 bg-background border-border/60 text-muted-foreground shadow-sm">
                            {sessionId}
                        </Badge>
                    </div>

                    <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="h-8 w-[140px] text-xs font-bold border-border/60 bg-muted/30 focus:ring-primary/20 transition-all">
                            <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                            {LANGUAGES.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>
                                    <span className="mr-2">{lang.icon}</span>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="h-4 w-[1px] bg-border/60 mx-1" />

                    <Button
                        onClick={handleRunCode}
                        disabled={isRunning}
                        size="sm"
                        className="h-8 px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        {isRunning ? (
                            <Cpu className="w-3.5 h-3.5 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-3.5 h-3.5 mr-2 fill-current" />
                        )}
                        {isRunning ? 'Running...' : 'Run Code'}
                    </Button>

                    <ThemeToggle />

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleResetCode} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reset Code</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hidden sm:flex">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 min-h-0 sandbox-ui">
                <ResizablePanelGroup direction="horizontal" className="h-full">

                    {/* Editor Panel */}
                    <ResizablePanel defaultSize={60} minSize={30}>
                        <div className="h-full flex flex-col bg-card/10 backdrop-blur-[2px]">
                            <Editor
                                height="100%"
                                language={getMonacoLanguage(language)}
                                value={code}
                                onChange={(value) => setCode(value || "")}
                                onMount={handleEditorDidMount}
                                theme={resolvedTheme === 'dark' ? "vs-dark" : "light"}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 16 },
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all',
                                    smoothScrolling: true,
                                    cursorBlinking: 'smooth',
                                    cursorSmoothCaretAnimation: 'on',
                                    fontLigatures: true
                                }}
                            />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border/40 hover:bg-primary/50 transition-colors w-1" />

                    {/* Output Panel */}
                    <ResizablePanel defaultSize={40} minSize={20}>
                        <div className="h-full flex flex-col bg-muted/20 border-l border-border/40">

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                                {/* Output Header */}
                                <div className="flex-none h-10 border-b border-border/40 flex items-center justify-between px-4 bg-muted/40 backdrop-blur-sm">
                                    <TabsList className="h-7 bg-muted border border-border/50">
                                        <TabsTrigger value="console" className="h-5 text-[10px] font-bold uppercase tracking-wider">
                                            <Terminal className="w-3 h-3 mr-1.5" />
                                            Console
                                        </TabsTrigger>
                                        <TabsTrigger value="visualize" disabled={!visualization} className="h-5 text-[10px] font-bold uppercase tracking-wider">
                                            <BarChart3 className="w-3 h-3 mr-1.5" />
                                            Charts
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-2">
                                        {executionTime && (
                                            <Badge variant="outline" className="text-[10px] h-5 bg-background border-border text-muted-foreground font-mono">
                                                <Clock className="w-3 h-3 mr-1.5" />
                                                {executionTime}
                                            </Badge>
                                        )}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button onClick={handleClearConsole} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Clear Output</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>

                                {/* Console Content */}
                                <TabsContent value="console" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col relative">
                                    <ScrollArea className="flex-1 p-4 font-mono text-sm">
                                        {!output && !error && !isRunning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 pointer-events-none select-none">
                                                <Zap className="w-12 h-12 mb-3 opacity-20" />
                                                <p className="text-sm font-bold uppercase tracking-widest">Ready to Execute</p>
                                            </div>
                                        )}

                                        {isRunning && (
                                            <div className="flex items-center gap-3 text-muted-foreground animate-pulse p-2">
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                                </span>
                                                <span>Running process...</span>
                                            </div>
                                        )}

                                        {output && (
                                            <div className="whitespace-pre-wrap mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex items-center gap-2 mb-2 text-emerald-500/90 text-[10px] font-black uppercase tracking-widest border-b border-emerald-500/10 pb-1 w-fit">
                                                    <CheckCircle2 className="w-3 h-3" /> Standard Output
                                                </div>
                                                <div className="text-foreground/90 leading-relaxed">{output}</div>
                                            </div>
                                        )}

                                        {error && (
                                            <div className="whitespace-pre-wrap text-destructive border-t border-destructive/20 pt-4 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex items-center gap-2 mb-2 text-destructive text-[10px] font-black uppercase tracking-widest border-b border-destructive/10 pb-1 w-fit">
                                                    <AlertCircle className="w-3 h-3" /> Standard Error
                                                </div>
                                                <div className="bg-destructive/5 p-3 rounded-lg border border-destructive/10 text-sm">
                                                    {error}
                                                </div>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                {/* Visualization Content */}
                                <TabsContent value="visualize" className="flex-1 min-h-0 mt-0 p-4 data-[state=active]:flex flex-col">
                                    {visualization ? (
                                        <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                                            <div className="mb-4">
                                                <h3 className="text-sm font-bold">{visualization.title}</h3>
                                                <p className="text-xs text-muted-foreground">{visualization.description}</p>
                                            </div>
                                            <div className="flex-1 w-full bg-card/50 rounded-xl border border-border/50 p-4 shadow-sm">
                                                {renderChart()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40">
                                            <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="text-sm font-medium">No visualization data</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                        </div>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default SandboxPage;
