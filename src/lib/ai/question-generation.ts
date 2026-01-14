export interface MCQQuestion {
  type: "mcq";
  question: string;
  questionTitle?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  hints?: string[];
}

export interface CodingQuestion {
  type: "coding";
  language:
  | "python"
  | "sql"
  | "javascript"
  | "java"
  | "pyspark"
  | "dax"
  | "dbt"
  | "snowflake";
  question: string;
  questionTitle?: string;
  description: string;
  questionDescription?: string;
  hints?: string[];
  starterCode: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
  solution: string;
  explanation: string;
}

export type Question = MCQQuestion | CodingQuestion;


// Helper to generate duration context
function getDurationContext(duration?: number, totalQuestions?: number): string {
  if (!duration || !totalQuestions) return "";
  const minsPerQ = duration / totalQuestions;
  return `
CONTEXT: The user has ${duration} minutes to complete the full exam of ${totalQuestions} questions (approx ${minsPerQ.toFixed(1)} mins/question).
ADJUST DIFFICULTY: ${minsPerQ < 5 ? "Questions should be specific and solvable quickly. Avoid overly massive schemas or complex multi-page logic." : "Questions can be more complex, requiring deeper analysis or multi-step logic."}
`;
}

// Generate MCQ prompt
export function generateMCQPrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} multiple-choice questions about "${topic}" at ${difficulty} difficulty level.${durationCtx}

CRITICAL: Generate ONLY multiple-choice questions, NOT coding problems!

Return a JSON object with a "questions" array. Each question MUST have type "mcq":
{
  "questions": [
    {
      "type": "mcq",
      "language": "Language related to ${topic}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "question": "Question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Correct Answer for the question",
      "explanation": "Explanation related to the Question"
    }
  ]
}

Requirements:
- EVERY question MUST have "type": "mcq"
- Exactly 4 options per question
- correctAnswer: index (0-3) of correct option
- Clear, unambiguous questions
- Difficulty: ${difficulty === "easy"
      ? "Basic concepts and definitions"
      : difficulty === "medium"
        ? "Intermediate application and analysis"
        : "Advanced problem-solving and complex scenarios"
    }
- Topic: ${topic}

Generate ${count} multiple-choice questions now.`;
}

// Generate Python coding prompt
export function generatePythonCodingPrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} Python scenario-based coding problems about "${topic}" at ${difficulty} difficulty level.${durationCtx}

CRITICAL: Generate ONLY scenario-based coding problems. Each question should be grounded in a real-world use case or business scenario (e.g., data processing for an e-commerce platform, automation for a log system, algorithm for a fintech app). Do NOT generate abstract math-only problems.
Return a JSON object with a "questions" array where EVERY question has type "coding" and language "python":
{
  "questions": [
    {
      "type": "coding",
      "language": "Language related to ${topic}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "question": "Question",
      "description": "Description related to the Question",
      "starterCode": "starter code for the question always starts with def solution()",
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
      "solution": "Solution related to the Question",
      "explanation": "Explanation related to the Question"
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
7. **Data Schema**: If the problem involves specific data structures or schemas, the "description" **MUST** include a beautifully styled HTML \`<table>\` showing the keys/columns and types.

TEST CASE FORMAT RULES:
- Single integer: "5" (not "[5]")
- Single string: "\\"hello\\"" (with escaped quotes)
- Single list: "[1,2,3]" (the actual list)
- Multiple args: "[5, 3]" (will be unpacked)

Difficulty: ${difficulty === "easy"
      ? "Basic loops and conditionals"
      : difficulty === "medium"
        ? "Array/string manipulation, recursion"
        : "Complex algorithms, dynamic programming"
    }
Topic: ${topic}

Generate ${count} Python CODING problems now. DO NOT generate MCQ questions.`;
}

// Generate SQL coding prompt
export function generateSQLCodingPrompt(
  topic: string,
  difficulty: string,
  count: number,
  schema: string,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} highly detailed SCENARIO-BASED SQL query problems about "${topic}" at ${difficulty} difficulty level.${durationCtx}
    ${schema}

