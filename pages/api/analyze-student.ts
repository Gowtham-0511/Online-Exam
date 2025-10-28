import { NextApiRequest, NextApiResponse } from "next";
import { analyzeStudentPerformance } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { studentData } = req.body;

        if (!studentData || !studentData.questionDetails) {
            return res.status(400).json({ error: "Invalid student data" });
        }

        const analysis = await analyzeStudentPerformance(studentData);
        // console.log(analysis)
        return res.status(200).json(analysis);
    } catch (error: any) {
        console.error("Analysis API Error:", error);
        return res.status(500).json({ error: "Failed to analyze student performance" });
    }
}