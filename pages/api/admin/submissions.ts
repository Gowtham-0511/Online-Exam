import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    try {

        const query = `select id , email , "userName" , "examId" , "answersWithQuestionIds" , disqualified , "submittedAt" , ai_feedback  from submissions s order by "examId" , email`;

        console.log(query)

        const result = await pool.query(query);

        return res.status(200).json(result.rows);

    } catch (err) {
        console.error("Error fetching exams:", err);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
}