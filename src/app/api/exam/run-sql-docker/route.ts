import pool from "@/lib/db/db";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { log } from "console";

const credentialsCache = new Map<
  string,
  { credential: any; password: string; timestamp: number }
>();
const CRED_CACHE_TTL = 10 * 60 * 1000;

const SQL_EXECUTOR_URL =
  process.env.SQL_SERVICE_URL ||
  process.env.SQL_EXECUTOR_URL ||
  "http://localhost:5001";

console.log(SQL_EXECUTOR_URL);

export async function POST(req: Request) {
  const { query, examId, userEmail = "anonymous" } = await req.json();

  if (!query || !examId) {
    return NextResponse.json(
      { error: "Missing query or examId" },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  logger.info(`SQL Query Request from ${userEmail}`);

  try {
    const { credential, password } = await getCredentials(examId);

    if (!credential) {
      return NextResponse.json(
        { error: "SQL credentials not found for this exam" },
        { status: 404 }
      );
    }

    logger.debug("Connecting to SQL executor at: %s", SQL_EXECUTOR_URL);

    const response = await fetch(`${SQL_EXECUTOR_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        serverType: credential.server_type,
        credentials: {
          host: credential.host,
          port: credential.port,
          username: credential.username,
          password: password,
          database: credential.database_name,
        },
        examId,
        userEmail,
      }),
    });

    // Sensitive info removed from logs
    logger.debug("Sent SQL query to executor for examId: %s", examId);

    const result = await response.json();
    const totalTime = Date.now() - startTime;

    logger.info(`SQL execution completed in ${totalTime}ms for ${userEmail}`);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          executionTime: result.executionTime,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        totalTime,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error running SQL query:", error);
    return NextResponse.json(
      { error: "Error running SQL query" },
      { status: 500 }
    );
  }
}

async function getCredentials(examId: string) {
  const cached = credentialsCache.get(examId);
  if (cached && Date.now() - cached.timestamp < CRED_CACHE_TTL) {
    logger.debug(`Using cached credentials for exam ${examId}`);
    return { credential: cached.credential, password: cached.password };
  }

  logger.info(`Fetching credentials for exam ${examId}`);
  const client = await pool.connect();

  try {
    const assessmentResult = await client.query(
      'SELECT "sqlCredentialId" FROM "Assessment" WHERE title = $1',
      [examId]
    );

    if (assessmentResult.rows.length === 0) {
      throw new Error("Assessment not found");
    }

    const sqlCredentialId = assessmentResult.rows[0].sqlCredentialId;
    if (!sqlCredentialId) {
      throw new Error("No SQL credentials configured for this exam");
    }

    const credentialResult = await client.query(
      "SELECT * FROM sql_credentials WHERE id = $1",
      [sqlCredentialId]
    );

    if (credentialResult.rows.length === 0) {
      throw new Error("SQL credentials not found");
    }

    const credential = credentialResult.rows[0];
    const password = decrypt(credential.password);

    credentialsCache.set(examId, {
      credential,
      password,
      timestamp: Date.now(),
    });

    return { credential, password };
  } finally {
    client.release();
  }
}

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of credentialsCache.entries()) {
    if (now - value.timestamp > CRED_CACHE_TTL) {
      credentialsCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned ${cleaned} expired SQL credential cache entries`);
  }
}, CRED_CACHE_TTL);
