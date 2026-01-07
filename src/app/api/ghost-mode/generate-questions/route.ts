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

  const { topic, difficulty, questionCount, questionType = "mcq" } = body;

  // console.log(topic)

  if (!topic || !difficulty || !questionCount) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  logger.info(
    `Generating ${questionCount} questions of type: ${questionType} for topic: ${topic}`
  );

  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  try {
    let prompt = "";
    let systemMessage = "";

    if (questionType === "mcq") {
      prompt = generateMCQPrompt(topic, difficulty, questionCount);
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

      logger.info("Language determined: %s", language);

      if (language === "sql") {
        const schema = await fetchDatabaseSchema();
        // logger.debug("Schema: %o", schema);
        prompt = generateSQLCodingPrompt(
          topic,
          difficulty,
          questionCount,
          schema
        );
        systemMessage =
          "You are an expert database instructor creating SQL problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'sql'. NO multiple choice questions. Use the provided database schema to create realistic problems.";
      } else if (language === "javascript") {
        prompt = generateJavascriptCodingPrompt(
          topic,
          difficulty,
          questionCount
        );
        systemMessage =
          "You are an expert programming instructor creating Javascript coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'Javascript'. NO multiple choice questions.";
      } else if (language === "java") {
        prompt = generateJavaCodingPrompt(topic, difficulty, questionCount);
        systemMessage =
          "You are an expert programming instructor creating Java coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'java'. NO multiple choice questions.";
      } else if (language === "pyspark") {
        systemMessage =
          "You are an expert Databricks/PySpark instructor creating PySpark coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'pyspark'. NO multiple choice questions. Focus on DataFrame operations, transformations, aggregations, joins, and Spark SQL.";
        prompt = generatePySparkPrompt(topic, difficulty, questionCount);
      } else if (language === "dax") {
        systemMessage =
          "You are an expert Power BI/DAX instructor creating DAX expression problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'dax'. NO multiple choice questions. Focus on measures, calculated columns, and filter context.";
        prompt = generateDaxPrompt(topic, difficulty, questionCount);
      } else if (language === "dbt") {
        systemMessage =
          "You are an expert Analytics Engineer and DBT instructor creating DBT coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'dbt'. NO multiple choice questions. Focus on SQL models, Jinja templating, macros, and tests.";
        prompt = generateDbtPrompt(topic, difficulty, questionCount);
      } else if (language === "snowflake") {
        systemMessage =
          "You are an expert Analytics Engineer and Snowflake instructor creating Snowflake coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'snowflake'. NO multiple choice questions. Focus on SQL models, Jinja templating, macros, and tests.";
        prompt = generateSnowflakePrompt(topic, difficulty, questionCount);
      } else {
        prompt = generatePythonCodingPrompt(topic, difficulty, questionCount);
        systemMessage =
          "You are an expert programming instructor creating Python coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'python'. NO multiple choice questions.";
      }
    } else if (questionType === "mixed") {
      // Determine the language based on topic for mixed questions
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
      prompt = generateMixedPrompt(topic, difficulty, questionCount, language);
      systemMessage =
        "You are an expert educator creating mixed practice questions. Return valid JSON with both MCQ and coding questions.";
    } else {
      return NextResponse.json(
        { message: "Invalid question type" },
        { status: 400 }
      );
    }

    const client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
    });

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

    if (!isDeterministicModel) {
      params.temperature = 0.7;
      params.top_p = 0.9;
    }

    const result = await client.chat.completions.create(params);
    let content = result.choices[0]?.message?.content?.trim() || "{}";

    console.log("=== AI Raw Response (first 500 chars) ===");
    console.log(content.substring(0, 500));
    console.log("======================");

    // Clean markdown if present
    content = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    let parsedData: any;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      logger.error("JSON Parse Error:", parseError);
      throw new Error("Invalid JSON response from AI");
    }

    // Handle multiple possible response formats
    let questions: any[] = [];

    if (Array.isArray(parsedData)) {
      questions = parsedData;
    } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
      questions = parsedData.questions;
    } else {
      // Try to find any array in the response
      const keys = Object.keys(parsedData);
      for (const key of keys) {
        if (Array.isArray(parsedData[key]) && parsedData[key].length > 0) {
          logger.info(`Found questions in key: ${key}`);
          questions = parsedData[key];
          break;
        }
      }
    }

    logger.info(`=== Found ${questions.length} questions ===`);
    logger.info(
      `Question types in response: %o`,
      questions.map((q) => q.type)
    );

    // Validate the response
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No questions generated");
    }

    // Validate and normalize each question
    const validatedQuestions: Question[] = [];
    questions.forEach((q: any, index: number) => {
      try {
        // Check explicit type first
        if (q.type === "coding") {
          validatedQuestions.push(validateCodingQuestion(q, index));
        } else if (q.type === "mcq") {
          validatedQuestions.push(validateMCQQuestion(q, index));
        } else {
          // Infer type based on question structure
          if (q.language && (q.starterCode || q.testCases)) {
            // Has coding question fields
            const codingQ = { ...q, type: "coding" };
            validatedQuestions.push(validateCodingQuestion(codingQ, index));
          } else if (q.options && Array.isArray(q.options)) {
            // Has MCQ fields
            const mcqQ = { ...q, type: "mcq" };
            validatedQuestions.push(validateMCQQuestion(mcqQ, index));
          } else {
            logger.warn(`Question ${index} has ambiguous type, skipping`);
          }
        }
      } catch (error) {
        logger.error(`Error validating question ${index}:`, error);
      }
    });

    if (validatedQuestions.length === 0) {
      throw new Error("No valid questions after validation");
    }

    console.log(
      `=== Successfully validated ${validatedQuestions.length} questions ===`
    );
    console.log(
      `Final question types:`,
      validatedQuestions.map(
        (q) =>
          `${q.type}${q.type === "coding" ? `-${(q as CodingQuestion).language}` : ""
          }`
      )
    );

    return NextResponse.json({ questions: validatedQuestions });
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
