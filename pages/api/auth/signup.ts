import type { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'bcryptjs';
import { getDBConnection } from '@/lib/database';
import sql from 'mssql';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }

    try {
        const pool = await getDBConnection();

        // Check if user exists
        const checkUser = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT id FROM ExternalUsers WHERE email = @email');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await hash(password, 12);

        // Create user
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .input('name', sql.VarChar, name || email.split('@')[0])
            .input('password', sql.VarChar, hashedPassword)
            .input('role', sql.VarChar, 'attender')
            .query(`
                INSERT INTO ExternalUsers (email, name, password, role, createdAt)
                OUTPUT INSERTED.id
                VALUES (@email, @name, @password, @role, GETDATE())
            `);

        res.status(201).json({
            message: 'User created successfully',
            userId: result.recordset[0].id
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
}