import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface JobPosition {
    id: number;
    title: string;
    description: string;
    createdAt: string;
}

export default function JobPositionsPage() {
    const [positions, setPositions] = useState<JobPosition[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [editId, setEditId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");


    const fetchPositions = async () => {
        const res = await fetch("/api/exams");
        const data = await res.json();
        setPositions(data);
    };

    useEffect(() => {
        fetchPositions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch("/api/exams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description }),
        });

        if (res.ok) {
            toast.success("Job Position added");
            setTitle("");
            setDescription("");
            fetchPositions();
        } else {
            toast.error("Failed to add");
        }
    };

    const handleUpdate = async (id: number) => {
        const res = await fetch("/api/exams", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, title: editTitle, description: editDesc }),
        });

        if (res.ok) {
            toast.success("Updated successfully");
            setEditId(null);
            fetchPositions();
        } else {
            toast.error("Update failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this position?")) return;

        const res = await fetch("/api/exams", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });

        if (res.ok) {
            toast.success("Deleted");
            fetchPositions();
        } else {
            toast.error("Delete failed");
        }
    };

    return (
        <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '2rem 0' }}>
            <div className="max-w-4xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1
                        className="text-3xl font-bold mb-2"
                        style={{ color: '#6C757D' }}
                    >
                        📌 Exams
                    </h1>
                    <p style={{ color: '#6C757D' }}>
                        Create, edit, and manage exams for your organization
                    </p>
                </div>

                {/* Add New Position Form */}
                <div
                    className="rounded-lg shadow-lg p-6"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0F6FF' }}
                >
                    <h2
                        className="text-xl font-semibold mb-4 flex items-center gap-2"
                        style={{ color: '#6C757D' }}
                    >
                        ✨ Add New Exam
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label
                                className="block text-sm font-medium mb-2"
                                style={{ color: '#6C757D' }}
                            >
                                Exam Title
                            </label>
                            <input
                                type="text"
                                placeholder="Enter job title..."
                                className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2"
                                style={{
                                    backgroundColor: '#E6F3FF',
                                    borderColor: '#ADD8E6',
                                    color: '#6C757D'
                                }}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onFocus={(e) => {
                                    e.target.style.backgroundColor = '#FFFFFF';
                                    e.target.style.borderColor = '#87CEEB';
                                    e.target.style.boxShadow = '0 0 0 3px #E0F6FF';
                                }}
                                onBlur={(e) => {
                                    e.target.style.backgroundColor = '#E6F3FF';
                                    e.target.style.borderColor = '#ADD8E6';
                                    e.target.style.boxShadow = 'none';
                                }}
                                required
                            />
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium mb-2"
                                style={{ color: '#6C757D' }}
                            >
                                Description
                            </label>
                            <textarea
                                placeholder="Enter job description..."
                                className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2"
                                style={{
                                    backgroundColor: '#E6F3FF',
                                    borderColor: '#ADD8E6',
                                    color: '#6C757D',
                                    minHeight: '100px'
                                }}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onFocus={(e) => {
                                    e.target.style.backgroundColor = '#FFFFFF';
                                    e.target.style.borderColor = '#87CEEB';
                                    e.target.style.boxShadow = '0 0 0 3px #E0F6FF';
                                }}
                                onBlur={(e) => {
                                    e.target.style.backgroundColor = '#E6F3FF';
                                    e.target.style.borderColor = '#ADD8E6';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <button
                            type="button"
                            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            style={{
                                backgroundColor: '#87CEEB',
                                color: '#FFFFFF',
                                border: 'none'
                            }}
                            onClick={handleSubmit}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#B0E0E6';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#87CEEB';
                            }}
                        >
                            ➕ Add Exam
                        </button>
                    </div>
                </div>

                {/* Existing Positions */}
                <div>
                    <h2
                        className="text-2xl font-semibold mb-6 flex items-center gap-2"
                        style={{ color: '#6C757D' }}
                    >
                        📄 Current Exams ({positions.length})
                    </h2>

                    <div className="space-y-4">
                        {positions.map((pos) => (
                            <div
                                key={pos.id}
                                className="rounded-lg shadow-lg p-6 transition-all duration-200 hover:shadow-xl"
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CCE7FF'
                                }}
                            >
                                <div className="flex justify-between items-start gap-6">
                                    <div className="flex-1">
                                        {editId === pos.id ? (
                                            <div className="space-y-3">
                                                <input
                                                    className="w-full border rounded-lg px-4 py-2 transition-all duration-200 focus:outline-none focus:ring-2"
                                                    style={{
                                                        backgroundColor: '#E6F3FF',
                                                        borderColor: '#ADD8E6',
                                                        color: '#6C757D'
                                                    }}
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    onFocus={(e) => {
                                                        e.target.style.backgroundColor = '#FFFFFF';
                                                        e.target.style.borderColor = '#87CEEB';
                                                        e.target.style.boxShadow = '0 0 0 3px #E0F6FF';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.backgroundColor = '#E6F3FF';
                                                        e.target.style.borderColor = '#ADD8E6';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                                <textarea
                                                    className="w-full border rounded-lg px-4 py-2 transition-all duration-200 focus:outline-none focus:ring-2"
                                                    style={{
                                                        backgroundColor: '#E6F3FF',
                                                        borderColor: '#ADD8E6',
                                                        color: '#6C757D',
                                                        minHeight: '80px'
                                                    }}
                                                    value={editDesc}
                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                    onFocus={(e) => {
                                                        e.target.style.backgroundColor = '#FFFFFF';
                                                        e.target.style.borderColor = '#87CEEB';
                                                        e.target.style.boxShadow = '0 0 0 3px #E0F6FF';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.backgroundColor = '#E6F3FF';
                                                        e.target.style.borderColor = '#ADD8E6';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div
                                                    className="text-xl font-bold mb-2"
                                                    style={{ color: '#6C757D' }}
                                                >
                                                    {pos.title}
                                                </div>
                                                <div
                                                    className="text-sm leading-relaxed mb-3"
                                                    style={{ color: '#6C757D' }}
                                                >
                                                    {pos.description}
                                                </div>
                                                <div
                                                    className="text-xs"
                                                    style={{ color: '#ADD8E6' }}
                                                >
                                                    Created: {pos.createdAt}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 min-w-fit">
                                        {editId === pos.id ? (
                                            <>
                                                <button
                                                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                                    style={{
                                                        backgroundColor: '#87CEEB',
                                                        color: '#FFFFFF',
                                                        border: 'none'
                                                    }}
                                                    onClick={() => handleUpdate(pos.id)}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#B0E0E6';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#87CEEB';
                                                    }}
                                                >
                                                    ✅ Save
                                                </button>
                                                <button
                                                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                                                    style={{
                                                        backgroundColor: '#DEE2E6',
                                                        color: '#6C757D',
                                                        border: 'none'
                                                    }}
                                                    onClick={() => setEditId(null)}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#E9ECEF';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#DEE2E6';
                                                    }}
                                                >
                                                    ❌ Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                                    style={{
                                                        backgroundColor: '#B0E0E6',
                                                        color: '#6C757D',
                                                        border: 'none'
                                                    }}
                                                    onClick={() => {
                                                        setEditId(pos.id);
                                                        setEditTitle(pos.title);
                                                        setEditDesc(pos.description || "");
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#ADD8E6';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#B0E0E6';
                                                    }}
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                                    style={{
                                                        backgroundColor: '#E9ECEF',
                                                        color: '#6C757D',
                                                        border: 'none'
                                                    }}
                                                    onClick={() => handleDelete(pos.id)}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#DEE2E6';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#E9ECEF';
                                                    }}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {positions.length === 0 && (
                            <div
                                className="text-center py-12 rounded-lg"
                                style={{
                                    backgroundColor: '#E6F3FF',
                                    color: '#6C757D'
                                }}
                            >
                                <div className="text-4xl mb-4">📝</div>
                                <div className="text-lg">No job positions yet</div>
                                <div className="text-sm mt-2">Add your first position above!</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
