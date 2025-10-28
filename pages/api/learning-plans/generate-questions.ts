import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { generateLearningPlanQuestions } from '@/lib/azureOpenAI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { weekNumber, topics, goals, language, difficulty, questionCount } = req.body;

    if (!weekNumber || !topics || !goals || !language || !difficulty) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (topics.length === 0) {
        return res.status(400).json({ error: 'Week must have at least one topic' });
    }

    try {
        const questions = await generateLearningPlanQuestions(
            { weekNumber, topics, goals, language, difficulty },
            questionCount || 3
        );

        if (questions.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate questions'
            });
        }

        return res.status(200).json({
            success: true,
            questions,
            count: questions.length
        });
    } catch (error: any) {
        console.error('Question generation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate questions',
            message: error.message
        });
    }
}