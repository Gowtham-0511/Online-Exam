import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { questions } = req.body; // array of question objects
        if (!Array.isArray(questions)) {
            return res.status(400).json({ error: "Invalid format" });
        }

        const db = await getDBConnection();

        for (const q of questions) {
            await db.request()
                .input("questionText", q.questionText)
                .input("expectedOutput", q.expectedOutput)
                .input("difficulty", q.difficulty)
                .input("marks", q.marks)
                .input("language", q.language)
                .input("jobId", q.jobId)
                .input("skillId", q.skillId)
                .input("createdBy", q.createdBy)
                .query(`
                INSERT INTO Questions (
                    questionText, expectedOutput, difficulty, marks, language, jobId, skillId, createdBy
                ) VALUES (
                    @questionText, @expectedOutput, @difficulty, @marks, @language, @jobId, @skillId, @createdBy
                )
                `);
        }

        return res.status(200).json({ success: true, inserted: questions.length });
    } catch (error) {
        console.error("Bulk insert failed:", error);
        return res.status(500).json({ error: "Failed to bulk insert" });
    }
}
