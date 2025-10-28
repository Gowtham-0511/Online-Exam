import { NextApiRequest, NextApiResponse } from "next";
import { predictFuturePerformance } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { studentHistory } = req.body;
        const prediction = await predictFuturePerformance(studentHistory);
        return res.status(200).json(prediction);
    } catch (error: any) {
        console.error("Performance prediction error:", error);
        return res.status(500).json({ error: "Failed to predict performance" });
    }
}