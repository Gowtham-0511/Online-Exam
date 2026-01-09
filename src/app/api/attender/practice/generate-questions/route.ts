import {
  generateDaxPrompt,
  generateDbtPrompt,
  generateJavaCodingPrompt,
  generateJavascriptCodingPrompt,
  generateMCQPrompt,
  generatePySparkPrompt,
  generatePythonCodingPrompt,
  generateSQLCodingPrompt,
} from "@/lib/ai/practice-question-generation";
import { fetchDatabaseSchema } from "@/lib/db/schema";
import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  const endpoint = process.env.AZURE_OAI_ENDPOINT
    ? process.env.AZURE_OAI_ENDPOINT.replace(/^['"]|['"]$/g, "")
    : "";
  const apiKey = process.env.AZURE_OAI_API_KEY || "";
  const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
  const apiVersion = process.env.AZURE_OAI_API_VER || "";

  try {
    const body = await request.json();

    const { email, topic, difficulty, count, questionType } = body;

    logger.info("Generating practice questions: %s, %s, %s, %s, %s", email, topic, difficulty, count, questionType);

    if (!email || !topic || !difficulty || !count || !questionType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Create Practice Set Container
    let practiceSetId: number | null = null;
    let dbClient = await pool.connect();

    try {
      const setInsertRes = await dbClient.query(`
        INSERT INTO "PracticeSets" (
            "userEmail", title, topic, difficulty, "questionType", "totalQuestions", status, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'not_started', NOW(), NOW())
        RETURNING id
      `, [
        email,
        `${topic} ${questionType === 'mcq' ? 'MCQ' : 'Coding'} Session`, // Title
        topic,
        difficulty,
        questionType,
        count
      ]);
      practiceSetId = setInsertRes.rows[0].id;
    } catch (e) {
      logger.error("Failed to create practice set", e);
      return NextResponse.json({ error: "Failed to initialize practice session" }, { status: 500 });
    } finally {
      dbClient.release();
    }

    try {
      let prompt = "";
      let systemMessage = "";
      let language = "mcq";

      if (questionType === "mcq") {
        prompt = generateMCQPrompt(topic, difficulty, count);
        systemMessage =
          "You are an expert educator creating multiple-choice questions. Always return valid JSON with a 'questions' array. Each question must have type 'mcq'.";
      } else if (questionType === "coding") {
        const topicLower = topic.toLowerCase();
        language =
          topicLower === "sql"
            ? "sql"
            : topicLower === "javascript"
              ? "javascript"
              : topicLower === "java"
                ? "java"
                : topicLower === "pyspark"
                  ? "pyspark"
                  : topicLower === "powerbi"
                    ? "dax"
                    : topicLower === "dbt"
                      ? "dbt"
                      : "python";

        logger.info("Language: %s", language);

        if (language === "sql") {
          const schema = await fetchDatabaseSchema();
          // logger.debug("Schema: %o", schema);
          prompt = generateSQLCodingPrompt(topic, difficulty, count, schema);
          systemMessage =
            "You are an expert database instructor creating SQL problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'sql'. NO multiple choice questions. Use the provided database schema to create realistic problems.";
        } else if (language === "javascript") {
          prompt = generateJavascriptCodingPrompt(topic, difficulty, count);
          systemMessage =
            "You are an expert programming instructor creating Javascript coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'Javascript'. NO multiple choice questions.";
        } else if (language === "java") {
          prompt = generateJavaCodingPrompt(topic, difficulty, count);
          systemMessage =
            "You are an expert programming instructor creating Java coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'java'. NO multiple choice questions.";
        } else if (language === "pyspark") {
          systemMessage =
            "You are an expert Databricks/PySpark instructor creating PySpark coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'pyspark'. NO multiple choice questions. Focus on DataFrame operations, transformations, aggregations, joins, and Spark SQL.";
          prompt = generatePySparkPrompt(topic, difficulty, count);
        } else if (language === "dax") {
          systemMessage =
            "You are an expert Power BI/DAX instructor creating DAX expression problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'dax'. NO multiple choice questions. Focus on measures, calculated columns, and filter context.";
          prompt = generateDaxPrompt(topic, difficulty, count);
        } else if (language === "dbt") {
          systemMessage =
            "You are an expert Analytics Engineer and DBT instructor creating DBT coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'dbt'. NO multiple choice questions. Focus on SQL models, Jinja templating, macros, and tests.";
          prompt = generateDbtPrompt(topic, difficulty, count);
        } else {
          prompt = generatePythonCodingPrompt(topic, difficulty, count);
          systemMessage =
            "You are an expert programming instructor creating Python coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'python'. NO multiple choice questions.";
        }
      }

      const client = new AzureOpenAI({
        endpoint,
        apiKey,
        apiVersion,
      });

      logger.debug("Prompt generated");

      const params: any = {
        model: deploymentName,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      };

      const result = await client.chat.completions.create(params);
      let content = result.choices[0]?.message?.content?.trim() || "{}";

      content = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      let parsedData: any;
      try {
        parsedData = JSON.parse(content);
      } catch (parseError) {
        logger.error("JSON Parse Error: %s", parseError);
        throw new Error("Invalid JSON response from AI");
      }

      logger.debug("Parsed Data: %o", parsedData);

      // Insert questions into database
      const questions = parsedData.questions || [];
      const insertedQuestions = [];

      dbClient = await pool.connect();
      try { // Inner try for DB operations
        for (const q of questions) {
          try {
            let insertQuery = "";
            let values: any[] = [];

            if (q.type === "mcq") {
              // Insert MCQ question
              insertQuery = `
                INSERT INTO "PracticeQuestions" (
                  type,
                  "generatedFor",
                  "language",
                  difficulty,
                  topic,
                  "weakArea",
                  "questionTitle",
                  "questionDescription",
                  hints,
                  "solutionExplanation",
                  "basedOnExam",
                  "mcqOptions",
                  question,
                  "solutionCode",
                  "generatedAt",
                  "isActive",
                  "practiceSetId"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), true, $15)
                RETURNING id, "questionTitle", "questionDescription", "mcqOptions", difficulty, topic;
              `;

              const mcqOptions = {
                options: q.options || [],
                correctAnswer: q.correctAnswer || 0,
              };

              values = [
                q.type,
                email,
                q.language,
                difficulty,
                q.topic,
                q.weakArea,
                q.questionTitle || "Untitled Question",
                q.questionDescription || "",
                JSON.stringify(q.hints || []),
                q.explanation || q.solutionExplanation || "",
                q.basedOnExam,
                JSON.stringify(mcqOptions),
                q.question,
                q.solutionCode,
                practiceSetId
              ];
            } else if (q.type === "coding") {
              // Insert Coding question
              insertQuery = `
                INSERT INTO "PracticeQuestions" (
                  type,
                  "generatedFor",
                  "language",
                  difficulty,
                  "weakArea",
                  topic,
                  "questionTitle",
                  "questionDescription",
                  "starterCode",
                  "testCases",
                  "expectedOutput",
                  "solutionCode",
                  "solutionExplanation",
                  hints,
                  "basedOnExam",
                  "generatedAt",
                  "isActive",
                  "practiceSetId"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), true, $16)
                RETURNING id, "questionTitle", "questionDescription", "language", difficulty, topic;
              `;

              values = [
                q.type,
                email,
                q.language || language,
                q.difficulty,
                q.topic,
                q.weakArea,
                q.questionTitle || "Untitled Coding Problem",
                q.questionDescription || "",
                q.starterCode || "",
                JSON.stringify(q.testCases || []),
                q.description || "",
                q.solution || "",
                q.explanation || "",
                JSON.stringify(q.hints || []),
                q.basedOnExam,
                practiceSetId
              ];
            }

            if (insertQuery) {
              const result = await dbClient.query(insertQuery, values);
              insertedQuestions.push(result.rows[0]);
              logger.info(`Inserted ${q.type} question: %s`, result.rows[0].id);
            }
          } catch (insertError) {
            logger.error(`Error inserting question:`, insertError);
            // Continue with next question even if one fails
          }
        }
      } finally {
        dbClient.release();
      }

      await pool.query(
        `
          UPDATE "PracticeProgress"
          SET "totalPracticeQuestions" = "totalPracticeQuestions" + $1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE email = $2
        `,
        [questions.length, email]
      );

      return NextResponse.json(
        {
          message: `Successfully generated and saved ${insertedQuestions.length} questions`,
          questions: insertedQuestions,
          generatedData: parsedData,
          practiceSetId: practiceSetId
        },
        { status: 200 }
      );
    } catch (error) {
      logger.error("Error in POST:", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (error) {
    logger.error("Error in POST:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
