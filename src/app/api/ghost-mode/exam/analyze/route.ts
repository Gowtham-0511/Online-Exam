import { NextResponse } from "next/server";
import { generateFullExamAnalysis } from "@/lib/ai/azureOpenAI";
import logger from "@/lib/logger";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userName, questionDetails } = body;

        if (!questionDetails || !Array.isArray(questionDetails)) {
            return NextResponse.json(
                { message: "Invalid question details" },
                { status: 400 }
            );
        }

        const analysis = await generateFullExamAnalysis({
            userName: userName || "Student",
            questionDetails,
        });

        return NextResponse.json(analysis);
    } catch (error: any) {
        logger.error("Exam Analysis API Error:", error);
        return NextResponse.json(
            { message: "Failed to analyze exam", error: error.message },
            { status: 500 }
        );
    }
}
