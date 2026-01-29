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
      const submissionId = result.rows[0]?.id;

      await client.query("COMMIT");

      logger.info(`Submission saved: ${submissionId} for ${email}`);



      // Auto-Verify Submission
      // try {
      //   if (answersWithQuestionIds && Array.isArray(answersWithQuestionIds)) {
      //     logger.info(`Auto-verifying submission ${submissionId}...`);
      //     const verificationResult = await verifyExamSubmission(
      //       answersWithQuestionIds.map((a: any) => ({
      //         questionText: a.question || "Not provided",
      //         studentAnswer: a.answer || "Not provided",
      //         maxMarks: a.marks,
      //       }))
      //     );

      //     console.log(verificationResult);

      //     const updatedAnswers = answersWithQuestionIds.map(
      //       (a: any, i: number) => ({
      //         ...a,
      //         verification:
      //           verificationResult.verifiedAnswers.find((v) => v.index === i) ||
      //           null,
      //       })
      //     );

      //     await client.query(
      //       `UPDATE "submissions" SET "answersWithQuestionIds" = $1 WHERE "id" = $2`,
      //       [JSON.stringify(updatedAnswers), submissionId]
      //     );
      //     logger.info(`Auto-verification completed for ${submissionId}`);
      //   }
      // } catch (verifyErr) {
      //   logger.error("Auto-verification failed:", verifyErr);
      // }

      if (submissionId && answersWithQuestionIds) {
        fetch("https://wizard-aiautomate.dopplr.ai/webhook/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            output: answersWithQuestionIds,
            id: submissionId,
          }),
        }).catch((err) => logger.error("Webhook failed:", err));
      }
    } catch (error: any) {
      await client.query("ROLLBACK");
      logger.error(`Submission failed for ${email}:`, error);

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
      client.release();
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
