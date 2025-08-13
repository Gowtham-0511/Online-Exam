import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

interface QuestionInput {
    id?: number;
    questionText: string;
    expectedOutput: string;
    difficulty: string;
    marks: number;
    language: string;
    jobId: number;
    skillId: number;
    imageUrl?: string;
    imageAltText?: string;
}

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

// Custom Rich Text Editor Component
const RichTextEditor = ({ value, onChange, placeholder = "Write your question here..." }: RichTextEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleContentChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleContentChange();
    };

   

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target?.result as string;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '10px 0';
                
                if (editorRef.current) {
                    editorRef.current.appendChild(img);
                    handleContentChange();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{ border: '2px solid #E6F3FF', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                padding: '8px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E6F3FF'
            }}>
                {/* Text Formatting */}
                <button type="button" onClick={() => execCommand('bold')} style={toolbarButtonStyle}>
                    <strong>B</strong>
                </button>
                <button type="button" onClick={() => execCommand('italic')} style={toolbarButtonStyle}>
                    <em>I</em>
                </button>
                <button type="button" onClick={() => execCommand('underline')} style={toolbarButtonStyle}>
                    <u>U</u>
                </button>
                
                
                
                
                
                <div style={{ width: '1px', backgroundColor: '#E5E7EB', margin: '0 4px' }}></div>
                
                {/* Image Upload */}
                <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    style={{...toolbarButtonStyle, backgroundColor: '#10B981', color: 'white'}}
                >
                    📷 Image
                </button>
                
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                />
                
                <div style={{ width: '1px', backgroundColor: '#E5E7EB', margin: '0 4px' }}></div>
                
            </div>
            
            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleContentChange}
                onBlur={handleContentChange}
                style={{
                    minHeight: '200px',
                    padding: '16px',
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    backgroundColor: 'white'
                }}
                suppressContentEditableWarning={true}
                data-placeholder={placeholder}
            />
            
            {/* Placeholder styling */}
            <style jsx>{`
                div[contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #9CA3AF;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};

const toolbarButtonStyle = {
    padding: '6px 10px',
    border: '1px solid #D1D5DB',
    backgroundColor: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151',
    transition: 'all 0.2s'
};

export default function QuestionBankPage() {
    const { data: session } = useSession();

    const [question, setQuestion] = useState<QuestionInput>({
        questionText: "",
        expectedOutput: "",
        difficulty: "easy",
        marks: 1,
        language: "python",
        jobId: 1,
        skillId: 1,
    });

    const [filters, setFilters] = useState({
        keyword: "",
        language: "",
        difficulty: "",
        jobId: "",
        skillId: ""
    });

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<QuestionInput[]>([]);
    const [uploading, setUploading] = useState(false);
    const [questions, setQuestions] = useState<QuestionInput[]>([]);
    const [editMode, setEditMode] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>({});

    const fetchFilteredQuestions = async () => {
        const params = new URLSearchParams(filters as any).toString();
        const res = await fetch(`/api/questions?${params}`);
        const data = await res.json();
        setQuestions(data);
    };

    useEffect(() => {
        fetchFilteredQuestions();
    }, []);

    const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: { data: QuestionInput[] }) => {
                const rows = results.data as QuestionInput[];
                setPreview(rows);
                toast.success(`Parsed ${rows.length} questions`);
            },
        });
    };

    const handleBulkUpload = async () => {
        if (!preview.length) return;
        setUploading(true);
        const res = await fetch("/api/questions/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                questions: preview.map((q) => ({ ...q, createdBy: "admin@example.com" })),
            }),
        });
        if (res.ok) {
            toast.success("Bulk upload successful");
            setFile(null);
            setPreview([]);
        } else {
            toast.error("Bulk upload failed");
        }
        setUploading(false);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const content = question.questionText;
        
        if (!content || !content.replace(/<[^>]+>/g, '').trim()) {
            toast.error("Please enter the question text!");
            return;
        }
        
        const questionData = {
            ...question,
            questionText: content,
            createdBy: session?.user?.email
        };
        
        const res = await fetch("/api/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData),
        });
        
        if (res.ok) {
            toast.success("Question added");
            setQuestion({ ...question, questionText: "", expectedOutput: "" });
            fetchFilteredQuestions();
        } else {
            toast.error("Failed to add");
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #E0F6FF 0%, #CCE7FF 100%)',
            padding: '2rem 0'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 2rem'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)',
                    padding: '2rem',
                    borderRadius: '20px',
                    marginBottom: '2rem'
                }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        margin: 0
                    }}>
                        📚 Question Bank
                    </h1>
                    <p style={{
                        color: '#FFFFFF',
                        opacity: 0.9,
                        fontSize: '1.1rem',
                        margin: '0.5rem 0 0 0'
                    }}>
                        Manage your coding questions and test cases
                    </p>
                </div>

                {/* Manual Form with Custom Rich Text Editor */}
                <div style={{
                    background: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
                        ➕ Add Single Question
                    </h2>
                    
                    <form onSubmit={handleManualSubmit} style={{ display: "grid", gap: "1.5rem" }}>
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#374151'
                            }}>
                                Question (Rich Text & Images supported):
                            </label>
                            <RichTextEditor
                                value={question.questionText}
                                onChange={(content: any) => setQuestion({ ...question, questionText: content })}
                                placeholder="Write your coding question here. Use the toolbar to format text and add images..."
                            />
                        </div>
                        
                        {/* Expected Output */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#374151'
                            }}>
                                Expected Output:
                            </label>
                            <textarea
                                required
                                placeholder="Enter the expected output for this question..."
                                style={{ 
                                    border: "2px solid #E6F3FF", 
                                    padding: "1rem", 
                                    borderRadius: "12px", 
                                    fontSize: "1rem",
                                    minHeight: "100px",
                                    width: "100%",
                                    resize: "vertical",
                                    fontFamily: "monospace"
                                }}
                                value={question.expectedOutput}
                                onChange={(e) => setQuestion({ ...question, expectedOutput: e.target.value })}
                            />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {/* Difficulty */}
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Difficulty:
                                </label>
                                <select
                                    value={question.difficulty}
                                    onChange={(e) => setQuestion({ ...question, difficulty: e.target.value })}
                                    style={{ 
                                        border: "2px solid #E6F3FF", 
                                        padding: "1rem", 
                                        borderRadius: "12px", 
                                        fontSize: "1rem",
                                        width: "100%"
                                    }}
                                >
                                    <option value="easy">🟢 Easy</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="hard">🔴 Hard</option>
                                </select>
                            </div>
                            
                            {/* Marks */}
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Marks:
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    placeholder="Points"
                                    style={{ 
                                        border: "2px solid #E6F3FF", 
                                        padding: "1rem", 
                                        borderRadius: "12px", 
                                        fontSize: "1rem",
                                        width: "100%"
                                    }}
                                    value={question.marks}
                                    onChange={(e) => setQuestion({ ...question, marks: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            
                            {/* Language */}
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '0.5rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Programming Language:
                                </label>
                                <select
                                    value={question.language}
                                    onChange={(e) => setQuestion({ ...question, language: e.target.value })}
                                    style={{ 
                                        border: "2px solid #E6F3FF", 
                                        padding: "1rem", 
                                        borderRadius: "12px", 
                                        fontSize: "1rem",
                                        width: "100%"
                                    }}
                                >
                                    <option value="python">🐍 Python</option>
                                    <option value="javascript">💛 JavaScript</option>
                                    <option value="java">☕ Java</option>
                                    <option value="cpp">⚡ C++</option>
                                    <option value="csharp">🔷 C#</option>
                                    <option value="go">🐹 Go</option>
                                    <option value="rust">🦀 Rust</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={{
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: '#FFFFFF',
                                padding: '1.25rem 2rem',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                        >
                            💾 Save Question
                        </button>
                    </form>
                </div>

                {/* Bulk Upload Section */}
                <div style={{
                    background: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
                        📄 Bulk Upload (CSV)
                    </h2>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVChange}
                            style={{ 
                                border: "2px solid #E6F3FF", 
                                padding: "0.75rem", 
                                borderRadius: "8px",
                                fontSize: "0.9rem"
                            }}
                        />
                        
                        {preview.length > 0 && (
                            <button
                                onClick={handleBulkUpload}
                                disabled={uploading}
                                style={{
                                    background: uploading ? '#94A3B8' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                    color: '#FFFFFF',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: uploading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {uploading ? '⏳ Uploading...' : `📤 Upload ${preview.length} Questions`}
                            </button>
                        )}
                    </div>
                    
                    {preview.length > 0 && (
                        <div style={{ 
                            background: '#F8FAFC', 
                            padding: '1rem', 
                            borderRadius: '8px',
                            marginTop: '1rem'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B' }}>
                                ✅ Preview: {preview.length} questions ready for upload
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}