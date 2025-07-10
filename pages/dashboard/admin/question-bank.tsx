import { useEffect, useState } from "react";
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
}

export default function QuestionBankPage() {
    const [question, setQuestion] = useState<QuestionInput>({
        questionText: "",
        expectedOutput: "",
        difficulty: "easy",
        marks: 1,
        language: "python",
        jobId: 1,
        skillId: 1,
    });

    const { data: session } = useSession();

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
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
    const [testCases, setTestCases] = useState<any[]>([]);
    const [newTestCase, setNewTestCase] = useState({ inputText: "", expectedOutput: "" });
    const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
    const [editingData, setEditingData] = useState({ inputText: "", expectedOutput: "" });


    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch("/api/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...question, createdBy: session?.user?.email }),
        });

        if (res.ok) {
            toast.success("Question added");
            setQuestion({ ...question, questionText: "", expectedOutput: "" });
        } else {
            toast.error("Failed to add");
        }
    };

    const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: { data: QuestionInput[]; }) => {
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

    const fetchFilteredQuestions = async () => {
        const params = new URLSearchParams(filters as any).toString();
        const res = await fetch(`/api/questions?${params}`);
        const data = await res.json();
        setQuestions(data);
    };

    useEffect(() => {
        fetchFilteredQuestions();
    }, []);

    const handleEditClick = (question: any) => {
        setEditMode(question.id);
        setEditData({ ...question });
    };

    const handleEditSave = async () => {
        const res = await fetch("/api/questions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editData),
        });

        if (res.ok) {
            toast.success("Question updated!");
            setEditMode(null);
            fetchFilteredQuestions();
        } else {
            toast.error("Failed to update.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this question?")) return;

        const res = await fetch("/api/questions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });

        if (res.ok) {
            toast.success("Question deleted");
            fetchFilteredQuestions();
        } else {
            toast.error("Delete failed");
        }
    };

    const loadTestCases = async (questionId: number) => {
        const res = await fetch(`/api/questions/${questionId}/test-cases`);
        const data = await res.json();
        setTestCases(data);
        setExpandedRowId(questionId);
    };

    const handleAddTestCase = async (questionId: number) => {
        const res = await fetch(`/api/questions/${questionId}/test-cases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTestCase),
        });

        if (res.ok) {
            toast.success("Test case added");
            setNewTestCase({ inputText: "", expectedOutput: "" });
            loadTestCases(questionId);
        }
    };

    const handleDeleteTestCase = async (questionId: number, caseId: number) => {
        const res = await fetch(`/api/questions/${questionId}/test-cases`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseId }),
        });

        if (res.ok) {
            toast.success("Deleted");
            loadTestCases(questionId);
        }
    };

    const startEditing = (tc: any) => {
        setEditingCaseId(tc.id);
        setEditingData({ inputText: tc.inputText, expectedOutput: tc.expectedOutput });
    };

    const handleSaveEdit = async (questionId: number) => {
        const res = await fetch(`/api/questions/${questionId}/test-cases`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseId: editingCaseId, ...editingData }),
        });

        if (res.ok) {
            toast.success("Test case updated");
            setEditingCaseId(null);
            loadTestCases(questionId);
        } else {
            toast.error("Update failed");
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '#87CEEB';
            case 'medium': return '#ADD8E6';
            case 'hard': return '#B0E0E6';
            default: return '#E9ECEF';
        }
    };

    const getDifficultyIcon = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '🟢';
            case 'medium': return '🟡';
            case 'hard': return '🔴';
            default: return '⚪';
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
                    marginBottom: '2rem',
                    boxShadow: '0 8px 32px rgba(135, 206, 235, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
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

                {/* Filters */}
                <div style={{
                    background: '#FFFFFF',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    boxShadow: '0 4px 20px rgba(135, 206, 235, 0.15)',
                    border: '1px solid #E6F3FF'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem'
                    }}>
                        <input
                            placeholder="🔍 Search questions..."
                            style={{
                                border: '2px solid #E6F3FF',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                transition: 'all 0.3s ease',
                                outline: 'none',
                                backgroundColor: '#F8F9FA'
                            }}
                            value={filters.keyword}
                            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                            onFocus={(e) => e.target.style.borderColor = '#87CEEB'}
                            onBlur={(e) => e.target.style.borderColor = '#E6F3FF'}
                        />

                        <select
                            style={{
                                border: '2px solid #E6F3FF',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                backgroundColor: '#F8F9FA',
                                outline: 'none'
                            }}
                            value={filters.language}
                            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                        >
                            <option value="">All Languages</option>
                            <option value="python">🐍 Python</option>
                            <option value="sql">🗃️ SQL</option>
                        </select>

                        <select
                            style={{
                                border: '2px solid #E6F3FF',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                backgroundColor: '#F8F9FA',
                                outline: 'none'
                            }}
                            value={filters.difficulty}
                            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                        >
                            <option value="">All Difficulties</option>
                            <option value="easy">🟢 Easy</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="hard">🔴 Hard</option>
                        </select>

                        <button
                            onClick={fetchFilteredQuestions}
                            style={{
                                background: 'linear-gradient(135deg, #87CEEB 0%, #ADD8E6 100%)',
                                color: '#FFFFFF',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(135, 206, 235, 0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(135, 206, 235, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.3)';
                            }}
                        >
                            🔍 Search
                        </button>
                    </div>
                </div>

                {/* Manual Form */}
                <div style={{
                    background: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    boxShadow: '0 4px 20px rgba(135, 206, 235, 0.15)',
                    border: '1px solid #E6F3FF'
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        marginBottom: '1.5rem',
                        color: '#6C757D',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        ➕ Add Single Question
                    </h2>
                    <form onSubmit={handleManualSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <input
                            type="text"
                            required
                            placeholder="Enter your question..."
                            style={{
                                border: '2px solid #E6F3FF',
                                padding: '1rem',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                outline: 'none',
                                backgroundColor: '#F8F9FA',
                                transition: 'all 0.3s ease'
                            }}
                            value={question.questionText}
                            onChange={(e) => setQuestion({ ...question, questionText: e.target.value })}
                            onFocus={(e) => e.target.style.borderColor = '#87CEEB'}
                            onBlur={(e) => e.target.style.borderColor = '#E6F3FF'}
                        />
                        <input
                            type="text"
                            required
                            placeholder="Expected output..."
                            style={{
                                border: '2px solid #E6F3FF',
                                padding: '1rem',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                outline: 'none',
                                backgroundColor: '#F8F9FA',
                                transition: 'all 0.3s ease'
                            }}
                            value={question.expectedOutput}
                            onChange={(e) => setQuestion({ ...question, expectedOutput: e.target.value })}
                            onFocus={(e) => e.target.style.borderColor = '#87CEEB'}
                            onBlur={(e) => e.target.style.borderColor = '#E6F3FF'}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <select
                                style={{
                                    border: '2px solid #E6F3FF',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    backgroundColor: '#F8F9FA',
                                    outline: 'none'
                                }}
                                value={question.difficulty}
                                onChange={(e) => setQuestion({ ...question, difficulty: e.target.value })}
                            >
                                <option value="easy">🟢 Easy</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="hard">🔴 Hard</option>
                            </select>

                            <input
                                type="number"
                                placeholder="Marks"
                                value={question.marks}
                                style={{
                                    border: '2px solid #E6F3FF',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    backgroundColor: '#F8F9FA'
                                }}
                                onChange={(e) => setQuestion({ ...question, marks: Number(e.target.value) })}
                            />

                            <select
                                style={{
                                    border: '2px solid #E6F3FF',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    backgroundColor: '#F8F9FA',
                                    outline: 'none'
                                }}
                                value={question.language}
                                onChange={(e) => setQuestion({ ...question, language: e.target.value })}
                            >
                                <option value="python">🐍 Python</option>
                                <option value="sql">🗃️ SQL</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            style={{
                                background: 'linear-gradient(135deg, #87CEEB 0%, #ADD8E6 100%)',
                                color: '#FFFFFF',
                                padding: '1rem 2rem',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(135, 206, 235, 0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(135, 206, 235, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 206, 235, 0.3)';
                            }}
                        >
                            💾 Save Question
                        </button>
                    </form>
                </div>

                {/* Bulk Upload */}
                <div style={{
                    background: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    boxShadow: '0 4px 20px rgba(135, 206, 235, 0.15)',
                    border: '1px solid #E6F3FF'
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        marginBottom: '1.5rem',
                        color: '#6C757D',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        📥 Bulk Upload (.CSV)
                    </h2>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVChange}
                        style={{
                            padding: '0.75rem',
                            border: '2px dashed #ADD8E6',
                            borderRadius: '12px',
                            backgroundColor: '#E0F6FF',
                            width: '100%',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    />
                    {preview.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <p style={{
                                color: '#6C757D',
                                fontSize: '0.9rem',
                                marginBottom: '1rem'
                            }}>
                                Previewing <strong style={{ color: '#87CEEB' }}>{preview.length}</strong> questions
                            </p>
                            <button
                                onClick={handleBulkUpload}
                                disabled={uploading}
                                style={{
                                    background: uploading ? '#DEE2E6' : 'linear-gradient(135deg, #87CEEB 0%, #ADD8E6 100%)',
                                    color: '#FFFFFF',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: uploading ? 'none' : '0 4px 12px rgba(135, 206, 235, 0.3)'
                                }}
                            >
                                {uploading ? "📤 Uploading..." : "📤 Upload All"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Questions Table */}
                {questions.length > 0 ? (
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(135, 206, 235, 0.15)',
                        border: '1px solid #E6F3FF',
                        overflow: 'hidden'
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{
                                        background: 'linear-gradient(135deg, #E0F6FF 0%, #CCE7FF 100%)',
                                        borderBottom: '2px solid #ADD8E6'
                                    }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: '#6C757D', fontWeight: '600' }}>#</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: '#6C757D', fontWeight: '600' }}>Question</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: '#6C757D', fontWeight: '600' }}>Language</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: '#6C757D', fontWeight: '600' }}>Difficulty</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: '#6C757D', fontWeight: '600' }}>Marks</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: '#6C757D', fontWeight: '600' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {questions.map((q, i) => (
                                        <>
                                            <tr key={q.id} style={{
                                                borderBottom: '1px solid #E6F3FF',
                                                backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F8F9FA'
                                            }}>
                                                <td style={{ padding: '1rem', color: '#6C757D' }}>{i + 1}</td>
                                                <td style={{ padding: '1rem', color: '#6C757D', maxWidth: '300px' }}>
                                                    {editMode === q.id ? (
                                                        <input
                                                            style={{
                                                                border: '2px solid #87CEEB',
                                                                padding: '0.5rem',
                                                                borderRadius: '8px',
                                                                width: '100%',
                                                                outline: 'none'
                                                            }}
                                                            value={editData.questionText}
                                                            onChange={(e) => setEditData({ ...editData, questionText: e.target.value })}
                                                        />
                                                    ) : (
                                                        <span style={{
                                                            display: 'block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {q.questionText}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        background: '#E0F6FF',
                                                        color: '#6C757D',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '500'
                                                    }}>
                                                        {q.language === 'python' ? '🐍' : '🗃️'} {q.language.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        background: getDifficultyColor(q.difficulty),
                                                        color: '#FFFFFF',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '500',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem'
                                                    }}>
                                                        {getDifficultyIcon(q.difficulty)} {q.difficulty.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', color: '#6C757D', fontWeight: '600' }}>{q.marks}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        {editMode === q.id ? (
                                                            <>
                                                                <button
                                                                    style={{
                                                                        background: '#87CEEB',
                                                                        color: '#FFFFFF',
                                                                        border: 'none',
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.8rem',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500'
                                                                    }}
                                                                    onClick={handleEditSave}
                                                                >
                                                                    ✅ Save
                                                                </button>
                                                                <button
                                                                    style={{
                                                                        background: '#DEE2E6',
                                                                        color: '#6C757D',
                                                                        border: 'none',
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.8rem',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500'
                                                                    }}
                                                                    onClick={() => setEditMode(null)}
                                                                >
                                                                    ❌ Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    style={{
                                                                        background: '#ADD8E6',
                                                                        color: '#FFFFFF',
                                                                        border: 'none',
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.8rem',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500'
                                                                    }}
                                                                    onClick={() => handleEditClick(q)}
                                                                >
                                                                    ✏️ Edit
                                                                </button>
                                                                <button
                                                                    style={{
                                                                        background: '#B0E0E6',
                                                                        color: '#FFFFFF',
                                                                        border: 'none',
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.8rem',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500'
                                                                    }}
                                                                    onClick={() => q.id !== undefined && handleDelete(q.id)}
                                                                >
                                                                    🗑️ Delete
                                                                </button>
                                                                <button
                                                                    style={{
                                                                        background: '#87CEEB',
                                                                        color: '#FFFFFF',
                                                                        border: 'none',
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.8rem',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500'
                                                                    }}
                                                                    onClick={() => q.id !== undefined && loadTestCases(q.id)}
                                                                >
                                                                    🧪 Test Cases
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRowId === q.id && (
                                                <tr>
                                                    <td colSpan={6} style={{
                                                        padding: '2rem',
                                                        background: 'linear-gradient(135deg, #E0F6FF 0%, #CCE7FF 100%)',
                                                        borderBottom: '1px solid #ADD8E6'
                                                    }}>
                                                        <h4 style={{
                                                            fontWeight: '600',
                                                            marginBottom: '1rem',
                                                            color: '#6C757D',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem'
                                                        }}>
                                                            🧪 Test Cases
                                                        </h4>

                                                        <div style={{ marginBottom: '1.5rem' }}>
                                                            {testCases.map((tc) => (
                                                                <div key={tc.id} style={{
                                                                    background: '#FFFFFF',
                                                                    border: '1px solid #E6F3FF',
                                                                    padding: '1rem',
                                                                    borderRadius: '12px',
                                                                    marginBottom: '0.75rem'
                                                                }}>
                                                                    {editingCaseId === tc.id ? (
                                                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                            <input
                                                                                value={editingData.inputText}
                                                                                onChange={(e) => setEditingData({ ...editingData, inputText: e.target.value })}
                                                                                placeholder="Input"
                                                                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', flex: 1 }}
                                                                            />
                                                                            <input
                                                                                value={editingData.expectedOutput}
                                                                                onChange={(e) => setEditingData({ ...editingData, expectedOutput: e.target.value })}
                                                                                placeholder="Expected Output"
                                                                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', flex: 1 }}
                                                                            />
                                                                            <button
                                                                                onClick={() => q.id !== undefined && handleSaveEdit(q.id)}
                                                                                style={{ background: '#28a745', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none' }}
                                                                            >
                                                                                Save
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingCaseId(null)}
                                                                                style={{ background: '#6c757d', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none' }}
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '0.9rem' }}>
                                                                                <b>Input:</b> {tc.inputText} &nbsp;&nbsp; <b>Output:</b> {tc.expectedOutput}
                                                                            </span>
                                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                <button
                                                                                    onClick={() => startEditing(tc)}
                                                                                    style={{ background: '#007bff', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.8rem' }}
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => q.id !== undefined && handleDeleteTestCase(q.id, tc.id)}
                                                                                    style={{ background: '#dc3545', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '6px', border: 'none', fontSize: '0.8rem' }}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Add new test case */}
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                                            <input
                                                                placeholder="Input"
                                                                value={newTestCase.inputText}
                                                                onChange={(e) => setNewTestCase({ ...newTestCase, inputText: e.target.value })}
                                                                style={{ padding: '0.5rem', flex: 1, borderRadius: '8px', border: '1px solid #ccc' }}
                                                            />
                                                            <input
                                                                placeholder="Expected Output"
                                                                value={newTestCase.expectedOutput}
                                                                onChange={(e) => setNewTestCase({ ...newTestCase, expectedOutput: e.target.value })}
                                                                style={{ padding: '0.5rem', flex: 1, borderRadius: '8px', border: '1px solid #ccc' }}
                                                            />
                                                            <button
                                                                onClick={() => q.id !== undefined && handleAddTestCase(q.id)}
                                                                style={{ background: '#007bff', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none' }}
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: '#6C757D', marginTop: '2rem' }}>
                        No questions found.
                    </p>
                )}
            </div>
        </div>
    );

}
