import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { predictFuturePerformance } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const query = `
            SELECT 
                s."examId",
                s."submittedAt",
                COALESCE(
                    (SELECT SUM((feedback->>'marks')::numeric)
                     FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback),
                    0
                ) as score,
                COALESCE(
                    (SELECT SUM((ans->>'marks')::numeric)
                     FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans),
                    0
                ) as "totalPossible"
            FROM submissions s
            WHERE s.email = $1
            AND s.disqualified = false
            ORDER BY s."submittedAt" ASC
        `;

        const result = await pool.query(query, [email as string]);

        if (result.rows.length < 2) {
            return res.status(200).json({
                hasData: false,
                message: "Need at least 2 exams for prediction"
            });
        }

        const studentHistory = result.rows.map(row => ({
            examId: row.examId,
            score: parseFloat(row.score) || 0,
            totalPossible: parseFloat(row.totalPossible) || 1,
            date: row.submittedAt
        }));

        const prediction = await predictFuturePerformance(studentHistory);

        return res.status(200).json({
            hasData: true,
            ...prediction
        });

    } catch (error: any) {
        console.error("Prediction Error:", error);
        return res.status(500).json({ error: "Failed to generate prediction" });
    }
}