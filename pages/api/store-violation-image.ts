import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { image, email, examId, reason, time } = req.body;

        if (!image || !email || !examId || !reason || !time) {
            return res.status(400).json({
                error: "Missing required fields: image, email, examId, reason, time",
            });
        }

        console.log("Incoming request body:", req.body);

        const query = `
            INSERT INTO "violation_images" 
                ("email", "examId", "reason", "timestamp", "imageBase64")
            VALUES ($1, $2, $3, $4, $5)
        `;

        const values = [
            email,
            examId,
            reason,
            new Date(time),
            image, // Base64 string (Postgres TEXT column can handle large data)
        ];

        await pool.query(query, values);

        console.log("✅ Violation image inserted for:", email, "Exam ID:", examId);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("❌ Error storing image:", error);
        return res.status(500).json({
            error: "Failed to store violation image",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
