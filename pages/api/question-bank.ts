import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = getDatabase();

    if (req.method === 'POST') {
        const { question, expectedOutput, difficulty, marks, language, createdBy } = req.body;

        const stmt = db.prepare(`
      INSERT INTO questionBank (question, expectedOutput, difficulty, marks, language, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
        stmt.run(question, expectedOutput, difficulty, marks, language, createdBy);
        return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
        const { email, language } = req.query;

        const stmt = db.prepare(`
      SELECT * FROM questionBank WHERE createdBy = ? AND language = ? ORDER BY createdAt DESC
    `);
        const rows = stmt.all(email, language);
        return res.status(200).json(rows);
    }

    res.status(405).end();
}
