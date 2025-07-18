import getDatabase from "@/lib/database";
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (req.method !== "DELETE") return res.status(405).end();
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Invalid ID" });

    try {
        const db = getDatabase();
        const stmt = db.prepare("DELETE FROM exams WHERE id = ?");
        const result = stmt.run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Exam not found" });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Failed to delete exam:", error);
        return res.status(500).json({ error: "Failed to delete exam" });
    }
}
