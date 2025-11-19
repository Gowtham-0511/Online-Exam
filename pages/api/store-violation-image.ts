import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            image,
            email,
            examId,
            reason,
            time,
            aiAnalysis,      // NEW: Gemini's full analysis
            aiConfidence,    // NEW: Confidence score
            severity         // NEW: Severity level
        } = req.body;

        if (!image || !email || !examId || !reason || !time) {
            return res.status(400).json({
                error: "Missing required fields: image, email, examId, reason, time",
            });
        }

        console.log("Incoming violation with AI analysis:", {
            email,
            examId,
            reason,
            hasAiAnalysis: !!aiAnalysis,
            severity
        });

        const query = `
            INSERT INTO "violation_images" 
                ("email", "examId", "reason", "timestamp", "imageBase64", "ai_analysis", "ai_confidence", "severity")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;

        const values = [
            email,
            examId,
            reason,
            new Date(time),
            image,
            aiAnalysis ? JSON.stringify(aiAnalysis) : null,
            aiConfidence || null,
            severity || 'medium'
        ];

        const result = await pool.query(query, values);

        console.log("✅ Violation image inserted with AI analysis. ID:", result.rows[0].id);

        return res.status(200).json({
            success: true,
            violationId: result.rows[0].id,
            aiAnalysis: aiAnalysis
        });
    } catch (error: any) {
        console.error("❌ Error storing violation image:", error);
        return res.status(500).json({
            error: "Failed to store violation image",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}