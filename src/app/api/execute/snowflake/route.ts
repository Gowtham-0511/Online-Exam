import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/executor/snowflake";
import logger from "@/lib/logger";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query, testCase } = body;

        // Validate input
        if (!query || typeof query !== "string") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Query is required and must be a string"
                },
                { status: 400 }
            );
        }

        // Execute the Snowflake query
        const result = await executeQuery(query);

        logger.info("Snowflake execution result: %o", result);

        // Return the execution result
        return NextResponse.json(result, {
            status: result.success ? 200 : 500
        });

    } catch (error: any) {
        logger.error("Error in Snowflake route:", error);
        return NextResponse.json(
            {
                success: false,
                output: "",
                error: error.message || "Internal server error",
            },
            { status: 500 }
        );
    }
}