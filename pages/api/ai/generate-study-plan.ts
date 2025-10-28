import { NextApiRequest, NextApiResponse } from "next";
import { generateStudyPlan } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { studentData } = req.body;
        const plan = await generateStudyPlan(studentData);
        return res.status(200).json(plan);
    } catch (error: any) {
        console.error("Study plan generation error:", error);
        return res.status(500).json({ error: "Failed to generate study plan" });
    }
}