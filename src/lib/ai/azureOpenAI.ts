import { AzureOpenAI } from "openai";

const endpoint = (process.env.AZURE_OAI_ENDPOINT || "").replace(
  /^['"]|['"]$/g,
  ""
);
const apiKey = process.env.AZURE_OAI_API_KEY || "";
const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
const apiVersion = process.env.AZURE_OAI_API_VER || "";

let clientInstance: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (!clientInstance) {
    clientInstance = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
    });
  }
  return clientInstance;
}

export async function generateQuestionTags(
  questionText: string,
  questionType: string,
  language?: string
): Promise<string[]> {
  const cleanText = questionText.replace(/<[^>]*>/g, "").trim();

  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const basePrompt = `
        Analyze the following ${questionType} question${
    language ? ` (${language})` : ""
  } 
        and return 1–3 relevant technical tags describing its key topic or concept.
        Question:
            ${cleanText}

        Return tags as comma-separated words (like: joins, subquery, recursion, oop).
    `;

  async function getTagsFromAI(prompt: string): Promise<string[]> {
    const params: any = {
      model: deploymentName,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI that assigns technical tags to questions. Be concise and return only tags, no explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      // max_completion_tokens: 100,
    };

    if (!isDeterministicModel) {
      params.temperature = 0.5;
      params.top_p = 0.9;
    }

    const result = await getClient().chat.completions.create(params);

    const content = result.choices[0]?.message?.content?.trim() || "";
    console.log("AI raw content:", JSON.stringify(content));

    // Clean up and normalize
    const tags = content
      .replace(/(^tags?:?|\n)/gi, "")
      .split(/[,;]/)
      .map((tag: string) =>
        tag
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "")
      )
      .filter((tag) => tag.length > 2 && tag.length < 30)
      .slice(0, 3);

    return tags;
  }

  try {
    let tags = await getTagsFromAI(basePrompt);

    // Retry once if empty or failed
    if (tags.length === 0) {
      console.log("⚠️ Empty result — retrying with fallback prompt...");
      const fallbackPrompt = `Give 1–3 short technical keywords for this ${questionType} question:\n${cleanText}\nExample: joins, subquery, recursion`;
      tags = await getTagsFromAI(fallbackPrompt);
    }

    console.log("Parsed tags:", tags);

    return tags.length > 0 ? tags : ["general"];
  } catch (error: any) {
    console.error("Azure OpenAI Error:", error.message);
    console.error("Status:", error.status);
    console.error("Code:", error.code);
    console.error("Param:", error.param);
    return ["uncategorized"];
  }
}

export async function regenerateTagsForQuestion(
  questionId: number,
  questionText: string,
  questionType: string,
  language?: string
): Promise<string[]> {
  return generateQuestionTags(questionText, questionType, language);
}

export async function analyzeStudentPerformance(studentData: {
  questionDetails: Array<{
    questionText: string;
    questionType: string;
    score: number;
    maxMarks: number;
    feedback: string;
  }>;
  userName: string;
}): Promise<{
  strengths: Array<{ topic: string; score: number; description: string }>;
  weaknesses: Array<{ topic: string; score: number; description: string }>;
  recommendations: string[];
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Analyze this student's performance across multiple questions and identify:
        1. Top 3-5 strength areas (topics they excel at)
        2. Top 3-5 weakness areas (topics needing improvement)
        3. 2-3 specific recommendations for improvement

        Student: ${studentData.userName}
        Questions Attempted: ${studentData.questionDetails.length}

        Performance Data:
        ${studentData.questionDetails
          .map(
            (q, i) => `
        Q${i + 1}: ${q.questionText.replace(/<[^>]*>/g, "").substring(0, 100)}
        Type: ${q.questionType}
        Score: ${q.score}/${q.maxMarks} (${(
              (q.score / q.maxMarks) *
              100
            ).toFixed(0)}%)
        Feedback: ${q.feedback}
        `
          )
          .join("\n")}

        Return JSON in this exact format:
        {
        "strengths": [{"topic": "string", "score": number 0-100, "description": "brief description"}],
        "weaknesses": [{"topic": "string", "score": number 0-100, "description": "brief description"}],
        "recommendations": ["recommendation 1", "recommendation 2"]
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an educational AI that analyzes student performance. Return only valid JSON, no markdown or explanations.",
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

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    const analysis = JSON.parse(content);

    return {
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      recommendations: analysis.recommendations || [],
    };
  } catch (error: any) {
    console.error("Azure OpenAI Analysis Error:", error.message);
    return {
      strengths: [],
      weaknesses: [],
      recommendations: ["Unable to generate recommendations at this time."],
    };
  }
}

