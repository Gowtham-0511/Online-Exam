import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId, userEmail } = req.query;

    try {
        const query = `
            SELECT 
                "questionId",
                "questionIndex",
                "actionType",
                SUM("timeSpent") as "totalTimeSpent",
                SUM("codeRunCount") as "totalCodeRuns",
                COUNT(*) as "actionCount",
                MAX("timestamp") as "lastAction",
                jsonb_agg("metadata") as "allMetadata"
            FROM "UserExamActions"
            WHERE "examId" = $1 AND "userEmail" = $2
            GROUP BY "questionId", "questionIndex", "actionType"
            ORDER BY "questionIndex", "actionType";
        `;

        const result = await pool.query(query, [examId, userEmail]);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("Analytics error:", error);
        return res.status(500).json({ error: "Failed to fetch analytics" });
    }
}