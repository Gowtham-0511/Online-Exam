import type { NextApiRequest, NextApiResponse } from "next";
import dockerSqlExecutor from "@/lib/dockerSqlExecutor";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { query, testCase } = req.body;

    console.log('📥 Received SQL execution request:', {
        hasQuery: !!query,
        hasTestCase: !!testCase,
        testCaseInput: testCase?.input?.substring(0, 100)
    });

    if (!query) {
        return res.status(400).json({ error: "Query is required" });
    }

    try {
        // Validate query first
        const setupQuery = testCase?.input || "";
        const fullQuery = setupQuery ? `${setupQuery};\n${query}` : query;
        
        console.log('🔍 Validating query...');
        const validation = dockerSqlExecutor.validateQuery(fullQuery);
        
        if (!validation.valid) {
            console.log('❌ Validation failed:', validation.error);
            return res.status(400).json({
                success: false,
                error: validation.error,
            });
        }

        console.log('✅ Validation passed, executing query...');

        // Execute setup + query
        const result = await dockerSqlExecutor.execute({
            query: fullQuery,
            serverType: "postgres",
            credentials: {
                host: process.env.DB_HOST || "localhost",
                port: parseInt(process.env.DB_PORT || "5432"),
                username: process.env.DB_USER || "postgres",
                password: process.env.DB_PASSWORD || "",
                database: process.env.DB_NAME || "practice_db",
            },
        });

        console.log('✅ Execution complete:', {
            success: result.success,
            rowCount: result.rowCount,
            executionTime: result.executionTime
        });

        return res.status(200).json({
            success: result.success,
            output: JSON.stringify(result.rows),
            columns: result.columns,
            rowCount: result.rowCount,
            executionTime: result.executionTime,
            error: result.error,
        });
    } catch (error: any) {
        console.error("❌ SQL execution error:", {
            message: error.message,
            stack: error.stack
        });
        return res.status(500).json({
            success: false,
            error: error.message || "Execution failed",
        });
    }
}