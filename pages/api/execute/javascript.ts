import type { NextApiRequest, NextApiResponse } from "next";
import { runJavaScriptCode } from "@/lib/dockerJavaScriptExecutor";

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
        const fullCode = `
${code}

// Test execution
try {
    const input_data = ${testCase?.input || "null"};
    
    // Check if solution function exists
    if (typeof solution === 'function') {
        // Check function signature
        const params = solution.length;
        
        let result;
        if (params > 0) {
            result = solution(input_data);
        } else {
            result = solution();
        }
        
        console.log(JSON.stringify(result));
    } else {
        throw new Error('Function "solution" is not defined');
    }
} catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
}
`;

        const result = await runJavaScriptCode(fullCode);

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("JavaScript execution error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Execution failed",
        });
    }
}