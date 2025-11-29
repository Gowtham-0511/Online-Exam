import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            `SELECT id, title, description, duration_minutes, passing_score, created_at 
             FROM CertificateExams 
             WHERE is_published = TRUE 
             ORDER BY created_at DESC`
        );

        res.status(200).json({ exams: result.rows });
    } catch (error: any) {
        console.error('Error fetching certificate exams:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