USE THE NORTHWIND DATABASE SCHEMA PROVIDED ABOVE to generate realistic SQL problems. Each problem MUST be a real-world business use case (e.g., "Analyze quarterly revenue growth by region", "Identify top-performing employees by order volume"). Reference actual tables and columns from the Northwind schema.

CRITICAL: Generate ONLY SQL coding problems, NOT multiple choice questions!

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "sql":
{
  "questions": [
    {
      "type": "coding",
      "language": "sql",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "detailed Description Related to the Question with all the requirements mentioned",
      "hints": ["Hint 1", "Hint 2"],
      "solutionExplanation": "Detailed step-by-step logic",
      "basedOnExam": "Practice Exam",
      "question": "Detailed prompt: What exactly needs to be retrieved? Mention if sorting, grouping, or specific conditions are required.",
      "description": "Comprehensive HTML-formatted description. **MUST** include a beautifully styled HTML table representing the Table Schema (Columns and Types) for the relevant Northwind tables at the beginning of the description.",
      "starterCode": "SELECT ",
      "testCases": [
        {
          "input": "DROP TABLE IF EXISTS ...; CREATE TABLE ...; INSERT INTO ...;",
          "expectedOutput": "[{\\"col1\\":\\"val\\"}, ...]",
          "isHidden": false
        }
      ],
      "solution": "CORRECT SQL QUERY",
      "explanation": "Why this query works"
    }
  ]
}

REQUIREMENTS:
1. **Scope**: Cover all relevant SQL topics for the chosen difficulty.
2. **Detail**: Make the "question" and "description" as detailed as possible. Explain the business context.
3. **Table Schema**: The "description" **MUST** include a beautifully styled HTML table showing the columns and data types for the relevant Northwind tables.
   Example Format:
   <div class="mb-4 overflow-hidden rounded-lg border border-zinc-800">
     <h4 class="text-xs font-bold mb-2 px-3 py-1 bg-zinc-800/50 text-zinc-300 border-b border-zinc-800">Table: Categories</h4>
     <table class="min-w-full border-collapse text-xs">
       <thead>
         <tr class="bg-zinc-900/80">
           <th class="border-r border-b border-zinc-800 px-3 py-2 text-left text-zinc-100 font-semibold uppercase tracking-wider">Column</th>
           <th class="border-b border-zinc-800 px-3 py-2 text-left text-zinc-100 font-semibold uppercase tracking-wider">Type</th>
         </tr>
       </thead>
       <tbody>
         <tr class="bg-zinc-900/30">
           <td class="border-r border-zinc-800 px-3 py-2 font-mono text-zinc-300">CategoryID</td>
           <td class="px-3 py-2 text-blue-400 font-medium italic">int</td>
         </tr>
       </tbody>
     </table>
   </div>
4. **Ordering**: If a specific output order is expected (essential for test case matching), explicitly state it in the question (e.g., "Sort the results by date in descending order").
5. **Variety**: If multiple questions are requested, ensure they cover different aspects of ${topic} within the Northwind context.
6. **Schema**: Use ONLY the Northwind schema provided.
7. **Test Cases**: 2-4 test cases. EVERY test case input MUST start with "DROP TABLE IF EXISTS table_name;" for all tables involved.
8. **Recursive Queries (Postgres)**: If generating a RECURSIVE query, **CRITICAL**: Ensure the non-recursive term and the recursive term have the EXACT same data types. Use explicit casting (e.g., \`CAST(x AS DATE)\` or \`::DATE\`) if necessary to prevent errors like "non-recursive term has type date but recursive term has type timestamp".
9. **Test Case Precision**: DOUBLE-CHECK for typos. Ensure every column name in the \`CREATE TABLE\` and \`INSERT INTO\` statements perfectly matches the Northwind schema. The \`expectedOutput\` must be a high-precision JSON representation of the result of the \`solution\` query when run against the \`input\` SQL. Verify that date strings (e.g., '1997-01-01') and numeric precision are consistent throughout.

Difficulty Guidelines:
- EASY: Focus on Basic SELECT, filtered results (WHERE), basic sorting (ORDER BY), and simple joins.
- MEDIUM: Focus on Multiple JOINs, Aggregations (GROUP BY, HAVING), Subqueries, and Case statements.
- HARD: Focus on Advanced Window Functions (RANK, ROW_NUMBER, LEAD/LAG), Common Table Expressions (CTEs), Recursive queries, and Complex Data analysis.

Topic: ${topic}

Generate ${count} comprehensive SCENARIO-BASED SQL CODING problems using the Northwind schema now. DO NOT generate MCQ questions.`;
}

