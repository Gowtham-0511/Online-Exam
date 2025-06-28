import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Missing email" });
    }

    try {
        const db = getDatabase();
        const stmt = db.prepare("SELECT rowid AS id, * FROM exams WHERE createdBy = ? ORDER BY createdAt DESC");
        const exams = stmt.all(email);

        res.status(200).json(exams);
    } catch (err) {
        console.error("Error fetching user exams:", err);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}
