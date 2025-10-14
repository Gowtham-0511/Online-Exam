import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        // const db = await getDBConnection();
        // const result = await db.query(`
        //     SELECT * FROM users 
        //     ORDER BY created_at DESC
        // `);

        const query = `
            SELECT * FROM users 
            ORDER BY "name"
        `;
        const result = await pool.query(query);
        return res.status(200).json(result.rows);

        // res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
}
