import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        // Check cache first
        const cacheQuery = `
            SELECT "aiInsights", "insightsGeneratedAt"
            FROM "UserInsightsCache"
            WHERE email = $1
        `;
        const cacheResult = await pool.query(cacheQuery, [email as string]);

        if (cacheResult.rows.length > 0 && cacheResult.rows[0].aiInsights) {
            return res.status(200).json({
                hasData: true,
                fromCache: true,
                ...cacheResult.rows[0].aiInsights,
                generatedAt: cacheResult.rows[0].insightsGeneratedAt
            });
        }

        // No cache - return message indicating insights will be generated
        return res.status(200).json({
            hasData: false,
            message: "No insights available yet. They will be generated after your first exam."
        });

    } catch (error: any) {
        console.error("AI Insights Error:", error);
        return res.status(500).json({ error: "Failed to fetch insights" });
    }
}