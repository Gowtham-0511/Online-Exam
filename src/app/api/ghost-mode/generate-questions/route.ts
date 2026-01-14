import { NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { fetchDatabaseSchema } from "@/lib/db/schema";
import {
  generateMCQPrompt,
  generateSQLCodingPrompt,
  generateJavascriptCodingPrompt,
  generateJavaCodingPrompt,
  generatePySparkPrompt,
  generateDaxPrompt,
  generateDbtPrompt,
  generateMixedPrompt,
  generatePythonCodingPrompt,
  validateMCQQuestion,
  validateCodingQuestion,
  Question,
  MCQQuestion,
  CodingQuestion,
  generateSnowflakePrompt,
} from "@/lib/ai/question-generation";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  const endpoint = process.env.AZURE_OAI_ENDPOINT
    ? process.env.AZURE_OAI_ENDPOINT.replace(/^['"]|['"]$/g, "")
    : "";
  const apiKey = process.env.AZURE_OAI_API_KEY || "";
  const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
  const apiVersion = process.env.AZURE_OAI_API_VER || "";
  if (!endpoint || !apiKey || !deploymentName || !apiVersion) {
    logger.error("Azure OpenAI configuration missing");
    return NextResponse.json(
      {
        message: "Server configuration error: Azure OpenAI credentials missing",
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { topic, difficulty, questionCount, questionType = "mcq", duration } = body;

  if (!topic || !difficulty || !questionCount) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  logger.info(
    `Generating ${questionCount} questions of type: ${questionType} for topic: ${topic} (Duration: ${duration ? duration + "m" : "N/A"})`
  );

  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  // Pre-fetch schema for SQL if needed query
  let sqlSchema = "";
  if (questionType === "coding" && topic.toLowerCase() === "sql") {
    sqlSchema = await fetchDatabaseSchema();
  }

  // Determine batching strategy
  // efficient batch sizes: Coding=4 (safe for tokens), MCQ=10
  const BATCH_SIZE = questionType === "coding" ? 4 : 10;
  const batches: number[] = [];
  let remaining = questionCount;
  while (remaining > 0) {
    const size = Math.min(remaining, BATCH_SIZE);
    batches.push(size);
    remaining -= size;
  }

  logger.info(`Splitting request into ${batches.length} batches: [${batches.join(", ")}]`);

  try {
    const batchPromises = batches.map(async (batchSize, batchIndex) => {
      let prompt = "";
      let systemMessage = "";

      if (questionType === "mcq") {
        prompt = generateMCQPrompt(topic, difficulty, batchSize, duration, questionCount);
        systemMessage =
          "You are an expert educator creating multiple-choice questions. Always return valid JSON with a 'questions' array. Each question must have type 'mcq'.";
      } else if (questionType === "coding") {
        const topicLower = topic.toLowerCase();
        const language =
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
                      ? "dbt" : topicLower === "snowflake"
                        ? "snowflake"
                        : "python";

        if (language === "sql") {
          prompt = generateSQLCodingPrompt(
            topic,
            difficulty,
            batchSize,
            sqlSchema,
            duration,
            questionCount
          );
          systemMessage =
            "You are an expert database instructor creating SQL problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'sql'. NO multiple choice questions. Use the provided database schema to create realistic problems.";
        } else if (language === "javascript") {
          prompt = generateJavascriptCodingPrompt(
            topic,
            difficulty,
            batchSize,
            duration,
            questionCount
          );
          systemMessage =
            "You are an expert programming instructor creating Javascript coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'Javascript'. NO multiple choice questions.";
        } else if (language === "java") {
          prompt = generateJavaCodingPrompt(topic, difficulty, batchSize, duration, questionCount);
          systemMessage =
            "You are an expert programming instructor creating Java coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'java'. NO multiple choice questions.";
        } else if (language === "pyspark") {
          systemMessage =
            "You are an expert Databricks/PySpark instructor creating PySpark coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'pyspark'. NO multiple choice questions. Focus on DataFrame operations, transformations, aggregations, joins, and Spark SQL.";
          prompt = generatePySparkPrompt(topic, difficulty, batchSize, duration, questionCount);
        } else if (language === "dax") {
          systemMessage =
            "You are an expert Power BI/DAX instructor creating DAX expression problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'dax'. NO multiple choice questions. Focus on measures, calculated columns, and filter context.";
          prompt = generateDaxPrompt(topic, difficulty, batchSize, duration, questionCount);
        } else if (language === "dbt") {
          systemMessage =
            "You are an expert Analytics Engineer and DBT instructor creating DBT coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'dbt'. NO multiple choice questions. Focus on SQL models, Jinja templating, macros, and tests.";
          prompt = generateDbtPrompt(topic, difficulty, batchSize, duration, questionCount);
        } else if (language === "snowflake") {
          systemMessage =
            "You are an expert Analytics Engineer and Snowflake instructor creating Snowflake coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'snowflake'. NO multiple choice questions. Focus on SQL models, Jinja templating, macros, and tests.";
          prompt = generateSnowflakePrompt(topic, difficulty, batchSize, duration, questionCount);
        } else {
          prompt = generatePythonCodingPrompt(topic, difficulty, batchSize, duration, questionCount);
          systemMessage =
            "You are an expert programming instructor creating Python coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'python'. NO multiple choice questions.";
        }
      } else if (questionType === "mixed") {
        const topicLower = topic.toLowerCase();
        const language =
          topicLower === "sql"
            ? "sql"
            : topicLower === "javascript"
              ? "javascript"
              : topicLower === "java"
                ? "java"
                : topicLower === "pyspark"
                  ? "pyspark"
                  : topicLower === "dbt"
                    ? "dbt"
                    : topicLower === "snowflake"
                      ? "snowflake"
                      : "python";
        // Note: mixed prompt currently doesn't support duration/total context in its params, but we can update it if needed. 
        // For now, mixed prompt is assumed to be less strictly timed.
        prompt = generateMixedPrompt(topic, difficulty, batchSize, language);
        systemMessage =
          "You are an expert educator creating mixed practice questions. Return valid JSON with both MCQ and coding questions.";
      } else {
        throw new Error("Invalid question type");
      }

      const client = new AzureOpenAI({
        endpoint,
        apiKey,
        apiVersion,
      });

      const params: any = {
        model: deploymentName,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      };

      if (!isDeterministicModel) {
        params.temperature = 0.7;
        params.top_p = 0.9;
      }

      logger.info(`Batch ${batchIndex + 1}/${batches.length}: Requesting ${batchSize} questions...`);

      const result = await client.chat.completions.create(params);
      let content = result.choices[0]?.message?.content?.trim() || "{}";

      // logger.debug(`Batch ${batchIndex + 1} raw response: ${content.substring(0, 200)}...`);

      content = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      let parsedData: any;
      try {
        parsedData = JSON.parse(content);
      } catch (parseError) {
        logger.error(`Batch ${batchIndex + 1} JSON Parse Error`, parseError);
        return []; // Return empty for this batch on error, or throw to fail all
      }

      let questions: any[] = [];
      if (Array.isArray(parsedData)) {
        questions = parsedData;
      } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
        questions = parsedData.questions;
      } else {
        const keys = Object.keys(parsedData);
        for (const key of keys) {
          if (Array.isArray(parsedData[key]) && parsedData[key].length > 0) {
            questions = parsedData[key];
            break;
          }
        }
      }

      // Validate questions in this batch
      const validBatchQuestions: Question[] = [];
      questions.forEach((q: any, qIndex: number) => {
        try {
          if (q.type === "coding") {
            validBatchQuestions.push(validateCodingQuestion(q, qIndex));
          } else if (q.type === "mcq") {
            validBatchQuestions.push(validateMCQQuestion(q, qIndex));
          } else {
            if (q.language && (q.starterCode || q.testCases)) {
              const codingQ = { ...q, type: "coding" };
              validBatchQuestions.push(validateCodingQuestion(codingQ, qIndex));
            } else if (q.options && Array.isArray(q.options)) {
              const mcqQ = { ...q, type: "mcq" };
              validBatchQuestions.push(validateMCQQuestion(mcqQ, qIndex));
            }
          }
        } catch (e) {
          logger.warn(`Skipping invalid question in batch ${batchIndex + 1}: ${e}`);
        }
      });

      logger.info(`Batch ${batchIndex + 1} complete: Got ${validBatchQuestions.length} valid questions.`);
      return validBatchQuestions;
    });

    // Wait for all batches
    const results = await Promise.all(batchPromises);
    const allQuestions = results.flat();

    logger.info(`=== Total Valid Questions Generated: ${allQuestions.length} ===`);

    if (allQuestions.length === 0) {
      throw new Error("No valid questions generated from any batch.");
    }

    return NextResponse.json({ questions: allQuestions });

  } catch (error: any) {
    logger.error("Error generating questions:", error);
    return NextResponse.json(
      {
        message: "Failed to generate questions",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
