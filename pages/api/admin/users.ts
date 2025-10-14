import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        // const db = await getDBConnection();
        // const result = await db.query(`
        //     select * from "ExternalUsers"
        //     ORDER BY [createdAt] DESC
        // `);

        const query = `select * from "ExternalUsers" order by "createdAt" desc`;

        const result = await pool.query(query);

        res.status(200).json(result.rows);


        // res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
}
