import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function PATCH(request: Request) {
  const { email, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json(
      { error: "Missing email or role in request body" },
      { status: 400 }
    );
  }

  try {
    const query = `
        UPDATE Users
        SET role = $1
        WHERE email = $2
    `;

    const values = [role, email];

    await pool.query(query, values);

    logger.info("Updated user role: %s -> %s", email, role);

    return NextResponse.json(
      { message: "User role updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
