import { NextApiRequest, NextApiResponse } from 'next';
import { validateQuestion } from '@/lib/azureOpenAI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            questionText,
            questionType,
            language,
            expectedOutput,
            options,
            testCases,
            marks
        } = req.body;

        if (!questionText || !questionType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const validation = await validateQuestion(
            questionText,
            questionType,
            language,
            expectedOutput,
            options,
            testCases,
            marks
        );

        return res.status(200).json(validation);

    } catch (error: any) {
        console.error('Validation API Error:', error);
        return res.status(500).json({
            error: 'Validation failed',
            message: error.message
        });
    }
}