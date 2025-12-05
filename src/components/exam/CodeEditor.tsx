import { Play, Terminal, Sun, Moon, Database } from "lucide-react";
import { Editor } from "@monaco-editor/react";
import type { CodeEditorProps } from "@/types/exam.types";

interface ExtendedCodeEditorProps extends CodeEditorProps {
    theme: "light" | "dark";
    setTheme: (theme: "light" | "dark") => void;
    setEditorTheme: (theme: "light" | "dark") => void;
    sqlResult?: { columns: string[]; rows: Record<string, any>[] } | null;
    examLanguage: string;
    onCodeChange: (code: string) => void;
    schemaData?: any;
    onShowErDiagram?: () => void;
}

export default function CodeEditor({
    code,
    setCode,
    language,
    editorTheme,
    onRun,
    running,
    output,
    theme,
    setTheme,
    setEditorTheme,
    sqlResult,
    examLanguage,
    onCodeChange,
    schemaData,
    onShowErDiagram,
}: ExtendedCodeEditorProps) {
    const handleThemeToggle = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        setEditorTheme(newTheme);
    };

    const handleEditorChange = (value: string | undefined) => {
        const newCode = value || "";
        setCode(newCode);
        onCodeChange(newCode);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Editor Header */}
            <div className="h-14 border-b border-border bg-muted/30 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Code Editor</span>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                        {examLanguage.toUpperCase()}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg">
                        <Sun
                            className={`w-4 h-4 ${theme === "light" ? "text-amber-500" : "text-muted-foreground"}`}
                        />
                        <button
                            onClick={handleThemeToggle}
                            className="relative w-10 h-5 bg-muted rounded-full transition-colors"
                            aria-label="Toggle theme"
                        >
                            <div
                                className={`absolute top-0.5 ${theme === "dark" ? "right-0.5" : "left-0.5"
                                    } w-4 h-4 bg-primary rounded-full transition-all`}
                            />
                        </button>
                        <Moon
                            className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-muted-foreground"}`}
                        />
                    </div>

                    {/* Schema Button for SQL */}
                    {examLanguage === 'sql' && schemaData && onShowErDiagram && (
                        <button
                            onClick={onShowErDiagram}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Database className="w-4 h-4" />
                            View Schema
                        </button>
                    )}

                    {/* Run Button */}
                    <button
                        onClick={onRun}
                        disabled={running}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        aria-label={examLanguage === "sql" ? "Execute query" : "Run code"}
                    >
                        {running ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Running
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                {examLanguage === "sql" ? "Execute" : "Run Code"}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Monaco Editor - Full Width */}
            <div className="flex-1 overflow-hidden bg-background">
                <Editor
                    height="100%"
                    language={examLanguage === "sql" ? "sql" : language}
                    value={code}
                    onChange={handleEditorChange}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        lineNumbers: "on",
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        wordWrap: "on",
                        formatOnPaste: true,
                        formatOnType: true,
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        folding: true,
                        bracketPairColorization: { enabled: true },
                    }}
                />
            </div>
        </div>
    );
}