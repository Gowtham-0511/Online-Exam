import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useSession } from "next-auth/react";

export default function AdminDashboard() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);

    useEffect(() => {
        if (!session) {
            <p className="p-6">Loading...</p>
            return;
        }

        const allowedAdmins = ["admin@example.com"];
        if (!allowedAdmins.includes(session.user?.email || "")) {
            alert("Access denied: Admins only");
        }
    }, [session]);

    useEffect(() => {
        const fetchUsers = async () => {
            const snap = await getDocs(collection(db, "users"));
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(list);
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        const fetchExams = async () => {
            const snap = await getDocs(collection(db, "exams"));
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExams(list);
        };

        fetchExams();
    }, []);

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard 🛠️</h1>

            {/* USERS */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Registered Users</h2>
                <div className="bg-white shadow rounded p-4">
                    {users.length === 0 ? (
                        <p>No users found.</p>
                    ) : (
                        <table className="w-full text-sm border">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="text-left p-2 border">Email</th>
                                    <th className="text-left p-2 border">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => (
                                    <tr key={i}>
                                        <td className="p-2 border">{u.email}</td>
                                        <td className="p-2 border">{u.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* EXAMS */}
            <div>
                <h2 className="text-xl font-semibold mb-2">All Exams</h2>
                <div className="bg-white shadow rounded p-4">
                    {exams.length === 0 ? (
                        <p>No exams found.</p>
                    ) : (
                        <table className="w-full text-sm border">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="text-left p-2 border">ID</th>
                                    <th className="text-left p-2 border">Title</th>
                                    <th className="text-left p-2 border">Language</th>
                                    <th className="text-left p-2 border">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.map((e, i) => (
                                    <tr key={i}>
                                        <td className="p-2 border">{e.id}</td>
                                        <td className="p-2 border">{e.title}</td>
                                        <td className="p-2 border">{e.language}</td>
                                        <td className="p-2 border">{e.duration} min</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}