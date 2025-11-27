import { NextApiRequest, NextApiResponse } from 'next';
import { AzureOpenAI } from 'openai';

const endpoint = process.env.AZURE_OAI_ENDPOINT!.replace(/^['\"]|['\"]$/g, '');
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

    try {
        const { skillTitle, skillDescription, difficulty = 'medium', count = 3 } = req.body;

        if (!skillTitle) {
            return res.status(400).json({ error: 'Skill title is required' });
        }

        const prompt = `Generate ${count} coding challenges for learning "${skillTitle}".
Description: ${skillDescription}
Difficulty: ${difficulty}

For each challenge, provide:
1. A clear title
2. A detailed problem description
3. Example input/output
4. Estimated time to solve (in minutes)
5. XP points to award (10-50 based on difficulty)

Format as JSON array with this structure:
[
  {
    "title": "Challenge title",
    "description": "Problem description with examples",
    "difficulty": "easy|medium|hard",
    "timeEstimate": 15,
    "xpReward": 20
  }
]

Return ONLY the JSON array, no additional text.`;

        const result = await client.chat.completions.create({
            model: deploymentName,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert programming instructor who creates engaging coding challenges. Always return valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            // temperature: 0.7,
        });

        const content = result.choices[0]?.message?.content?.trim() || '';

        // Extract JSON from response (in case there's markdown formatting)
        let jsonContent = content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            jsonContent = jsonMatch[0];
        }

        const challenges = JSON.parse(jsonContent);

        return res.status(200).json({ challenges });

    } catch (error: any) {
        console.error('Challenge generation error:', error);
        return res.status(500).json({
            error: 'Failed to generate challenges',
            details: error.message
        });
    }
}
