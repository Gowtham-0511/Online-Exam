import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end()

    try {
        // const db = await getDBConnection();

        const query = `SELECT "Id", "EmployeeId" , "Name" , "Email" , "Department" , "Position"  FROM "Employees" order by "Email" `;

        const result = await pool.query(query);
        console.log(result.rows);
        return res.status(200).json(result.rows);

        // const result = await db.query(`
        //     SELECT Id, EmployeeId, Name, Email, Department, Position FROM Employees ORDER BY Email
        // `);

        // res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching exams:", error);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}
