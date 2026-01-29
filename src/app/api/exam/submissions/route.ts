import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { verifyExamSubmission } from "@/lib/ai/azureOpenAI";

const submissionQueue: Array<() => Promise<void>> = [];
let activeSubmissions = 0;
const MAX_CONCURRENT_SUBMISSIONS = 10;

async function processSubmissionQueue() {
  if (
    activeSubmissions >= MAX_CONCURRENT_SUBMISSIONS ||
    submissionQueue.length === 0
  ) {
    return;
  }

  activeSubmissions++;
  const task = submissionQueue.shift();

  if (task) {
    try {
      await task();
    } catch (error) {
      logger.error("Submission queue error:", error);
    } finally {
      activeSubmissions--;
      processSubmissionQueue();
    }
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    examId,
    email,
    userName,
    answers,
    answersWithQuestionIds,
    disqualified = false,
    disqualificationReason,
    code,
  } = body;

  if (!examId || !email || !userName) {
    return NextResponse.json(
      {
        error: "Missing required fields: examId, email, userName",
      },
      {
        status: 400,
      }
    );
  }

  const submissionTask = async () => {
    // Phase 1: Database Transaction (Fast)
    let submissionId: number | null = null;
    let dbSuccess = false;

    // We use a dedicated client for transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO "submissions" (
            "email", 
            "examId", 
            "userName", 
            "answers", 
            "answersWithQuestionIds", 
            "code", 
            "disqualified", 
            "disqualification_reason",
            "submittedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT ("email", "examId") 
        DO UPDATE SET
            "answers" = EXCLUDED."answers",
            "answersWithQuestionIds" = EXCLUDED."answersWithQuestionIds",
            "code" = EXCLUDED."code",
            "disqualified" = EXCLUDED."disqualified",
            "disqualification_reason" = EXCLUDED."disqualification_reason",
            "submittedAt" = NOW()
        RETURNING "id";
      `;

      const values = [
        email,
        examId,
        userName,
        JSON.stringify(answers ?? []),
        JSON.stringify(answersWithQuestionIds ?? []),
        code || null,
        disqualified ? true : false,
        disqualificationReason || null,
      ];

      const result = await client.query(query, values);
      submissionId = result.rows[0]?.id;

      await client.query("COMMIT");
      dbSuccess = true;
      logger.info(`Submission saved: ${submissionId} for ${email}`);

    } catch (error: any) {
      await client.query("ROLLBACK");
      logger.error(`Submission failed for ${email}:`, error);

      // Attempt to log failure to DB (using same client before release)
      try {
        await client.query(
          `
            INSERT INTO "failed_submissions" 
            ("email", "examId", "data", "error", "timestamp")
            VALUES ($1, $2, $3, $4, NOW())
          `,
          [email, examId, JSON.stringify(body), error.message]
        );
      } catch (logError) {
        logger.error("Failed to log submission error:", logError);
      }
    } finally {
      // CRITICAL: Release DB connection immediately
      client.release();
    }

    // Phase 2: external Integrations (Slow) - No DB connection held here
    if (dbSuccess && submissionId && answersWithQuestionIds) {
      try {
        // Fire and forget webhook
        fetch("https://wizard-aiautomate.dopplr.ai/webhook/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            output: answersWithQuestionIds,
            id: submissionId,
          }),
        }).catch((err) => logger.error("Webhook failed:", err));

      } catch (externalError) {
        console.error("External integration error", externalError);
      }
    }
  };

  submissionQueue.push(submissionTask);
  processSubmissionQueue();

  // Return response AFTER adding to queue
  return NextResponse.json(
    {
      success: true,
      message: "Submission is being processed",
      status: "pending",
    },
    {
      status: 202,
    }
  );
}
