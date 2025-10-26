import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { language } = req.query;

        let query = `
            SELECT DISTINCT unnest(tags) as tag
            FROM "Questions"
            WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
        `;

        const params: any[] = [];
        if (language) {
            query += ` AND language = $1`;
            params.push(language);
        }

        query += ` ORDER BY tag`;

        const result = await pool.query(query, params);
        const tags = result.rows.map(row => row.tag);

        return res.status(200).json({ tags });
    } catch (error) {
        console.error("Error fetching tags:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}