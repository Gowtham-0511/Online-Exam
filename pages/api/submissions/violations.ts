import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId, email } = req.query;

    if (!examId || !email) {
        return res.status(400).json({ error: "examId and email are required" });
    }

    try {
        const db = await getDBConnection();

        const result = await db.request()
            .input("examId", sql.NVarChar, examId)
            .input("email", sql.NVarChar, email)
            .query(`
                SELECT imageBase64, reason, timestamp
                FROM violation_images
                WHERE examId = @examId AND email = @email
            `);

        return res.status(200).json(result.recordset || []);
    } catch (err) {
        console.error("Error fetching violation images:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
