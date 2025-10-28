import { NextApiRequest, NextApiResponse } from "next";
import { analyzeCommonMistakes } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { questionText, studentAnswers } = req.body;
        const analysis = await analyzeCommonMistakes(questionText, studentAnswers);
        return res.status(200).json(analysis);
    } catch (error: any) {
        console.error("Mistakes analysis error:", error);
        return res.status(500).json({ error: "Failed to analyze mistakes" });
    }
}