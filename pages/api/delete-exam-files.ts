import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { examId } = req.body;

        if (!examId) {
            return res.status(400).json({ message: 'examId is required' });
        }

        const examDir = path.join(process.cwd(), 'public', 'exam-files', examId);

        if (fs.existsSync(examDir)) {
            fs.rmSync(examDir, { recursive: true, force: true });
            return res.status(200).json({
                success: true,
                message: 'Exam files deleted successfully'
            });
        }

        return res.status(404).json({ message: 'Exam directory not found' });

    } catch (error) {
        console.error('Error deleting exam files:', error);
        return res.status(500).json({ message: 'Failed to delete exam files' });
    }
}