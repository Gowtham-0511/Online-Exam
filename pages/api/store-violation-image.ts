import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const db = await getDBConnection();
        const { image, email, examId, reason, time } = req.body;

        console.log("Incoming request body:", req.body);

        await db
            .request()
            .input("email", sql.VarChar, email)
            .input("examId", sql.VarChar, examId)
            .input("reason", sql.VarChar, reason)
            .input("timestamp", sql.DateTime, time)
            .input("imageBase64", sql.VarChar(sql.MAX), image)
            .query(`
                INSERT INTO violation_images (email, examId, reason, timestamp, imageBase64)
                VALUES (@email, @examId, @reason, @timestamp, @imageBase64)
            `);

        console.log("✅ Violation image inserted for:", email, "Exam ID:", examId);

        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("❌ Error storing image:");
        console.error("Message:", error.message || error);
        console.error("Stack:", error.stack || "No stack trace available");
        if (error.originalError) {
            console.error("SQL Error Details:", error.originalError.info || error.originalError);
        }

        res.status(500).json({ error: "Failed to store violation image" });
    }
}
