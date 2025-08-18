import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Missing email" });
    }

    try {

        const db = await getDBConnection();

        const result = await db
            .request()
            .input("email", email)
            .query(`
                SELECT * FROM assessment
                WHERE createdBy = @email
                ORDER BY createdAt DESC
            `);

        console.log("Fetched exams for user:", email, result.recordset);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching user exams:", err);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}