// Generate javascript coding prompt
export function generateJavascriptCodingPrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} scenario-based JavaScript coding problems about "${topic}" at ${difficulty} difficulty level.${durationCtx}

CRITICAL: Each question MUST be a real-world programming scenario (e.g., "Implement a shopping cart validator", "Create an analytics event parser", "Build a component state manager"). Avoid abstract algorithmic puzzles without context.
Return a JSON object with a "questions" array where EVERY question has type "coding" and language "javascript":
{
  "questions": [
    {
      "type": "coding",
      "language": "Language related to ${topic}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "question": "Question",
      "description": "Description related to the Question",
      "starterCode": "starter code for the question always starts with function solution()",
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
      "solution": "Solution related to the Question",
      "explanation": "Explanation related to the Question"
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
        : "Complex algorithms, dynamic programming"
    }
Topic: ${topic}

Generate ${count} JavaScript CODING problems now. DO NOT generate MCQ questions.`;
}

// Generate mixed questions
export function generateMixedPrompt(
  topic: string,
  difficulty: string,
  count: number,
  language: "python" | "sql" | "javascript" | "java" | "pyspark" | "dax" | "dbt" | "snowflake"
): string {
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

export function generatePySparkPrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} SCENARIO-BASED PySpark/Databricks coding questions about ${topic} at ${difficulty} level.${durationCtx}

CRITICAL REQUIREMENTS:
- Each question MUST be a real-world data engineering scenario (e.g., "Processing daily clickstream data", "Aggregating monthly sales by region", "Cleaning IoT sensor logs").
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
      "language": "Language related to ${topic}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "description": "Comprehensive HTML-formatted description. **MUST** include an HTML table showing the Schema (Columns/Types) of the dataframes used.",
      "starterCode": "starter code for the question always starts with SELECT",
      "testCases": [
        {
          "input": "Sample data or description",
          "expectedOutput": "Expected DataFrame output from show()",
          "isHidden": false
        }
      ],
      "solution": "Solution related to the Question",
      "explanation": "Explanation related to the Question"
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
6. **Table Schema**: The "description" **MUST** include a beautifully styled HTML \`<table>\` showing the schema (columns/types) of the dataframes used.

Generate ${count} questions now.`;
}

export function generateDaxPrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} SCENARIO-BASED Power BI DAX expression questions about ${topic} at ${difficulty} level.${durationCtx}

CRITICAL REQUIREMENTS:
- Each question MUST be a business case scenario (e.g., "Calculating Year-over-Year revenue growth", "Calculating average customer lifetime value").
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
      "language": "Language related to ${topic}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "description": "Comprehensive HTML-formatted description. **MUST** include an HTML table showing the Table Schema (Columns/Types) for Sales, Products, and Customers.",
      "starterCode": "starter code for the question always starts with SELECT",
      "testCases": [
        {
          "input": "Context or sample data description",
          "expectedOutput": "Expected result (number or text)",
          "isHidden": false
        }
      ],
      "solution": "Solution related to the Question",
      "explanation": "Explanation related to the Question"
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
6. **Table Schema**: The "description" **MUST** include a beautifully styled HTML \`<table>\` showing the columns and data types for the relevant tables.

Generate ${count} questions now.`;
}

