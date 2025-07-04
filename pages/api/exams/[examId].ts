import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId } = req.query;

    if (typeof examId !== "string") {
        return res.status(400).json({ error: "Invalid examId" });
    }

    try {
        const db = await getDBConnection();

        const result = await db
            .request()
            .input("title", examId)
            .query(`
                SELECT * FROM exams WHERE title = @title
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Exam not found" });
        }

        const exam = result.recordset[0];

        try {
            exam.questions = JSON.parse(exam.questions || "[]");
            exam.questionConfig = JSON.parse(exam.questionConfig || "{}");
        } catch {
            return res.status(500).json({ error: "Invalid question format" });
        }

        return res.status(200).json(exam);
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
