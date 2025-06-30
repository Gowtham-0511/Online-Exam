import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

    try {
        const db = getDatabase();

        const userCountStmt = db.prepare("SELECT COUNT(*) as totalUsers FROM users");
        const examCountStmt = db.prepare("SELECT COUNT(*) as totalExams FROM exams");
        const submissionCountStmt = db.prepare("SELECT COUNT(*) as totalSubmissions FROM submissions");
        const avgDurationStmt = db.prepare("SELECT ROUND(AVG(duration), 1) as avgDuration FROM exams");

        const totalUsers = (userCountStmt.get() as { totalUsers: number }).totalUsers;
        const totalExams = (examCountStmt.get() as { totalExams: number }).totalExams;
        const totalSubmissions = (submissionCountStmt.get() as { totalSubmissions: number }).totalSubmissions;
        const avgDuration = (avgDurationStmt.get() as { avgDuration: number | null }).avgDuration ?? 0;

        return res.status(200).json({
            totalUsers,
            totalExams,
            totalSubmissions,
            avgDuration
        });
    } catch (err) {
        console.error("Error fetching stats:", err);
        return res.status(500).json({ error: "Failed to fetch analytics" });
    }
}
