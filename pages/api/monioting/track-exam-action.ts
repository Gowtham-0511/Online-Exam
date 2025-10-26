import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

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
                RETURNING *;
            `;
            values = [examId, userEmail, questionId, questionIndex, actionType, metadata];
        } else {
            query = `
                INSERT INTO "UserExamActions" 
                ("examId", "userEmail", "questionId", "questionIndex", "actionType", "timeSpent", "metadata")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            values = [examId, userEmail, questionId, questionIndex, actionType, timeSpent, metadata];
        }

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Track action error:", error);
        return res.status(500).json({ error: "Failed to track action" });
    }
}