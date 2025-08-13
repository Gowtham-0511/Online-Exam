import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminLayout from "./layout";

interface Skill { id: number; name: string; }
interface Exam { id: number; title: string; }

export default function SkillsetConfigPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [adding, setAdding] = useState(false);

    const fetchExams = async () => {
        const res = await fetch("/api/exams");
        const data = await res.json();
        setExams(data);
    };

    const fetchSkills = async () => {
        const res = await fetch("/api/skills");
        const data = await res.json();
        setSkills(data);
    };

    const fetchExamSkills = async (examId: number) => {
        const res = await fetch(`/api/exam-skill-map?examId=${examId}`);
        const data = await res.json();
        setSelectedSkillIds(data.map((s: Skill) => s.id));
    };

    useEffect(() => {
        fetchExams();
        fetchSkills();
    }, []);

    useEffect(() => {
        if (selectedExamId) {
            fetchExamSkills(selectedExamId);
        }
    }, [selectedExamId]);

    const handleSubmit = async () => {
        if (!selectedExamId) return;
        const res = await fetch("/api/exam-skill-map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId: selectedExamId, skillIds: selectedSkillIds }),
        });

        if (res.ok) {
            toast.success("Skills mapped successfully!");
        } else {
            toast.error("Failed to map skills");
        }
    };

    const toggleSkill = (id: number) => {
        setSelectedSkillIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleAddSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSkill.trim()) return;

        setAdding(true);
        const res = await fetch("/api/skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newSkill.trim() }),
        });

        if (res.ok) {
            toast.success("Skill added!");
            setNewSkill("");
            fetchSkills();
        } else {
            toast.error("Failed to add skill");
        }

        setAdding(false);
    };

    const selectedExam = exams.find(exam => exam.id === selectedExamId);
    const selectedSkills = skills.filter(skill => selectedSkillIds.includes(skill.id));

    return (
        <AdminLayout>
            <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '2rem 0' }}>
                <div className="max-w-4xl mx-auto p-8 space-y-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2 text-gray-600">🧠 Skillset Configuration</h1>
                        <p className="text-gray-600">Map skills to exams and manage your skill database</p>
                    </div>

                    {/* Exam Selection */}
                    <div className="rounded-lg shadow-lg p-6 bg-white border border-blue-100">
                        <h2 className="text-xl font-semibold mb-4 text-gray-600 flex items-center gap-2">
                            📝 Select Exam
                        </h2>
                        <select
                            className="w-full px-4 py-3 rounded-lg border bg-blue-50 border-blue-200 text-gray-700"
                            value={selectedExamId ?? ""}
                            onChange={(e) => setSelectedExamId(Number(e.target.value))}
                        >
                            <option value="" disabled>Choose an exam...</option>
                            {exams.map((exam) => (
                                <option key={exam.id} value={exam.id}>{exam.title}</option>
                            ))}
                        </select>
                    </div>

                    {selectedExamId && (
                        <>
                            {/* Current Selection Summary */}
                            <div className="rounded-lg shadow-lg p-6 bg-blue-50 border border-blue-200">
                                <h3 className="text-lg font-semibold mb-2 text-gray-600">📊 Current Selection</h3>
                                <p className="mb-3 text-gray-600">
                                    <strong>Exam:</strong> {selectedExam?.title}
                                </p>
                                <p className="mb-3 text-gray-600">
                                    <strong>Selected Skills:</strong> {selectedSkills.length}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedSkills.map((skill) => (
                                        <span key={skill.id} className="bg-blue-400 text-white px-3 py-1 rounded-full text-sm">
                                            {skill.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Add New Skill */}
                            <div className="rounded-lg shadow-lg p-6 bg-white border border-blue-100">
                                <h3 className="text-lg font-semibold mb-4 text-gray-600 flex items-center gap-2">
                                    ➕ Add New Skill
                                </h3>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        className="flex-1 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 text-gray-600"
                                        placeholder="Enter skill name..."
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSkill}
                                        disabled={adding || !newSkill.trim()}
                                        className="px-6 py-3 rounded-lg bg-blue-400 text-white font-medium shadow hover:bg-blue-500 disabled:opacity-50"
                                    >
                                        {adding ? "Adding..." : "Add Skill"}
                                    </button>
                                </div>
                            </div>

                            {/* Skills Selection */}
                            <div className="rounded-lg shadow-lg p-6 bg-white border border-blue-100">
                                <h3 className="text-lg font-semibold mb-4 text-gray-600 flex items-center gap-2">
                                    🎯 Select Skills for {selectedExam?.title}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {skills.map((skill) => (
                                        <label
                                            key={skill.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${selectedSkillIds.includes(skill.id)
                                                    ? "bg-blue-50 border-blue-300"
                                                    : "bg-gray-50 border-gray-300"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedSkillIds.includes(skill.id)}
                                                onChange={() => toggleSkill(skill.id)}
                                                className="w-4 h-4 accent-blue-400"
                                            />
                                            <span className="text-gray-700 font-medium">{skill.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={handleSubmit}
                                    className="px-8 py-4 rounded-lg bg-blue-400 text-white font-medium text-lg hover:bg-blue-500 transition-all shadow"
                                >
                                    💾 Save Skill Mappings
                                </button>
                            </div>
                        </>
                    )}

                    {!selectedExamId && (
                        <div className="text-center py-16 rounded-lg bg-blue-50 text-gray-600">
                            <div className="text-6xl mb-4">📘</div>
                            <div className="text-xl mb-2">Select an Exam</div>
                            <div className="text-sm">Choose an exam from the dropdown above to configure its skills</div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
