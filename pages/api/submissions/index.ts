import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const {
        examId,
        email,
        userName,
        answers,
        answersWithQuestionIds,
        disqualified = false,
        code,
    } = req.body;

    const db = getDatabase();

    const stmt = db.prepare(`
        INSERT INTO submissions (
        email, examId, userName, answers, answersWithQuestionIds, code, disqualified, submittedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    try {
        stmt.run(
            email,
            examId,
            userName,
            JSON.stringify(answers),
            JSON.stringify(answersWithQuestionIds),
            code,
            disqualified ? 1 : 0
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Submission error:", err);
        res.status(500).json({ error: "Failed to save submission" });
    }
}
