import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        // Check cache first
        const cacheQuery = `
            SELECT "achievementPredictions", "achievementsGeneratedAt"
            FROM "UserInsightsCache"
            WHERE email = $1
        `;
        const cacheResult = await pool.query(cacheQuery, [email as string]);

        if (cacheResult.rows.length > 0 && cacheResult.rows[0].achievementPredictions) {
            return res.status(200).json({
                hasData: true,
                fromCache: true,
                ...cacheResult.rows[0].achievementPredictions,
                generatedAt: cacheResult.rows[0].achievementsGeneratedAt
            });
        }

        // No cache - return empty state
        return res.status(200).json({
            hasData: false,
            message: "No achievements yet"
        });

    } catch (error: any) {
        console.error("Achievement Error:", error);
        return res.status(500).json({ error: "Failed to fetch achievements" });
    }
}