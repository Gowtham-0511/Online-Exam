import { NextApiRequest, NextApiResponse } from "next";
import { generateAlternativeSolutions } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { questionText, studentAnswer, questionType, language } = req.body;

        const solutions = await generateAlternativeSolutions(
            questionText,
            studentAnswer,
            questionType,
            language
        );

        return res.status(200).json(solutions);
    } catch (error) {
        console.error("Alternative solutions API error:", error);
        return res.status(500).json({ error: "Failed to generate solutions" });
    }
}