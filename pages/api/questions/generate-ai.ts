import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { generateQuestionsForExam } from '@/lib/azureOpenAI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { language, questionType, difficulty, count, topics, marks } = req.body;

        // Validation
        if (!language || !questionType || !difficulty || !count) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (count > 20) {
            return res.status(400).json({ error: 'Cannot generate more than 20 questions at once' });
        }

        const questions = await generateQuestionsForExam({
            language,
            questionType,
            difficulty,
            count,
            topics: topics || [],
            marks
        });

        return res.status(200).json({
            success: true,
            questions,
            count: questions.length
        });

    } catch (error: any) {
        console.error('Generate AI Questions Error:', error);
        return res.status(500).json({
            error: 'Failed to generate questions',
            message: error.message
        });
    }
}