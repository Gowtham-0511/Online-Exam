import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = getDatabase();
        const stmt = db.prepare(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);
        const roles = stmt.all();
        res.status(200).json(roles);
    } catch (err) {
        console.error("Error fetching user roles:", err);
        res.status(500).json({ error: "Failed to fetch user role breakdown" });
    }
}
