import { QueueManager } from "@/lib/executor/queueManager";
import { NextResponse } from "next/server";
import pool from "@/lib/db/db";

const pythonQueue = new QueueManager("python");

export async function POST(req: Request) {
  const body = await req.json();

  const { code, examId, userEmail = "anonymous" } = body;

  if (!code) {
    return NextResponse.json(
      { error: "No Python code provided" },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  console.log(
    `\n🐍 [${new Date().toISOString()}] Python Execution Request from ${userEmail}`
  );

  try {
    const isAllowed = await pythonQueue.checkRateLimit(userEmail, 10);
    if (!isAllowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 10 executions per minute.",
          retryAfter: 60,
        },
        { status: 429 }
      );
    }

    const stats = await pythonQueue.getStats();
    console.log(`📊 Queue: ${stats.active} active, ${stats.waiting} waiting`);

    if (stats.waiting > 50) {
      return NextResponse.json(
        {
          error: "Server is very busy. Please try again in a few moments.",
          queueStats: stats,
        },
        { status: 503 }
      );
    }

    const jobId = await pythonQueue.addJob({
      type: "python",
      code,
      examId: examId || "test",
      userEmail,
      priority: examId ? 10 : 5,
    });

    console.log(`📝 Job ${jobId} queued`);

    processJob(jobId, code, examId, userEmail);

    try {
      const result = await pythonQueue.getResult(jobId, 35000);

      const totalTime = Date.now() - startTime;
      console.log(`✅ Request completed in ${totalTime}ms`);

      return NextResponse.json(
        {
          output:
            result.result.output ||
            result.result.error ||
            "Code executed successfully",
          success: result.success,
          executionTime: result.result.executionTime,
          totalTime,
        },
        { status: 200 }
      );
    } catch (timeoutError) {
      console.error(`⏱️ Job ${jobId} timed out`);
      return NextResponse.json(
        {
          error: "Request timeout. The server is busy, please try again.",
          executionTime: Date.now() - startTime,
        },
        { status: 408 }
      );
    }
  } catch (error) {
    console.error("❌ Error executing code:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to execute code",
      },
      { status: 500 }
    );
  }
}

async function processJob(
  jobId: string,
  code: string,
  examId: string | undefined,
  userEmail: string
) {
  const startTime = Date.now();

  try {
    console.log(`⚙️ Processing job ${jobId}`);

    // ✅ Step 1: Fetch exam files if available
    let files: Array<{ fileName: string; content: Buffer }> = [];

    if (examId && pool) {
      try {
        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT file_name, file_url FROM exam_files WHERE exam_id = $1",
            [examId]
          );

          const fs = require("fs").promises;
          const path = require("path");

          for (const row of result.rows) {
            const filePath = path.join(process.cwd(), "public", row.file_url);
            try {
              const content = await fs.readFile(filePath);
              files.push({
                fileName: row.file_name,
                content,
              });
            } catch {
              console.warn(`⚠️ File not found: ${row.file_name}`);
            }
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.warn("⚠️ Could not fetch exam files:", dbError);
      }
    }

    // ✅ Step 2: Run Python code through HTTP microservice
    const { runPythonCode } = await import("@/lib/executor/python");
    const result = await runPythonCode(code); // ← No Docker socket needed

    // ✅ Step 3: Store result in Redis queue
    const executionTime = Date.now() - startTime;
    await pythonQueue.storeResult(jobId, result, result.success);

    const redis = (await import("@/lib/executor/queueManager")).default;
    const jobData = {
      id: jobId,
      userEmail,
      success: result.success,
      executionTime, // ← Use measured duration
      error: result.error,
    };

    await redis.zadd("exam:recent:python", Date.now(), JSON.stringify(jobData));

    // Keep only last 100 jobs
    await redis.zremrangebyrank("exam:recent:python", 0, -101);

    console.log(`✅ Job ${jobId} completed in ${executionTime}ms`);
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error.message);

    const executionTime = Date.now() - startTime;
    const result = {
      output: "",
      error: error.message,
      success: false,
    };

    await pythonQueue.storeResult(jobId, result, false);

    // Store failed job in Redis
    const redis = (await import("@/lib/executor/queueManager")).default;
    const jobData = {
      id: jobId,
      userEmail,
      success: false,
      executionTime,
      error: error.message,
    };

    await redis.zadd("exam:recent:python", Date.now(), JSON.stringify(jobData));

    await redis.zremrangebyrank("exam:recent:python", 0, -101);
  }
}
