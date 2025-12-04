import { NextApiRequest, NextApiResponse } from "next";
import { generateQuestionsForExam } from "@/lib/azureOpenAI";
import {
  CodingQuestion,
  generateDaxPrompt,
  generateDbtPrompt,
  generateJavaCodingPrompt,
  generateJavascriptCodingPrompt,
  generateMCQPrompt,
  generateMixedPrompt,
  generatePySparkPrompt,
  generatePythonCodingPrompt,
  generateSQLCodingPrompt,
  Question,
  validateCodingQuestion,
  validateMCQQuestion,
} from "@/lib/ai/question-generation";
import { fetchDatabaseSchema } from "@/lib/db/schema";
import { AzureOpenAI } from "openai";

const endpoint = process.env.AZURE_OAI_ENDPOINT
  ? process.env.AZURE_OAI_ENDPOINT.replace(/^['"]|['"]$/g, "")
  : "";
const apiKey = process.env.AZURE_OAI_API_KEY || "";
const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
const apiVersion = process.env.AZURE_OAI_API_VER || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!endpoint || !apiKey || !deploymentName || !apiVersion) {
    return res
      .status(500)
      .json({ error: "Missing required environment variables" });
  }

  const { topic, difficulty, questionCount, questionType = "mcq" } = req.body;

  if (!topic || !difficulty || !questionCount) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  console.log(
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
          ? "dbt"
          : "python";

      console.log(language);

      if (language === "sql") {
        const schema = await fetchDatabaseSchema();
        console.log(schema);
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
          : "python";
      prompt = generateMixedPrompt(topic, difficulty, questionCount, language);
      systemMessage =
        "You are an expert educator creating mixed practice questions. Return valid JSON with both MCQ and coding questions.";
    } else {
      return res.status(400).json({ message: "Invalid question type" });
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
      console.error("JSON Parse Error:", parseError);
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
          console.log(`Found questions in key: ${key}`);
          questions = parsedData[key];
          break;
        }
      }
    }

    console.log(`=== Found ${questions.length} questions ===`);
    console.log(
      `Question types in response:`,
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
            console.warn(`Question ${index} has ambiguous type, skipping`);
          }
        }
      } catch (error) {
        console.error(`Error validating question ${index}:`, error);
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
          `${q.type}${
            q.type === "coding" ? `-${(q as CodingQuestion).language}` : ""
          }`
      )
    );

    return res.status(200).json({ questions: validatedQuestions });
  } catch (error: any) {
    console.error("Exam generation error:", error);
    return res.status(500).json({
      error: "Failed to generate exam",
      details: error.message,
    });
  }
}
