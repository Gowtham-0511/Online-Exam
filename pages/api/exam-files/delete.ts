import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { examId } = req.body;

    if (!examId) {
        return res.status(400).json({ message: 'Exam ID required' });
    }

    try {
        const client = await pool.connect();

        // Get file paths before deleting from DB
        const result = await client.query(
            'SELECT file_url FROM exam_files WHERE exam_id = $1',
            [examId]
        );

        // Delete from database
        await client.query('DELETE FROM exam_files WHERE exam_id = $1', [examId]);

        // Optionally delete physical files
        const examDir = path.join(process.cwd(), 'public', 'exam-files', examId);
        if (fs.existsSync(examDir)) {
            fs.rmSync(examDir, { recursive: true, force: true });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting exam files:', error);
        return res.status(500).json({ message: 'Failed to delete exam files' });
    }
}