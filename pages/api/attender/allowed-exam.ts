import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;

    try {
        const db = await getDBConnection();
        const result = await db
            .request()
            .input("email", email as string)
            .query(`
                SELECT DISTINCT a.id, a.title, a.duration, a.createdBy, a.createdAt, a.isExamProctored, a.isGeneratedFromExcel, a.questionConfig, a.questions,  a.language, abm.startTime, abm.endTime, b.Name AS BatchName, b.EmployeeCount as participants
                FROM AssessmentBatchMapping abm
                INNER JOIN Assessment a ON abm.assessmentId = a.id
                INNER JOIN Batch b ON abm.batchId = b.id
                CROSS APPLY OPENJSON(b.Employees) 
                WITH (
                    Email NVARCHAR(255) '$.Email',
                    Name NVARCHAR(255) '$.Name'
                ) emp
                WHERE emp.Email = @email
                AND abm.isActive = 1;
            `);

        // console.log(result.recordset);
        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

// import { NextApiRequest, NextApiResponse } from "next";
// import pool from "@/lib/db";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method !== "GET") return res.status(405).end();

//     const { email } = req.query;

//     try {
//         const query = `
//             SELECT DISTINCT 
//                 a.id, 
//                 a.title, 
//                 a.duration, 
//                 a."createdBy", 
//                 a."createdAt", 
//                 a."isExamProctored", 
//                 a."isGeneratedFromExcel", 
//                 a."questionConfig", 
//                 a.questions,  
//                 a.language, 
//                 abm."startTime", 
//                 abm."endTime", 
//                 b."Name" AS "BatchName", 
//                 b."EmployeeCount" AS participants
//             FROM "AssessmentBatchMapping" abm
//             INNER JOIN "Assessment" a ON abm."assessmentId" = a.id
//             INNER JOIN "Batch" b ON abm."batchId" = b."Id"
//             CROSS JOIN LATERAL jsonb_array_elements(b."Employees"::jsonb) emp
//             WHERE emp->>'Email' = $1
//                 AND abm."isActive" = true;
//         `;

//         const result = await pool.query(query, [email as string]);

//         return res.status(200).json(result.rows);
//     } catch (error) {
//         console.error("DB error:", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// }