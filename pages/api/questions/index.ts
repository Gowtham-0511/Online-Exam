import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = await getDBConnection();

    if (req.method === "GET") {
        const { keyword = "", language, difficulty, jobId, skillId } = req.query;

        let query = `SELECT * FROM Questions WHERE 1=1`;
        const inputs: { name: string; value: any }[] = [];

        if (keyword) {
            query += ` AND questionText LIKE @keyword`;
            inputs.push({ name: "keyword", value: `%${keyword}%` });
        }
        if (language) {
            query += ` AND language = @language`;
            inputs.push({ name: "language", value: language });
        }
        if (difficulty) {
            query += ` AND difficulty = @difficulty`;
            inputs.push({ name: "difficulty", value: difficulty });
        }
        if (jobId) {
            query += ` AND jobId = @jobId`;
            inputs.push({ name: "jobId", value: Number(jobId) });
        }
        if (skillId) {
            query += ` AND skillId = @skillId`;
            inputs.push({ name: "skillId", value: Number(skillId) });
        }

        query += ` ORDER BY createdAt DESC`;

        const request = db.request();
        inputs.forEach(({ name, value }) => request.input(name, value));

        const result = await request.query(query);
        return res.status(200).json(result.recordset);
    }

    if (req.method === "POST") {
        const { questionText, expectedOutput, difficulty, marks, language, jobId, skillId, imageUrl, imageAltText, createdBy } = req.body;

        await db.request()
            .input("questionText", questionText)
            .input("expectedOutput", expectedOutput)
            .input("difficulty", difficulty)
            .input("marks", marks)
            .input("language", language)
            .input("jobId", jobId)
            .input("skillId", skillId)
            .input("imageUrl", imageUrl)
            .input("imageAltText", imageAltText)
            .input("createdBy", createdBy)
            .query(`
        INSERT INTO Questions (
          questionText, expectedOutput, difficulty, marks, language, jobId, skillId, imageUrl, imageAltText, createdBy
        ) VALUES (
          @questionText, @expectedOutput, @difficulty, @marks, @language, @jobId, @skillId, @imageUrl, @imageAltText, @createdBy
        )
      `);

        return res.status(201).json({ success: true });
    }

    if (req.method === "PUT") {
        const { id, questionText, expectedOutput, difficulty, marks, language, jobId, skillId } = req.body;

        await db.request()
            .input("id", id)
            .input("questionText", questionText)
            .input("expectedOutput", expectedOutput)
            .input("difficulty", difficulty)
            .input("marks", marks)
            .input("language", language)
            .input("jobId", jobId)
            .input("skillId", skillId)
            .query(`
      UPDATE Questions SET
        questionText = @questionText,
        expectedOutput = @expectedOutput,
        difficulty = @difficulty,
        marks = @marks,
        language = @language,
        jobId = @jobId,
        skillId = @skillId
      WHERE id = @id
    `);

        return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
        const { id } = req.body;

        await db.request().input("id", id).query("DELETE FROM Questions WHERE id = @id");
        return res.status(200).json({ success: true });
    }


    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    res.status(405).end();
}

// ⬇ ADD THIS AT THE VERY END OR VERY TOP (OUTSIDE FUNCTION)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // adjust as needed
    },
  },
};
