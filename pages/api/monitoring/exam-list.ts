import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const query = `
            SELECT DISTINCT
                a.id,
                a.title,
                a.language,
                a."assignmentType",
                a."createdAt",
                COUNT(DISTINCT s."email") FILTER (WHERE s."submittedAt" IS NULL) as "activeUsers",
                COUNT(DISTINCT s."email") as "totalParticipants"
            FROM "Assessment" a
            LEFT JOIN submissions s ON s."examId" = a.title
            GROUP BY a.id, a.title, a.language, a."assignmentType", a."createdAt"
            ORDER BY a."createdAt" DESC;
        `;

        const result = await pool.query(query);

        const exams = result.rows.map(exam => ({
            id: exam.id,
            title: exam.title,
            language: exam.language,
            assignmentType: exam.assignmentType,
            createdAt: exam.createdAt,
            activeUsers: parseInt(exam.activeUsers) || 0,
            totalParticipants: parseInt(exam.totalParticipants) || 0
        }));

        return res.status(200).json(exams);
    } catch (error) {
        console.error("Exam list error:", error);
        return res.status(500).json({ error: "Failed to fetch exam list" });
    }
}