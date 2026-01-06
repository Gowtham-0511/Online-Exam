import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/db";
import logger from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = "unknown";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      );
    }

    const query = `SELECT * FROM "Batch" WHERE "Id" = $1`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const batch = result.rows[0];
    const employees = batch.Employees ? JSON.parse(batch.Employees) : [];

    return NextResponse.json(
      {
        id: batch.Id,
        name: batch.Name,
        createdAt: batch.CreatedAt,
        employeeCount: batch.EmployeeCount,
        employees: employees,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error fetching batch %s:", id, error);
    return NextResponse.json(
      { error: "Failed to fetch batch" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = "unknown";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;

    const body = await request.json();
    const { name, employeeCount, employees } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      );
    }
    if (!name || !employeeCount || !employees) {
      return NextResponse.json(
        { error: "Missing required fields: name, employeeCount, employees" },
        { status: 400 }
      );
    }

    const employeesWithoutAvatar = employees.map((emp: any) => {
      const { Avatar, ...rest } = emp;
      return rest;
    });

    const checkQuery = `SELECT "Id" FROM "Batch" WHERE "Id" = $1`;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const updateQuery = `
                UPDATE "Batch"
                SET "Name" = $1,
                "EmployeeCount" = $2,
                "Employees" = $3
                WHERE "Id" = $4
                RETURNING "Id", "Name", "CreatedAt", "EmployeeCount", "Employees";
            `;

    const updateValues = [
      name,
      employeeCount,
      JSON.stringify(employeesWithoutAvatar),
      id,
    ];

    const updateResult = await pool.query(updateQuery, updateValues);

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Failed to update batch" },
        { status: 404 }
      );
    }

    const updatedBatch = updateResult.rows[0];
    const parsedEmployees = updatedBatch.Employees
      ? JSON.parse(updatedBatch.Employees)
      : [];

    const responseData = {
      id: updatedBatch.Id,
      name: updatedBatch.Name,
      createdAt: updatedBatch.CreatedAt,
      employeeCount: updatedBatch.EmployeeCount,
      employees: parsedEmployees,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    logger.error("Error updating batch %s:", id, error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = "unknown";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      );
    }

    const deleteQuery = `DELETE FROM "Batch" WHERE "Id" = $1 RETURNING *`;
    const deleteResult = await pool.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Batch deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error deleting batch %s:", id, error);
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
