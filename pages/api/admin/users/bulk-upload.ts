import { IncomingForm } from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import * as XLSX from 'xlsx';
import { hash } from 'bcrypt';
import sql from 'mssql';
import { getDBConnection } from '@/lib/database';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const parseForm = (): Promise<{ fields: any; files: any }> => {
        const form = new IncomingForm({ multiples: false });
        return new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        });
    };

    try {
        const { files } = await parseForm();
        const uploadedFile = files.file;
        const filePath = Array.isArray(uploadedFile) ? uploadedFile[0].filepath : uploadedFile?.filepath;

        if (!filePath) return res.status(400).json({ message: 'No file uploaded' });

        const buffer = await fs.promises.readFile(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length < 2) return res.status(400).json({ message: 'No data rows found' });

        const pool = await getDBConnection();
        let insertedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        // Skip header row
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const name = row[0]?.toString().trim() || '';
            const email = row[1]?.toString().trim() || '';
            const phone = row[2]?.toString().trim() || '';

            if (!name || !email || !phone) {
                errors.push(`Row ${i + 1}: Missing required fields`);
                continue;
            }

            try {
                const hashedPassword = await hash(phone, 12);

                const existing = await pool
                    .request()
                    .input('email', sql.VarChar, email)
                    .query('SELECT id FROM ExternalUsers WHERE email = @email');

                if (existing.recordset.length > 0) {
                    failedCount++;
                    errors.push(`Row ${i + 1}: User already exists (${email})`);
                    continue;
                }

                await pool
                    .request()
                    .input('email', sql.VarChar, email)
                    .input('name', sql.VarChar, name)
                    .input('password', sql.VarChar, hashedPassword)
                    .input('role', sql.VarChar, 'attender')
                    .query(
                        `INSERT INTO ExternalUsers (email, name, password, role, createdAt)
             VALUES (@email, @name, @password, @role, GETDATE())`
                    );

                insertedCount++;
            } catch (e: any) {
                failedCount++;
                errors.push(`Row ${i + 1}: ${e.message}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Processed ${insertedCount} users`,
            inserted: insertedCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        console.error('Bulk upload error:', error);
        return res.status(500).json({ message: 'Upload failed', error: error.message });
    }
}
