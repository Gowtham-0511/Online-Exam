import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDBConnection();

  if (req.method === "GET") {
    const { keyword = "", language, difficulty, jobId, skillId, questionType } = req.query;

    let query = `
            SELECT q.*, 
                   o.id AS optionId, 
                   o.optionText, 
                   o.isCorrect
            FROM Questions q
            LEFT JOIN QuestionOptions o ON q.id = o.questionId
            WHERE 1=1
        `;
    const inputs: { name: string; value: any }[] = [];

    if (keyword) {
      query += ` AND q.questionText LIKE @keyword`;
      inputs.push({ name: "keyword", value: `%${keyword}%` });
    }
    if (language) {
      query += ` AND q.language = @language`;
      inputs.push({ name: "language", value: language });
    }
    if (difficulty) {
      query += ` AND q.difficulty = @difficulty`;
      inputs.push({ name: "difficulty", value: difficulty });
    }
    if (jobId) {
      query += ` AND q.jobId = @jobId`;
      inputs.push({ name: "jobId", value: Number(jobId) });
    }
    if (skillId) {
      query += ` AND q.skillId = @skillId`;
      inputs.push({ name: "skillId", value: Number(skillId) });
    }
    if (questionType) {
      query += ` AND q.questionType = @questionType`;
      inputs.push({ name: "questionType", value: questionType });
    }

    query += ` ORDER BY q.createdAt DESC`;

    const request = db.request();
    inputs.forEach(({ name, value }) => request.input(name, value));

    const result = await request.query(query);

    // Group options by questionId
    const grouped = result.recordset.reduce((acc: any, row: any) => {
      if (!acc[row.id]) {
        acc[row.id] = {
          ...row,
          options: []
        };
      }
      if (row.optionId) {
        acc[row.id].options.push({
          id: row.optionId,
          text: row.optionText,
          isCorrect: row.isCorrect
        });
      }
      return acc;
    }, {});

    return res.status(200).json(Object.values(grouped));
  }

  if (req.method === "POST") {
    const { questionText, expectedOutput, difficulty, marks, language, jobId, skillId, imageUrl, imageAltText, createdBy, questionType, options } = req.body;

    // Insert into Questions and get new id
    const result = await db.request()
      .input("questionText", questionText)
      .input("expectedOutput", expectedOutput || null)
      .input("difficulty", difficulty)
      .input("marks", marks)
      .input("language", language || null)
      .input("jobId", jobId)
      .input("skillId", skillId)
      .input("imageUrl", imageUrl || null)
      .input("imageAltText", imageAltText || null)
      .input("createdBy", createdBy)
      .input("questionType", questionType)
      .query(`
                INSERT INTO Questions (
                    questionText, expectedOutput, difficulty, marks, language, jobId, skillId, imageUrl, imageAltText, createdBy, questionType
                ) 
                OUTPUT INSERTED.id
                VALUES (
                    @questionText, @expectedOutput, @difficulty, @marks, @language, @jobId, @skillId, @imageUrl, @imageAltText, @createdBy, @questionType
                )
            `);

    const questionId = result.recordset[0].id;

    // Insert MCQ options if applicable
    if (questionType === "mcq" && options?.length) {
      for (const opt of options) {
        await db.request()
          .input("questionId", questionId)
          .input("optionText", opt.text)
          .input("isCorrect", opt.isCorrect ? 1 : 0)
          .query(`
                        INSERT INTO QuestionOptions (questionId, optionText, isCorrect)
                        VALUES (@questionId, @optionText, @isCorrect)
                    `);
      }
    }

    return res.status(201).json({ success: true, id: questionId });
  }

  if (req.method === "PUT") {
    const { id, questionText, expectedOutput, difficulty, marks, language, jobId, skillId, questionType, options } = req.body;

    // Update Question
    await db.request()
      .input("id", id)
      .input("questionText", questionText)
      .input("expectedOutput", expectedOutput || null)
      .input("difficulty", difficulty)
      .input("marks", marks)
      .input("language", language || null)
      .input("jobId", jobId)
      .input("skillId", skillId)
      .input("questionType", questionType)
      .query(`
                UPDATE Questions SET
                    questionText = @questionText,
                    expectedOutput = @expectedOutput,
                    difficulty = @difficulty,
                    marks = @marks,
                    language = @language,
                    jobId = @jobId,
                    skillId = @skillId,
                    questionType = @questionType
                WHERE id = @id
            `);

    // If MCQ, replace options
    if (questionType === "mcq") {
      await db.request().input("id", id).query("DELETE FROM QuestionOptions WHERE questionId = @id");

      for (const opt of options) {
        await db.request()
          .input("questionId", id)
          .input("optionText", opt.text)
          .input("isCorrect", opt.isCorrect ? 1 : 0)
          .query(`
                        INSERT INTO QuestionOptions (questionId, optionText, isCorrect)
                        VALUES (@questionId, @optionText, @isCorrect)
                    `);
      }
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;

    // Delete Question + Options (cascade takes care of options)
    await db.request().input("id", id).query("DELETE FROM Questions WHERE id = @id");
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  res.status(405).end();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
