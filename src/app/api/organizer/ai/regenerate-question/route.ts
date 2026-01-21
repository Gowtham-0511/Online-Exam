
import { NextRequest, NextResponse } from "next/server";
import { regenerateSingleQuestion } from "@/lib/ai/azureOpenAI";

export async function POST(req: NextRequest) {
    try {
        const { language, type, difficulty, marks, topics } = await req.json();

        if (!language || !type || !difficulty) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const question = await regenerateSingleQuestion(
            language,
            type,
            difficulty,
            marks || 5, // Default marks
            topics || []
        );

        if (!question) {
            return NextResponse.json({ message: "Failed to regenerate question" }, { status: 500 });
        }

        return NextResponse.json({ success: true, question });

    } catch (error) {
        console.error("Error regenerating question:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
