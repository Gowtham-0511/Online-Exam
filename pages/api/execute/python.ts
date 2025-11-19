import type { NextApiRequest, NextApiResponse } from "next";
import { runPythonCode } from "@/lib/dockerPythonExecutor";

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

# Test execution
import json
try:
    input_data = ${testCase?.input || "None"}
    
    # Check if solution accepts parameters
    import inspect
    sig = inspect.signature(solution)
    
    if len(sig.parameters) > 0:
        result = solution(input_data)
    else:
        result = solution()
    
    print(str(result))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

        const result = await runPythonCode(fullCode);

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Python execution error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Execution failed",
        });
    }
}