import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "@/lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const db = getDatabase();
        const { image, email, examId, reason, time } = req.body;

        const stmt = db.prepare(`
      INSERT INTO violation_images (email, examId, reason, timestamp, imageBase64)
      VALUES (?, ?, ?, ?, ?)
    `);

        stmt.run(email, examId, reason, time, image);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error storing image:", error);
        res.status(500).json({ error: "Failed to store violation image" });
    }
}
