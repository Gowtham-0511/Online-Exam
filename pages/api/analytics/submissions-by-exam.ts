import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT e.title as examTitle, COUNT(s.id) as count
            FROM submissions s
            JOIN exams e ON e.title = s.examId
            GROUP BY e.title
            ORDER BY count DESC
        `);

        const result = stmt.all();
        res.status(200).json(result);
    } catch (err) {
        console.error("Error in submissions by exam:", err);
        res.status(500).json({ error: "Failed to fetch submissions" });
    }
}
