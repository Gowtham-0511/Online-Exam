import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
    try {
        const query = `select * from "ExternalUsers" order by "createdAt" desc`;

        // Log the administrative access
        logger.info('Admin accessed user list');

        const result = await pool.query(query);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        logger.error('Error fetching users in /api/admin/users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}