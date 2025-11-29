import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        console.log("Session not found or email missing", session);
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { title, description, duration, passingScore, isPublished, questions } = req.body;

    if (!title || !questions || questions.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const examId = uuidv4();
        const userId = session.user.email;

        console.log("User ID:", userId);

        // Insert Exam
        await pool.query(
            `INSERT INTO CertificateExams (id, title, description, duration_minutes, passing_score, created_by, is_published)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [examId, title, description, duration, passingScore, userId, isPublished]
        );

        // Insert Questions
        for (const q of questions) {
            const questionId = uuidv4();
            await pool.query(
                `INSERT INTO CertificateQuestions (id, exam_id, question_text, question_type, options, correct_answer, points)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    questionId,
                    examId,
                    q.text,
                    q.type,
                    JSON.stringify(q.options), // Store options as JSON string
                    q.correctAnswer,
                    q.points
                ]
            );
        }

        res.status(201).json({ message: 'Certificate Exam created successfully', examId });
    } catch (error: any) {
        console.error('Error creating certificate exam:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
