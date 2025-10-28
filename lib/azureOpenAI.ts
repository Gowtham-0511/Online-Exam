import { AzureOpenAI } from "openai";

const endpoint = process.env.AZURE_OAI_ENDPOINT!.replace(/^['"]|['"]$/g, "");
const apiKey = process.env.AZURE_OAI_API_KEY!;
const deploymentName = process.env.AZURE_OAI_DEPLOY!;
const apiVersion = process.env.AZURE_OAI_API_VER!;

const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
});

export async function generateQuestionTags(
    questionText: string,
    questionType: string,
    language?: string
): Promise<string[]> {
    const cleanText = questionText.replace(/<[^>]*>/g, "").trim();

    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const basePrompt = `
        Analyze the following ${questionType} question${language ? ` (${language})` : ""} 
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

        const result = await client.chat.completions.create(params);

        const content = result.choices[0]?.message?.content?.trim() || "";
        console.log("AI raw content:", JSON.stringify(content));

        // Clean up and normalize
        const tags = content
            .replace(/(^tags?:?|\n)/gi, "")
            .split(/[,;]/)
            .map((tag: string) =>
                tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
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

export async function analyzeStudentPerformance(
    studentData: {
        questionDetails: Array<{
            questionText: string;
            questionType: string;
            score: number;
            maxMarks: number;
            feedback: string;
        }>;
        userName: string;
    }
): Promise<{
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
        ${studentData.questionDetails.map((q, i) => `
        Q${i + 1}: ${q.questionText.replace(/<[^>]*>/g, "").substring(0, 100)}
        Type: ${q.questionType}
        Score: ${q.score}/${q.maxMarks} (${((q.score / q.maxMarks) * 100).toFixed(0)}%)
        Feedback: ${q.feedback}
        `).join('\n')}

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
                content: "You are an educational AI that analyzes student performance. Return only valid JSON, no markdown or explanations.",
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
        const result = await client.chat.completions.create(params);
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
    predictedDifficulty: 'Easy' | 'Medium' | 'Hard';
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
            { role: "system", content: "You are an educational AI that predicts question difficulty. Return only valid JSON." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };

    if (!isDeterministicModel) {
        params.temperature = 0.3;
    }

    try {
        const result = await client.chat.completions.create(params);
        return JSON.parse(result.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Difficulty prediction error:", error);
        return {
            predictedDifficulty: 'Medium',
            confidence: 0,
            reasoning: 'Unable to predict',
            estimatedSuccessRate: 50
        };
    }
}

export async function analyzeCommonMistakes(
    questionText: string,
    studentAnswers: Array<{ answer: string; score: number; maxMarks: number; feedback: string }>
): Promise<{
    commonMistakes: Array<{ pattern: string; frequency: number; suggestion: string }>;
    insights: string[];
    improvementTips: string[];
}> {
    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const prompt = `Analyze student responses to identify common mistakes and patterns:

        Question: ${questionText.replace(/<[^>]*>/g, "")}

        Student Responses (${studentAnswers.length} total):
        ${studentAnswers.slice(0, 10).map((s, i) => `
        Student ${i + 1}: ${s.answer.substring(0, 200)}
        Score: ${s.score}/${s.maxMarks}
        Feedback: ${s.feedback}
        `).join('\n')}

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
            { role: "system", content: "You are an educational AI analyzing student performance patterns. Return only valid JSON." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };

    if (!isDeterministicModel) {
        params.temperature = 0.6;
    }

    try {
        const result = await client.chat.completions.create(params);
        return JSON.parse(result.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Common mistakes analysis error:", error);
        return { commonMistakes: [], insights: [], improvementTips: [] };
    }
}

export async function generateStudyPlan(
    studentData: {
        userName: string;
        weaknesses: Array<{ topic: string; score: number }>;
        strengths: Array<{ topic: string; score: number }>;
        totalQuestions: number;
        successRate: number;
    }
): Promise<{
    weeklyPlan: Array<{ day: string; topic: string; activities: string[]; duration: string }>;
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
        ${studentData.weaknesses.map(w => `- ${w.topic}: ${w.score}%`).join('\n')}

        Strong Areas:
        ${studentData.strengths.map(s => `- ${s.topic}: ${s.score}%`).join('\n')}

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
            { role: "system", content: "You are an educational AI creating personalized study plans. Return only valid JSON." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };

    if (!isDeterministicModel) {
        params.temperature = 0.7;
    }

    try {
        const result = await client.chat.completions.create(params);
        return JSON.parse(result.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Study plan generation error:", error);
        return { weeklyPlan: [], priorityTopics: [], estimatedImprovementTime: "N/A" };
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
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
    insights: string[];
    riskLevel: 'low' | 'medium' | 'high';
}> {
    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const prompt = `Analyze student exam history and predict future performance:

        Exam History (${studentHistory.length} exams):
        ${studentHistory.map((h, i) => `
        Exam ${i + 1}: ${h.score}/${h.totalPossible} (${((h.score / h.totalPossible) * 100).toFixed(1)}%)
        Date: ${h.date}
        `).join('\n')}

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
            { role: "system", content: "You are an educational AI predicting student performance. Return only valid JSON." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };

    if (!isDeterministicModel) {
        params.temperature = 0.4;
    }

    try {
        const result = await client.chat.completions.create(params);
        return JSON.parse(result.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Performance prediction error:", error);
        return {
            predictedScore: 50,
            trend: 'stable',
            confidence: 0,
            insights: [],
            riskLevel: 'medium'
        };
    }
}

export async function compareStudents(
    student1: { userName: string; successRate: number; strengths: string[]; weaknesses: string[] },
    student2: { userName: string; successRate: number; strengths: string[]; weaknesses: string[] }
): Promise<{
    comparison: string;
    recommendations: { forStudent1: string[]; forStudent2: string[] };
    peerLearningOpportunities: string[];
}> {
    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const prompt = `Compare these two students and provide insights:

        Student A: ${student1.userName}
        Success Rate: ${student1.successRate.toFixed(1)}%
        Strengths: ${student1.strengths.join(', ')}
        Weaknesses: ${student1.weaknesses.join(', ')}

        Student B: ${student2.userName}
        Success Rate: ${student2.successRate.toFixed(1)}%
        Strengths: ${student2.strengths.join(', ')}
        Weaknesses: ${student2.weaknesses.join(', ')}

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
            { role: "system", content: "You are an educational AI comparing student performance. Return only valid JSON." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };

    if (!isDeterministicModel) {
        params.temperature = 0.6;
    }

    try {
        const result = await client.chat.completions.create(params);
        return JSON.parse(result.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Student comparison error:", error);
        return {
            comparison: "Unable to compare",
            recommendations: { forStudent1: [], forStudent2: [] },
            peerLearningOpportunities: []
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
): Promise<Array<{
    questionText: string;
    difficulty: string;
    totalMarks: number;
    testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
    starterCode: string;
    solution: string;
    hints: string[];
}>> {
    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const prompt = `Generate ${questionCount} coding practice questions for a learning plan.

        Week ${weekData.weekNumber} Details:
        Topics: ${weekData.topics.join(', ')}
        Goals: ${weekData.goals.join(', ')}
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
                content: "You are an educational AI that creates programming practice questions. Return only valid JSON with realistic, practical coding problems."
            },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };

    if (!isDeterministicModel) {
        params.temperature = 0.8;
        params.top_p = 0.95;
    }

    try {
        const result = await client.chat.completions.create(params);
        const content = result.choices[0]?.message?.content?.trim() || "{}";
        const data = JSON.parse(content);

        return data.questions || [];
    } catch (error: any) {
        console.error("Question generation error:", error.message);
        return [];
    }
}