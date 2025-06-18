// components/CodeEditor.tsx
import { useRef } from "react";
import Editor from "@monaco-editor/react";

type Props = {
    language: "python" | "sql";
    value: string;
    onChange: (val: string) => void;
};

export default function CodeEditor({ language, value, onChange }: Props) {
    const editorRef = useRef(null);

    return (
        <div className="h-[400px] border rounded-lg overflow-hidden">
            <Editor
                height="100%"
                defaultLanguage={language}
                defaultValue={value}
                value={value}
                onChange={(value) => onChange(value || "")}
                theme="vs-dark"
                options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                }}
            />
        </div>
    );
}