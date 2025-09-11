import { NextApiRequest, NextApiResponse } from 'next';
import { getDBConnection } from '@/lib/database';
import sql from 'mssql';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '200mb',
        },
    },
}

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
            allowedUsers,
            batchSchedules
        } = req.body;

        const db = await getDBConnection();

        // Check for existing exam title
        const check = await db
            .request()
            .input("title", examId)
            .query(`SELECT COUNT(*) as count FROM Assessment WHERE title = @title`);

        if (check.recordset[0].count > 0) {
            return res.status(409).json({ error: 'Exam with this title already exists' });
        }

        // Insert new exam
        const result = await db
            .request()
            .input("title", examId)
            .input("language", language)
            .input("duration", duration)
            .input("createdBy", createdBy)
            .input("createdAt", new Date().toISOString())
            .input("isExamProctored", isExamProctored ? 1 : 0)
            .input("isGeneratedFromExcel", useExcelQuestions ? 1 : 0)
            .input("questionConfig", JSON.stringify(questionConfig || {}))
            .input("questions", sql.NVarChar(sql.MAX), JSON.stringify(questions || []))
            .input("startTime", startTime || null)
            .input("endTime", endTime || null)
            .input("allowedUsers", allowedUsers?.length ? JSON.stringify(allowedUsers) : null)
            .query(`
                INSERT INTO Assessment (
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
                ) OUTPUT INSERTED.Id VALUES (
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

        console.log(result.recordset);

        const assessmentId = result.recordset[0].Id;

        if (batchSchedules && batchSchedules.length > 0) {
            for (const schedule of batchSchedules) {
                await db
                    .request()
                    .input("assessmentId", assessmentId)
                    .input("batchId", schedule.batchId)
                    .input("startTime", schedule.startTime ? new Date(schedule.startTime).toISOString() : null)
                    .input("endTime", schedule.endTime ? new Date(schedule.endTime).toISOString() : null)
                    .query(`
                    INSERT INTO AssessmentBatchMapping (
                        assessmentId,
                        batchId,
                        startTime,
                        endTime
                    ) VALUES (
                        @assessmentId,
                        @batchId,
                        @startTime,
                        @endTime
                    )
                `);
            }
        }


        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error creating exam:", error);
        res.status(500).json({ error: "Failed to create exam" });
    }
}
