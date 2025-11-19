import type { NextApiRequest, NextApiResponse } from "next";
import { runPySparkCode } from "@/lib/dockerPySparkExecutor";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { code, testCase } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Code is required" });
    }

    try {
        // Extract input from testCase if provided
        const input = testCase?.input || null;

        // Execute PySpark code
        const result = await runPySparkCode(code, input);

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("PySpark execution error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Execution failed",
        });
    }
}