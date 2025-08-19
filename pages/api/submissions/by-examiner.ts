import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const email = req.query.email;

    if (typeof email !== "string") {
      return res.status(400).json({ error: "Missing or invalid email" });
    }

    const db = await getDBConnection();

    // Step 1: Get exams created by examiner
    const examsResult = await db
      .request()
      .input("createdBy", email)
      .query(`SELECT id, title FROM Assessment WHERE createdBy = @createdBy`);

    const exams = examsResult.recordset;
    console.log("Exams found:", exams);

    if (exams.length === 0) {
      return res.status(200).json([]); // no exams for this examiner
    }

    // Step 2: Use exam IDs for submissions (safer than titles)
    const examIds = exams.map((e: any) => e.id);
    const placeholders = examIds.map((_, idx) => `@id${idx}`).join(",");

    const request = db.request();
    examIds.forEach((id, idx) => request.input(`id${idx}`, id));

    const submissionsResult = await request.query(`
      SELECT * 
      FROM Submissions 
      WHERE examId IN (${placeholders})
      ORDER BY submittedAt DESC
    `);

    console.log("Submissions found:", submissionsResult.recordset.length);

    return res.status(200).json(submissionsResult.recordset);
  } catch (error: any) {
    console.error("❌ Error in /api/submissions/by-examiner:", error.message);
    return res.status(500).json({ error: "Failed to load submissions", details: error.message });
  }
}
