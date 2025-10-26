import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

// Add simple in-memory cache
const examCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { examId } = req.query;

    if (typeof examId !== "string") {
        return res.status(400).json({ error: "Invalid examId" });
    }

    // Check cache first
    const cached = examCache.get(examId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        // Set cache headers
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=180');
        return res.status(200).json(cached.data);
    }

    try {
        // Use connection pooling properly
        const client = await pool.connect();

        try {
            const query = `
                SELECT *
                FROM "Assessment"
                WHERE "title" = $1
            `;

            const result = await client.query(query, [examId]);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: "Exam not found" });
            }

            const exam = result.rows[0];

            // Parse JSON fields
            try {
                exam.questions = exam.questions ? JSON.parse(exam.questions) : [];
                exam.questionConfig = exam.questionConfig ? JSON.parse(exam.questionConfig) : {};
            } catch {
                return res.status(500).json({ error: "Invalid question format" });
            }

            // Cache the result
            examCache.set(examId, { data: exam, timestamp: Date.now() });

            // Set cache headers
            res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=180');

            return res.status(200).json(exam);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

// Cleanup old cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of examCache.entries()) {
        if (now - value.timestamp > CACHE_TTL * 2) {
            examCache.delete(key);
        }
    }
}, CACHE_TTL);