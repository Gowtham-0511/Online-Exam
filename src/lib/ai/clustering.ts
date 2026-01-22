
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

export async function clusteringAnalysis(
    submissions: Array<{
        userName: string;
        email: string;
        examId: string;
        ai_feedback: any;
        answersWithQuestionIds: any;
    }>
): Promise<{
    clusters: Array<{ name: string; description: string; students: string[], avgScore: number }>;
    insights: string[];
    skillGapMap: { [skill: string]: number };
}> {
    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    // Pre-process submissions to a compact summary
    const summary = submissions.map(s => {
        const feedback = typeof s.ai_feedback === 'string' ? JSON.parse(s.ai_feedback) : s.ai_feedback;
        const totalMarks = feedback.reduce((acc: number, f: any) => acc + (f.marks || 0), 0);

        // Extract topics if available or just raw feedback
        const weakAreas = feedback.filter((f: any) => f.marks === 0).map((f: any) => f.feedback.substring(0, 50));

        return {
            user: s.userName,
            score: totalMarks,
            weaknesses: weakAreas
        };
    }).slice(0, 30); // Limit to 30 for token limits if necessary

    const prompt = `Analyze the provided student submissions and group them into distinct clusters based on their performance patterns and skill gaps.
  
    Student Data:
    ${JSON.stringify(summary)}
  
    Output Requirements:
    1. Clusters: Group students into meaningful profiles (e.g., "High Performers", "Logic-Strong but Syntax-Weak", "Need Fundamentals").
    2. IMPORTANT: Only create clusters for students that ACTUALLY EXIST in the data. Do NOT create empty, hypothetical, or "0 member" clusters.
    3. Terminology: Use "group" or "cohort" instead of "batch" to describe the set of students.
    4. Insights: Key observations about the cohort as a whole.
    5. Skill Gap Map: A heatmap of skills vs failure rate (0-100 score where 100 means everyone failed this skill).
  
    Return JSON:
    {
      "clusters": [
        { "name": "Cluster Name", "description": "Why they are grouped", "students": ["User1", "User2"], "avgScore": number }
      ],
      "insights": ["insight1", "insight2"],
      "skillGapMap": { "SQL Joins": 80, "Recursion": 45 }
    }
    `;

    const params: any = {
        model: deploymentName,
        messages: [
            {
                role: "system",
                content: "You are an AI data scientist analyzing educational cohorts. Return strict JSON.",
            },
            { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
    };

    if (!isDeterministicModel) {
        params.temperature = 0.5;
    }

    try {
        const result = await getClient().chat.completions.create(params);
        const content = result.choices[0]?.message?.content?.trim() || "{}";
        return JSON.parse(content);
    } catch (error: any) {
        logger.error("Clustering Analysis Error:", error.message);
        return {
            clusters: [],
            insights: ["Failed to generate clusters."],
            skillGapMap: {}
        };
    }
}
