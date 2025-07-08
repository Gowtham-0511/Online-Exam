import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = await getDBConnection();

        const result = await db.query(`
            SELECT TOP 1 
                e.title, 
                COUNT(s.id) AS submissionCount
            FROM Submissions s
            JOIN Exams e ON s.examId = e.id
            GROUP BY e.title
            ORDER BY submissionCount DESC
        `);

        const topExam = result.recordset[0] || {};
        res.status(200).json(topExam);
    } catch (err) {
        console.error("Error in top exam:", err);
        res.status(500).json({ error: "Failed to fetch top exam" });
    }
}
