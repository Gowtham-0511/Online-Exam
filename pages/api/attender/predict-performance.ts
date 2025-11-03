import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        // Check cache first
        const cacheQuery = `
            SELECT "performancePrediction", "predictionGeneratedAt", "totalExamsCount"
            FROM "UserInsightsCache"
            WHERE email = $1
        `;
        const cacheResult = await pool.query(cacheQuery, [email as string]);

        if (cacheResult.rows.length > 0 && cacheResult.rows[0].performancePrediction) {
            return res.status(200).json({
                hasData: true,
                fromCache: true,
                ...cacheResult.rows[0].performancePrediction,
                generatedAt: cacheResult.rows[0].predictionGeneratedAt
            });
        }

        // Check if user has enough exams
        const examCountQuery = `
            SELECT COUNT(*) as count
            FROM submissions
            WHERE email = $1 AND disqualified = false
        `;
        const countResult = await pool.query(examCountQuery, [email as string]);
        const examCount = parseInt(countResult.rows[0].count);

        if (examCount < 2) {
            return res.status(200).json({
                hasData: false,
                message: "Need at least 2 exams for prediction"
            });
        }

        // No cache but has exams - will be generated on next submission
        return res.status(200).json({
            hasData: false,
            message: "Predictions will be generated after your next exam submission"
        });

    } catch (error: any) {
        console.error("Prediction Error:", error);
        return res.status(500).json({ error: "Failed to fetch prediction" });
    }
}