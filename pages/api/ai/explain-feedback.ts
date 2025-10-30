import { NextApiRequest, NextApiResponse } from "next";
import { explainFeedbackFurther } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { questionText, studentAnswer, originalFeedback, query } = req.body;

        const explanation = await explainFeedbackFurther(
            questionText,
            studentAnswer,
            originalFeedback,
            query
        );

        return res.status(200).json({ explanation });
    } catch (error) {
        console.error("Explain feedback API error:", error);
        return res.status(500).json({ error: "Failed to generate explanation" });
    }
}