import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const db = getDatabase();
    const { examId } = req.query;

    if (typeof examId !== "string") return res.status(400).json({ error: "Invalid examId" });

    const stmt = db.prepare("SELECT * FROM exams WHERE title = ?");
    type Exam = {
        id: number;
        title: string;
        questions: string;
        questionConfig?: string;
        [key: string]: any;
    };
    const exam = stmt.get(examId) as Exam | undefined;

    if (!exam) return res.status(404).json({ error: "Exam not found" });

    try {
        exam.questions = JSON.parse(exam.questions);
        exam.questionConfig = JSON.parse(exam.questionConfig || "{}");
        res.status(200).json(exam);
    } catch {
        res.status(500).json({ error: "Invalid question format" });
    }
}
