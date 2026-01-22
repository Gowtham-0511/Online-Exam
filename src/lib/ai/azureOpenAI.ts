import { AzureOpenAI } from "openai";
import logger from "@/lib/logger";

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
        Analyze the following ${questionType} question${language ? ` (${language})` : ""
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
    logger.debug("AI raw content: %s", JSON.stringify(content));

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
      logger.warn("⚠️ Empty result — retrying with fallback prompt...");
      const fallbackPrompt = `Give 1–3 short technical keywords for this ${questionType} question:\n${cleanText}\nExample: joins, subquery, recursion`;
      tags = await getTagsFromAI(fallbackPrompt);
    }

    logger.info("Parsed tags: %o", tags);

    return tags.length > 0 ? tags : ["general"];
  } catch (error: any) {
    logger.error("Azure OpenAI Error:", error.message);
    logger.error("Status: %s", error.status);
    logger.error("Code: %s", error.code);
    logger.error("Param: %s", error.param);
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

export async function generateFullExamAnalysis(studentData: {
  userName: string;
  questionDetails: Array<{
    questionText: string;
    questionType: string;
    userAnswer: string;
    isCorrect: boolean;
    testCaseResults?: any[];
  }>;
}): Promise<{
  questionFeedback: string[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Analyze the student's exam performance and provide a detailed report.
        
        Student: ${studentData.userName}
        Questions Attempted: ${studentData.questionDetails.length}

        Performance Data:
        ${studentData.questionDetails
      .map(
        (q, i) => `
        Q${i + 1}: ${q.questionText.replace(/<[^>]*>/g, "").substring(0, 150)}
        Type: ${q.questionType}
        Result: ${q.isCorrect ? "CORRECT/PASS" : "INCORRECT/FAIL"}
        User Answer/Code: ${q.userAnswer.substring(0, 300)}
        ${q.testCaseResults ? `Test Results: ${JSON.stringify(q.testCaseResults)}` : ""}
        `
      )
      .join("\n")}

        Provide:
        1. A concise feedback for EACH question (string array indexed 0 to N-1). Do not use special formatting like bold or unusual character patterns.
        2. A list of 3-4 overall strengths.
        3. A list of 3-4 overall weaknesses.
        4. 3-4 specific areas for improvement.

        IMPORTANT: Return ONLY standard plain text strings. Do NOT use patterns like &char& or any custom character-level escaping.

        Return JSON in this exact format:
        {
          "questionFeedback": ["feedback for Q1", "feedback for Q2", ...],
          "strengths": ["strength 1", "strength 2", ...],
          "weaknesses": ["weakness 1", "weakness 2", ...],
          "improvements": ["improvement 1", "improvement 2", ...]
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You are an expert technical evaluator. Provide constructive, insightful, and accurate feedback. Return only valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.5;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    const analysis = JSON.parse(content);

    return {
      questionFeedback: analysis.questionFeedback || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      improvements: analysis.improvements || [],
    };
  } catch (error: any) {
    logger.error("Full Exam Analysis Error:", error.message);
    return {
      questionFeedback: studentData.questionDetails.map(
        () => "Feedback unavailable"
      ),
      strengths: ["Performance data logged"],
      weaknesses: ["Unable to analyze in depth at this moment"],
      improvements: ["Continue practicing standard problems"],
    };
  }
}

export async function analyzeStudentPerformance(studentData: {
  userName: string;
  questionDetails: Array<{
    questionText: string;
    questionType: string;
    score: number;
    maxMarks: number;
    feedback: string;
  }>;
}): Promise<{
  hasData: boolean;
  strengths: Array<{ topic: string; score: number; description: string }>;
  weaknesses: Array<{ topic: string; score: number; description: string }>;
  recommendations: string[];
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `Analyze the student's overall performance across multiple exams and provide a high-level diagnostic.
        
        Student: ${studentData.userName}
        Total Questions Analyzed: ${studentData.questionDetails.length}

        Performance Details:
        ${studentData.questionDetails
      .map(
        (q, i) => `
        Q${i + 1}: ${q.questionText.replace(/<[^>]*>/g, "").substring(0, 100)}
        Type: ${q.questionType}
        Score: ${q.score}/${q.maxMarks}
        Feedback: ${q.feedback.substring(0, 150)}
        `
      )
      .join("\n")}

        Based on this data, provide:
        1. A list of 2-3 dominant strengths (skills/topics they excel at).
        2. A list of 2-3 focus areas (weaknesses/topics they struggle with).
        3. 3 specific, actionable recommendations for improvement.

        For each strength and weakness, provide:
        - topic: The name of the skill or topic.
        - score: A percentage (0-100) representing their proficiency in that topic.
        - description: A brief explanation of why this was identified.

        Return JSON in this exact format:
        {
          "strengths": [
            { "topic": "Topic Name", "score": number, "description": "reason..." },
            ...
          ],
          "weaknesses": [
            { "topic": "Topic Name", "score": number, "description": "reason..." },
            ...
          ],
          "recommendations": ["rec 1", "rec 2", "rec 3"]
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an AI educational consultant for a coding platform. Analyze student performance data and provide actionable regularized insights. Return only valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.5;
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    const analysis = JSON.parse(content);

    return {
      hasData: true,
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      recommendations: analysis.recommendations || [],
    };
  } catch (error: any) {
    logger.error("Student Performance Analysis Error:", error.message);
    return {
      hasData: false,
      strengths: [],
      weaknesses: [],
      recommendations: [],
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
    logger.error("Difficulty prediction error:", error);
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
    logger.error("Common mistakes analysis error:", error);
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
    logger.error("Study plan generation error:", error);
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
    logger.error("Performance prediction error:", error);
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
    logger.error("Student comparison error:", error);
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
    logger.error("Question generation error:", error.message);
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
        
        ${specificQuery
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
    logger.error("Explain feedback error:", error);
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
    logger.error("Alternative solutions error:", error);
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

  const prompt = `Generate ${config.count} ${config.difficulty} ${config.questionType === "both" ? "coding and MCQ" : config.questionType
    } questions for ${config.language}.

${topicsText}

Requirements:
- Each question should be ${config.difficulty} difficulty
- ${config.questionType === "coding"
      ? "Include test cases, starter code, and solution"
      : ""
    }
- ${config.questionType === "mcq"
      ? "Include 4 options with one correct answer"
      : ""
    }
- Assign appropriate marks (${config.marks ? config.marks + " marks each" : "5-20 based on complexity"
    })
- Add 1-3 relevant tags
- ${config.questionType === "coding"
      ? "Include 3-4 test cases (mix visible and hidden)"
      : ""
    }
- Make questions practical and realistic

${config.questionType === "coding"
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

${config.questionType === "mcq"
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

${config.questionType === "both"
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

${questionType === "mcq" && options
      ? `
Options:
${options
        .map((opt, i) => `${i + 1}. ${opt.text} ${opt.isCorrect ? "(Correct)" : ""}`)
        .join("\n")}
Correct answers count: ${options.filter((o) => o.isCorrect).length}
`
      : ""
    }

${questionType === "coding" && testCases
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
5. **Difficulty Alignment**: Does it match typical ${marks ? marks + "-mark" : ""
    } questions?
${questionType === "mcq"
      ? "6. **MCQ Quality**: Are options distinct, is there exactly one correct answer?"
      : ""
    }
${questionType === "coding"
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

export async function generatePodcastScript(
  sourceText: string,
  hostStyle: string = "Conversational",
  durationTarget: string = "5 minutes"
): Promise<{
  title: string;
  script: Array<{ speaker: string; text: string }>;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  // Calculate target word count (approx 150 words per minute)
  const durationMatch = durationTarget.match(/(\d+)/);
  const minutes = durationMatch ? parseInt(durationMatch[1]) : 5;
  const targetWordCount = minutes * 160; // Slightly higher rate for natural flow

  const prompt = `
        Create a detailed, deep-dive podcast script based on the following text.
        
        SOURCE TEXT:
        ${sourceText}

        CONFIGURATION:
        - Host Style: ${hostStyle}
        - Target Duration: ${durationTarget} (Approx. ${targetWordCount} words)
        - Format: Dialogue between two hosts (Host A and Host B)

        CRITICAL INSTRUCTIONS:
        1. **LENGTH**: You MUST generate a script long enough to fill ${durationTarget}. Aim for at least ${targetWordCount} words. Do not shorten it.
        2. **DEPTH**: Do NOT just summarize. Explain technical concepts in detail, provide examples, and discuss implications.
        3. **COVERAGE**: Cover ALL sections of the source text comprehensively. Do not skip the middle or end sections.
        4. **FLOW**: Make it sound like a real deep-dive conversation. Host A presents data/concepts, Host B challenges them, asks for clarification, or provides analogies.
        5. **STRUCTURE**:
           - Intro (set the stage)
           - Deep Dive Part 1, 2, 3... (go through the content systematically)
           - Key Takeaways
           - Outro

        Return JSON:
        {
          "title": "A Catchy, Descriptive Podcast Title",
          "script": [
            { "speaker": "Host A", "text": "..." },
            { "speaker": "Host B", "text": "..." }
            ... (continue for ${targetWordCount} words)
          ]
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are an expert podcast producer and scriptwriter. Return only valid JSON.",
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
  } catch (error: any) {
    console.error("Podcast script generation error:", error);
    return {
      title: "Error Generating Script",
      script: [],
    };
  }
}

export async function executeCodeInSandbox(
  code: string,
  language: string,
  stdin: string = ""
): Promise<{
  output: string;
  error?: string;
  executionTime?: string;
  status: "success" | "error" | "timeout";
  visualization?: {
    type: "bar" | "line" | "pie" | "area";
    title: string;
    data: any[];
    xKey: string;
    yKey: string;
    description: string;
  };
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        You are a highly advanced Sandbox Code Executor Environment (Ghost Mode).
        Your task is to ACCURATELY SIMULATE the execution of the provided code in the specified language.
        
        Language: ${language}
        
        Input (stdin):
        ${stdin || "No input provided"}
        
        Code:
        ${code}
        
        Instructions:
        1. Analyze the logic carefully.
        2. Determine the expected output based on the code and input.
        3. If there are syntax errors or runtime errors, simulate them accurately.
        4. If the code is infinite loop or too complex, simulate a timeout or memory error.
        5. If the code involves plotting, graphing, or analyzing tabular data (especially in SQL/Pandas/PySpark), enable the 'Virtual Visualization Engine'.
           - Generate a 'visualization' object in the response.
           - Choose the best chart type (bar, line, pie, area) based on the data.
           - Format the data for Recharts (array of objects).

        Return JSON:
        {
            "output": "The stdout output of the code execution",
            "error": "Any stderr error message (or null if none)",
            "executionTime": "Simulated execution time (e.g., '0.042s')",
            "status": "success" | "error" | "timeout",
            "visualization": {
                "type": "bar" | "line" | "pie" | "area",
                "title": "Chart Title",
                "data": [{"name": "Category A", "value": 10}, ...],
                "xKey": "key for x-axis (e.g., 'name')",
                "yKey": "key for y-axis (e.g., 'value')",
                "description": "Brief description of the insight"
            } (optional, only if relevant)
        }
        
        IMPORTANT:
        - Be strict with syntax.
        - The output should be exactly what a terminal would show.
        - Handle edge cases.
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content:
          "You are a code execution engine. Simulate execution accurately without explanation. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.1; // Low temp for more accurate simulation
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error: any) {
    console.error("Sandbox execution error:", error.message);
    return {
      output: "",
      error: "System Error: Unable to execute code in sandbox environment.",
      status: "error",
      executionTime: "0.000s",
    };
  }
}
// @ts-ignore
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export async function generateSpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"
): Promise<Buffer | null> {
  if (!text || !text.trim()) return null;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(
        // Voice mapping from OpenAI names to Edge Neural voices
        getEdgeVoice(voice),
        OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
      );

      // We can collect the stream into a buffer.
      const { audioStream } = await tts.toStream(text); // Access audioStream property

      const chunks: Uint8Array[] = [];
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Stream timeout")), 15000);

        audioStream.on("data", (chunk: any) => chunks.push(chunk));
        audioStream.on("end", () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });
        audioStream.on("error", (err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      return buffer;
    } catch (error: any) {
      console.error(`Speech generation error (Attempt ${attempt + 1}/${maxRetries}):`, error.message || error);
      attempt++;
      if (attempt >= maxRetries) {
        console.error("Max retries reached. Speech generation failed.");
        return null;
      }
      // Linear backoff: 1s, 2s, 3s...
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

function getEdgeVoice(openaiVoice: string): string {
  // Map OpenAI voices to Microsoft Edge Neural Voices
  // These are free and high quality.
  switch (openaiVoice) {
    case "alloy":
      return "en-US-AndrewNeural"; // Male, Neutral
    case "echo":
      return "en-US-BrianNeural"; // Male, Soft
    case "fable":
      return "en-GB-RyanNeural"; // British Male
    case "onyx":
      return "en-US-EricNeural"; // Deep Male
    case "nova":
      return "en-US-MichelleNeural"; // Female
    case "shimmer":
      return "en-US-EmmaNeural"; // Female
    default:
      return "en-US-AndrewNeural";
  }
}

export async function generateSkillTree(
  topic: string,
  userLevel: string = "Beginner"
): Promise<{
  topic: string;
  description: string;
  tiers: Array<{
    tier: number;
    title: string;
    skills: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      status: "locked" | "unlocked" | "completed";
      prerequisites: string[];
      resources: Array<{ title: string; url: string; type: "video" | "article" | "course" }>;
      challenge: {
        question: string;
        options?: string[];
        correctAnswer: string;
      };
    }>;
  }>;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        Create a comprehensive learning skill tree for the topic: "${topic}".
        User Level: ${userLevel}
        
        Structure the skills into progressive Tiers (e.g., Tier 1: Fundamentals, Tier 2: Intermediate, Tier 3: Advanced, Tier 4: Mastery).
        
        For each skill, provide:
        1. A unique ID (short snake_case)
        2. Name and brief description
        3. Prerequisites (IDs of skills in previous tiers that must be known)
        4. Learning resources (provide 1-2 HIGH QUALITY, VALID, DIRECT URLs to official documentation, reputable tutorials (e.g. MDN, W3Schools, RealPython), or popular YouTube videos. DO NOT use generic search URLs. Ensure links are likely to exist.)
        5. A mini-challenge question (multiple choice) to prove knowledge.
        
        Return JSON in this format:
        {
            "topic": "${topic}",
            "description": "Overview of the skill path",
            "tiers": [
                {
                    "tier": 1,
                    "title": "Fundamentals",
                    "skills": [
                        {
                            "id": "skill_id",
                            "name": "Skill Name",
                            "description": "...",
                            "category": "Concept|Syntax|Tool",
                            "status": "unlocked",
                            "prerequisites": [],
                            "resources": [{"title": "Official Docs", "url": "https://react.dev", "type": "article"}],
                            "challenge": {
                                "question": "What is...?", 
                                "options": ["A", "B", "C", "D"],
                                "correctAnswer": "A"
                            }
                        }
                    ]
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
          "You are an expert curriculum designer creating gamified skill trees. Return valid JSON only.",
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
    console.error("Skill tree generation error:", error);
    return {
      topic: topic,
      description: "Failed to generate skill tree.",
      tiers: [],
    };
  }
}

export async function evaluateBattleSubmission(
  code: string,
  language: string,
  question: string,
  testCases: Array<{ input: string; expectedOutput: string }>
): Promise<{
  passed: boolean;
  score: number;
  failedCase?: { input: string; expected: string; actual: string };
  feedback: string;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        Evaluate this code submission for a coding battle.
        
        Question: ${question}
        Language: ${language}
        
        Code:
        ${code}
        
        Test Cases:
        ${testCases.map((tc, i) => `Case ${i + 1}: Input: ${tc.input}, Expected: ${tc.expectedOutput}`).join('\n')}
        
        Task:
        1. Analyze if the code solves the problem correctly.
        2. Check if it passes ALL provided test cases.
        3. If it fails a test case, predict what the actual output would be.
        
        Return JSON:
        {
            "passed": boolean,
            "score": number (0-100),
            "failedCase": { "input": "...", "expected": "...", "actual": "..." } (if passed is false),
            "feedback": "Brief feedback on efficiency or correctness"
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You are a code judge with strict validation criteria. Return only valid JSON."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  };

  if (!isDeterministicModel) {
    params.temperature = 0.1; // Strict evaluation
  }

  try {
    const result = await getClient().chat.completions.create(params);
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch (error: any) {
    console.error("Battle evaluation error:", error.message);
    return {
      passed: false,
      score: 0,
      feedback: "System Error: Unable to evaluate submission."
    };
  }
}

import { toFile } from "openai/uploads";

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const file = await toFile(audioBuffer, "speech.mp3");

    // Note: Azure OpenAI Whisper deployment might have strict naming
    // If using standard OpenAI it's 'whisper-1'. For Azure, it depends on deployment name.
    // We will assume the same deployment name works or fallback to 'whisper'.
    // If the user's deployment doesn't support whisper, this might fail.
    // However, for standard OpenAI patterns, we use the specific model name.

    const result = await getClient().audio.transcriptions.create({
      file: file,
      model: "whisper-1", // This would be the deployment name for Azure
    });

    return result.text;
  } catch (error: any) {
    logger.error("Transcription error:", error.message);
    throw error;
  }
}

/**
 * Simulates the execution of code using AI.
 * This is useful for languages or environments where a real executor is not available
 * or as a fallback when the real executor fails.
 */
export async function simulateExecution(
  code: string,
  language: string,
  question: string,
  testCase: { input: string; expectedOutput: string }
): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        You are a highly accurate code execution engine for ${language}.
        
        Problem Context:
        ${question}
        
        Code to Execute:
        ${code}
        
        Test Case Setup/Input:
        ${testCase.input}
        
        Expected Output (for reference):
        ${testCase.expectedOutput}
        
        Task:
        1. Analyze the code and the test case input.
        2. Simulate exactly what would happen if this code was run in a local ${language} environment.
        3. If it is SQL:
           - Treat the 'Test Case Setup' as the initial state of the database (CREATE TABLE, INSERT INTO).
           - Execute the user's code as a query against this state.
           - Return the result as a JSON array of objects, one per row.
           - Ensure column names match the expected output.
        4. If it is Python/Javascript:
           - Simulate the execution and return the printed output or final expression evaluation.
        5. If there is a runtime error or syntax error, provide a clear error message.

        Return ONLY a JSON object in this format:
        {
            "success": boolean,
            "output": "The simulated output as a string (must be a JSON string of an array for SQL)",
            "error": "Description of the error if success is false"
        }
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You are a precise code simulator. You return only valid JSON representing the execution result."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  };

  if (!isDeterministicModel) {
    params.temperature = 0.0; // Most deterministic
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      success: parsed.success ?? true,
      output: parsed.output || "",
      error: parsed.error
    };
  } catch (error: any) {
    logger.error("AI simulation error:", error.message);
    return {
      success: false,
      output: "",
      error: "AI Simulation failed: " + error.message
    };
  }
}

export async function generatePodcastInteraction(
  userText: string,
  contextText: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ text: string; audio: Buffer | null }> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
        You are simulating a podcast interaction. You are playing the roles of Host A (The Lead, dynamic) and Host B (The Analyst, thoughtful).
        
        CONTEXT OF THE PODCAST:
        "${contextText.substring(0, 1000)}..." (truncated)

        The listener (User) has just chimed in with a comment or question.
        
        USER SAID:
        "${userText}"
        
        INSTRUCTIONS:
        1. Respond in character as Host A and/or Host B.
        2. Acknowledge the user's point naturally.
        3. Answer the question or discuss the comment briefly (2-4 sentences max).
        4. Keep it lively and conversational.
        
        OUTPUT FORMAT:
        Return ONLY the dialogue text.
        Example:
        Host A: That's a great point! I hadn't thought of that.
        Host B: Exactly, and it ties back to the core concept of...
    `;

  const params: any = {
    model: deploymentName,
    messages: [
      { role: "system", content: "You are a podcast host duo. Respond to the listener." },
      ...chatHistory,
      { role: "user", content: prompt }
    ],
  };

  if (!isDeterministicModel) params.temperature = 0.7;

  try {
    const result = await getClient().chat.completions.create(params);
    const responseText = result.choices[0]?.message?.content?.trim() || "Host A: generic response.";

    // Generate Audio for the response
    // We need to parse who is speaking to switch voices, similar to generatePodcastScript
    // But for a quick interaction, we'll just parse the first speaker or do a quick split.
    // For simplicity in this interaction mode, we will generate the whole block with one voice or split it.
    // Let's reuse the logic from generatePodcast if possible, or just simple split.

    const segments = responseText.split("\n").map(line => {
      const [speaker, ...rest] = line.split(":");
      return { speaker: speaker?.trim(), text: rest.join(":").trim() };
    }).filter(s => s.text);

    const audioBuffers: Buffer[] = [];
    for (const segment of segments) {
      let voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy";
      if (segment.speaker.includes("A")) voice = "shimmer";
      if (segment.speaker.includes("B")) voice = "onyx";

      const segmentAudio = await generateSpeech(segment.text, voice);
      if (segmentAudio) audioBuffers.push(segmentAudio);
    }

    const finalAudio = Buffer.concat(audioBuffers);
    return { text: responseText, audio: finalAudio };

  } catch (error: any) {
    console.error("Podcast interaction error:", error);
    return { text: "Error interacting.", audio: null };
  }
}

export async function parseExamCreationIntent(promptText: string): Promise<{
  title: string;
  language: string;
  duration: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  topics: string[];
  totalMarks: number;
  questionTypes: { coding: number; mcq: number };
  questionCount?: number;
}> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
      Analyze the user's intent to create an exam/assessment and extract configuration details.

      User Request: "${promptText}"

      Extract or Infer:
      1. Title: A professional title for the exam.
      2. Language: The programming language (python, sql, java, cpp, javascript, etc.). Default to "python" if unclear.
      3. Duration: In minutes (default 60 if unclear).
      4. Difficulty Distribution: Percentage for easy/medium/hard (must sum to 100).
      5. Topics: List of technical tags/topics mentioned or implied.
      6. Total Marks: Suggested total marks (default 100).
      7. Question Types: Percentage distribution for Coding vs MCQ (must sum to 100).
      8. Question Count: Total number of questions requested (optional, default null if not specified).

      Return JSON:
      {
          "title": "string",
          "language": "string",
          "duration": number,
          "difficultyDistribution": { "easy": number, "medium": number, "hard": number },
          "topics": ["topic1", "topic2"],
          "totalMarks": number,
          "questionTypes": { "coding": number, "mcq": number },
          "questionCount": number | null
      }
  `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You are an AI assistant that configures technical assessments. Return only valid JSON.",
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
    logger.error("Exam intent parsing error:", error);
    return {
      title: "New Assessment",
      language: "python",
      duration: 60,
      difficultyDistribution: { easy: 40, medium: 40, hard: 20 },
      topics: [],
      totalMarks: 100,
      questionTypes: { coding: 70, mcq: 30 },
      questionCount: undefined
    };
  }
}

export async function generateExamQuestions(
  language: string,
  totalMarks: number,
  difficultyDistribution: { easy: number; medium: number; hard: number },
  questionTypes: { coding: number; mcq: number },
  topics: string[],
  questionCount?: number
): Promise<any[]> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
      Create a comprehensive exam paper based on these requirements:
      
      Language: ${language}
      Total Marks: ${totalMarks}
      ${questionCount ? `Target Question Count: Approximately ${questionCount} questions` : ''}
      Topics: ${topics.length > 0 ? topics.join(', ') : 'General ' + language + ' concepts'}
      
      Requirements:
      - Create a mix of Coding and MCQ questions.
      - Adhere to this Difficulty Distribution (approx % of marks): Easy ${difficultyDistribution.easy}%, Medium ${difficultyDistribution.medium}%, Hard ${difficultyDistribution.hard}%.
      - Adhere to this Type Distribution (approx % of marks): Coding ${questionTypes.coding}%, MCQ ${questionTypes.mcq}%.
      
      For Coding Questions:
      - Include clear problem statement.
      - Include 3-4 test cases (inputs/outputs).
      - Include a solution code.
      
      For MCQ Questions:
      - Include 4 options.
      - Indicate correct answer index (0-3).
      
      Return JSON:
      {
          "questions": [
              {
                  "type": "coding",
                  "question": "Problem statement...",
                  "difficulty": "Easy|Medium|Hard",
                  "marks": number,
                  "testCases": [{"input": "...", "expectedOutput": "..."}],
                  "solution": "code...",
                  "tags": ["tag1"]
              },
              {
                  "type": "mcq",
                  "question": "Question text...",
                  "difficulty": "Easy|Medium|Hard",
                  "marks": number,
                  "options": [{"id": 1, "text": "Option A", "isCorrect": false}, ...],
                  "correctAnswer": 2,
                  "tags": ["tag2"]
              }
          ]
      }
  `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You are an expert exam setter. Create high-quality, unique questions. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.7; // High creativity for new questions
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    const data = JSON.parse(content);
    return data.questions || [];
  } catch (error) {
    logger.error("Exam generation error:", error);
    return [];
  }
}

export async function regenerateSingleQuestion(
  language: string,
  type: "coding" | "mcq",
  difficulty: string,
  marks: number,
  topics: string[]
): Promise<any | null> {
  const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

  const prompt = `
      Generate a SINGLE unique ${difficulty} ${type} question for a ${language} exam.
      
      Context:
      - Marks: ${marks}
      - Topics: ${topics.length > 0 ? topics.join(', ') : 'General ' + language + ' concepts'}
      
      ${type === 'coding' ? `
      Requirements for Coding Question:
      - Clear problem statement.
      - 3-4 robust test cases.
      - Efficient solution code.
      ` : `
      Requirements for MCQ Question:
      - Clear question text.
      - 4 distinct options.
      - Correct answer index (0-3).
      `}
      
      Return JSON:
      {
          "type": "${type}",
          "question": "...",
          "difficulty": "${difficulty}",
          "marks": ${marks},
          ${type === 'coding' ? `"testCases": [{"input": "...", "expectedOutput": "..."}], "solution": "...",` : `"options": [{"id": 1, "text": "...", "isCorrect": false}], "correctAnswer": 0,`}
          "tags": ["tag1"]
      }
  `;

  const params: any = {
    model: deploymentName,
    messages: [
      {
        role: "system",
        content: "You are an expert exam setter. Create a high-quality, unique question. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isDeterministicModel) {
    params.temperature = 0.8; // High variation
  }

  try {
    const result = await getClient().chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";
    return JSON.parse(content);
  } catch (error) {
    logger.error("Single question regeneration error:", error);
    return null;
  }
}
