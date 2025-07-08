import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Skill { id: number; name: string; }
interface Job { id: number; title: string; }

export default function SkillsetConfigPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [adding, setAdding] = useState(false);


    const fetchJobs = async () => {
        const res = await fetch("/api/job-positions");
        const data = await res.json();
        setJobs(data);
    };

    const fetchSkills = async () => {
        const res = await fetch("/api/skills");
        const data = await res.json();
        setSkills(data);
    };

    const fetchJobSkills = async (jobId: number) => {
        const res = await fetch(`/api/job-skill-map?jobId=${jobId}`);
        const data = await res.json();
        setSelectedSkillIds(data.map((s: Skill) => s.id));
    };

    useEffect(() => {
        fetchJobs();
        fetchSkills();
    }, []);

    useEffect(() => {
        if (selectedJobId) {
            fetchJobSkills(selectedJobId);
        }
    }, [selectedJobId]);

    const handleSubmit = async () => {
        if (!selectedJobId) return;
        const res = await fetch("/api/job-skill-map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: selectedJobId, skillIds: selectedSkillIds }),
        });

        if (res.ok) {
            toast.success("Skills mapped successfully!");
        } else {
            toast.error("Failed to map skills");
        }
    };

    const toggleSkill = (id: number) => {
        if (selectedSkillIds.includes(id)) {
            setSelectedSkillIds(selectedSkillIds.filter((sid) => sid !== id));
        } else {
            setSelectedSkillIds([...selectedSkillIds, id]);
        }
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
            fetchSkills(); // Refresh list
        } else {
            toast.error("Failed to add skill");
        }

        setAdding(false);
    };

    const selectedJob = jobs.find(job => job.id === selectedJobId);
    const selectedSkills = skills.filter(skill => selectedSkillIds.includes(skill.id));

    return (
        <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '2rem 0' }}>
            <div className="max-w-4xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1
                        className="text-3xl font-bold mb-2"
                        style={{ color: '#6C757D' }}
                    >
                        🧠 Skillset Configuration
                    </h1>
                    <p style={{ color: '#6C757D' }}>
                        Map skills to job positions and manage your skill database
                    </p>
                </div>

                {/* Job Selection */}
                <div
                    className="rounded-lg shadow-lg p-6"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0F6FF' }}
                >
                    <h2
                        className="text-xl font-semibold mb-4 flex items-center gap-2"
                        style={{ color: '#6C757D' }}
                    >
                        💼 Select Job Position
                    </h2>

                    <div className="relative">
                        <select
                            className="w-full px-4 py-3 rounded-lg border appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2"
                            style={{
                                backgroundColor: '#E6F3FF',
                                borderColor: '#ADD8E6',
                                color: '#6C757D',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ADD8E6' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em'
                            }}
                            onChange={(e) => setSelectedJobId(Number(e.target.value))}
                            value={selectedJobId ?? ""}
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
                        >
                            <option value="" disabled>Choose a job position...</option>
                            {jobs.map((job) => (
                                <option key={job.id} value={job.id}>{job.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedJobId && (
                    <>
                        {/* Current Selection Summary */}
                        <div
                            className="rounded-lg shadow-lg p-6"
                            style={{ backgroundColor: '#E6F3FF', border: '1px solid #CCE7FF' }}
                        >
                            <h3
                                className="text-lg font-semibold mb-2"
                                style={{ color: '#6C757D' }}
                            >
                                📊 Current Selection
                            </h3>
                            <p className="mb-3" style={{ color: '#6C757D' }}>
                                <strong>Job:</strong> {selectedJob?.title}
                            </p>
                            <p className="mb-3" style={{ color: '#6C757D' }}>
                                <strong>Selected Skills:</strong> {selectedSkills.length} skills
                            </p>
                            {selectedSkills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedSkills.map((skill) => (
                                        <span
                                            key={skill.id}
                                            className="px-3 py-1 rounded-full text-sm font-medium"
                                            style={{
                                                backgroundColor: '#87CEEB',
                                                color: '#FFFFFF'
                                            }}
                                        >
                                            {skill.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add New Skill */}
                        <div
                            className="rounded-lg shadow-lg p-6"
                            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0F6FF' }}
                        >
                            <h3
                                className="text-lg font-semibold mb-4 flex items-center gap-2"
                                style={{ color: '#6C757D' }}
                            >
                                ➕ Add New Skill
                            </h3>

                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: '#E6F3FF',
                                        borderColor: '#ADD8E6',
                                        color: '#6C757D'
                                    }}
                                    placeholder="Enter skill name..."
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    disabled={adding}
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
                                <button
                                    type="button"
                                    onClick={handleAddSkill}
                                    disabled={adding || !newSkill.trim()}
                                    className="px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    style={{
                                        backgroundColor: adding ? '#DEE2E6' : '#87CEEB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        minWidth: '100px'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!adding && newSkill.trim()) {
                                            e.currentTarget.style.backgroundColor = '#B0E0E6';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!adding) {
                                            e.currentTarget.style.backgroundColor = '#87CEEB';
                                        }
                                    }}
                                >
                                    {adding ? "Adding..." : "Add Skill"}
                                </button>
                            </div>
                        </div>

                        {/* Skills Selection */}
                        <div
                            className="rounded-lg shadow-lg p-6"
                            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0F6FF' }}
                        >
                            <h3
                                className="text-lg font-semibold mb-4 flex items-center gap-2"
                                style={{ color: '#6C757D' }}
                            >
                                🎯 Select Skills for {selectedJob?.title}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {skills.map((skill) => (
                                    <label
                                        key={skill.id}
                                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md"
                                        style={{
                                            backgroundColor: selectedSkillIds.includes(skill.id) ? '#E6F3FF' : '#F8F9FA',
                                            border: selectedSkillIds.includes(skill.id) ? '1px solid #87CEEB' : '1px solid #E9ECEF'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!selectedSkillIds.includes(skill.id)) {
                                                e.currentTarget.style.backgroundColor = '#CCE7FF';
                                                e.currentTarget.style.borderColor = '#ADD8E6';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!selectedSkillIds.includes(skill.id)) {
                                                e.currentTarget.style.backgroundColor = '#F8F9FA';
                                                e.currentTarget.style.borderColor = '#E9ECEF';
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSkillIds.includes(skill.id)}
                                            onChange={() => toggleSkill(skill.id)}
                                            className="w-4 h-4 rounded border-2 focus:ring-2 focus:ring-offset-2"
                                            style={{
                                                accentColor: '#87CEEB',
                                                borderColor: '#ADD8E6'
                                            }}
                                        />
                                        <span
                                            className="font-medium"
                                            style={{
                                                color: selectedSkillIds.includes(skill.id) ? '#6C757D' : '#6C757D'
                                            }}
                                        >
                                            {skill.name}
                                        </span>
                                        {selectedSkillIds.includes(skill.id) && (
                                            <span className="ml-auto text-sm">✓</span>
                                        )}
                                    </label>
                                ))}
                            </div>

                            {skills.length === 0 && (
                                <div
                                    className="text-center py-8 rounded-lg"
                                    style={{
                                        backgroundColor: '#E6F3FF',
                                        color: '#6C757D'
                                    }}
                                >
                                    <div className="text-3xl mb-3">🎯</div>
                                    <div className="text-lg">No skills available</div>
                                    <div className="text-sm mt-2">Add your first skill above!</div>
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                                style={{
                                    backgroundColor: '#87CEEB',
                                    color: '#FFFFFF',
                                    border: 'none'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#B0E0E6';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#87CEEB';
                                }}
                            >
                                💾 Save Skill Mappings
                            </button>
                        </div>
                    </>
                )}

                {!selectedJobId && (
                    <div
                        className="text-center py-16 rounded-lg"
                        style={{
                            backgroundColor: '#E6F3FF',
                            color: '#6C757D'
                        }}
                    >
                        <div className="text-6xl mb-4">🎯</div>
                        <div className="text-xl mb-2">Select a Job Position</div>
                        <div className="text-sm">Choose a job position from the dropdown above to configure its required skills</div>
                    </div>
                )}
            </div>
        </div>
    );
}
