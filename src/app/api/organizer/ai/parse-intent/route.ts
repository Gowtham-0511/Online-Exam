
import { NextRequest, NextResponse } from "next/server";
import { parseExamCreationIntent } from "@/lib/ai/azureOpenAI";

export async function POST(req: NextRequest) {

    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { message: "Prompt is required" },
                { status: 400 }
            );
        }

        const config = await parseExamCreationIntent(prompt);

        return NextResponse.json({ success: true, config });
    } catch (error) {
        console.error("Error parsing exam intent:", error);
        return NextResponse.json(
            { message: "Failed to process intent" },
            { status: 500 }
        );
    }
}