export function generateJavaCodingPrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} SCENARIO-BASED Java coding problems about "${topic}" at ${difficulty} difficulty level.${durationCtx}

CRITICAL: Each question MUST be grounded in a real-world software engineering scenario (e.g., "Building a library management system backend", "Implementing a thread-safe cache", "Parsing a financial transaction payload").
CRITICAL: Generate ONLY Java coding problems, NOT multiple choice questions!

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "java":
{
  "questions": [
    {
      "type": "coding",
      "language": "Language related to ${topic}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "description": "Description related to the Question",
      "starterCode": "starter code for the question always starts with SELECT",
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
      "solution": "Solution related to the Question",
      "explanation": "Explanation related to the Question"
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
7. **Data Schema**: If the problem involves specific data structures or schemas, the "description" **MUST** include a beautifully styled HTML \`<table>\` showing the fields and types at the beginning of the description.

TEST CASE FORMAT RULES:
- Single integer: "5" (not "[5]")
- Single string: "\\"hello\\"" (with escaped quotes)
- Input is passed as String, parse in solution method

Difficulty: ${difficulty === "easy"
      ? "Basic loops and conditionals"
      : difficulty === "medium"
        ? "Array/string manipulation, recursion"
        : "Complex algorithms, dynamic programming"
    }
Topic: ${topic}

Generate ${count} Java CODING problems now. DO NOT generate MCQ questions.`;
}

export function generateDbtPrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} SCENARIO-BASED DBT (Data Build Tool) coding questions about ${topic} at ${difficulty} level.${durationCtx}

CRITICAL REQUIREMENTS:
- Each question MUST be a realistic analytics engineering scenario (e.g., "Building a dimensional model for customer analytics", "Implementing incremental logic for high-volume logs").
- Focus on DBT models (SQL), Jinja templating, macros, and tests
- Include realistic data scenarios
- Test understanding of ref(), source(), config(), and other Jinja functions
- Provide sample data in test cases (seeds)
- Expected output should be the result of the SQL query

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "dbt":

{
  "questions": [
    {
      "type": "coding",
      "language": "Language related to ${topic}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "description": "Comprehensive HTML-formatted description. **MUST** include an HTML table showing the Schema (Columns/Types) of the models involved.",
      "starterCode": "starter code for the question always starts with SELECT",
      "testCases": [
        {
          "input": "Sample data or description",
          "expectedOutput": "Expected query result",
          "isHidden": false
        }
      ],
      "solution": "Solution related to the Question",
      "explanation": "Explanation related to the Question"
    }
  ]
}

DIFFICULTY GUIDELINES:
- Easy: Basic SELECT models, ref() usage, simple materializations
- Medium: Jinja logic (if/else, loops), macros, incremental models, tests
- Hard: Complex macros, custom materializations, advanced Jinja, package usage

IMPORTANT RULES:
1. EVERY question MUST have "type": "coding" and "language": "dbt"
2. StarterCode should be a SQL file content with Jinja
3. Focus on Analytics Engineering concepts
4. Generate valid DBT SQL/Jinja code
5. **Table Schema**: The "description" **MUST** include a beautifully styled HTML \`<table>\` showing the columns and data types for the relevant models.

Generate ${count} questions now.`;
}

