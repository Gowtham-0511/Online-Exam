import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { examId, avgScore, successRate, totalSubmissions } = req.body;

        // Import your Azure OpenAI client
        const { AzureOpenAI } = require("openai");

        const endpoint = process.env.AZURE_OAI_ENDPOINT!.replace(/^['"]|['"]$/g, "");
        const apiKey = process.env.AZURE_OAI_API_KEY!;
        const deploymentName = process.env.AZURE_OAI_DEPLOY!;
        const apiVersion = process.env.AZURE_OAI_API_VER!;

        const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
        const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

        const prompt = `Analyze this exam's difficulty based on student performance data:

            Exam ID: ${examId}
            Average Score: ${avgScore.toFixed(1)}%
            Success Rate (≥70%): ${successRate.toFixed(1)}%
            Total Submissions: ${totalSubmissions}

            Determine:
            1. Overall difficulty level (Easy/Medium/Hard)
            2. Recommended student level (Beginner/Intermediate/Advanced)
            3. Pass rate analysis
            4. Detailed analysis of the exam difficulty

            Return JSON:
            {
                "overallDifficulty": "Easy|Medium|Hard",
                "recommendedLevel": "Beginner|Intermediate|Advanced",
                "passRate": number (0-100),
                "analysis": "detailed explanation string"
            }
        `;

        const params: any = {
            model: deploymentName,
            messages: [
                {
                    role: "system",
                    content: "You are an educational AI that analyzes exam difficulty. Return only valid JSON, no markdown."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        };

        if (!isDeterministicModel) {
            params.temperature = 0.4;
        }

        const result = await client.chat.completions.create(params);
        const analysis = JSON.parse(result.choices[0]?.message?.content || "{}");

        return res.status(200).json(analysis);
    } catch (error: any) {
        console.error("Exam difficulty analysis error:", error);
        return res.status(500).json({
            error: "Failed to analyze exam difficulty",
            overallDifficulty: "Medium",
            recommendedLevel: "Intermediate",
            passRate: 50,
            analysis: "Unable to generate analysis at this time."
        });
    }
}