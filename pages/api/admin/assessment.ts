import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        // const db = await getDBConnection();

        const query = `SELECT * FROM "Assessment"`;

        console.log(query)

        const result = await pool.query(query);

        return res.status(200).json(result.rows);

        // const result = await db.query(`
        //     SELECT * FROM Assessment
        // `);

        // res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching exams:", err);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}
