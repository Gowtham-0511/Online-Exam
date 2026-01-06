import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const query = `
        SELECT id, server_type, host, port, username, database_name, exam_title, created_by, created_at 
        FROM sql_credentials
        ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    return NextResponse.json(
      {
        credentials: result.rows.map((row) => ({
          id: row.id,
          serverType: row.server_type,
          host: row.host,
          port: row.port,
          username: row.username,
          database: row.database_name,
          examTitle: row.exam_title,
          createdBy: row.created_by,
          createdAt: row.created_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error listing credentials:", error);
    return NextResponse.json(
      { error: "Failed to list credentials" },
      { status: 500 }
    );
  }
}