export function generateSnowflakePrompt(
  topic: string,
  difficulty: string,
  count: number,
  duration?: number,
  totalQuestions?: number
): string {
  const durationCtx = getDurationContext(duration, totalQuestions);
  return `Generate ${count} SCENARIO-BASED Snowflake coding questions about ${topic} at ${difficulty} level.${durationCtx}

CRITICAL REQUIREMENTS:
- Each question MUST be a real-world cloud data warehousing scenario (e.g., "Implementing row-level security for HR data", "Optimizing data ingestion from S3 using Snowpipe").
- Focus on Snowflake SQL, stored procedures, functions, and UDFs
- Include realistic data scenarios
- Test understanding of DDL, DML, and DCL
- Provide sample data in test cases (seeds)
- Expected output should be the result of the SQL query

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "snowflake":

{
  "questions": [
    {
      "type": "coding",
      "language": "snowflake",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "weakArea": "Weak Area related to the Question",
      "questionTitle": "Title Related to the Question",
      "questionDescription": "Description Related to the Question",
      "hints": ["Hint related to the Question"],
      "solutionExplanation": "Solution Explanation related to the Question",
      "basedOnExam": "Based on Exam",
      "description": "Comprehensive HTML-formatted description. **MUST** include an HTML table showing the Table Schema (Columns/Types).",
      "starterCode": "starter code for the question always starts with SELECT(not the solution)",
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
      "solution": "Solution related to the Question",
      "explanation": "Explanation related to the Question"
    }
  ]
}

DIFFICULTY GUIDELINES:
- Easy: Basic SELECT, DDL, DML
- Medium: Stored procedures, functions, UDFs, complex queries
- Hard: Complex DDL, DML, DCL, advanced SQL features

IMPORTANT RULES:
1. EVERY question MUST have "type": "coding" and "language": "snowflake"
2. StarterCode should be a SQL file content with Snowflake-specific syntax
3. Focus on Analytics Engineering concepts
4. Generate valid Snowflake SQL code
5. **Table Schema**: The "description" **MUST** include a beautifully styled HTML \`<table>\` showing the columns and data types for the relevant tables.

Generate ${count} questions now.`;
}

// Validate MCQ question
export function validateMCQQuestion(q: any, index: number): MCQQuestion {
  // Handle cases where AI returns questionTitle instead of question
  const questionText = String(q.question || q.questionTitle || "");
  if (!questionText || !q.options || !q.explanation) {
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
    question: questionText,
    questionTitle: String(q.questionTitle || questionText),
    options: options.map((o: any) => String(o)),
    correctAnswer,
    explanation: String(q.explanation),
    hints: Array.isArray(q.hints) ? q.hints.map((h: any) => String(h)) : [],
  };
}

// Validate coding question
export function validateCodingQuestion(q: any, index: number): CodingQuestion {
  // Handle cases where AI returns questionTitle/questionDescription instead of question/description
  const questionText = String(q.question || q.questionTitle || "");
  const descriptionText = String(q.description || q.questionDescription || "");

  if (!questionText || !descriptionText) {
    throw new Error(`Coding question ${index} missing required fields`);
  }

  const language:
    | "python"
    | "sql"
    | "javascript"
    | "java"
    | "pyspark"
    | "dax"
    | "dbt"
    | "snowflake" = q.language.includes("sql")
      ? "sql"
      : q.language.includes("javascript") || q.language.includes("js")
        ? "javascript"
        : q.language.includes("java")
          ? "java"
          : q.language.includes("pyspark") || q.language.includes("spark")
            ? "pyspark"
            : q.language.includes("dax") || q.language.includes("powerbi")
              ? "dax"
              : q.language.includes("dbt")
                ? "dbt"
                : q.language.includes("snowflake")
                  ? "snowflake"
                  : "python";

  // Ensure we have test cases
  let testCases = Array.isArray(q.testCases) ? q.testCases : [];

  // Normalize test cases to ensure fields are strings
  testCases = testCases.map((tc: any) => ({
    input: String(tc.input || ""),
    expectedOutput: typeof tc.expectedOutput === "string"
      ? tc.expectedOutput
      : JSON.stringify(tc.expectedOutput),
    isHidden: !!tc.isHidden,
  }));

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
    question: questionText,
    questionTitle: String(q.questionTitle || questionText),
    description: descriptionText,
    questionDescription: String(q.questionDescription || descriptionText),
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
    hints: Array.isArray(q.hints) ? q.hints.map((h: any) => String(h)) : [],
  };
}
