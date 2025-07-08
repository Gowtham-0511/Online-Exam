import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = await getDBConnection();
    const { id } = req.query;

    if (typeof id !== "string") return res.status(400).json({ error: "Invalid question ID" });

    if (req.method === "GET") {
        const result = await db.request().input("id", id).query(`
      SELECT * FROM QuestionTestCases WHERE questionId = @id
    `);
        return res.status(200).json(result.recordset);
    }

    if (req.method === "POST") {
        const { inputText, expectedOutput } = req.body;

        await db.request()
            .input("questionId", id)
            .input("inputText", inputText)
            .input("expectedOutput", expectedOutput)
            .query(`
        INSERT INTO QuestionTestCases (questionId, inputText, expectedOutput)
        VALUES (@questionId, @inputText, @expectedOutput)
      `);

        return res.status(201).json({ success: true });
    }

    if (req.method === "PUT") {
        const { caseId, inputText, expectedOutput } = req.body;

        await db.request()
            .input("caseId", caseId)
            .input("inputText", inputText)
            .input("expectedOutput", expectedOutput)
            .query(`
            UPDATE QuestionTestCases 
            SET inputText = @inputText, expectedOutput = @expectedOutput
            WHERE id = @caseId
            `);

        return res.status(200).json({ success: true });
    }


    if (req.method === "DELETE") {
        const { caseId } = req.body;
        await db.request().input("caseId", caseId).query(`
      DELETE FROM QuestionTestCases WHERE id = @caseId
    `);
        return res.status(200).json({ success: true });
    }

    res.status(405).end();
}
