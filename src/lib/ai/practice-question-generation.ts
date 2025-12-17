export interface MCQQuestion {
  type: "mcq";
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
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

export type Question = MCQQuestion | CodingQuestion;

// Generate MCQ prompt
export function generateMCQPrompt(
  topic: string,
  difficulty: string,
  count: number
): string {
  return `Generate ${count} multiple-choice questions about "${topic}" at ${difficulty} difficulty level.

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
  count: number
): string {
  return `Generate ${count} Python coding problems about "${topic}" at ${difficulty} difficulty level.

CRITICAL: Generate ONLY Python coding problems, NOT multiple choice questions!

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
  schema: string
): string {
  return `Generate ${count} SQL query problems about "${topic}" at ${difficulty} difficulty level.
    ${schema}

USE THE ABOVE REAL DATABASE SCHEMA to generate realistic SQL problems. Reference actual tables and columns from the schema.

CRITICAL: Generate ONLY SQL coding problems, NOT multiple choice questions!

Return a JSON object with a "questions" array where EVERY question has type "coding" and language "sql":
{
  "questions": [
    {
      "type": "coding",
      "language": "Language related to ${topic}",
      "question": "Question",
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

REQUIREMENTS:
1. EVERY question MUST have "type": "coding" and "language": "sql"
2. Include table schemas in the description
3. Provide starter SQL query
4. Include 2-4 test cases with CREATE/INSERT statements
5. **CRITICAL: EVERY test case input MUST start with "DROP TABLE IF EXISTS table_name;" before CREATE TABLE**
6. Provide working solution query
7. Include explanation

Difficulty: ${difficulty === "easy"
      ? "Basic SELECT, WHERE, ORDER BY"
      : difficulty === "medium"
        ? "JOINs, GROUP BY, subqueries"
        : "Complex queries, window functions, CTEs"
    }
Topic: ${topic}

Generate ${count} SQL CODING problems now. DO NOT generate MCQ questions.
**IMPORTANT: All test case inputs must begin with DROP TABLE IF EXISTS statements for all tables being created.**`;
}

// Generate javascript coding prompt
export function generateJavascriptCodingPrompt(
  topic: string,
  difficulty: string,
  count: number
): string {
  return `Generate ${count} JavaScript coding problems about "${topic}" at ${difficulty} difficulty level.

CRITICAL: Generate ONLY JavaScript coding problems, NOT multiple choice questions!

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
  count: number
): string {
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

Generate ${count} questions now.`;
}

export function generateDaxPrompt(
  topic: string,
  difficulty: string,
  count: number
): string {
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

Generate ${count} questions now.`;
}

export function generateJavaCodingPrompt(
  topic: string,
  difficulty: string,
  count: number
): string {
  return `Generate ${count} Java coding problems about "${topic}" at ${difficulty} difficulty level.

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
  count: number
): string {
  return `Generate ${count} DBT (Data Build Tool) coding questions about ${topic} at ${difficulty} level.

CRITICAL REQUIREMENTS:
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
      "description": "Description related to the Question",
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

Generate ${count} questions now.`;
}

// Validate MCQ question
export function validateMCQQuestion(q: any, index: number): MCQQuestion {
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

// Validate coding question
export function validateCodingQuestion(q: any, index: number): CodingQuestion {
  if (!q.question || !q.description) {
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
