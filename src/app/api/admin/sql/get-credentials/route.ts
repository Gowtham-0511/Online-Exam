import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/db";
import { decrypt } from "@/lib/encryption";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const credentialId = searchParams.get("credentialId");

  if (!credentialId) {
    return NextResponse.json(
      { message: "Credential ID is required" },
      { status: 400 }
    );
  }

  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      "SELECT * FROM sql_credentials WHERE id = $1",
      [credentialId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Credentials not found" },
        { status: 404 }
      );
    }

    const credential = result.rows[0];

    // Decrypt password before sending
    const decryptedPassword = decrypt(credential.password);

    return NextResponse.json({
      id: credential.id,
      serverType: credential.server_type,
      host: credential.host,
      port: credential.port,
      username: credential.username,
      password: decryptedPassword,
      database: credential.database_name,
      examTitle: credential.exam_title,
      createdBy: credential.created_by,
      createdAt: credential.created_at,
    });
  } catch (error: any) {
    logger.error("Error retrieving credentials:", error);
    return NextResponse.json(
      {
        message: "Failed to retrieve credentials",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