export async function predictQuestionDifficulty(
  questionText: string,
  questionType: string,
  totalMarks: number
): Promise<{
  predictedDifficulty: "Easy" | "Medium" | "Hard";
  confidence: number;
  reasoning: string;
  estimatedSuccessRate: number;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Analyze this ${questionType} question and predict its difficulty level for students:

        Question: ${questionText.replace(/<[^>]*>/g, "")}
        Type: ${questionType}
        Marks: ${totalMarks}

        Predict:
        1. Difficulty level (Easy/Medium/Hard)
        2. Confidence score (0-100)
        3. Brief reasoning
        4. Estimated success rate (0-100%)

        Return JSON:
        {
        "predictedDifficulty": "Easy|Medium|Hard",
        "confidence": number,
        "reasoning": "string",
        "estimatedSuccessRate": number
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an educational AI that predicts question difficulty. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.3;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Difficulty prediction error:", error);
    return {
      predictedDifficulty: "Medium",
      confidence: 0,
      reasoning: "Unable to predict",
      estimatedSuccessRate: 50,
    };
  }
}

export async function analyzeCommonMistakes(
  questionText: string,
  studentAnswers: Array<{
    answer: string;
    score: number;
    maxMarks: number;
    feedback: string;
  }>
): Promise<{
  commonMistakes: Array<{
    pattern: string;
    frequency: number;
    suggestion: string;
  }>;
  insights: string[];
  improvementTips: string[];
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Analyze student responses to identify common mistakes and patterns:

        Question: ${questionText.replace(/<[^>]*>/g, "")}

        Student Responses (${studentAnswers.length} total):
        ${studentAnswers
          .slice(0, 10)
          .map(
            (s, i) => `
        Student ${i + 1}: ${s.answer.substring(0, 200)}
        Score: ${s.score}/${s.maxMarks}
        Feedback: ${s.feedback}
        `
          )
          .join("\n")}

        Identify:
        1. Top 3-5 common mistakes/misconceptions
        2. Key insights about student understanding
        3. Teaching improvement tips

        Return JSON:
        {
        "commonMistakes": [{"pattern": "string", "frequency": number, "suggestion": "string"}],
        "insights": ["insight1", "insight2"],
        "improvementTips": ["tip1", "tip2"]
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an educational AI analyzing student performance patterns. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.6;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Common mistakes analysis error:", error);
    return { commonMistakes: [], insights: [], improvementTips: [] };
  }
}

export async function generateStudyPlan(studentData: {
  userName: string;
  weaknesses: Array<{ topic: string; score: number }>;
  strengths: Array<{ topic: string; score: number }>;
  totalQuestions: number;
  successRate: number;
}): Promise<{
  weeklyPlan: Array<{
    day: string;
    topic: string;
    activities: string[];
    duration: string;
  }>;
  priorityTopics: string[];
  estimatedImprovementTime: string;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        Create a personalized 7-day study plan for this student:

        Student: ${studentData.userName}
        Overall Success Rate: ${studentData.successRate.toFixed(1)}%
        Questions Attempted: ${studentData.totalQuestions}

        Weak Areas:
        ${studentData.weaknesses
          .map((w) => `- ${w.topic}: ${w.score}%`)
          .join("\n")}

        Strong Areas:
        ${studentData.strengths
          .map((s) => `- ${s.topic}: ${s.score}%`)
          .join("\n")}

        Create a structured weekly study plan focusing on weak areas first.

        Return JSON:
        {
        "weeklyPlan": [
            {"day": "Monday", "topic": "string", "activities": ["activity1", "activity2"], "duration": "2 hours"}
        ],
        "priorityTopics": ["topic1", "topic2"],
        "estimatedImprovementTime": "2-3 weeks"
        }
`;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an educational AI creating personalized study plans. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.7;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Study plan generation error:", error);
    return {
      weeklyPlan: [],
      priorityTopics: [],
      estimatedImprovementTime: "N/A",
    };
  }
}

export async function predictFuturePerformance(
  studentHistory: Array<{
    examId: string;
    score: number;
    totalPossible: number;
    date: string;
  }>
): Promise<{
  predictedScore: number;
  trend: "improving" | "declining" | "stable";
  confidence: number;
  insights: string[];
  riskLevel: "low" | "medium" | "high";
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Analyze student exam history and predict future performance:

        Exam History (${studentHistory.length} exams):
        ${studentHistory
          .map(
            (h, i) => `
        Exam ${i + 1}: ${h.score}/${h.totalPossible} (${(
              (h.score / h.totalPossible) *
              100
            ).toFixed(1)}%)
        Date: ${h.date}
        `
          )
          .join("\n")}

        Predict:
        1. Expected score percentage in next exam
        2. Performance trend
        3. Confidence level (0-100)
        4. Key insights
        5. Risk level for failing

        Return JSON:
        {
        "predictedScore": number (0-100),
        "trend": "improving|declining|stable",
        "confidence": number,
        "insights": ["insight1", "insight2"],
        "riskLevel": "low|medium|high"
        }
`;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an educational AI predicting student performance. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.4;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Performance prediction error:", error);
    return {
      predictedScore: 50,
      trend: "stable",
      confidence: 0,
      insights: [],
      riskLevel: "medium",
    };
  }
}

