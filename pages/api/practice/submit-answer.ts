import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    practiceQuestionId,
    email,
    userName,
    submittedCode,
    selectedMcqAnswer,
    language,
    executionResult,
  } = req.body;

  if (
    !practiceQuestionId ||
    !email ||
    !userName ||
    !language ||
    !executionResult
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get current attempt number
    const attemptQuery = `
        SELECT COALESCE(MAX("attemptNumber"), 0) + 1 as "nextAttempt"
        FROM "PracticeSubmissions"
        WHERE "practiceQuestionId" = $1 AND email = $2
    `;
    const attemptResult = await client.query(attemptQuery, [
      practiceQuestionId,
      email,
    ]);
    const attemptNumber = attemptResult.rows[0].nextAttempt;

    // Calculate score based on question type
    let score = 0;
    let isPassed = false;
    let testCasesPassed = 0;
    let totalTestCases = 0;

    if (executionResult.isMcq) {
      // MCQ scoring: 100 if correct, 0 if incorrect
      isPassed = executionResult.success || false;
      score = isPassed ? 100 : 0;
      testCasesPassed = isPassed ? 1 : 0;
      totalTestCases = 1;
    } else {
      // Coding question scoring
      isPassed = executionResult.success || false;
      testCasesPassed = executionResult.testCasesPassed || 0;
      totalTestCases = executionResult.totalTestCases || 0;
      score = totalTestCases > 0 ? (testCasesPassed / totalTestCases) * 100 : 0;
    }

    // Generate AI feedback on the code (optional but recommended)
    const aiFeedback = {
      codeQuality: "Good structure",
      suggestions: ["Consider edge cases", "Add comments"],
      testResults: executionResult.testResults,
    };

    let submissionResult;

    const insertQuery = `
        INSERT INTO "PracticeSubmissions" (
            "practiceQuestionId", email, "userName", "submittedCode",
            language, "isPassed", "testCasesPassed", "totalTestCases",
            "executionTime", "errorMessage", "aiFeedback", score, "attemptNumber"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
    `;

    if (selectedMcqAnswer !== null && selectedMcqAnswer !== undefined) {
      // MCQ submission
      submissionResult = await client.query(insertQuery, [
        practiceQuestionId,
        email,
        userName,
        `Selected Answer: ${selectedMcqAnswer}`, // Store selected answer as text
        language,
        isPassed,
        testCasesPassed,
        totalTestCases,
        executionResult.executionTime || null,
        executionResult.error || null,
        JSON.stringify(aiFeedback),
        score,
        attemptNumber,
      ]);
    } else {
      // Coding submission
      submissionResult = await client.query(insertQuery, [
        practiceQuestionId,
        email,
        userName,
        submittedCode,
        language,
        isPassed,
        testCasesPassed,
        totalTestCases,
        executionResult.executionTime || null,
        executionResult.error || null,
        JSON.stringify(aiFeedback),
        score,
        attemptNumber,
      ]);
    }

    // Update question attempt count and success rate
    const updateQuestionQuery = `
            UPDATE "PracticeQuestions"
            SET 
                "attemptCount" = "attemptCount" + 1,
                "successRate" = (
                    SELECT AVG(CASE WHEN "isPassed" THEN 100 ELSE 0 END)
                    FROM "PracticeSubmissions"
                    WHERE "practiceQuestionId" = $1
                )
            WHERE id = $1
        `;
    await client.query(updateQuestionQuery, [practiceQuestionId]);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      submissionId: submissionResult.rows[0].id,
      isPassed,
      score,
      attemptNumber,
      executionResult,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Submit Practice Answer Error:", error);
    return res.status(500).json({ error: "Failed to submit answer" });
  } finally {
    client.release();
  }
}
