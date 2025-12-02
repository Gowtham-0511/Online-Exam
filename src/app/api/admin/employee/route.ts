import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const query = `SELECT "Id", "EmployeeId" , "Name" , "Email" , "Department" , "Position"  FROM "Employees" order by "Email" asc`;

    const result = await pool.query(query);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
