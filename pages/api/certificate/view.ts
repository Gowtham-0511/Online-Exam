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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    try {
        const result = await pool.query(
            `SELECT uc.id, uc.score, uc.issue_date, ce.title as exam_title, u.name as user_name
             FROM UserCertificates uc
             JOIN CertificateExams ce ON uc.exam_id = ce.id
             JOIN "ExternalUsers" u ON uc.user_id = u.email
             WHERE uc.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            // Try checking internal users table if not found in ExternalUsers
            // Or just use session name if we can't join easily (depending on schema)
            // For now, let's assume ExternalUsers or fallback to session name
            const resultFallback = await pool.query(
                `SELECT uc.id, uc.score, uc.issue_date, ce.title as exam_title
                 FROM UserCertificates uc
                 JOIN CertificateExams ce ON uc.exam_id = ce.id
                 WHERE uc.id = $1`,
                [id]
            );

            if (resultFallback.rows.length === 0) {
                return res.status(404).json({ message: 'Certificate not found' });
            }

            const cert = resultFallback.rows[0];
            // If user_id matches session, use session name
            // We should verify ownership here too!

            // Let's verify ownership
            const ownershipCheck = await pool.query(
                `SELECT user_id FROM UserCertificates WHERE id = $1`,
                [id]
            );

            if (ownershipCheck.rows[0].user_id !== session.user.email) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            return res.status(200).json({
                certificate: {
                    ...cert,
                    user_name: session.user.name
                }
            });
        }

        const certificate = result.rows[0];

        // Verify ownership
        const ownershipCheck = await pool.query(
            `SELECT user_id FROM UserCertificates WHERE id = $1`,
            [id]
        );
        if (ownershipCheck.rows[0].user_id !== session.user.email) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.status(200).json({ certificate });
    } catch (error: any) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
