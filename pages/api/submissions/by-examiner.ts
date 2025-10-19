import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const email = req.query.email;

    if (typeof email !== "string") {
      return res.status(400).json({ error: "Missing or invalid email" });
    }

    // 1️⃣ Get exams created by this examiner
    const examsResult = await pool.query(
      `SELECT id, title FROM "Assessment" WHERE "createdBy" = $1`,
      [email]
    );

    const exams = examsResult.rows;

    if (exams.length === 0) {
      return res.status(200).json([]);
    }

    const examIds = exams.map((e: any) => e.id);
    const examTitles = exams.map((e: any) => e.title);
    console.log("Exam Titles:", examTitles);

    // 2️⃣ Build a dynamic placeholder list ($1, $2, ...)
    const placeholders = examIds.map((_, idx) => `$${idx + 1}`).join(",");

    console.log("Fetching submissions for exam IDs:", examIds);

    const submissionsResult = await pool.query(
      `SELECT * 
       FROM "submissions"
       WHERE "examId" IN (${placeholders})
       ORDER BY "submittedAt" DESC`,
      examTitles
    );

    console.log("Submissions found:", submissionsResult.rows.length);

    return res.status(200).json(submissionsResult.rows);
  } catch (error: any) {
    console.error("❌ Error in /api/submissions/by-examiner:", error.message);
    return res.status(500).json({ error: "Failed to load submissions", details: error.message });
  }
}
