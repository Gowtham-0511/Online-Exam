import { NextApiRequest, NextApiResponse } from "next";
import { conversationalTutor } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { conversationHistory, examContext } = req.body;

        const response = await conversationalTutor(conversationHistory, examContext);

        return res.status(200).json({ response });
    } catch (error) {
        console.error("Tutor chat API error:", error);
        return res.status(500).json({ error: "Failed to get response" });
    }
}