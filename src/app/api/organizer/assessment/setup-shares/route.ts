import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "AssessmentShares" (
                id serial4 PRIMARY KEY,
                "assessmentId" int4 NOT NULL,
                "sharedWithEmail" VARCHAR(255) NOT NULL,
                "sharedByEmail" VARCHAR(255) NOT NULL,
                "permission" VARCHAR(50) DEFAULT 'view',
                "createdAt" TIMESTAMP DEFAULT now(),
                CONSTRAINT unique_share UNIQUE ("assessmentId", "sharedWithEmail")
            );
        `);
        return NextResponse.json({ success: true, message: "Table initialized" });
    } catch (e: any) {
        return NextResponse.json({ error: e.toString() }, { status: 500 });
    }
}
