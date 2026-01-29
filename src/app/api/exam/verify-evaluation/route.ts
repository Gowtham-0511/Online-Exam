import { NextResponse } from "next/server";
import { verifyExamSubmission } from "@/lib/ai/azureOpenAI";
import pool from "@/lib/db/db";
import logger from "@/lib/logger";

export async function POST(req: Request) {
    try {
        const { submissionId, answersWithQuestionIds } = await req.json();

        if (!submissionId || !answersWithQuestionIds) {
            return NextResponse.json(
                { error: "Missing submissionId or answersWithQuestionIds" },
                { status: 400 }
            );
        }

        logger.info(`Starting verification for submission ${submissionId}`);

        // Call AI to verify
        const verificationResult = await verifyExamSubmission(answersWithQuestionIds);

        // Update the submission in DB with verification results
        const client = await pool.connect();
        try {
            // Fetch current data to ensure we don't overwrite if changed?
            // For now, we mix the passed answersWithQuestionIds with verification code

            const updatedAnswers = answersWithQuestionIds.map(
                (answer: any, index: number) => {
                    // Find matching verification
                    // We assume order is preserved or map by index
                    const verification = verificationResult.verifiedAnswers.find(
                        (v) => v.index === index
                    );

                    return {
                        ...answer,
                        verification: verification || null,
                    };
                }
            );

            // Update the database
            // We store the updated JSON in 'answersWithQuestionIds' column
            // We also store the summary if there's a place, but for now just the JSON
            await client.query(
                `
        UPDATE "submissions" 
        SET "answersWithQuestionIds" = $1
        WHERE "id" = $2
        `,
                [JSON.stringify(updatedAnswers), submissionId]
            );

            logger.info(`Verification saved for submission ${submissionId}`);

        } finally {
            client.release();
        }

        return NextResponse.json({
            success: true,
            verification: verificationResult
        });

    } catch (error: any) {
        logger.error("Verification route error:", error);
        return NextResponse.json(
            { error: "Failed to verify submission" },
            { status: 500 }
        );
    }
}
