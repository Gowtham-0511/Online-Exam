import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { keyword = "", language, difficulty, jobId, skillId, questionType } = req.query;

      let query = `
        SELECT q.*, 
          o.id AS "optionId", 
          o."optionText", 
          o."isCorrect" 
        FROM "Questions" q
        LEFT JOIN "QuestionOptions" o ON q.id = o."questionId"
        WHERE 1=1
      `;

      const params: any[] = [];
      let idx = 1;

      if (keyword) {
        query += ` AND q."questionText" ILIKE $${idx++}`;
        params.push(`%${keyword}%`);
      }
      if (language) {
        query += ` AND q.language = $${idx++}`;
        params.push(language);
      }
      if (difficulty) {
        query += ` AND q.difficulty = $${idx++}`;
        params.push(difficulty);
      }
      if (jobId) {
        query += ` AND q."jobId" = $${idx++}`;
        params.push(Number(jobId));
      }
      if (skillId) {
        query += ` AND q."skillId" = $${idx++}`;
        params.push(Number(skillId));
      }
      if (questionType) {
        query += ` AND q."questionType" = $${idx++}`;
        params.push(questionType);
      }

      query += ` ORDER BY q."createdAt" DESC`;

      const result = await pool.query(query, params);

      const grouped = result.rows.reduce((acc: any, row: any) => {
        if (!acc[row.id]) {
          acc[row.id] = {
            id: row.id,
            questionText: row.questionText,
            expectedOutput: row.expectedOutput,
            difficulty: row.difficulty,
            marks: row.marks,
            language: row.language,
            questionType: row.questionType,
            jobId: row.jobId,
            skillId: row.skillId,
            solution: row.solution,
            createdAt: row.createdAt,
            options: [],
          };
        }
        if (row.optionId) {
          acc[row.id].options.push({
            id: row.optionId,
            text: row.optionText,
            isCorrect: row.isCorrect,
          });
        }
        return acc;
      }, {});

      console.log("Grouped result:", grouped);

      return res.status(200).json(Object.values(grouped));
    }

    // 🟢 POST - Add Question
    if (req.method === "POST") {
      const {
        questionText,
        expectedOutput,
        difficulty,
        marks,
        language,
        jobId,
        skillId,
        imageUrl,
        imageAltText,
        createdBy,
        questionType,
        options,
      } = req.body;

      // Insert question and return id
      const insertQuestionQuery = `
        INSERT INTO "Questions" (
          "questionText", "expectedOutput", difficulty, marks, language,
          "jobId", "skillId", "imageUrl", "imageAltText", "createdBy", "questionType"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        RETURNING id;
      `;

      const questionResult = await pool.query(insertQuestionQuery, [
        questionText,
        expectedOutput || null,
        difficulty,
        marks,
        language || null,
        jobId,
        skillId,
        imageUrl || null,
        imageAltText || null,
        createdBy,
        questionType,
      ]);

      const questionId = questionResult.rows[0].id;

      // Insert MCQ options (if applicable)
      if (questionType === "mcq" && options?.length) {
        const insertOptionQuery = `
          INSERT INTO "QuestionOptions" ("questionId", "optionText", "isCorrect")
          VALUES ($1, $2, $3)
        `;

        for (const opt of options) {
          await pool.query(insertOptionQuery, [
            questionId,
            opt.text,
            opt.isCorrect ? true : false,
          ]);
        }
      }

      return res.status(201).json({ success: true, id: questionId });
    }

    // 🟡 PUT - Update Question
    if (req.method === "PUT") {
      const {
        id,
        questionText,
        expectedOutput,
        difficulty,
        marks,
        language,
        jobId,
        skillId,
        questionType,
        options,
      } = req.body;

      const updateQuery = `
        UPDATE "Questions" SET
          "questionText" = $1,
          "expectedOutput" = $2,
          difficulty = $3,
          marks = $4,
          language = $5,
          "jobId" = $6,
          "skillId" = $7,
          "questionType" = $8
        WHERE id = $9
      `;

      await pool.query(updateQuery, [
        questionText,
        expectedOutput || null,
        difficulty,
        marks,
        language || null,
        jobId,
        skillId,
        questionType,
        id,
      ]);

      // Replace options if MCQ
      if (questionType === "mcq") {
        await pool.query(`DELETE FROM "QuestionOptions" WHERE "questionId" = $1`, [id]);

        const insertOptionQuery = `
          INSERT INTO "QuestionOptions" ("questionId", "optionText", "isCorrect")
          VALUES ($1, $2, $3)
        `;

        for (const opt of options) {
          await pool.query(insertOptionQuery, [
            id,
            opt.text,
            opt.isCorrect ? true : false,
          ]);
        }
      }

      return res.status(200).json({ success: true });
    }

    // 🔴 DELETE - Remove Question
    if (req.method === "DELETE") {
      const { id } = req.body;

      await pool.query(`DELETE FROM "Questions" WHERE id = $1`, [id]);
      return res.status(200).json({ success: true });
    }

    // If method not supported
    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    res.status(405).end();
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
