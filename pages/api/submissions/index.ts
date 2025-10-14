import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            examId,
            email,
            userName,
            answers,
            answersWithQuestionIds,
            disqualified = false,
            code,
        } = req.body;

        if (!examId || !email || !userName) {
            return res.status(400).json({
                error: "Missing required fields: examId, email, userName",
            });
        }

        const query = `
            INSERT INTO "submissions" (
                "email", 
                "examId", 
                "userName", 
                "answers", 
                "answersWithQuestionIds", 
                "code", 
                "disqualified", 
                "submittedAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING "id";
        `;

        const values = [
            email,
            examId,
            userName,
            JSON.stringify(answers ?? []),
            JSON.stringify(answersWithQuestionIds ?? []),
            code || null,
            disqualified ? true : false,
        ];

        const result = await pool.query(query, values);
        const submissionId = result.rows[0]?.id;

        return res.status(200).json({
            success: true,
            submissionId,
        });
    } catch (error) {
        console.error("Submission error:", error);
        return res.status(500).json({ error: "Failed to save submission" });
    }
}
