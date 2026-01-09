
import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ message: "Email required" }, { status: 400 });
    }

    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`
        SELECT * FROM "PracticeSets"
        WHERE "userEmail" = $1
        ORDER BY "createdAt" DESC
      `, [email]);

            return NextResponse.json({ sets: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error fetching practice sets:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
