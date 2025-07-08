import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = await getDBConnection();

        const result = await db.query(`
            SELECT role, COUNT(*) AS count
            FROM Users
            GROUP BY role
        `);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching user roles:", err);
        res.status(500).json({ error: "Failed to fetch user role breakdown" });
    }
}
