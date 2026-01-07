import DockerSqlExecutor from "@/lib/executor/sql";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { query, testCase } = body;

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const setupQuery = testCase?.input || "";
    const fullQuery = setupQuery ? `${setupQuery};\n${query}` : query;

    logger.info("🔍 Validating query...");
    const validation = DockerSqlExecutor.validateQuery(fullQuery);

    if (!validation.valid) {
      logger.warn("❌ Validation failed: %s", validation.error);
      return NextResponse.json({
        success: false,
        error: validation.error,
      });
    }

    logger.info("✅ Validation passed, executing query...");

    const result = await DockerSqlExecutor.execute({
      query: fullQuery,
      serverType: "postgres",
      credentials: {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "practice_db",
      },
    });

    return NextResponse.json(
      {
        success: result.success,
        output: JSON.stringify(result.rows),
        columns: result.columns,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        error: result.error,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("SQL execution error:", error);
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        error: errMsg,
      },
      { status: 500 }
    );
  }
}
