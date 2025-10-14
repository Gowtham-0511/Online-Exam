import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { credentialId } = req.query;

    if (!credentialId || typeof credentialId !== 'string') {
        return res.status(400).json({ message: 'Credential ID is required' });
    }

    let client;
    try {
        client = await pool.connect();

        const result = await client.query(
            'DELETE FROM sql_credentials WHERE id = $1 RETURNING id',
            [credentialId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Credentials not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Credentials deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting credentials:', error);
        return res.status(500).json({
            message: 'Failed to delete credentials',
            error: error.message
        });
    } finally {
        if (client) client.release();
    }
}