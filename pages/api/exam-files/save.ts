import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { examId, files } = req.body;

    if (!examId || !files || !Array.isArray(files)) {
        return res.status(400).json({ message: 'Invalid request data' });
    }

    try {
        const client = await pool.connect();

        // Use parameterized query to prevent SQL injection
        const query = `
            INSERT INTO exam_files (exam_id, file_name, file_url, file_size)
            VALUES ($1, $2, $3, $4)
        `;

        for (const file of files) {
            await client.query(query, [examId, file.name, file.url, file.size]);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving file references:', error);
        return res.status(500).json({ message: 'Failed to save file references' });
    }
}