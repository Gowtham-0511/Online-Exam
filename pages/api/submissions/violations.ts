import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId, email } = req.query;

    if (!examId || !email || typeof examId !== "string" || typeof email !== "string") {
        return res.status(400).json({ error: "examId and email are required" });
    }

    try {
        const query = `
            select "imageBase64" , reason , "timestamp"  
            from violation_images vi
            WHERE "examId" = '${examId}' AND email = '${email}'
        `;

        console.log("Executing query:", query);

        const result = await pool.query(query);

        return res.status(200).json(result.rows || []);
    } catch (err) {
        console.error("Error fetching violation images:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}