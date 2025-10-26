import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId, limit = 50, userEmail } = req.query;

    console.log(examId)

    try {
        const actionsQuery = `
            SELECT 
                ua.id,
                ua."userEmail",
                ua."questionIndex",
                ua."actionType",
                ua."timestamp",
                ua."timeSpent",
                ua."codeRunCount",
                ua."metadata",
                s."userName"
            FROM "UserExamActions" ua
            LEFT JOIN submissions s ON s."email" = ua."userEmail" AND s."examId" = ua."examId"
            WHERE 1=1
            ${examId ? 'AND ua."examId" = $1' : ''}
            ${userEmail ? `AND ua."userEmail" = $${examId ? '2' : '1'}` : ''}
            ORDER BY ua."timestamp" DESC
            LIMIT $${examId && userEmail ? '3' : examId || userEmail ? '2' : '1'};
        `;

        const params = [];
        if (examId) params.push(examId);
        if (userEmail) params.push(userEmail);
        params.push(limit);

        console.log(examId, userEmail)

        // console.log(actionsQuery, params)

        const actions = await pool.query(actionsQuery, params);

        return res.status(200).json(actions.rows);
    } catch (error) {
        console.error("Recent actions error:", error);
        return res.status(500).json({ error: "Failed to fetch recent actions" });
    }
}