import type { NextApiRequest, NextApiResponse } from "next";
import { runJavaCode } from "@/lib/dockerJavaExecutor";

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
        const result = await runJavaCode(
            code,
            testCase?.input || null,
            "solution"
        );

        console.log(result);

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Java execution error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Execution failed",
        });
    }
}