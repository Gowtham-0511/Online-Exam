import { NextApiRequest, NextApiResponse } from 'next';
import { getDBConnection } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDBConnection();

  if (req.method === 'POST') {
    const {
      questionText,
      expectedOutput,
      difficulty,
      marks,
      language,
      createdBy
    } = req.body;

    try {
      await db
        .request()
        .input("question", questionText)
        .input("expectedOutput", expectedOutput)
        .input("difficulty", difficulty)
        .input("marks", marks)
        .input("language", language)
        .input("createdBy", createdBy)
        .input("createdAt", new Date().toISOString())
        .query(`
          INSERT INTO Questions (
            question, expectedOutput, difficulty, marks, language, createdBy, createdAt
          ) VALUES (
            @question, @expectedOutput, @difficulty, @marks, @language, @createdBy, @createdAt
          )
        `);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Insert Error:", error);
      return res.status(500).json({ error: "Failed to insert question" });
    }
  }

  if (req.method === 'GET') {
    const { language } = req.query;

    console.log(language);

    if (typeof language !== "string") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    try {
      const result = await db
        .request()
        .input("language", language)
        .query(`
          SELECT * FROM Questions
          WHERE language = @language
          ORDER BY createdAt DESC
        `);

      // console.log(result);

      return res.status(200).json(result.recordset);
    } catch (error) {
      console.error("Query Error:", error);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }
  }

  res.status(405).end();
}

