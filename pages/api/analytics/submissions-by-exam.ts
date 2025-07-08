import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = await getDBConnection();

        const result = await db.query(`
            SELECT 
                e.title AS examTitle,
                COUNT(s.id) AS count
            FROM Submissions s
            JOIN Exams e ON s.examId = e.id
            GROUP BY e.title
            ORDER BY count DESC
        `);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error in submissions by exam:", err);
        res.status(500).json({ error: "Failed to fetch submissions" });
    }
}