export async function compareStudents(
  student1: {
    userName: string;
    successRate: number;
    strengths: string[];
    weaknesses: string[];
  },
  student2: {
    userName: string;
    successRate: number;
    strengths: string[];
    weaknesses: string[];
  }
): Promise<{
  comparison: string;
  recommendations: { forStudent1: string[]; forStudent2: string[] };
  peerLearningOpportunities: string[];
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Compare these two students and provide insights:

        Student A: ${student1.userName}
        Success Rate: ${student1.successRate.toFixed(1)}%
        Strengths: ${student1.strengths.join(", ")}
        Weaknesses: ${student1.weaknesses.join(", ")}

        Student B: ${student2.userName}
        Success Rate: ${student2.successRate.toFixed(1)}%
        Strengths: ${student2.strengths.join(", ")}
        Weaknesses: ${student2.weaknesses.join(", ")}

        Provide:
        1. Comparison summary
        2. Individual recommendations
        3. Peer learning opportunities

        Return JSON:
        {
        "comparison": "string",
        "recommendations": {
            "forStudent1": ["rec1", "rec2"],
            "forStudent2": ["rec1", "rec2"]
        },
        "peerLearningOpportunities": ["opportunity1", "opportunity2"]
        }
`;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an educational AI comparing student performance. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.6;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Student comparison error:", error);
    return {
      comparison: "Unable to compare",
      recommendations: { forStudent1: [], forStudent2: [] },
      peerLearningOpportunities: [],
    };
  }
}

export async function generateLearningPlanQuestions(
  weekData: {
    weekNumber: number;
    topics: string[];
    goals: string[];
    language: string;
    difficulty: string;
  },
  questionCount: number = 3
): Promise<
  Array<{
    questionText: string;
    difficulty: string;
    totalMarks: number;
    testCases: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }>;
    starterCode: string;
    solution: string;
    hints: string[];
  }>
> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Generate ${questionCount} coding practice questions for a learning plan.

        Week ${weekData.weekNumber} Details:
        Topics: ${weekData.topics.join(", ")}
        Goals: ${weekData.goals.join(", ")}
        Language: ${weekData.language}
        Difficulty: ${weekData.difficulty}

        For each question, provide:
        1. Clear problem statement
        2. Difficulty level (beginner/intermediate/advanced)
        3. Total marks (5-20 based on complexity)
        4. 3-4 test cases (mix of visible and hidden)
        5. Starter code template
        6. Complete solution
        7. 2-3 helpful hints

        Return JSON:
        {
        "questions": [
            {
            "questionText": "Problem description with examples",
            "difficulty": "beginner|intermediate|advanced",
            "totalMarks": number,
            "testCases": [
                {"input": "test input", "expectedOutput": "expected result", "isHidden": false}
            ],
            "starterCode": "function template code",
            "solution": "complete working solution",
            "hints": ["hint 1", "hint 2"]
            }
        ]
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an educational AI that creates programming practice questions. Return only valid JSON with realistic, practical coding problems.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.8;
    params.top_p = 0.95;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    const data = JSON.parse(content);

    return data.questions || [];
  } catch (error: any) {
    console.error("Question generation error:", error.message);
    return [];
  }
}

export async function explainFeedbackFurther(
  questionText: string,
  studentAnswer: string,
  originalFeedback: string,
  specificQuery?: string
): Promise<string> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        Question: ${questionText.replace(/<[^>]*>/g, "")}
        
        Student's Answer: ${studentAnswer}
        
        Original Feedback: ${originalFeedback}
        
        ${
          specificQuery
            ? `Student asks: ${specificQuery}`
            : "Provide a more detailed explanation of the feedback, breaking down the concepts and offering concrete examples."
        }
        
        Be clear, educational, and encouraging. Use examples where helpful.
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are a patient tutor who explains concepts clearly with examples. Be encouraging and constructive.",
      },
      { role: "user", content: prompt },
    ],
    // response_format: { type: "json_object" }
  };

  if (!isDeterministicModel) {
    params.temperature = 0.7;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return (
      result.choices[0]?.message?.content?.trim() ||
      "Unable to generate explanation"
    );
  } catch (error) {
    console.error("Explain feedback error:", error);
    return "Unable to generate explanation at this time.";
  }
}

export async function generateAlternativeSolutions(
  questionText: string,
  studentAnswer: string,
  questionType: string,
  language?: string
): Promise<{
  approaches: Array<{ title: string; description: string; code?: string }>;
  comparison: string;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        Question: ${questionText.replace(/<[^>]*>/g, "")}
        Type: ${questionType}
        ${language ? `Language: ${language}` : ""}
        
        Student's Answer: ${studentAnswer}
        
        Suggest 2-3 alternative approaches to solve this problem. For each approach:
        1. Title of the approach
        2. Brief description
        3. Sample code/pseudocode if applicable
        4. When to use this approach
        
        Then provide a brief comparison of the approaches.
        
        Return JSON:
        {
            "approaches": [
                {
                    "title": "Approach name",
                    "description": "Detailed explanation",
                    "code": "Sample code (optional)"
                }
            ],
            "comparison": "Brief comparison of all approaches"
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an expert programmer who teaches multiple ways to solve problems. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.8;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Alternative solutions error:", error);
    return { approaches: [], comparison: "" };
  }
}

export async function reviewCode(
  code: string,
  language: string,
  questionContext?: string
): Promise<{
  overallQuality: number;
  strengths: string[];
  improvements: string[];
  bugs: Array<{ line: string; issue: string; fix: string }>;
  bestPractices: string[];
  optimizations: string[];
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        Review this ${language} code:
        
        ${questionContext ? `Context: ${questionContext}` : ""}
        
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Provide:
        1. Overall quality score (0-100)
        2. What the code does well (strengths)
        3. Areas for improvement
        4. Potential bugs or errors
        5. Best practices recommendations
        6. Performance optimizations
        
        Return JSON:
        {
            "overallQuality": number,
            "strengths": ["strength1", "strength2"],
            "improvements": ["improvement1", "improvement2"],
            "bugs": [{"line": "line reference", "issue": "description", "fix": "suggested fix"}],
            "bestPractices": ["practice1", "practice2"],
            "optimizations": ["optimization1", "optimization2"]
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an expert code reviewer. Be constructive and specific. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.4;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Code review error:", error);
    return {
      overallQuality: 0,
      strengths: [],
      improvements: [],
      bugs: [],
      bestPractices: [],
      optimizations: [],
    };
  }
}

export async function conversationalTutor(
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  examContext: {
    questionText: string;
    studentAnswer: string;
    feedback: string;
    marks: number;
    maxMarks: number;
  }
): Promise<string> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const systemPrompt = `You are a helpful AI tutor helping a student understand their exam results.

Context:
Question: ${examContext.questionText.replace(/<[^>]*>/g, "")}
Student's Answer: ${examContext.studentAnswer}
Marks: ${examContext.marks}/${examContext.maxMarks}
Feedback: ${examContext.feedback}

Be encouraging, patient, and explain concepts clearly. Use examples when helpful. Keep responses concise (2-3 paragraphs max).`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
  ];

  const params: any = {
    model: deploymentName,
    messages,
    // max_tokens: 400,
  };

  if (!isDeterministicModel) {
    params.temperature = 0.7;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return (
      result.choices[0]?.message?.content?.trim() ||
      "I'm having trouble responding right now."
    );
  } catch (error) {
    console.error("Conversational tutor error:", error);
    return "I'm having trouble responding right now. Please try again.";
  }
}

export async function generateQuestionsForExam(config: {
  language: string;
  questionType: "coding" | "mcq" | "both";
  difficulty: "easy" | "medium" | "hard";
  count: number;
  topics?: string[];
  marks?: number; // marks per question or total
}): Promise<
  Array<{
    questionText: string;
    difficulty: string;
    marks: number;
    type: "coding" | "mcq";
    expectedOutput?: string;
    testCases?: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }>;
    starterCode?: string;
    solution: string;
    hints?: string[];
    options?: Array<{ id: number; text: string; isCorrect: boolean }>;
    tags: string[];
  }>
> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const topicsText =
    config.topics && config.topics.length > 0
      ? `Focus on these topics: ${config.topics.join(", ")}`
      : "";

  const prompt = `Generate ${config.count} ${config.difficulty} ${
    config.questionType === "both" ? "coding and MCQ" : config.questionType
  } questions for ${config.language}.

${topicsText}

Requirements:
- Each question should be ${config.difficulty} difficulty
- ${
    config.questionType === "coding"
      ? "Include test cases, starter code, and solution"
      : ""
  }
- ${
    config.questionType === "mcq"
      ? "Include 4 options with one correct answer"
      : ""
  }
- Assign appropriate marks (${
    config.marks ? config.marks + " marks each" : "5-20 based on complexity"
  })
- Add 1-3 relevant tags
- ${
    config.questionType === "coding"
      ? "Include 3-4 test cases (mix visible and hidden)"
      : ""
  }
- Make questions practical and realistic

${
  config.questionType === "coding"
    ? `
For CODING questions return:
{
  "questions": [
    {
      "questionText": "Clear problem with examples in HTML format",
      "difficulty": "${config.difficulty}",
      "marks": number,
      "type": "coding",
      "expectedOutput": "sample output description",
      "testCases": [
        {"input": "test input", "expectedOutput": "expected result", "isHidden": false},
        {"input": "edge case", "expectedOutput": "result", "isHidden": true}
      ],
      "starterCode": "function template for ${config.language}",
      "solution": "complete working solution with comments",
      "hints": ["hint 1", "hint 2"],
      "tags": ["tag1", "tag2"]
    }
  ]
}
`
    : ""
}

${
  config.questionType === "mcq"
    ? `
For MCQ questions return:
{
  "questions": [
    {
      "questionText": "Question text in HTML format",
      "difficulty": "${config.difficulty}",
      "marks": number,
      "type": "mcq",
      "options": [
        {"id": 1, "text": "Option A", "isCorrect": false},
        {"id": 2, "text": "Option B", "isCorrect": true},
        {"id": 3, "text": "Option C", "isCorrect": false},
        {"id": 4, "text": "Option D", "isCorrect": false}
      ],
      "solution": "Explanation why correct answer is right",
      "tags": ["tag1", "tag2"]
    }
  ]
}
`
    : ""
}

${
  config.questionType === "both"
    ? "Generate a mix of coding and MCQ questions."
    : ""
}

Return ONLY valid JSON, no markdown or extra text.`;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: `You are an expert ${config.language} instructor creating exam questions. Generate realistic, practical problems that test real understanding. Return only valid JSON.`,
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.8;
    params.top_p = 0.95;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    const data = JSON.parse(content);

    console.log(data);

    return data.questions || [];
  } catch (error: any) {
    console.error("AI Question Generation Error:", error.message);
    throw new Error("Failed to generate questions with AI");
  }
}

export async function validateQuestion(
  questionText: string,
  questionType: "coding" | "mcq",
  language?: string,
  expectedOutput?: string,
  options?: Array<{ text: string; isCorrect: boolean }>,
  testCases?: Array<{ input: string; expectedOutput: string }>,
  marks?: number
): Promise<{
  isValid: boolean;
  overallScore: number; // 0-100
  issues: Array<{
    severity: "critical" | "warning" | "suggestion";
    category:
      | "clarity"
      | "grammar"
      | "completeness"
      | "difficulty"
      | "technical";
    message: string;
    suggestion?: string;
  }>;
  suggestions: string[];
  estimatedDifficulty?: "easy" | "medium" | "hard";
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Analyze this ${questionType} question and provide detailed validation feedback.

Question Text: ${questionText}
Type: ${questionType}
Language: ${language || "N/A"}
${expectedOutput ? `Expected Output: ${expectedOutput}` : ""}
${marks ? `Marks: ${marks}` : ""}

${
  questionType === "mcq" && options
    ? `
Options:
${options
  .map((opt, i) => `${i + 1}. ${opt.text} ${opt.isCorrect ? "(Correct)" : ""}`)
  .join("\n")}
Correct answers count: ${options.filter((o) => o.isCorrect).length}
`
    : ""
}

${
  questionType === "coding" && testCases
    ? `
Test Cases: ${testCases.length} provided
`
    : ""
}

Validate the question for:
1. **Clarity**: Is it clear, unambiguous, and easy to understand?
2. **Grammar**: Any spelling or grammar issues?
3. **Completeness**: Missing information, test cases, or details?
4. **Technical Accuracy**: Any technical errors or impossibilities?
5. **Difficulty Alignment**: Does it match typical ${
    marks ? marks + "-mark" : ""
  } questions?
${
  questionType === "mcq"
    ? "6. **MCQ Quality**: Are options distinct, is there exactly one correct answer?"
    : ""
}
${
  questionType === "coding"
    ? "6. **Coding Quality**: Are requirements clear, is expected output reasonable?"
    : ""
}

Return JSON:
{
    "isValid": boolean,
    "overallScore": number (0-100),
    "issues": [
        {
            "severity": "critical|warning|suggestion",
            "category": "clarity|grammar|completeness|difficulty|technical",
            "message": "specific issue description",
            "suggestion": "how to fix it"
        }
    ],
    "suggestions": ["general improvement suggestions"],
    "estimatedDifficulty": "easy|medium|hard"
}

Critical issues: Must fix before exam creation
Warnings: Should fix but not blocking
Suggestions: Nice to have improvements`;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an expert educational content validator. Be thorough but constructive. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.3;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const validation = JSON.parse(result.choices[0]?.message?.content || "{}");

    return {
      isValid: validation.isValid ?? true,
      overallScore: validation.overallScore ?? 100,
      issues: validation.issues ?? [],
      suggestions: validation.suggestions ?? [],
      estimatedDifficulty: validation.estimatedDifficulty,
    };
  } catch (error) {
    console.error("Question validation error:", error);
    return {
      isValid: true,
      overallScore: 0,
      issues: [
        {
          severity: "warning",
          category: "technical",
          message: "Unable to validate question automatically",
          suggestion: "Please review manually",
        },
      ],
      suggestions: [],
    };
  }
}

