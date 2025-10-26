import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
        responseLimit: false,
    },
};

const submissionQueue: Array<() => Promise<void>> = [];
let activeSubmissions = 0;
const MAX_CONCURRENT_SUBMISSIONS = 10;

async function processSubmissionQueue() {
    if (activeSubmissions >= MAX_CONCURRENT_SUBMISSIONS || submissionQueue.length === 0) {
        return;
    }

    activeSubmissions++;
    const task = submissionQueue.shift();

    if (task) {
        try {
            await task();
        } catch (error) {
            console.error('Submission queue error:', error);
        } finally {
            activeSubmissions--;
            processSubmissionQueue();
        }
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const {
        examId,
        email,
        userName,
        answers,
        answersWithQuestionIds,
        disqualified = false,
        code,
    } = req.body;

    if (!examId || !email || !userName) {
        return res.status(400).json({
            error: "Missing required fields: examId, email, userName",
        });
    }

    res.status(202).json({
        success: true,
        message: "Submission is being processed",
        status: "pending"
    });

    const submissionTask = async () => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO "submissions" (
                    "email", 
                    "examId", 
                    "userName", 
                    "answers", 
                    "answersWithQuestionIds", 
                    "code", 
                    "disqualified", 
                    "submittedAt"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT ("email", "examId") 
                DO UPDATE SET
                    "answers" = EXCLUDED."answers",
                    "answersWithQuestionIds" = EXCLUDED."answersWithQuestionIds",
                    "code" = EXCLUDED."code",
                    "disqualified" = EXCLUDED."disqualified",
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
            ];

            const result = await client.query(query, values);
            const submissionId = result.rows[0]?.id;

            await client.query('COMMIT');

            console.log(`✅ Submission saved: ${submissionId} for ${email}`);

            if (submissionId && answersWithQuestionIds) {
                fetch("https://wizard-aiautomate.dopplr.ai/webhook/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        output: answersWithQuestionIds,
                        id: submissionId
                    })
                }).catch(err => console.error('Webhook failed:', err));
            }

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error(`❌ Submission failed for ${email}:`, error);

            try {
                await client.query(`
                    INSERT INTO "failed_submissions" 
                    ("email", "examId", "data", "error", "timestamp")
                    VALUES ($1, $2, $3, $4, NOW())
                `, [email, examId, JSON.stringify(req.body), error.message]);
            } catch (logError) {
                console.error('Failed to log submission error:', logError);
            }
        } finally {
            client.release();
        }
    };

    submissionQueue.push(submissionTask);
    processSubmissionQueue();
}