import { NextApiRequest, NextApiResponse } from 'next';
import { getDBConnection } from '@/lib/database';
import sql from 'mssql';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const {
            examId,
            email,
            userName,
            answers,
            answersWithQuestionIds,
            disqualified = false,
            code,
        } = req.body;

        const db = await getDBConnection();

        const result = await db
            .request()
            .input('email', email)
            .input('examId', examId)
            .input('userName', userName)
            .input('answers', sql.NVarChar(sql.MAX), JSON.stringify(answers ?? []))
            .input(
                'answersWithQuestionIds',
                sql.NVarChar(sql.MAX),
                JSON.stringify(answersWithQuestionIds ?? []),
            )
            .input('code', code)
            .input('disqualified', disqualified ? 1 : 0)
            .input('submittedAt', new Date().toISOString())
            .query(`
                INSERT INTO submissions (
                email, examId, userName, answers, answersWithQuestionIds, code, disqualified, submittedAt
                )
                OUTPUT INSERTED.id
                VALUES (
                @email, @examId, @userName, @answers, @answersWithQuestionIds, @code, @disqualified, @submittedAt
                )
            `);

        const submissionId = result.recordset?.[0]?.id;

        return res.status(200).json({ success: true, submissionId });
    } catch (err) {
        console.error('Submission error:', err);
        return res.status(500).json({ error: 'Failed to save submission' });
    }
}
