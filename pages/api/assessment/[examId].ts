import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { examId } = req.query;

    if (typeof examId !== "string") {
        return res.status(400).json({ error: "Invalid examId" });
    }

    console.log(examId)

    try {
        const query = `
            SELECT *
            FROM "Assessment"
            WHERE "title" = $1
        `;

        const result = await pool.query(query, [examId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Exam not found" });
        }

        const exam = result.rows[0];

        // Safely parse JSON fields
        try {
            exam.questions = exam.questions ? JSON.parse(exam.questions) : [];
            exam.questionConfig = exam.questionConfig ? JSON.parse(exam.questionConfig) : {};
        } catch {
            return res.status(500).json({ error: "Invalid question format" });
        }

        return res.status(200).json(exam);
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
