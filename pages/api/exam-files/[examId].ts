import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

// Add cache
const filesCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { examId } = req.query;

    if (!examId || typeof examId !== 'string') {
        return res.status(400).json({ message: 'Invalid exam ID' });
    }

    // Check cache
    const cached = filesCache.get(examId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json(cached.data);
    }

    try {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT file_name, file_url, file_size, created_at FROM exam_files WHERE exam_id = $1 ORDER BY created_at ASC',
                [examId]
            );

            const response = { files: result.rows };

            // Cache the result
            filesCache.set(examId, { data: response, timestamp: Date.now() });

            res.setHeader('Cache-Control', 'public, s-maxage=300');
            return res.status(200).json(response);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching exam files:', error);
        return res.status(500).json({ message: 'Failed to fetch exam files' });
    }
}