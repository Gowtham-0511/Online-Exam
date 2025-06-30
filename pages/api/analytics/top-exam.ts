import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = getDatabase();

        const stmt = db.prepare(`
            SELECT e.title, COUNT(s.id) as submissionCount
            FROM submissions s
            JOIN exams e ON s.examId = e.title
            GROUP BY e.title
            ORDER BY submissionCount DESC
            LIMIT 1
        `);

        const topExam = stmt.get();
        return res.status(200).json(topExam || {});
    } catch (err) {
        console.error("Error in top exam:", err);
        res.status(500).json({ error: "Failed to fetch top exam" });
    }
}
