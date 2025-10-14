import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { examId } = req.query;

    if (!examId || typeof examId !== 'string') {
        return res.status(400).json({ message: 'Invalid exam ID' });
    }

    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT file_name, file_url, file_size, created_at FROM exam_files WHERE exam_id = $1 ORDER BY created_at ASC',
            [examId]
        );

        return res.status(200).json({ files: result.rows });
    } catch (error) {
        console.error('Error fetching exam files:', error);
        return res.status(500).json({ message: 'Failed to fetch exam files' });
    }
}