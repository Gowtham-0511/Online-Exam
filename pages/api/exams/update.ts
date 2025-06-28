import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = getDatabase();

    if (req.method === "GET") {
        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Missing exam ID" });
        }

        try {
            const stmt = db.prepare("SELECT * FROM exams WHERE id = ?");
            const exam = stmt.get(id) as {
                id: string;
                title: string;
                duration: number;
                language: string;
                questions: string;
                questionConfig: string;
                isExamProctored?: number;
                isGeneratedFromExcel?: number;
                [key: string]: any;
            } | undefined;
            if (!exam) return res.status(404).json({ error: "Exam not found" });

            exam.questions = JSON.parse(exam.questions || "[]");
            exam.questionConfig = JSON.parse(exam.questionConfig || "{}");

            return res.status(200).json(exam);
        } catch (err) {
            console.error("Error fetching exam:", err);
            return res.status(500).json({ error: "Failed to load exam" });
        }
    }

    if (req.method === "PUT") {
        const {
            id,
            title,
            duration,
            language,
            questions,
            questionConfig,
            isExamProctored,
            isGeneratedFromExcel
        } = req.body;

        if (!id) return res.status(400).json({ error: "Missing exam ID" });

        try {
            const stmt = db.prepare(`
                UPDATE exams
                SET title = ?, duration = ?, language = ?, questions = ?, questionConfig = ?,
                    isExamProctored = ?, isGeneratedFromExcel = ?
                WHERE id = ?
            `);

            const result = stmt.run(
                title,
                duration,
                language,
                JSON.stringify(questions || []),
                JSON.stringify(questionConfig || {}),
                isExamProctored ? 1 : 0,
                isGeneratedFromExcel ? 1 : 0,
                id
            );

            if (result.changes === 0) {
                return res.status(404).json({ error: "Exam not found or unchanged" });
            }

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("Error updating exam:", err);
            return res.status(500).json({ error: "Failed to update exam" });
        }
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
