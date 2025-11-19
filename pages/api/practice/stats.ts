import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { sessionId } = req.query;

    if (!sessionId) {
        return res.status(200).json({
            totalAttempts: 0,
            totalQuestions: 0,
            averageScore: 0,
            totalTimeSpent: 0,
            recentAttempts: [],
        });
    }

    try {
        // Get overall stats
        const statsQuery = `
      SELECT 
        COUNT(*) as "totalAttempts",
        SUM("totalQuestions") as "totalQuestions",
        AVG("score") as "averageScore",
        SUM("timeSpent") as "totalTimeSpent"
      FROM "practice_attempts"
      WHERE "sessionId" = $1;
    `;

        const statsResult = await pool.query(statsQuery, [sessionId]);

        // Get recent attempts
        const recentQuery = `
      SELECT 
        "id",
        "topic",
        "difficulty",
        "score",
        "correctAnswers",
        "totalQuestions",
        "timeSpent",
        "completedAt"
      FROM "practice_attempts"
      WHERE "sessionId" = $1
      ORDER BY "completedAt" DESC
      LIMIT 10;
    `;

        const recentResult = await pool.query(recentQuery, [sessionId]);

        return res.status(200).json({
            totalAttempts: parseInt(statsResult.rows[0]?.totalAttempts || 0),
            totalQuestions: parseInt(statsResult.rows[0]?.totalQuestions || 0),
            averageScore: parseFloat(statsResult.rows[0]?.averageScore || 0).toFixed(1),
            totalTimeSpent: parseInt(statsResult.rows[0]?.totalTimeSpent || 0),
            recentAttempts: recentResult.rows,
        });
    } catch (error: any) {
        console.error("Error fetching practice stats:", error);
        return res.status(500).json({
            error: "Failed to fetch stats",
            message: error.message,
        });
    }
}