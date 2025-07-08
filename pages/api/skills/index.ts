import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = await getDBConnection();

    if (req.method === "GET") {
        const result = await db.query("SELECT * FROM Skills ORDER BY name");
        return res.status(200).json(result.recordset);
    }

    if (req.method === "POST") {
        const { name } = req.body;
        try {
            await db.request().input("name", name).query("INSERT INTO Skills (name) VALUES (@name)");
            return res.status(201).json({ success: true });
        } catch (error) {
            console.error("Insert failed", error);
            return res.status(500).json({ error: "Failed to create skill" });
        }
    }

    res.status(405).end();
}
