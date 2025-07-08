import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database"; // your MSSQL helper

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = await getDBConnection(); // MSSQL pool or connection
        const result = await db.query(`
        SELECT * FROM Users
        ORDER BY created_at DESC
        `);

        res.status(200).json(result.recordset); // .recordset for MSSQL results
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
}
