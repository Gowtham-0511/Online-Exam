
import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { generatePracticeQuestionsFromWeakAreas } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const { email, count = 5 } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // 1. Get user's weak areas from cache
        const weakAreasQuery = `
            SELECT "aiInsights"
            FROM "UserInsightsCache"
            WHERE email = $1
        `;
        const weakAreasResult = await pool.query(weakAreasQuery, [email]);

        if (!weakAreasResult.rows[0]?.aiInsights?.weaknesses) {
            return res.status(400).json({
                error: "No weak areas found. Complete at least one exam first."
            });
        }

        const weaknesses = weakAreasResult.rows[0].aiInsights.weaknesses;

        if (weaknesses.length === 0) {
            return res.status(200).json({
                message: "No weaknesses detected. Great job!",
                questions: []
            });
        }

        // 2. Format weak areas for AI
        const weakAreas = weaknesses.map((w: any) => ({
            topic: w.topic,
            language: w.language || 'General',
            score: w.score,
            description: w.description
        }));

        // 3. Generate practice questions using AI
        const questions = await generatePracticeQuestionsFromWeakAreas(
            email,
            weakAreas,
            Math.min(count, 10) // Max 10 questions at a time
        );

        // 4. Store generated questions in database
        const insertPromises = questions.map(async (q) => {
            const insertQuery = `
                INSERT INTO "PracticeQuestions" (
                    "generatedFor", language, difficulty, topic, "weakArea",
                    "questionTitle", "questionDescription", "starterCode",
                    "testCases", "solutionCode", "solutionExplanation", "hints"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `;

            return pool.query(insertQuery, [
                email,
                q.language,
                q.difficulty,
                q.topic,
                q.weakArea,
                q.questionTitle,
                q.questionDescription,
                q.starterCode,
                JSON.stringify(q.testCases),
                q.solutionCode,
                q.solutionExplanation,
                JSON.stringify(q.hints)
            ]);
        });

        const insertedQuestions = await Promise.all(insertPromises);

        // 5. Update user's total practice questions count
        await pool.query(`
            UPDATE "PracticeProgress"
            SET "totalPracticeQuestions" = "totalPracticeQuestions" + $1,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE email = $2
        `, [questions.length, email]);

        return res.status(200).json({
            success: true,
            questionsGenerated: questions.length,
            questionIds: insertedQuestions.map(r => r.rows[0].id),
            message: `Generated ${questions.length} personalized practice questions!`
        });

    } catch (error: any) {
        console.error("Generate Practice Questions Error:", error);
        return res.status(500).json({
            error: "Failed to generate practice questions",
            details: error.message
        });
    }
}