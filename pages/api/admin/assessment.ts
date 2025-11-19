import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {

        const query = `SELECT * FROM "Assessment"`;

        console.log(query)

        const result = await pool.query(query);

        return res.status(200).json(result.rows);

    } catch (err) {
        console.error("Error fetching exams:", err);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}
