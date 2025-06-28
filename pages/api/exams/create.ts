import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const db = getDatabase();
        const { examId, language, duration, createdBy, questions, isExamProctored, useExcelQuestions, questionConfig } = req.body;

        // ✅ Check if exam already exists
        const exists = db.prepare(`SELECT COUNT(*) AS count FROM exams WHERE title = ?`).get(examId) as { count: number };
        if (exists.count > 0) {
            return res.status(409).json({ error: 'Exam with this title already exists' });
        }

        const stmt = db.prepare(`
        INSERT INTO exams (title, language, duration, createdBy, createdAt, isExamProctored, isGeneratedFromExcel, questionConfig, questions)
        VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
        `);

        stmt.run(
            examId,
            language,
            duration,
            createdBy,
            isExamProctored ? 1 : 0,
            useExcelQuestions ? 1 : 0,
            JSON.stringify(questionConfig),
            JSON.stringify(questions)
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error creating exam:", error);
        res.status(500).json({ error: "Failed to create exam" });
    }
}
