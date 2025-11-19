import type { NextApiRequest, NextApiResponse } from "next";
import { AzureOpenAI } from "openai";
import { Pool } from "pg";

const endpoint = process.env.AZURE_OAI_ENDPOINT!.replace(/^['"]|['"]$/g, "");
const apiKey = process.env.AZURE_OAI_API_KEY!;
const deploymentName = process.env.AZURE_OAI_DEPLOY!;
const apiVersion = process.env.AZURE_OAI_API_VER!;

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PRACTICEDATABASE,
    password: process.env.PGPASSWORD,
    port: 5432,

    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
});

interface MCQQuestion {
    type: "mcq";
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface CodingQuestion {
    type: "coding";
    language: "python" | "sql" | "javascript" | "java" | "pyspark" | "dax";
    question: string;
    description: string;
    starterCode: string;
    testCases: Array<{
        input: string;
        expectedOutput: string;
        isHidden: boolean;
    }>;
    solution: string;
    explanation: string;
}

type Question = MCQQuestion | CodingQuestion;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { topic, difficulty, questionCount, questionType = "mcq" } = req.body;

    // console.log(topic)

    if (!topic || !difficulty || !questionCount) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    console.log(`Generating ${questionCount} questions of type: ${questionType} for topic: ${topic}`);

    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    try {
        let prompt = "";
        let systemMessage = "";

        if (questionType === "mcq") {
            prompt = generateMCQPrompt(topic, difficulty, questionCount);
            systemMessage = "You are an expert educator creating multiple-choice questions. Always return valid JSON with a 'questions' array. Each question must have type 'mcq'.";
        } else if (questionType === "coding") {
            const topicLower = topic.toLowerCase();
            const language = topicLower === "sql" ? "sql"
                : topicLower === "javascript" ? "javascript"
                    : topicLower === "java" ? "java"
                        : topicLower === "pyspark" ? "pyspark"
                            : topicLower === "powerbi" ? "dax"
                                : "python";

            console.log(language)

            if (language === "sql") {
                const schema = await fetchDatabaseSchema();
                console.log(schema);
                prompt = generateSQLCodingPrompt(topic, difficulty, questionCount, schema);
                systemMessage = "You are an expert database instructor creating SQL problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'sql'. NO multiple choice questions. Use the provided database schema to create realistic problems.";
            } else if (language === 'javascript') {
                prompt = generateJavascriptCodingPrompt(topic, difficulty, questionCount);
                systemMessage = "You are an expert programming instructor creating Javascript coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'Javascript'. NO multiple choice questions.";
            } else if (language === 'java') {
                prompt = generateJavaCodingPrompt(topic, difficulty, questionCount);
                systemMessage = "You are an expert programming instructor creating Java coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'java'. NO multiple choice questions.";
            } else if (language === 'pyspark') {
                systemMessage = "You are an expert Databricks/PySpark instructor creating PySpark coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'pyspark'. NO multiple choice questions. Focus on DataFrame operations, transformations, aggregations, joins, and Spark SQL.";
                prompt = generatePySparkPrompt(topic, difficulty, questionCount);
            } else if (language === 'dax') {
                systemMessage = "You are an expert Power BI/DAX instructor creating DAX expression problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'dax'. NO multiple choice questions. Focus on measures, calculated columns, and filter context.";
                prompt = generateDaxPrompt(topic, difficulty, questionCount);
            }
            else {
                prompt = generatePythonCodingPrompt(topic, difficulty, questionCount);
                systemMessage = "You are an expert programming instructor creating Python coding problems. Always return valid JSON with a 'questions' array. Each question must have type 'coding' and language 'python'. NO multiple choice questions.";
            }
        } else if (questionType === "mixed") {
            // Determine the language based on topic for mixed questions
            const topicLower = topic.toLowerCase();
            const language = topicLower === "sql" ? "sql"
                : topicLower === "javascript" ? "javascript"
                    : topicLower === "java" ? "java"
                        : topicLower === "pyspark" ? "pyspark"
                            : "python";
            prompt = generateMixedPrompt(topic, difficulty, questionCount, language);
            systemMessage = "You are an expert educator creating mixed practice questions. Return valid JSON with both MCQ and coding questions.";
        } else {
            return res.status(400).json({ message: "Invalid question type" });
        }

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
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

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
        console.log(`Question types in response:`, questions.map(q => q.type));

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

        console.log(`=== Successfully validated ${validatedQuestions.length} questions ===`);
        console.log(`Final question types:`, validatedQuestions.map(q => `${q.type}${q.type === 'coding' ? `-${(q as CodingQuestion).language}` : ''}`));

        return res.status(200).json({ questions: validatedQuestions });
    } catch (error: any) {
        console.error("Error generating questions:", error);
        return res.status(500).json({
            message: "Failed to generate questions",
            error: error.message || "Unknown error",
        });
    }
}

