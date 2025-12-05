import pool from "@/lib/db/db";
import { CodingQuestion, MCQQuestion } from "@/lib/ai/question-generation";

export async function insertPracticeQuestions(
  email: string,
  questions: (MCQQuestion | CodingQuestion)[],
  language: string,
  difficulty: string,
  topic: string
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertPromises = questions.map(async (q) => {
      if (q.type === "mcq") {
        return client.query(
          `INSERT INTO "PracticeQuestions" (
            "generatedFor", "language", difficulty, topic, 
            "questionTitle", "questionDescription", "testCases", 
            "expectedOutput", "solutionExplanation", "generatedAt", 
            "isActive", "attemptCount", "successRate"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12)
          RETURNING id`,
          [
            email,
            "mcq",
            difficulty,
            topic,
            q.question,
            q.question,
            JSON.stringify(q.options),
            String(q.correctAnswer),
            q.explanation,
            true,
            0,
            0,
          ]
        );
      } else {
        return client.query(
          `INSERT INTO "PracticeQuestions" (
            "generatedFor", "language", difficulty, topic,
            "questionTitle", "questionDescription", "starterCode",
            "testCases", "solutionCode", "solutionExplanation",
            "generatedAt", "isActive", "attemptCount", "successRate"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, $13)
          RETURNING id`,
          [
            email,
            q.language,
            difficulty,
            topic,
            q.question,
            q.description,
            q.starterCode,
            JSON.stringify(q.testCases),
            q.solution,
            q.explanation,
            true,
            0,
            0,
          ]
        );
      }
    });

    const results = await Promise.all(insertPromises);
    await client.query("COMMIT");

    return results.map((r) => r.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
