import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = await getDBConnection();

        const result = await db.query(`
            SELECT 
                CAST(submittedAt AS DATE) AS date, 
                COUNT(*) AS count
            FROM Submissions
            GROUP BY CAST(submittedAt AS DATE)
            ORDER BY date ASC
        `);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error in submission timeline:", err);
        res.status(500).json({ error: "Failed to fetch timeline" });
    }
}
