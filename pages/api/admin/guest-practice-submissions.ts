import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const query = `
            SELECT 
                id, 
                "sessionId", 
                topic, 
                difficulty, 
                "questionsData", 
                answers, 
                score, 
                "correctAnswers", 
                "totalQuestions", 
                "timeSpent", 
                "completedAt"
            FROM practice_attempts
            ORDER BY "completedAt" DESC
        `;

        console.log('Fetching guest practice submissions...');

        const result = await pool.query(query);

        return res.status(200).json(result.rows);

    } catch (err) {
        console.error("Error fetching guest practice submissions:", err);
        res.status(500).json({ error: "Failed to fetch guest practice submissions" });
    }
}