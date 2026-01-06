import { NextResponse } from "next/server";
// import pool from "@/lib/db/db"; // unused since files weren't being passed
import { runPythonCode } from "@/lib/executor/python";
import logger from "@/lib/logger";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

function checkRateLimit(userEmail: string, limit: number, windowMs: number): boolean {
  if (!userEmail) return true;

  const now = Date.now();
  const userData = rateLimitMap.get(userEmail);

  if (!userData) {
    rateLimitMap.set(userEmail, { count: 1, timestamp: now });
    return true;
  }

  if (now - userData.timestamp > windowMs) {
    // Reset window
    rateLimitMap.set(userEmail, { count: 1, timestamp: now });
    return true;
  }

  if (userData.count >= limit) {
    return false;
  }

  userData.count++;
  return true;
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code, examId, userEmail = "anonymous" } = body;

  if (!code) {
    return NextResponse.json(
      { error: "No Python code provided" },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  logger.info(`Python Execution Request from ${userEmail}`);

  // Rate Limit: 10 requests per minute
  if (!checkRateLimit(userEmail, 10, 60000)) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Maximum 10 executions per minute.",
        retryAfter: 60,
      },
      { status: 429 }
    );
  }

  try {
    // Execute Python code directly
    // Note: Previous implementation fetched exam files but didn't pass them to the executor.
    // If file support is needed, runPythonCode needs to be updated to accept files.

    const result = await runPythonCode(code);
    const totalTime = Date.now() - startTime;

    logger.info(`Python execution completed in ${totalTime}ms for ${userEmail}`);

    return NextResponse.json(
      {
        output: result.output || result.error || "Code executed successfully",
        success: result.success,
        executionTime: totalTime, // Approximate since we don't get exact internal time
        totalTime,
      },
      { status: 200 }
    );

  } catch (error: any) {
    logger.error("Error executing python code:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute code",
      },
      { status: 500 }
    );
  }
}
