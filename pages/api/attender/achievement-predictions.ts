import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const query = `
            SELECT 
                COUNT(*) as "totalExams",
                AVG(
                    CASE 
                        WHEN (SELECT SUM((ans->>'marks')::numeric)
                              FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans) > 0 
                        THEN (
                            (SELECT SUM((feedback->>'marks')::numeric)
                             FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback) * 100.0 /
                            (SELECT SUM((ans->>'marks')::numeric)
                             FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans)
                        )
                        ELSE 0
                    END
                ) as "avgScore",
                COUNT(CASE 
                    WHEN (
                        SELECT SUM((feedback->>'marks')::numeric)
                        FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback
                    ) * 100.0 / NULLIF((
                        SELECT SUM((ans->>'marks')::numeric)
                        FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans
                    ), 0) >= 80 
                    THEN 1 
                END) as "highScores",
                MAX(s."submittedAt") as "lastExam",
                COUNT(DISTINCT DATE(s."submittedAt")) as "activeDays"
            FROM submissions s
            WHERE s.email = $1
            AND s.disqualified = false
        `;

        const result = await pool.query(query, [email as string]);
        const stats = result.rows[0];

        const totalExams = parseInt(stats.totalExams) || 0;
        const avgScore = parseFloat(stats.avgScore) || 0;
        const highScores = parseInt(stats.highScores) || 0;
        const activeDays = parseInt(stats.activeDays) || 0;

        // Calculate achievements and predictions
        const achievements = {
            // Current achievements
            examsCompleted: totalExams,
            highScoresCount: highScores,
            currentStreak: activeDays,
            averageScore: avgScore,

            // Next milestones
            nextMilestones: [
                {
                    type: 'exams',
                    current: totalExams,
                    target: Math.ceil(totalExams / 10) * 10 + 10,
                    progress: (totalExams % 10) * 10,
                    label: `Complete ${Math.ceil(totalExams / 10) * 10 + 10} exams`,
                    icon: 'target'
                },
                {
                    type: 'highScores',
                    current: highScores,
                    target: Math.ceil(highScores / 5) * 5 + 5,
                    progress: ((highScores % 5) / 5) * 100,
                    label: `Achieve ${Math.ceil(highScores / 5) * 5 + 5} high scores (80%+)`,
                    icon: 'trophy'
                },
                {
                    type: 'average',
                    current: avgScore,
                    target: Math.min(avgScore + 10, 100),
                    progress: avgScore,
                    label: `Reach ${Math.min(Math.ceil(avgScore / 10) * 10 + 10, 100)}% average`,
                    icon: 'trending-up'
                }
            ],

            // Predictions
            predictions: {
                nextHighScore: totalExams > 0 ? Math.min(95, avgScore + (highScores / totalExams) * 20) : 50,
                daysToNextMilestone: Math.max(1, Math.ceil((10 - (totalExams % 10)) / (activeDays / Math.max(totalExams, 1)))),
                improvementRate: totalExams > 1 ? ((avgScore / 100) * 5).toFixed(1) : "0"
            }
        };

        return res.status(200).json({
            hasData: totalExams > 0,
            ...achievements
        });

    } catch (error: any) {
        console.error("Achievement Prediction Error:", error);
        return res.status(500).json({ error: "Failed to generate predictions" });
    }
}