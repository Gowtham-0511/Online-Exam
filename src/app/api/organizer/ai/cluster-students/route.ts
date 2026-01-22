
import { NextResponse } from "next/server";
import { clusteringAnalysis } from "@/lib/ai/clustering";
import logger from "@/lib/logger";

export async function POST(request: Request) {
    try {
        const { submissions } = await request.json();

        if (!submissions || submissions.length === 0) {
            return NextResponse.json({ clusters: [], insights: [], skillGapMap: {} });
        }

        const result = await clusteringAnalysis(submissions);
        return NextResponse.json(result);
    } catch (error) {
        logger.error("Error in AI clustering endpoint:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
