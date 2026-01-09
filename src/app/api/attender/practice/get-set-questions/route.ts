
import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("setId");
    const email = searchParams.get("email");

    if (!setId) {
        return NextResponse.json({ message: "Set ID required" }, { status: 400 });
    }

    try {
        const client = await pool.connect();
        try {
            // Fetch set info
            const setRes = await client.query(`SELECT * FROM "PracticeSets" WHERE id = $1`, [setId]);
            if (setRes.rows.length === 0) {
                return NextResponse.json({ message: "Set not found" }, { status: 404 });
            }

            // Fetch questions with hasPassed status
            // We use the email to check for submissions
            const qRes = await client.query(`
                SELECT pq.*, 
                COALESCE((
                    SELECT BOOL_OR("isPassed") 
                    FROM "PracticeSubmissions" ps 
                    WHERE ps."practiceQuestionId" = pq.id 
                    AND ps.email = $2
                ), false) as "hasPassed"
                FROM "PracticeQuestions" pq
                WHERE "practiceSetId" = $1
                ORDER BY id ASC
            `, [setId, email || '']);

            return NextResponse.json({
                set: setRes.rows[0],
                questions: qRes.rows
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
