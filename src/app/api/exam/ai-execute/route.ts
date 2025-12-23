import { NextRequest, NextResponse } from "next/server";
import { evaluateBattleSubmission } from "@/lib/ai/azureOpenAI";

export async function POST(req: NextRequest) {
    try {
        const { code, language, question, testCases } = await req.json();

        if (!code || !language || !question) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const result = await evaluateBattleSubmission(code, language, question, testCases || []);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("AI execution error:", error);
        return NextResponse.json(
            { error: "Failed to execute code with AI" },
            { status: 500 }
        );
    }
}
