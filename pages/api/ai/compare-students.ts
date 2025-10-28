import { NextApiRequest, NextApiResponse } from "next";
import { compareStudents } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { student1, student2 } = req.body;
        const comparison = await compareStudents(student1, student2);
        return res.status(200).json(comparison);
    } catch (error: any) {
        console.error("Student comparison error:", error);
        return res.status(500).json({ error: "Failed to compare students" });
    }
}