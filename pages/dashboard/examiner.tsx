// pages/dashboard/examiner.tsx
import { useState } from "react";

export default function ExaminerDashboard() {
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("python");
    const [duration, setDuration] = useState(10);

    const handleCreateExam = () => {
        alert(`Exam "${title}" created with ${language} editor for ${duration} minutes.`);
        // TODO: Save to Firestore in next phase
    };

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <h1 className="text-3xl font-bold mb-4">Examiner Dashboard 🎓</h1>

            <div className="bg-white shadow rounded p-6 max-w-md">
                <h2 className="text-xl font-semibold mb-4">Post New Exam</h2>

                <input
                    type="text"
                    placeholder="Exam Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border p-2 rounded mb-3"
                />

                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border p-2 rounded mb-3"
                >
                    <option value="python">Python</option>
                    <option value="sql">SQL</option>
                </select>

                <input
                    type="number"
                    placeholder="Duration (minutes)"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full border p-2 rounded mb-3"
                />

                <button
                    onClick={handleCreateExam}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    Create Exam
                </button>
            </div>
        </div>
    );
}
