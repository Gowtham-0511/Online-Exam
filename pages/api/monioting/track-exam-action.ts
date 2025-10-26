import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

// Make this fire-and-forget
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const {
        examId,
        userEmail,
        questionId,
        questionIndex,
        actionType,
        timeSpent,
        metadata
    } = req.body;

    // Respond immediately
    res.status(202).json({ success: true, message: 'Action queued' });

    // Process in background (fire-and-forget)
    setImmediate(async () => {
        try {
            let query;
            let values;

            if (actionType === 'code_run') {
                query = `
                    INSERT INTO "UserExamActions" 
                    ("examId", "userEmail", "questionId", "questionIndex", "actionType", "codeRunCount", "metadata")
                    VALUES ($1, $2, $3, $4, $5, 1, $6)
                    ON CONFLICT ("examId", "userEmail", "questionId", "timestamp")
                    DO UPDATE SET 
                        "codeRunCount" = "UserExamActions"."codeRunCount" + 1,
                        "metadata" = $6
                `;
                values = [examId, userEmail, questionId, questionIndex, actionType, metadata];
            } else {
                query = `
                    INSERT INTO "UserExamActions" 
                    ("examId", "userEmail", "questionId", "questionIndex", "actionType", "timeSpent", "metadata")
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;
                values = [examId, userEmail, questionId, questionIndex, actionType, timeSpent, metadata];
            }

            await pool.query(query, values);
        } catch (error) {
            console.error("Track action error:", error);
        }
    });
}