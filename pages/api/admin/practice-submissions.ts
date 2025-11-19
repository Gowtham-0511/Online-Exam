import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const query = `
            SELECT 
                ps.id, 
                pq."questionDescription", 
                ps.email, 
                ps."userName", 
                ps."submittedCode", 
                ps."language", 
                ps."isPassed", 
                ps."testCasesPassed", 
                ps."totalTestCases", 
                ps."executionTime", 
                ps."aiFeedback", 
                ps.score, 
                ps."attemptNumber"
            FROM "PracticeSubmissions" ps
            JOIN "PracticeQuestions" pq ON ps."practiceQuestionId" = pq.id
            ORDER BY ps.id DESC
        `;

        console.log('Fetching practice submissions...');

        const result = await pool.query(query);

        return res.status(200).json(result.rows);

    } catch (err) {
        console.error("Error fetching practice submissions:", err);
        res.status(500).json({ error: "Failed to fetch practice submissions" });
    }
}