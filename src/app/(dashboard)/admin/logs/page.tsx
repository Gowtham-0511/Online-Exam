"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, AlertCircle, Info, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    service?: string;
    [key: string]: any;
}

export default function SystemLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("app");

    const fetchLogs = async (type: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/logs?type=${type}&limit=200`);
            const data = await res.json();
            if (data.logs) {
                setLogs(data.logs);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(activeTab);
        const interval = setInterval(() => {
            fetchLogs(activeTab);
        }, 10000); // Auto-refresh every 10s

        return () => clearInterval(interval);
    }, [activeTab]);

    const getLevelColor = (level: string) => {
        switch (level) {
            case "error":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            case "warn":
                return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case "debug":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            default:
                return "bg-green-500/10 text-green-500 border-green-500/20";
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        System Logs
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor application events, errors, and debugging information.
                    </p>
                </div>
                <Button
                    onClick={() => fetchLogs(activeTab)}
                    variant="outline"
                    disabled={loading}
                    className="gap-2"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <Tabs
                        defaultValue="app"
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="app" className="gap-2">
                                <FileText className="h-4 w-4" />
                                Application Logs
                            </TabsTrigger>
                            <TabsTrigger value="error" className="gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Error Logs
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] w-full rounded-md border bg-zinc-950 p-4 font-mono text-sm">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Info className="h-8 w-8 mb-2 opacity-50" />
                                <p>No logs found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row sm:items-start gap-2 p-2 rounded hover:bg-white/5 border-b border-white/5 last:border-0"
                                    >
                                        <div className="flex items-center gap-2 min-w-[180px]">
                                            <span className="text-zinc-500 text-xs whitespace-nowrap">
                                                {log.timestamp}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`${getLevelColor(
                                                    log.level
                                                )} uppercase text-[10px] px-1 py-0 h-5 min-w-[50px] justify-center`}
                                            >
                                                {log.level}
                                            </Badge>
                                        </div>
                                        <div className="flex-1 break-all text-zinc-300">
                                            <span className="font-semibold text-zinc-100">
                                                {log.message}
                                            </span>
                                            {Object.keys(log).map((key) => {
                                                if (
                                                    ["level", "message", "timestamp", "service"].includes(
                                                        key
                                                    )
                                                )
                                                    return null;
                                                return (
                                                    <div
                                                        key={key}
                                                        className="mt-1 ml-2 text-xs text-zinc-500"
                                                    >
                                                        <span className="text-zinc-400">{key}:</span>{" "}
                                                        {JSON.stringify(log[key])}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
