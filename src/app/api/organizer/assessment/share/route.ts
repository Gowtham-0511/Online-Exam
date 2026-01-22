import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(req: Request) {
    try {
        const { assessmentId, emails, sharedBy } = await req.json();

        if (!assessmentId || !emails || !emails.length || !sharedBy) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const email of emails) {
                await client.query(`
                    INSERT INTO "AssessmentShares" ("assessmentId", "sharedWithEmail", "sharedByEmail", "permission")
                    VALUES ($1, $2, $3, 'view')
                    ON CONFLICT ("assessmentId", "sharedWithEmail") DO NOTHING
                `, [assessmentId, email, sharedBy]);
            }

            await client.query('COMMIT');
            return NextResponse.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e: any) {
        logger.error("Share error", e);
        return NextResponse.json({ error: e.toString() }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) return NextResponse.json([], { status: 200 });

    try {
        const result = await pool.query(`
            SELECT "sharedWithEmail", "permission" FROM "AssessmentShares" WHERE "assessmentId" = $1
         `, [assessmentId]);
        return NextResponse.json(result.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.toString() }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId");
    const email = searchParams.get("email");

    if (!assessmentId || !email) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    try {
        await pool.query(`DELETE FROM "AssessmentShares" WHERE "assessmentId" = $1 AND "sharedWithEmail" = $2`, [assessmentId, email]);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.toString() }, { status: 500 });
    }
}
