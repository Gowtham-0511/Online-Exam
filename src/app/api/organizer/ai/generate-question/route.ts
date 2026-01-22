
import { NextRequest, NextResponse } from "next/server";
import { generateExamQuestions } from "@/lib/ai/azureOpenAI";

export async function POST(req: NextRequest) {
    try {
        const { language, totalMarks, difficultyDistribution, questionTypes, topics, questionCount } = await req.json();

        if (!language || !totalMarks) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const questions = await generateExamQuestions(
            language,
            totalMarks,
            difficultyDistribution || { easy: 40, medium: 40, hard: 20 },
            questionTypes || { coding: 70, mcq: 30 },
            topics || [],
            questionCount
        );

        return NextResponse.json({ success: true, questions });

    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json({ message: "Failed to generate questions" }, { status: 500 });
    }
}
