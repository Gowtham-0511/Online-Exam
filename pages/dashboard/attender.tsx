import { useRouter } from "next/router";

export default function AttenderDashboard() {
    const router = useRouter();

    const handleStartExam = () => {
        router.push("/exam/python101"); // Static for now; dynamic later
    };

    return (
        <div className="min-h-screen p-6 bg-gray-100">
            <h1 className="text-3xl font-bold mb-4">Welcome, Attender 👨‍🎓</h1>
            <p className="mb-6">You have an upcoming Python exam scheduled.</p>

            <button
                onClick={handleStartExam}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
                Start Exam
            </button>
        </div>
    );
}
