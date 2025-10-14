import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
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
            'SELECT * FROM sql_credentials WHERE id = $1',
            [credentialId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Credentials not found' });
        }

        const credential = result.rows[0];

        // Decrypt password before sending
        const decryptedPassword = decrypt(credential.password);

        return res.status(200).json({
            id: credential.id,
            serverType: credential.server_type,
            host: credential.host,
            port: credential.port,
            username: credential.username,
            password: decryptedPassword,
            database: credential.database_name,
            examTitle: credential.exam_title,
            createdBy: credential.created_by,
            createdAt: credential.created_at
        });
    } catch (error: any) {
        console.error('Error retrieving credentials:', error);
        return res.status(500).json({
            message: 'Failed to retrieve credentials',
            error: error.message
        });
    } finally {
        if (client) client.release();
    }
}