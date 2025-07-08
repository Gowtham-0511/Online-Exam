import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

    try {
        const db = await getDBConnection();

        const [users, exams, submissions, avgDuration] = await Promise.all([
            db.query(`SELECT COUNT(*) as totalUsers FROM Users`),
            db.query(`SELECT COUNT(*) as totalExams FROM Exams`),
            db.query(`SELECT COUNT(*) as totalSubmissions FROM Submissions`),
            db.query(`SELECT ROUND(AVG(CAST(duration AS FLOAT)), 1) as avgDuration FROM Exams`)
        ]);

        const totalUsers = users.recordset[0]?.totalUsers || 0;
        const totalExams = exams.recordset[0]?.totalExams || 0;
        const totalSubmissions = submissions.recordset[0]?.totalSubmissions || 0;
        const avg = avgDuration.recordset[0]?.avgDuration ?? 0;

        return res.status(200).json({
            totalUsers,
            totalExams,
            totalSubmissions,
            avgDuration: avg
        });
    } catch (err) {
        console.error("Error fetching stats:", err);
        return res.status(500).json({ error: "Failed to fetch analytics" });
    }
}
