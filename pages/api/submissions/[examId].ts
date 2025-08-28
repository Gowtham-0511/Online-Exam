import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const { examId } = req.query;

        if (!examId || typeof examId !== 'string') {
            return res.status(400).json({ message: 'Exam ID is required' });
        }

        const db = await getDBConnection();

        const questions = await db
            .request()
            .input("examId", examId)
            .query(`SELECT questions FROM Assessment WHERE title = @examId`);

        console.log("Questions found:", questions.recordset);

        return res.status(200).json(questions.recordset);
    } catch (error: any) {
        console.error("❌ Error in /api/submissions/by-examiner:", error.message);
        return res.status(500).json({ error: "Failed to load submissions", details: error.message });
    }
}
