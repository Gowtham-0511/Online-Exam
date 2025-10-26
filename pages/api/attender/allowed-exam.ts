import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;

    try {
        const query = `
            SELECT 
                DISTINCT a.id, 
                a.title, 
                a.duration, 
                a."createdBy", 
                a."createdAt", 
                a."isExamProctored", 
                a."isGeneratedFromExcel", 
                a."questionConfig", 
                a.questions,  
                a.language,
                a."assignmentType",
                abm."startTime"::TEXT, 
                abm."endTime"::TEXT, 
                b."Name" AS "BatchName", 
                b."EmployeeCount" AS participants,
                'batch' AS "assignedVia"
            FROM "AssessmentBatchMapping" abm
            INNER JOIN "Assessment" a ON abm."assessmentId" = a.id
            INNER JOIN "Batch" b ON abm."batchId" = b."Id"
            CROSS JOIN LATERAL jsonb_array_elements(b."Employees"::jsonb) emp
            WHERE emp->>'Email' = $1
            AND abm."isActive" = true
            AND NOT EXISTS (
                SELECT 1 FROM submissions s   
                WHERE "examId" = a.title
                AND "email" = $1
            )
            UNION
            SELECT DISTINCT 
                a.id, 
                a.title, 
                a.duration, 
                a."createdBy", 
                a."createdAt", 
                a."isExamProctored", 
                a."isGeneratedFromExcel", 
                a."questionConfig", 
                a.questions,  
                a.language,
                a."assignmentType",
                NULL::TEXT AS "startTime", 
                NULL::TEXT AS "endTime", 
                NULL AS "BatchName", 
                (SELECT COUNT(*) FROM "AssessmentUserMapping" WHERE "assessmentId" = a.id) AS participants,
                'user' AS "assignedVia"
            FROM "AssessmentUserMapping" aum
            INNER JOIN "Assessment" a ON aum."assessmentId" = a.id
            WHERE aum."userEmail" = $1
            AND NOT EXISTS (
                SELECT 1 FROM submissions s   
                WHERE "examId" = a.title
                AND "email" = $1
            )
            ORDER BY "createdAt" DESC;
        `;

        const result = await pool.query(query, [email as string]);

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}