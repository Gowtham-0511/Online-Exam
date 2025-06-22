import Editor from "@monaco-editor/react";

interface Props {
    language: string;
    value: string;
    onChange: (value: string) => void;
    theme?: "light" | "vs-dark";
}

export default function CodeEditor({
    language,
    value,
    onChange,
    theme = "light"
}: Props) {
    return (
        <Editor
            height="100%"
            defaultLanguage={language}
            defaultValue={value}
            value={value}
            onChange={(value) => onChange(value || "")}
            theme={theme}
            options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                wordWrap: "on",
                tabSize: 2,
                scrollBeyondLastLine: false
            }}
        />
    );
}