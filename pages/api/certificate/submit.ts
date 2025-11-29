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
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { examId, answers } = req.body;

    if (!examId || !answers) {
        return res.status(400).json({ message: 'Missing required fields' });
    }



    try {
        // Fetch Exam Details
        const examResult = await pool.query(
            `SELECT id, passing_score FROM CertificateExams WHERE id = $1`,
            [examId]
        );



        if (examResult.rows.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const exam = examResult.rows[0];

        // Fetch Questions and Correct Answers
        const questionsResult = await pool.query(
            `SELECT id, question_type, correct_answer, points FROM CertificateQuestions WHERE exam_id = $1`,
            [examId]
        );

        const questions = questionsResult.rows;
        let totalScore = 0;
        let earnedScore = 0;



        // Calculate Score
        for (const q of questions) {
            totalScore += q.points;

            const userAnswer = answers[q.id];

            if (q.question_type === 'MCQ') {
                // correct_answer is stored as the option string value
                if (userAnswer === q.correct_answer) {
                    earnedScore += q.points;
                }
            } else if (q.question_type === 'CODING') {
                // Auto-grading for coding is complex. For now, we'll assume full points if submitted 
                // OR we can implement a basic check if code is not empty.
                // TODO: Implement real code execution/grading.
                if (userAnswer && userAnswer.trim().length > 10) {
                    earnedScore += q.points;
                }
            }
        }

        const percentage = (earnedScore / totalScore) * 100;
        const passed = percentage >= exam.passing_score;
        let certificateId = null;

        if (passed) {
            certificateId = uuidv4();
            // Insert Certificate
            await pool.query(
                `INSERT INTO UserCertificates (id, user_id, exam_id, score, issue_date)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                [certificateId, session.user.email, examId, Math.round(percentage)]
            );
        }

        res.status(200).json({
            passed,
            score: Math.round(percentage),
            certificateId,
            message: passed ? 'Congratulations! You passed the exam.' : 'You did not pass the exam.'
        });

    } catch (error: any) {
        console.error('Error submitting exam:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
