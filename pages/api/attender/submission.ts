import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const email = Array.isArray(req.query.email) ? req.query.email[0] : req.query.email;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const db = await getDBConnection();
        const result = await db
            .request()
            .input("email", email)
            .query(`SELECT * FROM SUBMISSIONS WHERE email = @email`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "No Submissions" });
        }

        // Return all submissions instead of just the first one
        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}