// Generate MCQ prompt
function generateMCQPrompt(topic: string, difficulty: string, count: number): string {
    return `Generate ${count} multiple-choice questions about "${topic}" at ${difficulty} difficulty level.

CRITICAL: Generate ONLY multiple-choice questions, NOT coding problems!

Return a JSON object with a "questions" array. Each question MUST have type "mcq":
{
  "questions": [
    {
      "type": "mcq",
      "question": "What is the time complexity of binary search?",
      "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
      "correctAnswer": 1,
      "explanation": "Binary search divides the search space in half each time, resulting in O(log n) complexity."
    }
  ]
}

Requirements:
- EVERY question MUST have "type": "mcq"
- Exactly 4 options per question
- correctAnswer: index (0-3) of correct option
- Clear, unambiguous questions
- Difficulty: ${difficulty === "easy" ? "Basic concepts and definitions" : difficulty === "medium" ? "Intermediate application and analysis" : "Advanced problem-solving and complex scenarios"}
- Topic: ${topic}

Generate ${count} multiple-choice questions now.`;
}

// Generate Python coding prompt
function generatePythonCodingPrompt(topic: string, difficulty: string, count: number): string {
    return `Generate ${count} Python coding problems about "${topic}" at ${difficulty} difficulty level.

CRITICAL: Generate ONLY Python coding problems, NOT multiple choice questions!

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "python":
{
  "questions": [
    {
      "type": "coding",
      "language": "python",
      "question": "Calculate Factorial",
      "description": "<p>Write a function that calculates the factorial of a given number n.</p><p><strong>Example:</strong></p><pre>Input: 5\\nOutput: 120\\nExplanation: 5! = 5 × 4 × 3 × 2 × 1 = 120</pre>",
      "starterCode": "def solution(n):\\n    # Write your code here\\n    pass",
      "testCases": [
        {
          "input": "5",
          "expectedOutput": "120",
          "isHidden": false
        },
        {
          "input": "3",
          "expectedOutput": "6",
          "isHidden": false
        },
        {
          "input": "0",
          "expectedOutput": "1",
          "isHidden": true
        }
      ],
      "solution": "def solution(n):\\n    if n == 0:\\n        return 1\\n    result = 1\\n    for i in range(1, n + 1):\\n        result *= i\\n    return result",
      "explanation": "The function calculates factorial by iterating from 1 to n and multiplying each number. Base case: 0! = 1."
    }
  ]
}

REQUIREMENTS:
1. EVERY question MUST have "type": "coding" and "language": "python"
2. Include complete HTML-formatted problem description with examples
3. Provide starter code with function definition named "solution"
4. Include 3-5 test cases (at least 2 visible, 1-3 hidden)
5. Provide working solution code
6. Include explanation of the approach

TEST CASE FORMAT RULES:
- Single integer: "5" (not "[5]")
- Single string: "\\"hello\\"" (with escaped quotes)
- Single list: "[1,2,3]" (the actual list)
- Multiple args: "[5, 3]" (will be unpacked)

Difficulty: ${difficulty === "easy" ? "Basic loops and conditionals" : difficulty === "medium" ? "Array/string manipulation, recursion" : "Complex algorithms, dynamic programming"}
Topic: ${topic}

Generate ${count} Python CODING problems now. DO NOT generate MCQ questions.`;
}

