import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { examId, email, answers, flaggedQuestions, timeLeft, lastUpdated } = req.body;

        // Upsert auto-saved data
        const query = `
            INSERT INTO "ExamAutoSave" (
                "examId", "userEmail", "answers", "flaggedQuestions", 
                "timeLeft", "lastUpdated"
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT ("examId", "userEmail") 
            DO UPDATE SET
                "answers" = $3,
                "flaggedQuestions" = $4,
                "timeLeft" = $5,
                "lastUpdated" = $6
        `;

        await pool.query(query, [
            examId,
            email,
            JSON.stringify(answers),
            JSON.stringify(flaggedQuestions),
            timeLeft,
            lastUpdated
        ]);

        return res.status(200).json({ success: true, message: 'Auto-saved successfully' });
    } catch (error) {
        console.error('Auto-save error:', error);
        return res.status(500).json({ error: 'Failed to auto-save' });
    }
}