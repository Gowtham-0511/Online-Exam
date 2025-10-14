import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") return res.status(405).end();

    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Invalid exam ID" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const mappingDeleteQuery = `DELETE FROM "AssessmentBatchMapping" WHERE "assessmentId" = $1`;
        const mappingResult = await client.query(mappingDeleteQuery, [id]);
        console.log(`Deleted ${mappingResult.rowCount} mappings for assessment ${id}`);

        const assessmentDeleteQuery = `DELETE FROM "Assessment" WHERE "id" = $1 RETURNING *`;
        const assessmentResult = await client.query(assessmentDeleteQuery, [id]);

        if (assessmentResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Assessment not found" });
        }

        await client.query("COMMIT");

        console.log("✅ Assessment and related mappings deleted successfully");
        return res.status(200).json({
            success: true,
            deletedAssessment: assessmentResult.rows[0],
            deletedMappings: mappingResult.rowCount,
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Failed to delete assessment and mappings:", error);
        return res.status(500).json({ error: "Failed to delete assessment" });
    } finally {
        client.release();
    }
}