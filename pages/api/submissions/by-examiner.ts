import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const email = req.query.email;
  if (typeof email !== "string") {
    return res.status(400).json({ error: "Missing or invalid email" });
  }

  try {
    const db = getDatabase();

    // Get exams created by this examiner
    const examsStmt = db.prepare("SELECT title FROM exams WHERE createdBy = ?");
    const examRows = examsStmt.all(email) as { title: string }[];
    const examTitles = examRows.map(row => row.title);

    if (examTitles.length === 0) return res.status(200).json([]);

    // Get submissions for those exams
    const placeholders = examTitles.map(() => '?').join(',');
    const submissionsStmt = db.prepare(
      `SELECT * FROM submissions WHERE examId IN (${placeholders}) ORDER BY submittedAt DESC`
    );
    const submissions = submissionsStmt.all(...examTitles);

    res.status(200).json(submissions);
  } catch (error) {
    console.error("Error fetching submissions by examiner:", error);
    res.status(500).json({ error: "Failed to load submissions" });
  }
}
