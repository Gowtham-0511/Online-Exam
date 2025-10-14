import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end()

    try {
        // const db = await getDBConnection();

        const query = `select id , email , name, "createdAt" , "updatedAt"  from "ExternalUsers" order by email `;

        const result = await pool.query(query);
        return res.status(200).json(result.rows);

        // const result = await db.query(`
        //     SELECT id, email, name, createdAt, updatedAt FROM ExternalUsers ORDER BY Email
        // `);

        // res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching exams:", error);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}