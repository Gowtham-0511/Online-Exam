import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { assessmentId } = req.query;

    try {
        const result = await pool.query(
            'SELECT * FROM "AssessmentBatchMapping" WHERE "assessmentId" = $1',
            [assessmentId]
        );
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching batch assignments:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}