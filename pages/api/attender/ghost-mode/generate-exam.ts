import { NextApiRequest, NextApiResponse } from 'next';
import { generateQuestionsForExam } from '@/lib/azureOpenAI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { topic, difficulty, questionCount } = req.body;

        if (!topic || !difficulty || !questionCount) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Force MCQ only for ghost mode
        const aiQuestionType = 'mcq';
        const language = 'general';

        // Generate questions using Azure OpenAI
        const questions = await generateQuestionsForExam({
            language,
            questionType: aiQuestionType,
            difficulty,
            count: questionCount,
            topics: [topic],
            marks: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15
        });

        if (!questions || questions.length === 0) {
            return res.status(500).json({ error: 'Failed to generate questions' });
        }

        // Create exam object
        const examId = `ghost_${Date.now()}`;
        const exam = {
            examId,
            title: `Mastering ${topic}`,
            description: `A ${difficulty} level exam focusing on ${topic} concepts.`,
            duration: Math.round(questionCount * 1.5), // minutes
            language,
            questions,
            isGhostMode: true,
            createdAt: new Date().toISOString()
        };

        return res.status(200).json(exam);

    } catch (error: any) {
        console.error('Exam generation error:', error);
        return res.status(500).json({
            error: 'Failed to generate exam',
            details: error.message
        });
    }
}
