import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = getDatabase();

        const stmt = db.prepare(`
            SELECT DATE(submittedAt) as date, COUNT(*) as count
            FROM submissions
            GROUP BY DATE(submittedAt)
            ORDER BY date ASC
        `);

        const timeline = stmt.all();
        res.status(200).json(timeline);
    } catch (err) {
        console.error("Error in submission timeline:", err);
        res.status(500).json({ error: "Failed to fetch timeline" });
    }
}
