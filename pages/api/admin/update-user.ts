import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";
import { UserRole } from "../../../lib/userOperations";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PUT") return res.status(405).end();

    const { email, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
    }

    if (!["attender", "examiner", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
    }

    try {
        const db = getDatabase();
        const stmt = db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE email = ?`);
        const result = stmt.run(role, email);

        if (result.changes === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ error: "Failed to update user role" });
    }
}