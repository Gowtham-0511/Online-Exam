import { NextApiRequest, NextApiResponse } from 'next';
import { getDBConnection } from '@/lib/database'; // make sure this points to your MSSQL connector

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const {
            examId,
            language,
            duration,
            createdBy,
            questions,
            isExamProctored,
            useExcelQuestions,
            questionConfig,
            startTime,
            endTime,
            allowedUsers
        } = req.body;

        const db = await getDBConnection();

        // Check for existing exam title
        const check = await db
            .request()
            .input("title", examId)
            .query(`SELECT COUNT(*) as count FROM exams WHERE title = @title`);

        if (check.recordset[0].count > 0) {
            return res.status(409).json({ error: 'Exam with this title already exists' });
        }

        // Insert new exam
        await db
            .request()
            .input("title", examId)
            .input("language", language)
            .input("duration", duration)
            .input("createdBy", createdBy)
            .input("createdAt", new Date().toISOString())
            .input("isExamProctored", isExamProctored ? 1 : 0)
            .input("isGeneratedFromExcel", useExcelQuestions ? 1 : 0)
            .input("questionConfig", JSON.stringify(questionConfig || {}))
            .input("questions", JSON.stringify(questions || []))
            .input("startTime", startTime || null)
            .input("endTime", endTime || null)
            .input("allowedUsers", allowedUsers?.length ? JSON.stringify(allowedUsers) : null)
            .query(`
        INSERT INTO exams (
          title,
          language,
          duration,
          createdBy,
          createdAt,
          isExamProctored,
          isGeneratedFromExcel,
          questionConfig,
          questions,
          startTime,
          endTime,
          allowedUsers
        ) VALUES (
          @title,
          @language,
          @duration,
          @createdBy,
          @createdAt,
          @isExamProctored,
          @isGeneratedFromExcel,
          @questionConfig,
          @questions,
          @startTime,
          @endTime,
          @allowedUsers
        )
      `);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error creating exam:", error);
        res.status(500).json({ error: "Failed to create exam" });
    }
}
