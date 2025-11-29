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
            `SELECT uc.id, uc.score, uc.issue_date, ce.title as exam_title
             FROM UserCertificates uc
             JOIN CertificateExams ce ON uc.exam_id = ce.id
             WHERE uc.user_id = $1
             ORDER BY uc.issue_date DESC`,
            [session.user.email]
        );

        res.status(200).json({ certificates: result.rows });
    } catch (error: any) {
        console.error('Error fetching user certificates:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
