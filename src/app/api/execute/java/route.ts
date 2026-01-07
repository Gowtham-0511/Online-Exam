import { runJavaCode } from "@/lib/executor/java";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { code, testCase } = body;

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  try {
    const result = await runJavaCode(code, testCase?.input || null, "solution");

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    logger.error("Java execution error:", error);
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
