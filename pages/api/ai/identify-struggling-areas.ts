import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { examId, studentsData } = req.body;

        const { AzureOpenAI } = require("openai");

        const endpoint = process.env.AZURE_OAI_ENDPOINT!.replace(/^['"]|['"]$/g, "");
        const apiKey = process.env.AZURE_OAI_API_KEY!;
        const deploymentName = process.env.AZURE_OAI_DEPLOY!;
        const apiVersion = process.env.AZURE_OAI_API_VER!;

        const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
        const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

        // Calculate statistics
        const lowPerformers = studentsData.filter((s: any) =>
            (s.totalScore / s.totalPossible) * 100 < 40
        );
        const avgCorrect = studentsData.reduce((sum: number, s: any) =>
            sum + s.correctAnswers, 0
        ) / studentsData.length;
        const avgIncorrect = studentsData.reduce((sum: number, s: any) =>
            sum + s.incorrectAnswers, 0
        ) / studentsData.length;

        const prompt = `Identify areas where students struggled in this exam:

            Exam ID: ${examId}
            Total Students: ${studentsData.length}
            Low Performers (<40%): ${lowPerformers.length}
            Avg Correct Answers: ${avgCorrect.toFixed(1)}
            Avg Incorrect Answers: ${avgIncorrect.toFixed(1)}

            Sample Student Performance:
            ${studentsData.slice(0, 5).map((s: any, i: number) => `
            Student ${i + 1}: ${s.totalScore}/${s.totalPossible} (${((s.totalScore / s.totalPossible) * 100).toFixed(0)}%)
            Correct: ${s.correctAnswers}, Incorrect: ${s.incorrectAnswers}
            `).join('\n')}

            Identify:
            1. Top 3-5 areas/topics where students struggled most
            2. Failure rate for each area
            3. Specific recommendations to address each area

            Return JSON:
            {
                "strugglingAreas": [
                    {
                        "topic": "Topic/concept name",
                        "failureRate": number (0-100),
                        "recommendation": "How to help students improve"
                    }
                ]
            }
        `;

        const params: any = {
            model: deploymentName,
            messages: [
                {
                    role: "system",
                    content: "You are an educational AI identifying learning gaps. Return only valid JSON."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        };

        if (!isDeterministicModel) {
            params.temperature = 0.5;
        }

        const result = await client.chat.completions.create(params);
        const analysis = JSON.parse(result.choices[0]?.message?.content || "{}");

        return res.status(200).json(analysis);
    } catch (error: any) {
        console.error("Struggling areas analysis error:", error);
        return res.status(500).json({
            error: "Failed to identify struggling areas",
            strugglingAreas: []
        });
    }
}