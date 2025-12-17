import { NextRequest, NextResponse } from 'next/server';
import { evaluateBattleSubmission } from '@/lib/ai/azureOpenAI';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { code, language, question, testCases } = body;

        if (!code || !question || !testCases) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const evaluation = await evaluateBattleSubmission(code, language, question, testCases);

        return NextResponse.json({
            passed: evaluation.passed,
            score: evaluation.score,
            feedback: evaluation.feedback,
            failedCase: evaluation.failedCase
        });

    } catch (error: any) {
        console.error("Battle submit error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
