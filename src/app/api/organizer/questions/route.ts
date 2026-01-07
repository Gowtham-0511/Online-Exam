import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/db";
import { generateQuestionTags } from "@/lib/ai/azureOpenAI";
import logger from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || "";
    const language = searchParams.get("language");
    const difficulty = searchParams.get("difficulty");
    const jobId = searchParams.get("jobId");
    const skillId = searchParams.get("skillId");
    const questionType = searchParams.get("questionType");
    const tags = searchParams.get("tags");

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
    if (tags) {
      const tagArray = tags.split(",");
      query += ` AND q.tags && $${idx++}`;
      params.push(tagArray);
    }

    query += ` ORDER BY q."createdAt" DESC`;

    // console.log(query);

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
          tags: row.tags || [],
          testCases: row.testCases || [],
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

    // console.log(Object.values(grouped));

    return NextResponse.json(Object.values(grouped), { status: 200 });
  } catch (error) {
    logger.error("DB Error fetching organizer questions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      testCases,
    } = body;

    // Generate tags using AI
    let tags: string[] = [];
    try {
      tags = await generateQuestionTags(questionText, questionType, language);
    } catch (error) {
      logger.warn("Failed to generate tags for question:", error);
      tags = ["general"];
    }

    const insertQuestionQuery = `
        INSERT INTO "Questions" (
          "questionText", "expectedOutput", difficulty, marks, language,
          "jobId", "skillId", "imageUrl", "imageAltText", "createdBy", "questionType", tags, "testCases"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        RETURNING id, tags;
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
      tags,
      JSON.stringify(testCases || []),
    ]);

    const questionId = questionResult.rows[0].id;
    const generatedTags = questionResult.rows[0].tags;

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

    return NextResponse.json(
      { success: true, id: questionId, tags: generatedTags },
      { status: 201 }
    );
  } catch (error) {
    logger.error("DB Error creating question:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  let id = null;
  try {
    const body = await request.json();
    id = body.id;
    const {
      questionText,
      expectedOutput,
      difficulty,
      marks,
      language,
      jobId,
      skillId,
      questionType,
      options,
      testCases,
    } = body;

    let tags: string[] = [];
    try {
      tags = await generateQuestionTags(questionText, questionType, language);
    } catch (error) {
      logger.warn("Failed to generate tags for question %s:", id, error);
      tags = ["general"];
    }

    const updateQuery = `
        UPDATE "Questions" SET
          "questionText" = $1,
          "expectedOutput" = $2,
          difficulty = $3,
          marks = $4,
          language = $5,
          "jobId" = $6,
          "skillId" = $7,
          "questionType" = $8,
          tags = $9,
          "testCases" = $10
        WHERE id = $11
        RETURNING tags
      `;

    const result = await pool.query(updateQuery, [
      questionText,
      expectedOutput || null,
      difficulty,
      marks,
      language || null,
      jobId,
      skillId,
      questionType,
      tags,
      JSON.stringify(testCases || []),
      id,
    ]);

    const generatedTags = result.rows[0].tags;

    if (questionType === "mcq") {
      await pool.query(
        `DELETE FROM "QuestionOptions" WHERE "questionId" = $1`,
        [id]
      );

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

    return NextResponse.json(
      { success: true, tags: generatedTags },
      { status: 200 }
    );
  } catch (error) {
    logger.error("DB Error updating question %s:", id, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  let id = null;
  try {
    const body = await request.json();
    id = body.id;

    await pool.query(`DELETE FROM "Questions" WHERE id = $1`, [id]);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("DB Error deleting question %s:", id, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
