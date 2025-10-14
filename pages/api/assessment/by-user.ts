import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Missing email" });
    }

    try {
        const query = `
            SELECT *
            FROM "Assessment"
            WHERE "createdBy" = $1
            ORDER BY "createdAt" DESC
        `;

        const result = await pool.query(query, [email]);

        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("❌ Error fetching user exams:", err);
        return res.status(500).json({ error: "Failed to fetch exams" });
    }
}