export async function generatePracticeQuestionsFromWeakAreas(
  userEmail: string,
  weakAreas: Array<{
    topic: string;
    language: string;
    score: number;
    description: string;
  }>,
  count: number = 5
): Promise<
  Array<{
    questionTitle: string;
    questionDescription: string;
    language: string;
    difficulty: "Easy" | "Medium" | "Hard";
    topic: string;
    starterCode: string;
    testCases: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }>;
    solutionCode: string;
    solutionExplanation: string;
    hints: string[];
    weakArea: string;
  }>
> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  // Determine difficulty based on average score
  const avgScore =
    weakAreas.reduce((sum, area) => sum + area.score, 0) / weakAreas.length;
  const baseDifficulty =
    avgScore < 40 ? "Easy" : avgScore < 70 ? "Medium" : "Hard";

  const prompt = `You are generating personalized coding practice questions to help a student improve their weak areas.

Weak Areas Analysis:
${weakAreas
  .map(
    (area, i) => `
${i + 1}. Topic: ${area.topic}
   Language: ${area.language}
   Current Score: ${area.score}%
   Issue: ${area.description}
`
  )
  .join("\n")}

Generate ${count} practice coding questions that specifically target these weaknesses.

CRITICAL TEST CASE FORMAT RULES:
1. The "input" field should be the EXACT argument(s) to pass to the function
2. For a function like: def sum_numbers(nums):
   - Correct input: "[1, 2, 3, 4]"  (a list to pass as the single argument)
3. For a function like: def categorize_scores(scores):
   - Correct input: "[85, 92, 45, 78, 55]"  (a list of numbers)
4. The function receives the ENTIRE input as a SINGLE argument
5. DO NOT use dictionary format with key names unless the function actually expects a dictionary

Requirements for each question:
1. Focus on one of the weak areas listed above
2. Base difficulty: ${baseDifficulty} (but adjust per topic as needed)
3. Include a clear problem statement with examples
4. Provide starter code template
5. Include 3-5 test cases (mix of visible and hidden)
6. Provide complete solution with explanation
7. Add 2-3 progressive hints
8. Make it practical and realistic

EXAMPLE QUESTION FORMAT:

For a function: def sum_even_numbers(nums):

CORRECT test cases:
{
  "input": "[2, 4, 6, 8, 10]",
  "expectedOutput": "30",
  "isHidden": false
}

For a function: def categorize_scores(scores):

CORRECT test cases:
{
  "input": "[85, 92, 45, 78, 55, 90]",
  "expectedOutput": "{'pass': 4, 'fail': 2}",
  "isHidden": false
}

CRITICAL TEST CASE FORMAT RULES FOR PYTHON:

1. **Single primitive argument** (int, str, float, bool):
   Function: def fizz_buzz(n):
   Input format: "15"  (just the value, not in a list)
   ❌ WRONG: "[15]"
   ✅ CORRECT: "15"

2. **Single list argument**:
   Function: def sum_numbers(nums):
   Input format: "[1, 2, 3, 4]"  (the list itself)
   ✅ CORRECT: "[1, 2, 3, 4]"

3. **Multiple arguments**:
   Function: def add(a, b):
   Input format: "[5, 3]"  (list that will be unpacked)
   ✅ CORRECT: "[5, 3]"

4. **Dictionary argument**:
   Function: def process_data(data):
   Input format: "{\"key\": \"value\"}"
   ✅ CORRECT: "{\"key\": \"value\"}"

5. **String argument**:
   Function: def reverse_string(text):
   Input format: "\"hello\""  (string in quotes)
   ✅ CORRECT: "\"hello\""

EXAMPLES:

Example 1 - Single integer:
{
  "starterCode": "def factorial(n):\\n    pass",
  "testCases": [
    {"input": "5", "expectedOutput": "120", "isHidden": false},
    {"input": "0", "expectedOutput": "1", "isHidden": false}
  ]
}

Example 2 - List argument:
{
  "starterCode": "def sum_list(numbers):\\n    pass",
  "testCases": [
    {"input": "[1, 2, 3, 4]", "expectedOutput": "10", "isHidden": false},
    {"input": "[]", "expectedOutput": "0", "isHidden": true}
  ]
}

Example 3 - String argument:
{
  "starterCode": "def count_vowels(text):\\n    pass",
  "testCases": [
    {"input": "\"hello\"", "expectedOutput": "2", "isHidden": false},
    {"input": "\"world\"", "expectedOutput": "1", "isHidden": true}
  ]
}

Example 4 - Two arguments:
{
  "starterCode": "def power(base, exp):\\n    pass",
  "testCases": [
    {"input": "[2, 3]", "expectedOutput": "8", "isHidden": false},
    {"input": "[5, 2]", "expectedOutput": "25", "isHidden": true}
  ]
}

Return JSON in this EXACT format:
{
  "questions": [
    {
      "questionTitle": "Count Even Numbers in List",
      "questionDescription": "<p>Write a function that takes a list of integers and returns the count of even numbers.</p><p><strong>Example:</strong></p><pre>Input: [1, 2, 3, 4, 5, 6]\nOutput: 3</pre>",
      "language": "Python",
      "difficulty": "Easy",
      "topic": "Arrays",
      "starterCode": "def count_even(nums):\\n    # Write your code here\\n    pass",
      "testCases": [
        {
          "input": "[2, 4, 6, 8]",
          "expectedOutput": "4",
          "isHidden": false
        },
        {
          "input": "[1, 3, 5, 7]",
          "expectedOutput": "0",
          "isHidden": false
        },
        {
          "input": "[1, 2, 3, 4, 5]",
          "expectedOutput": "2",
          "isHidden": true
        }
      ],
      "solutionCode": "def count_even(nums):\\n    count = 0\\n    for num in nums:\\n        if num % 2 == 0:\\n            count += 1\\n    return count",
      "solutionExplanation": "Iterate through the list and count numbers divisible by 2",
      "hints": ["Check if a number is divisible by 2", "Use a counter variable"],
      "weakArea": "Loop iteration and conditionals"
    }
  ]
}

IMPORTANT: The input field must be valid JSON that represents the SINGLE argument to the function.

Return ONLY valid JSON, no markdown formatting or extra text.`;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an expert programming instructor creating personalized practice questions. Focus on helping students overcome specific weaknesses. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.8;
    params.top_p = 0.95;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    const data = JSON.parse(content);

    return data.questions || [];
  } catch (error: any) {
    console.error("Practice Question Generation Error:", error.message);
    throw new Error("Failed to generate practice questions");
  }
}
