import { NextResponse } from "next/server";
import XLSX from "xlsx";
import { hash } from "bcryptjs";
import pool from "@/lib/db/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      return NextResponse.json({ message: "No data rows found" });
    }

    let insertedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = row[0]?.toString().trim() || "";
      const email = row[1]?.toString().trim() || "";
      const phone = row[2]?.toString().trim() || "";

      if (!name || !email || !phone) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      try {
        const hashedPassword = await hash(phone, 12);

        // Check if user already exists
        const existing = await pool.query(
          `SELECT id FROM "ExternalUsers" WHERE "email" = $1`,
          [email]
        );

        if ((existing.rowCount ?? 0) > 0) {
          failedCount++;
          errors.push(`Row ${i + 1}: User already exists (${email})`);
          continue;
        }

        // Insert new user
        await pool.query(
          `INSERT INTO "ExternalUsers" ("email", "name", "password", "role", "createdAt")
                     VALUES ($1, $2, $3, $4, NOW())`,
          [email, name, hashedPassword, "attender"]
        );

        insertedCount++;
      } catch (e: any) {
        failedCount++;
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${insertedCount} users successfully.`,
        inserted: insertedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Bulk upload error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        message: "Upload failed",
        error: errMsg,
      },
      { status: 500 }
    );
  }
}
