import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { createdBy } = req.query;

    let client;
    try {
        client = await pool.connect();

        let query = 'SELECT id, server_type, host, port, username, database_name, exam_title, created_by, created_at FROM sql_credentials';
        const params: any[] = [];

        if (createdBy) {
            query += ' WHERE created_by = $1';
            params.push(createdBy);
        }

        query += ' ORDER BY created_at DESC';

        const result = await client.query(query, params);

        return res.status(200).json({
            credentials: result.rows.map(row => ({
                id: row.id,
                serverType: row.server_type,
                host: row.host,
                port: row.port,
                username: row.username,
                database: row.database_name,
                examTitle: row.exam_title,
                createdBy: row.created_by,
                createdAt: row.created_at
            }))
        });
    } catch (error: any) {
        console.error('Error listing credentials:', error);
        return res.status(500).json({
            message: 'Failed to list credentials',
            error: error.message
        });
    } finally {
        if (client) client.release();
    }
}