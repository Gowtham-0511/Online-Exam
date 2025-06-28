import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id !== "string") return res.status(400).json({ error: "Invalid exam ID" });

    const db = getDatabase();

    if (req.method === "GET") {
        try {
            const stmt = db.prepare("SELECT * FROM exams WHERE id = ?");
            const exam = stmt.get(id) as {
                id: string;
                title: string;
                language: string;
                duration: number;
                isExamProctored: number;
                questions: string;
                questionConfig: string;
                createdAt: string;
            } | undefined;
            if (!exam) return res.status(404).json({ error: "Exam not found" });

            exam.questions = JSON.parse(exam.questions || "[]");
            exam.questionConfig = JSON.parse(exam.questionConfig || "{}");

            return res.status(200).json(exam);
        } catch (error) {
            return res.status(500).json({ error: "Failed to load exam" });
        }
    }

    if (req.method === "PUT") {
        const { title, language, duration, isExamProctored, questionConfig, questions } = req.body;
        try {
            const stmt = db.prepare(`
                UPDATE exams
                SET title = ?, language = ?, duration = ?, isExamProctored = ?, questionConfig = ?, questions = ?
                WHERE id = ?
            `);
            const result = stmt.run(
                title,
                language,
                duration,
                isExamProctored ? 1 : 0,
                JSON.stringify(questionConfig),
                JSON.stringify(questions),
                id
            );

            if (result.changes === 0) {
                return res.status(404).json({ error: "Exam not found or not updated" });
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error updating exam:", error);
            return res.status(500).json({ error: "Failed to update exam" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
