import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { examId } = req.query;

    if (!examId || typeof examId !== 'string') {
        return res.status(400).json({ message: 'Invalid exam ID' });
    }

    try {
        // Fetch Exam Details
        const examResult = await pool.query(
            `SELECT id, title, description, duration_minutes, passing_score 
             FROM CertificateExams 
             WHERE id = $1`,
            [examId]
        );

        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const exam = examResult.rows[0];

        // Fetch Questions
        // Note: In a real scenario, we might want to hide correct_answer from the client
        // but for now we'll send it or handle validation on server. 
        // Actually, for security, we should NOT send correct_answer to the client.
        const questionsResult = await pool.query(
            `SELECT id, question_text, question_type, options, points 
             FROM CertificateQuestions 
             WHERE exam_id = $1`,
            [examId]
        );

        const questions = questionsResult.rows.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));

        res.status(200).json({ exam, questions });
    } catch (error: any) {
        console.error('Error fetching exam details:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
