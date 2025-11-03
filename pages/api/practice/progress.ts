import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // Get overall progress
        const progressQuery = `
            SELECT * FROM "PracticeProgress"
            WHERE email = $1
        `;
        const progressResult = await pool.query(progressQuery, [email]);

        // console.log(progressResult)

        // Get detailed statistics
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT pq.id) as "totalQuestions",
                COUNT(DISTINCT CASE WHEN ps."isPassed" THEN pq.id END) as "completedQuestions",
                AVG(ps.score) as "averageScore",
                COUNT(ps.id) as "totalAttempts",
                SUM(CASE WHEN ps."isPassed" THEN 1 ELSE 0 END) as "successfulAttempts"
            FROM "PracticeQuestions" pq
            LEFT JOIN "PracticeSubmissions" ps ON pq.id = ps."practiceQuestionId" AND ps.email = $1
            WHERE pq."generatedFor" = $1
        `;
        const statsResult = await pool.query(statsQuery, [email]);

        // Get language-wise breakdown
        const languageQuery = `
            SELECT 
                pq.language,
                COUNT(DISTINCT pq.id) as total,
                COUNT(DISTINCT CASE WHEN ps."isPassed" THEN pq.id END) as completed,
                AVG(ps.score) as "avgScore"
            FROM "PracticeQuestions" pq
            LEFT JOIN "PracticeSubmissions" ps ON pq.id = ps."practiceQuestionId" AND ps.email = $1
            WHERE pq."generatedFor" = $1
            GROUP BY pq.language
        `;
        const languageResult = await pool.query(languageQuery, [email]);

        // Get topic-wise breakdown
        const topicQuery = `
            SELECT 
                pq.topic,
                COUNT(DISTINCT pq.id) as total,
                COUNT(DISTINCT CASE WHEN ps."isPassed" THEN pq.id END) as completed,
                AVG(ps.score) as "avgScore"
            FROM "PracticeQuestions" pq
            LEFT JOIN "PracticeSubmissions" ps ON pq.id = ps."practiceQuestionId" AND ps.email = $1
            WHERE pq."generatedFor" = $1
            GROUP BY pq.topic
        `;
        const topicResult = await pool.query(topicQuery, [email]);

        // Get recent activity
        const recentQuery = `
            SELECT 
                ps.id,
                ps."submittedAt",
                ps."isPassed",
                ps.score,
                pq."questionTitle",
                pq.language,
                pq.topic
            FROM "PracticeSubmissions" ps
            JOIN "PracticeQuestions" pq ON ps."practiceQuestionId" = pq.id
            WHERE ps.email = $1
            ORDER BY ps."submittedAt" DESC
            LIMIT 10
        `;
        const recentResult = await pool.query(recentQuery, [email]);

        return res.status(200).json({
            progress: progressResult.rows[0] || {
                totalPracticeQuestions: 0,
                questionsCompleted: 0,
                questionsAttempted: 0,
                currentStreak: 0,
                averageScore: 0
            },
            statistics: statsResult.rows[0],
            languageBreakdown: languageResult.rows,
            topicBreakdown: topicResult.rows,
            recentActivity: recentResult.rows
        });

    } catch (error: any) {
        console.error("Get Practice Progress Error:", error);
        return res.status(500).json({ error: "Failed to fetch progress" });
    }
}