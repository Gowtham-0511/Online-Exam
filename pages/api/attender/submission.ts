import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const email = Array.isArray(req.query.email) ? req.query.email[0] : req.query.email;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const query = `SELECT * FROM submissions WHERE email = $1`;
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No Submissions" });
        }

        // Return all submissions instead of just the first one
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
