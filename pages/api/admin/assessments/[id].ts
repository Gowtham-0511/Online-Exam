import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    console.log(id);

    if (req.method === "GET") {
        try {
            const query = `
                SELECT *
                FROM "Assessment"
                WHERE "id" = $1
            `;

            const result = await pool.query(query, [id]);

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

    if (req.method === "PUT") {
        const { duration, isExamProctored, assignmentType } = req.body;

        // Validate input
        if (duration === undefined || isExamProctored === undefined || !assignmentType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        try {
            const updateQuery = `
                UPDATE "Assessment"
                SET 
                    "duration" = $1,
                    "isExamProctored" = $2,
                    "assignmentType" = $3
                WHERE "id" = $4
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [
                duration,
                isExamProctored,
                assignmentType,
                id
            ]);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: "Exam not found" });
            }

            const updatedExam = result.rows[0];

            // Parse JSON fields for response
            try {
                updatedExam.questions = updatedExam.questions ? JSON.parse(updatedExam.questions) : [];
                updatedExam.questionConfig = updatedExam.questionConfig ? JSON.parse(updatedExam.questionConfig) : {};
            } catch {
                // If parsing fails, just return as is
            }

            return res.status(200).json(updatedExam);
        } catch (error) {
            console.error("DB error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}