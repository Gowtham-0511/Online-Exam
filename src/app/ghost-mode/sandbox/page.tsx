"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Ghost,
    ArrowLeft,
    Play,
    Terminal,
    Trash2,
    Code as CodeIcon,
    Cpu,
    Zap,
    Clock,
    AlertCircle,
    CheckCircle2,
    Maximize2,
    Minimize2
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

// Available languages
const LANGUAGES = [
    { value: 'sql', label: 'SQL (Standard)', icon: '💾' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'pyspark', label: 'PySpark (Databricks)', icon: '🔥' },
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
    const [language, setLanguage] = useState<string>('python');
    const [code, setCode] = useState<string>(DEFAULT_CODE.python);
    const [output, setOutput] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [executionTime, setExecutionTime] = useState<string | null>(null);
    const [visualization, setVisualization] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("console");
    const [isRunning, setIsRunning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

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

        return (
            <ResponsiveContainer width="100%" height="100%">
                {type === 'line' ? (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey={xKey} stroke="#888" />
                        <YAxis stroke="#888" />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey={yKey} stroke="#8b5cf6" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                ) : type === 'pie' ? (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey={yKey}
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'][index % 5]} />
                            ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }} />
                        <Legend />
                    </PieChart>
                ) : type === 'area' ? (
                    <AreaChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey={xKey} stroke="#888" />
                        <YAxis stroke="#888" />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }} />
                        <Legend />
                        <Area type="monotone" dataKey={yKey} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    </AreaChart>
                ) : (
                    // Default to Bar Chart
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey={xKey} stroke="#888" />
                        <YAxis stroke="#888" />
                        <RechartsTooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }} />
                        <Legend />
                        <Bar dataKey={yKey} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                )}
            </ResponsiveContainer>
        );
    };

    return (
        <div ref={containerRef} className="h-screen bg-background flex flex-col overflow-hidden font-sans selection:bg-violet-500/30">
            {/* Header */}
            <header className="flex-none h-14 border-b border-border/40 bg-background/80 backdrop-blur-md z-20 flex items-center justify-between px-4 sandbox-ui">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/ghost-mode')}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                            <CodeIcon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">Ghost Sandbox</span>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-500/20 text-blue-500 bg-blue-500/5">
                            Simulated Environment
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="h-8 w-[140px] text-xs font-medium border-border/60 bg-muted/30">
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
                        className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                    >
                        {isRunning ? (
                            <Cpu className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4 mr-2 fill-current" />
                        )}
                        {isRunning ? 'Executing...' : 'Run Code'}
                    </Button>

                    <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 min-h-0 sandbox-ui">
                <ResizablePanelGroup direction="horizontal" className="h-full">

                    {/* Editor Panel */}
                    <ResizablePanel defaultSize={60} minSize={30}>
                        <div className="h-full flex flex-col bg-[#1e1e1e]">
                            <Editor
                                height="100%"
                                language={getMonacoLanguage(language)}
                                value={code}
                                onChange={(value) => setCode(value || "")}
                                onMount={handleEditorDidMount}
                                theme="vs-dark"
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
                                    cursorSmoothCaretAnimation: 'on'
                                }}
                            />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border/40 hover:bg-violet-500/50 transition-colors w-1" />

                    {/* Output Panel */}
                    <ResizablePanel defaultSize={40} minSize={20}>
                        <div className="h-full flex flex-col bg-zinc-950">

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                                {/* Output Header */}
                                <div className="flex-none h-10 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-900/50">
                                    <TabsList className="h-7 bg-zinc-800/50 border border-white/5">
                                        <TabsTrigger value="console" className="h-5 text-[10px] data-[state=active]:bg-zinc-700">
                                            <Terminal className="w-3 h-3 mr-1.5" />
                                            Output
                                        </TabsTrigger>
                                        <TabsTrigger value="visualize" disabled={!visualization} className="h-5 text-[10px] data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                                            <PieChart className="w-3 h-3 mr-1.5" />
                                            Visualize
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-2">
                                        {executionTime && (
                                            <Badge variant="secondary" className="text-[10px] h-5 bg-zinc-800 text-zinc-400 border-zinc-700">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {executionTime}
                                            </Badge>
                                        )}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button onClick={handleClearConsole} variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-white/5">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="bg-zinc-800 text-zinc-300 border-zinc-700">Clear Console</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>

                                {/* Console Content */}
                                <TabsContent value="console" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col">
                                    <ScrollArea className="flex-1 p-4 font-mono text-sm">
                                        {!output && !error && !isRunning && (
                                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-60 pointer-events-none select-none">
                                                <Zap className="w-12 h-12 mb-3 opacity-20" />
                                                <p>Ready to execute</p>
                                            </div>
                                        )}

                                        {isRunning && (
                                            <div className="flex items-center gap-2 text-zinc-500 animate-pulse">
                                                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                                <span>Compiling and executing...</span>
                                            </div>
                                        )}

                                        {output && (
                                            <div className="whitespace-pre-wrap text-zinc-300 mb-4">
                                                <div className="flex items-center gap-2 mb-2 text-emerald-500/80 text-xs uppercase tracking-wider">
                                                    <CheckCircle2 className="w-3 h-3" /> STDOUT
                                                </div>
                                                {output}
                                            </div>
                                        )}

                                        {error && (
                                            <div className="whitespace-pre-wrap text-red-400 border-t border-red-500/20 pt-4 mt-2">
                                                <div className="flex items-center gap-2 mb-2 text-red-500 text-xs uppercase tracking-wider">
                                                    <AlertCircle className="w-3 h-3" /> STDERR
                                                </div>
                                                {error}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                {/* Visualization Content */}
                                <TabsContent value="visualize" className="flex-1 min-h-0 mt-0 p-4 data-[state=active]:flex flex-col">
                                    {visualization ? (
                                        <div className="flex-1 flex flex-col">
                                            <div className="mb-4">
                                                <h3 className="text-sm font-medium text-zinc-200">{visualization.title}</h3>
                                                <p className="text-xs text-zinc-500">{visualization.description}</p>
                                            </div>
                                            <div className="flex-1 min-h-[200px] w-full bg-zinc-900/50 rounded-lg border border-white/5 p-4">
                                                {renderChart()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-60">
                                            <PieChart className="w-12 h-12 mb-3 opacity-20" />
                                            <p>No visualization data generated</p>
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
