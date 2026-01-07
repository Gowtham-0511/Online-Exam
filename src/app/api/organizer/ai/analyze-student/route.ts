import { analyzeStudentPerformance } from "@/lib/ai/azureOpenAI";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  const body = await req.json();
  const { studentData } = body;

  if (!studentData) {
    return NextResponse.json(
      { error: "Student data is required" },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeStudentPerformance(studentData);

    return NextResponse.json({ analysis }, { status: 200 });
  } catch (error) {
    logger.error("Failed to analyze student:", error);
    return NextResponse.json(
      { error: "Failed to analyze student" },
      { status: 500 }
    );
  }
}
