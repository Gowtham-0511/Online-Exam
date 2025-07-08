import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {
        const db = await getDBConnection();

        const result = await db.query(`
        SELECT * FROM Exams ORDER BY createdAt DESC
        `);

        const exams = result.recordset.map((e) => ({
            ...e,
            questions: safeJSON(e.questions),
            questionConfig: safeJSON(e.questionConfig),
            allowedUsers: safeJSON(e.allowedUsers),
        }));

        res.status(200).json(exams);
    } catch (err) {
        console.error("Error fetching exams:", err);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}

function safeJSON(value: any) {
    try {
        return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
        return Array.isArray(value) ? [] : {};
    }
}
