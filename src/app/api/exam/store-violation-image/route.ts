import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    image,
    email,
    examId,
    reason,
    time,
    aiAnalysis,
    aiConfidence,
    severity,
  } = body;

  if (!image || !email || !examId || !reason || !time) {
    return NextResponse.json(
      {
        error: "Missing required fields: image, email, examId, reason, time",
      },
      {
        status: 400,
      }
    );
  }

  console.log("Incoming violation with AI analysis:", {
    email,
    examId,
    reason,
    hasAiAnalysis: !!aiAnalysis,
    severity,
  });

  const client = await pool.connect();

  try {
    const query = `
      INSERT INTO "violation_images" 
          ("email", "examId", "reason", "timestamp", "imageBase64", "ai_analysis", "ai_confidence", "severity")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const values = [
      email,
      examId,
      reason,
      new Date(time),
      image,
      aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      aiConfidence || null,
      severity || "medium",
    ];

    const result = await pool.query(query, values);
    console.log(
      "✅ Violation image inserted with AI analysis. ID:",
      result.rows[0].id
    );

    return NextResponse.json(
      {
        success: true,
        violationId: result.rows[0].id,
        aiAnalysis: aiAnalysis,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error("Error storing violation image:", error);
    return NextResponse.json(
      {
        error: "Failed to store violation image",
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}
