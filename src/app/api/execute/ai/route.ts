import { NextRequest, NextResponse } from "next/server";
import { simulateExecution } from "@/lib/ai/azureOpenAI";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const { code, language, question, testCase } = await req.json();

        if (!code || !language || !question || !testCase) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        logger.info(`🤖 AI simulating execution for ${language}...`);
        const result = await simulateExecution(code, language, question, testCase);

        return NextResponse.json(result);
    } catch (error: any) {
        logger.error("AI simulation route error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to simulate execution with AI" },
            { status: 500 }
        );
    }
}
