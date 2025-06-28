import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = getDatabase();

        const stmt = db.prepare("SELECT * FROM submissions ORDER BY submittedAt DESC");
        const submissions = stmt.all();

        res.status(200).json(submissions);
    } catch (error) {
        console.error("Error fetching all submissions:", error);
        res.status(500).json({ error: "Failed to load submissions" });
    }
}
