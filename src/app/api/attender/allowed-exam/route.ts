import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    logger.info("Fetching allowed exams for: %s", email);
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

    const result = await pool.query(query, [email]);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching allowed exams:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
