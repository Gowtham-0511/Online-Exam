import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  const { email, language, difficulty, topic, limit = 10 } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Build dynamic query based on filters
    let query = `
            SELECT 
                pq.id,
                pq.language,
                pq.difficulty,
                pq.topic,
                pq."weakArea",
                pq."questionTitle",
                pq."questionDescription",
                pq."starterCode",
                pq."testCases",
                pq.hints,
                pq."attemptCount",
                pq."successRate",
                pq."generatedAt",
                pq."mcqOptions",
                -- Check if user has attempted this question
                (SELECT COUNT(*) FROM "PracticeSubmissions" ps 
                 WHERE ps."practiceQuestionId" = pq.id AND ps.email = $1) as "userAttempts",
                -- Get user's best score for this question
                (SELECT MAX(score) FROM "PracticeSubmissions" ps 
                 WHERE ps."practiceQuestionId" = pq.id AND ps.email = $1) as "bestScore",
                -- Check if user has passed this question
                (SELECT BOOL_OR("isPassed") FROM "PracticeSubmissions" ps 
                 WHERE ps."practiceQuestionId" = pq.id AND ps.email = $1) as "hasPassed"
            FROM "PracticeQuestions" pq
            WHERE pq."generatedFor" = $1
            AND pq."isActive" = true
        `;

    const params: any[] = [email];
    let paramCount = 1;

    if (language) {
      paramCount++;
      query += ` AND pq.language = $${paramCount}`;
      params.push(language);
    }

    if (difficulty) {
      paramCount++;
      query += ` AND pq.difficulty = $${paramCount}`;
      params.push(difficulty);
    }

    if (topic) {
      paramCount++;
      query += ` AND pq.topic ILIKE $${paramCount}`;
      params.push(`%${topic}%`);
    }

    query += ` ORDER BY pq."generatedAt" DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);

    // Parse JSONB fields
    const questions = result.rows.map((row) => ({
      ...row,
      testCases:
        typeof row.testCases === "string"
          ? JSON.parse(row.testCases)
          : row.testCases || [],
      hints:
        typeof row.hints === "string" ? JSON.parse(row.hints) : row.hints || [],
      userAttempts: parseInt(row.userAttempts) || 0,
      bestScore: parseFloat(row.bestScore) || null,
      hasPassed: row.hasPassed || false,
    }));

    return res.status(200).json({
      questions,
      total: questions.length,
    });
  } catch (error: any) {
    console.error("Fetch Practice Questions Error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch practice questions" });
  }
}
