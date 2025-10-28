import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { language, difficulty, duration, focusAreas } = req.body;

    if (!language || !difficulty || !duration) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const prompt = `Create a ${duration}-week learning plan for ${language} programming at ${difficulty} level.
${focusAreas?.length > 0 ? `Focus areas: ${focusAreas.join(', ')}` : ''}

For each week, provide:
1. 3-5 specific topics to cover
2. 2-4 measurable learning goals
3. 3-5 learning resources (with realistic titles, URLs, and types: documentation/course/tutorial/article/practice/book)
4. 1-2 assessments or practice exercises

Return JSON in this exact format:
{
  "weeks": [
    {
      "weekNumber": 1,
      "topics": ["Topic 1", "Topic 2"],
      "goals": ["Goal 1", "Goal 2"],
      "resources": [
        {"title": "Resource Name", "url": "https://example.com", "type": "documentation"}
      ],
      "assessments": ["Assessment 1"]
    }
  ]
}`;

    const params: any = {
        model: deploymentName,
        messages: [
            {
                role: "system",
                content: "You are an educational AI that creates structured learning plans. Return only valid JSON, no markdown."
            },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    };

    if (!isDeterministicModel) {
        params.temperature = 0.7;
        params.top_p = 0.9;
    }

    try {
        const result = await client.chat.completions.create(params);
        const content = result.choices[0]?.message?.content?.trim() || "{}";
        const plan = JSON.parse(content);

        return res.status(200).json({ success: true, plan });
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return res.status(500).json({
            error: 'Failed to generate learning plan',
            message: error.message
        });
    }
}