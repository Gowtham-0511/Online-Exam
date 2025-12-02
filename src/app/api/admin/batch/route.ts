import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const query = `
        SELECT * FROM "Batch"
        ORDER BY "CreatedAt" ASC;
    `;

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, createdAt, employeeCount, employees } = body;

    if (!name || !employeeCount || !employees) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, employeeCount, employees",
        },
        { status: 400 }
      );
    }

    const employeesWithoutAvatar = employees.map((emp: any) => {
      const { Avatar, ...rest } = emp;
      return rest;
    });

    const query = `
        INSERT INTO "Batch" ("Name", "EmployeeCount", "Employees", "CreatedAt")
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;

    const values = [
      name,
      employeeCount,
      JSON.stringify(employeesWithoutAvatar),
      createdAt || new Date(),
    ];

    const result = await pool.query(query, values);

    console.log("Batch created:", result.rows[0]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating batch:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