// Fetch database schema
async function fetchDatabaseSchema(): Promise<string> {
    let client;
    try {
        console.log('Attempting to connect to database...');
        client = await pool.connect();
        console.log('Database connected successfully');

        const query = `
            SELECT 
                t.table_name,
                json_agg(
                    json_build_object(
                        'column_name', c.column_name,
                        'data_type', c.data_type,
                        'is_nullable', c.is_nullable
                    ) ORDER BY c.ordinal_position
                ) as columns,
                (
                    SELECT json_agg(
                        json_build_object(
                            'constraint_name', tc.constraint_name,
                            'constraint_type', tc.constraint_type,
                            'column_name', kcu.column_name,
                            'foreign_table', ccu.table_name,
                            'foreign_column', ccu.column_name
                        )
                    )
                    FROM information_schema.table_constraints tc
                    LEFT JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    LEFT JOIN information_schema.constraint_column_usage ccu
                        ON tc.constraint_name = ccu.constraint_name
                    WHERE tc.table_name = t.table_name
                        AND tc.table_schema = 'public'
                        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
                ) as constraints
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
            GROUP BY t.table_name
            ORDER BY t.table_name;
        `;

        const result = await client.query(query);
        console.log(`Fetched schema for ${result.rows.length} tables`);

        // Format schema as readable text
        let schemaText = "DATABASE SCHEMA:\n\n";
        result.rows.forEach(table => {
            schemaText += `Table: ${table.table_name}\n`;
            schemaText += `Columns:\n`;
            table.columns.forEach((col: any) => {
                schemaText += `  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})\n`;
            });
            if (table.constraints) {
                schemaText += `Constraints:\n`;
                table.constraints.forEach((constraint: any) => {
                    if (constraint.constraint_type === 'FOREIGN KEY') {
                        schemaText += `  - ${constraint.column_name} -> ${constraint.foreign_table}(${constraint.foreign_column})\n`;
                    } else {
                        schemaText += `  - ${constraint.constraint_type}: ${constraint.column_name}\n`;
                    }
                });
            }
            schemaText += `\n`;
        });

        return schemaText;
    } catch (error: any) {
        console.error('Error fetching database schema:', error.message);
        console.error('Error details:', {
            code: error.code,
            errno: error.errno,
            syscall: error.syscall
        });
        // Return empty string so question generation continues without schema
        return '';
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Generate SQL coding prompt
function generateSQLCodingPrompt(topic: string, difficulty: string, count: number, schema: string): string {
    return `Generate ${count} SQL query problems about "${topic}" at ${difficulty} difficulty level.
    ${schema}

USE THE ABOVE REAL DATABASE SCHEMA to generate realistic SQL problems. Reference actual tables and columns from the schema.

CRITICAL: Generate ONLY SQL coding problems, NOT multiple choice questions!

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "sql":
{
  "questions": [
    {
      "type": "coding",
      "language": "sql",
      "question": "Select All Active Users",
      "description": "<p>Write a SQL query to select all users where the status is 'active'.</p><p><strong>Table Schema:</strong></p><pre>users (id INT, name VARCHAR, status VARCHAR)</pre><p><strong>Example:</strong></p><pre>Input: users table with 3 users, 2 active\\nOutput: 2 rows with active users</pre>",
      "starterCode": "SELECT * FROM users",
      "testCases": [
        {
          "input": "DROP TABLE IF EXISTS users; CREATE TABLE users (id INT, name VARCHAR(50), status VARCHAR(20)); INSERT INTO users VALUES (1, 'Alice', 'active'), (2, 'Bob', 'inactive'), (3, 'Carol', 'active');",
          "expectedOutput": "[{\\"id\\":1,\\"name\\":\\"Alice\\",\\"status\\":\\"active\\"},{\\"id\\":3,\\"name\\":\\"Carol\\",\\"status\\":\\"active\\"}]",
          "isHidden": false
        },
        {
          "input": "DROP TABLE IF EXISTS users; CREATE TABLE users (id INT, name VARCHAR(50), status VARCHAR(20)); INSERT INTO users VALUES (1, 'Dave', 'active'), (2, 'Eve', 'active');",
          "expectedOutput": "[{\\"id\\":1,\\"name\\":\\"Dave\\",\\"status\\":\\"active\\"},{\\"id\\":2,\\"name\\":\\"Eve\\",\\"status\\":\\"active\\"}]",
          "isHidden": false
        }
      ],
      "solution": "SELECT * FROM users WHERE status = 'active'",
      "explanation": "Use the WHERE clause to filter rows where status column equals 'active'."
    }
  ]
}

REQUIREMENTS:
1. EVERY question MUST have "type": "coding" and "language": "sql"
2. Include table schemas in the description
3. Provide starter SQL query
4. Include 2-4 test cases with CREATE/INSERT statements
5. **CRITICAL: EVERY test case input MUST start with "DROP TABLE IF EXISTS table_name;" before CREATE TABLE**
6. Provide working solution query
7. Include explanation

Difficulty: ${difficulty === "easy" ? "Basic SELECT, WHERE, ORDER BY" : difficulty === "medium" ? "JOINs, GROUP BY, subqueries" : "Complex queries, window functions, CTEs"}
Topic: ${topic}

Generate ${count} SQL CODING problems now. DO NOT generate MCQ questions.
**IMPORTANT: All test case inputs must begin with DROP TABLE IF EXISTS statements for all tables being created.**`;
}

// Generate javascript coding prompt
function generateJavascriptCodingPrompt(topic: string, difficulty: string, count: number): string {
    return `Generate ${count} JavaScript coding problems about "${topic}" at ${difficulty} difficulty level.

CRITICAL: Generate ONLY JavaScript coding problems, NOT multiple choice questions!

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "javascript":
{
  "questions": [
    {
      "type": "coding",
      "language": "javascript",
      "question": "Calculate Factorial",
      "description": "<p>Write a function that calculates the factorial of a given number n.</p><p><strong>Example:</strong></p><pre>Input: 5\nOutput: 120\nExplanation: 5! = 5 × 4 × 3 × 2 × 1 = 120</pre>",
      "starterCode": "function solution(n) {\n  // Write your code here\n}",
      "testCases": [
        {
          "input": "5",
          "expectedOutput": "120",
          "isHidden": false
        },
        {
          "input": "3",
          "expectedOutput": "6",
          "isHidden": false
        },
        {
          "input": "0",
          "expectedOutput": "1",
          "isHidden": true
        }
      ],
      "solution": "function solution(n) {\n  if (n === 0) return 1;\n  let result = 1;\n  for (let i = 1; i <= n; i++) {\n    result *= i;\n  }\n  return result;\n}",
      "explanation": "The function calculates the factorial by iterating from 1 to n and multiplying each number. Base case: 0! = 1."
    }
  ]
}

REQUIREMENTS:
1. EVERY question MUST have "type": "coding" and "language": "javascript"
2. Include complete HTML-formatted problem description with examples
3. Provide starter code with function definition named "solution"
4. Include 3-5 test cases (at least 2 visible, 1-3 hidden)
5. Provide working solution code
6. Include explanation of the approach

TEST CASE FORMAT RULES:
- Single integer: "5" (not "[5]")
- Single string: "\\"hello world\\"" (escaped once)
- Single list: "[1,2,3]"
- Multiple args: "[5, 3]" (will be unpacked)

Difficulty: ${difficulty === "easy"
            ? "Basic loops and conditionals"
            : difficulty === "medium"
                ? "Array/string manipulation, recursion"
                : "Complex algorithms, dynamic programming"}
Topic: ${topic}

Generate ${count} JavaScript CODING problems now. DO NOT generate MCQ questions.`;
}

// Generate mixed questions
function generateMixedPrompt(topic: string, difficulty: string, count: number, language: "python" | "sql" | "javascript" | "java" | "pyspark" | "dax"): string {
    const mcqCount = Math.ceil(count * 0.6);
    const codingCount = count - mcqCount;

    return `Generate ${count} practice questions about "${topic}" at ${difficulty} difficulty level.
Mix: ${mcqCount} MCQ questions + ${codingCount} ${language.toUpperCase()} coding problems.

Return JSON with "questions" array containing BOTH types:
- MCQ questions must have "type": "mcq"
- Coding questions must have "type": "coding" and "language": "${language}"

Follow the previous format examples for each type.

Generate ${mcqCount} MCQ + ${codingCount} ${language.toUpperCase()} coding questions about ${topic}.`;
}

function generatePySparkPrompt(topic: string, difficulty: string, count: number): string {
    return `Generate ${count} PySpark/Databricks coding questions about ${topic} at ${difficulty} level.

CRITICAL REQUIREMENTS:
- Focus on DataFrame operations, transformations, aggregations, joins, and Spark SQL
- Include realistic data scenarios
- Questions should test PySpark understanding, not just Python
- Provide sample data in test cases
- Expected output should be DataFrame show() results

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "pyspark":

{
  "questions": [
    {
      "type": "coding",
      "language": "pyspark",
      "question": "Brief question title",
      "description": "Detailed description with requirements",
      "starterCode": "from pyspark.sql import SparkSession\\nfrom pyspark.sql.functions import *\\n\\n# Your code here\\n",
      "testCases": [
        {
          "input": "Sample data or description",
          "expectedOutput": "Expected DataFrame output from show()",
          "isHidden": false
        }
      ]
    }
  ]
}

DIFFICULTY GUIDELINES:
- Easy: Basic DataFrame creation, select, filter, show
- Medium: GroupBy, aggregations, joins, withColumn
- Hard: Window functions, complex transformations, Spark SQL, UDFs

IMPORTANT RULES:
1. EVERY question MUST have "type": "coding" and "language": "pyspark"
2. StarterCode must import necessary modules (SparkSession, functions)
3. Test cases should include sample data setup
4. Expected output should match DataFrame.show() format
5. Focus on real-world Databricks scenarios

Generate ${count} questions now.`;
}

function generateDaxPrompt(topic: string, difficulty: string, count: number): string {
    return `Generate ${count} Power BI DAX expression questions about ${topic} at ${difficulty} level.

CRITICAL REQUIREMENTS:
- Focus on DAX formulas and calculations
- Include realistic business scenarios
- Test understanding of measures vs calculated columns
- Include filter context problems
- Provide sample data context

Available Tables:
- Sales (OrderID, OrderDate, ProductID, CustomerID, Quantity, Amount)
- Products (ProductID, ProductName, Category, Price)
- Customers (CustomerID, CustomerName, Region, City)

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "dax":

{
  "questions": [
    {
      "type": "coding",
      "language": "dax",
      "question": "Brief question title",
      "description": "Detailed description with business context and sample data",
      "starterCode": "// Write your DAX expression here\\n",
      "testCases": [
        {
          "input": "Context or sample data description",
          "expectedOutput": "Expected result (number or text)",
          "isHidden": false
        }
      ]
    }
  ]
}

DIFFICULTY GUIDELINES:
- Easy: Basic aggregations (SUM, AVERAGE, COUNT, MIN, MAX)
- Medium: CALCULATE with filters, multiple conditions
- Hard: Complex filter context, time intelligence, SUMX/AVERAGEX

DAX FUNCTIONS TO USE:
Basic: SUM, AVERAGE, COUNT, MIN, MAX
Intermediate: CALCULATE, FILTER
Advanced: SUMX, AVERAGEX, ALL, ALLEXCEPT (mention but focus on basic/intermediate)

IMPORTANT RULES:
1. EVERY question MUST have "type": "coding" and "language": "dax"
2. Starter code should be minimal (just a comment)
3. Description must include table context and sample data
4. Expected output should be a single number or text value
5. Focus on realistic business scenarios

Generate ${count} questions now.`;
}

// Validate MCQ question
function validateMCQQuestion(q: any, index: number): MCQQuestion {
    if (!q.question || !q.options || !q.explanation) {
        throw new Error(`MCQ question ${index} missing required fields`);
    }

    const options = Array.isArray(q.options) ? q.options : [];
    if (options.length !== 4) {
        while (options.length < 4) options.push(`Option ${options.length + 1}`);
        if (options.length > 4) options.splice(4);
    }

    let correctAnswer = parseInt(String(q.correctAnswer || 0));
    if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
        correctAnswer = 0;
    }

    return {
        type: "mcq",
        question: String(q.question),
        options: options.map((o: any) => String(o)),
        correctAnswer,
        explanation: String(q.explanation),
    };
}

function generateJavaCodingPrompt(topic: string, difficulty: string, count: number): string {
    return `Generate ${count} Java coding problems about "${topic}" at ${difficulty} difficulty level.

CRITICAL: Generate ONLY Java coding problems, NOT multiple choice questions!

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "java":
{
  "questions": [
    {
      "type": "coding",
      "language": "java",
      "question": "Calculate Factorial",
      "description": "<p>Write a method that calculates the factorial of a given number n.</p><p><strong>Example:</strong></p><pre>Input: 5\\nOutput: 120\\nExplanation: 5! = 5 × 4 × 3 × 2 × 1 = 120</pre>",
      "starterCode": "public class Solution {\\n    public int solution(String input) {\\n        // Write your code here\\n        return 0;\\n    }\\n}",
      "testCases": [
        {
          "input": "5",
          "expectedOutput": "120",
          "isHidden": false
        },
        {
          "input": "3",
          "expectedOutput": "6",
          "isHidden": false
        },
        {
          "input": "0",
          "expectedOutput": "1",
          "isHidden": true
        }
      ],
      "solution": "public class Solution {\\n    public int solution(String input) {\\n        int n = Integer.parseInt(input);\\n        if (n == 0) return 1;\\n        int result = 1;\\n        for (int i = 1; i <= n; i++) {\\n            result *= i;\\n        }\\n        return result;\\n    }\\n}",
      "explanation": "The method calculates factorial by iterating from 1 to n and multiplying each number. Base case: 0! = 1."
    }
  ]
}

REQUIREMENTS:
1. EVERY question MUST have "type": "coding" and "language": "java"
2. Include complete HTML-formatted problem description with examples
3. Provide starter code with class "Solution" and method "solution"
4. Include 3-5 test cases (at least 2 visible, 1-3 hidden)
5. Provide working solution code
6. Include explanation of the approach

TEST CASE FORMAT RULES:
- Single integer: "5" (not "[5]")
- Single string: "\\"hello\\"" (with escaped quotes)
- Input is passed as String, parse in solution method

Difficulty: ${difficulty === "easy" ? "Basic loops and conditionals" : difficulty === "medium" ? "Array/string manipulation, recursion" : "Complex algorithms, dynamic programming"}
Topic: ${topic}

Generate ${count} Java CODING problems now. DO NOT generate MCQ questions.`;
}

// Validate coding question
function validateCodingQuestion(q: any, index: number): CodingQuestion {
    if (!q.question || !q.description) {
        throw new Error(`Coding question ${index} missing required fields`);
    }

    const language: "python" | "sql" | "javascript" | "java" | "pyspark" | "dax" =
        q.language.includes("sql") ? "sql"
            : q.language.includes("javascript") || q.language.includes("js") ? "javascript"
                : q.language.includes("java") ? "java"
                    : q.language.includes("pyspark") || q.language.includes("spark") ? "pyspark"
                        : q.language.includes("dax") || q.language.includes("powerbi") ? "dax" : "python";

    // Ensure we have test cases
    let testCases = Array.isArray(q.testCases) ? q.testCases : [];
    if (testCases.length === 0) {
        console.warn(`Coding question ${index} has no test cases, adding default`);
        testCases = [
            {
                input: "",
                expectedOutput: "",
                isHidden: false,
            },
        ];
    }

    return {
        type: "coding",
        language,
        question: String(q.question),
        description: String(q.description),
        starterCode: String(
            q.starterCode ||
            (language === "python"
                ? "def solution():\n    pass"
                : language === "javascript"
                    ? "function solution() {\n    // your code\n}"
                    : "SELECT * FROM table")
        ),
        testCases,
        solution: String(q.solution || ""),
        explanation: String(q.explanation || ""),
    };
}