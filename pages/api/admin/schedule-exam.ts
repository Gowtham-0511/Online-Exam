import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({
            success: false,
            message: `Method ${req.method} not allowed`,
        });
    }

    try {
        const { assessmentId, batchIds, startTime, endTime } = req.body;

        if (!assessmentId || !batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: assessmentId, batchIds, startTime, endTime",
            });
        }

        // Verify Assessment exists
        const verifyAssessment = await pool.query(
            `SELECT * FROM "Assessment" WHERE id = $1`,
            [assessmentId]
        );

        if (verifyAssessment.rowCount === 0) {
            return res.status(404).json({
                error: "Assessment not found",
                message: `Assessment with ID ${assessmentId} does not exist`,
            });
        }

        // Verify Batches exist
        const placeholders = batchIds.map((_, i) => `$${i + 1}`).join(", ");
        const verifyBatch = await pool.query(
            `SELECT * FROM "Batch" WHERE "Id" IN (${placeholders})`,
            batchIds
        );

        if (verifyBatch.rowCount === 0) {
            return res.status(404).json({
                error: "Batch not found",
                message: "One or more specified batches do not exist",
            });
        }

        if (verifyBatch.rowCount !== batchIds.length) {
            return res.status(404).json({
                error: "Some batches not found",
                message: "One or more specified batches do not exist",
            });
        }

        // Insert records inside a transaction
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            let insertedCount = 0;

            for (const batchId of batchIds) {
                try {
                    await client.query(
                        `
                        INSERT INTO "AssessmentBatchMapping" 
                            ("assessmentId", "batchId", "startTime", "endTime", "isActive", "createdAt")
                        VALUES ($1, $2, $3, $4, true, NOW())
                        `,
                        [assessmentId, batchId, new Date(startTime), new Date(endTime)]
                    );

                    insertedCount++;
                } catch (insertError) {
                    console.error(`Error inserting mapping for batch ${batchId}:`, insertError);
                }
            }

            await client.query("COMMIT");

            console.log(`✅ Successfully created ${insertedCount} mappings`);

            return res.status(200).json({
                success: true,
                message: "Exam scheduled successfully",
                data: {
                    assessmentId,
                    batchIds,
                    startTime,
                    endTime,
                    mappingsCreated: insertedCount,
                },
            });
        } catch (txError) {
            await pool.query("ROLLBACK");
            console.error("Transaction failed:", txError);
            return res.status(500).json({
                success: false,
                message: "Failed to schedule exam transaction",
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error scheduling exam:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to schedule exam",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
