import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = await getDBConnection();

    if (req.method === "GET") {
        const result = await db.query(`SELECT * FROM JobPositions ORDER BY createdAt DESC`);
        return res.status(200).json(result.recordset);
    }

    if (req.method === "POST") {
        const { title, description } = req.body;
        await db
            .request()
            .input("title", title)
            .input("description", description)
            .query(`INSERT INTO JobPositions (title, description) VALUES (@title, @description)`);

        return res.status(201).json({ success: true });
    }

    if (req.method === "PUT") {
        const { id, title, description } = req.body;
        await db
            .request()
            .input("id", id)
            .input("title", title)
            .input("description", description)
            .query(`UPDATE JobPositions SET title = @title, description = @description WHERE id = @id`);
        return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
        const { id } = req.body;
        await db
            .request()
            .input("id", id)
            .query(`DELETE FROM JobPositions WHERE id = @id`);
        return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
