import { NextApiRequest, NextApiResponse } from "next";
import { predictQuestionDifficulty } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { questionText, questionType, totalMarks } = req.body;
        const prediction = await predictQuestionDifficulty(questionText, questionType, totalMarks);
        return res.status(200).json(prediction);
    } catch (error: any) {
        console.error("Difficulty prediction error:", error);
        return res.status(500).json({ error: "Failed to predict difficulty" });
    }
}