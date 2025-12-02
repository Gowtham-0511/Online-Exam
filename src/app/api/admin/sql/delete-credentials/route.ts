import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/db";

export async function DELETE(req: NextRequest) {
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
      "DELETE FROM sql_credentials WHERE id = $1 RETURNING id",
      [credentialId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Credentials not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Credentials deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting credentials:", error);
    return NextResponse.json(
      {
        message: "Failed to delete credentials",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
