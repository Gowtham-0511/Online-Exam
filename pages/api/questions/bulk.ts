import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

interface MCQOption {
    text: string;
    isCorrect: boolean;
}

interface BulkQuestion {
    questionText: string;
    expectedOutput?: string;
    difficulty: string;
    marks: number;
    language?: string;
    jobId: number;
    skillId: number;
    imageUrl?: string;
    imageAltText?: string;
    createdBy: string;
    questionType: 'coding' | 'mcq';
    options?: MCQOption[] | string;
    correctAnswer?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { questions } = req.body;
        if (!Array.isArray(questions)) {
            return res.status(400).json({ error: "Invalid format" });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const insertQuestionQuery = `
                INSERT INTO "Questions" (
                    "questionText", "expectedOutput", "difficulty", "marks", "language", 
                    "jobId", "skillId", "imageUrl", "imageAltText", "createdBy", "questionType"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `;

            const insertOptionQuery = `
                INSERT INTO "QuestionOptions" ("questionId", "optionText", "isCorrect")
                VALUES ($1, $2, $3)
            `;

            let insertedCount = 0;

            for (const q of questions as BulkQuestion[]) {
                const questionResult = await client.query(insertQuestionQuery, [
                    q.questionText,
                    q.expectedOutput || null,
                    q.difficulty,
                    q.marks,
                    q.language || null,
                    q.jobId,
                    q.skillId,
                    q.imageUrl || null,
                    q.imageAltText || null,
                    q.createdBy,
                    q.questionType || 'coding'
                ]);

                const questionId = questionResult.rows[0].id;

                if (q.questionType === 'mcq' && q.options) {
                    let optionsArray: MCQOption[] = [];

                    if (typeof q.options === 'string') {
                        const optionTexts = q.options.split('|').map(opt => opt.trim());

                        optionsArray = optionTexts.map(text => ({
                            text,
                            isCorrect: text === q.correctAnswer?.trim()
                        }));
                    } else if (Array.isArray(q.options)) {
                        optionsArray = q.options;
                    }

                    for (const option of optionsArray) {
                        await client.query(insertOptionQuery, [
                            questionId,
                            option.text,
                            option.isCorrect || false
                        ]);
                    }
                }

                insertedCount++;
            }

            await client.query("COMMIT");

            return res.status(200).json({
                success: true,
                inserted: insertedCount,
                message: `Successfully inserted ${insertedCount} questions`
            });
        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Bulk insert failed:", err);
            return res.status(500).json({
                error: "Failed to bulk insert",
                details: err instanceof Error ? err.message : "Unknown error"
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Database connection failed:", error);
        return res.status(500).json({
            error: "Database connection error",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
}