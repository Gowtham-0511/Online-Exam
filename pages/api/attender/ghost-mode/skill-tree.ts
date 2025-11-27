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
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const prompt = `Generate a comprehensive programming skill tree with 12 skill nodes across 4 levels.
Each skill should have realistic prerequisites and progression.

Return a JSON array with this exact structure:
[
  {
    "id": "unique-id",
    "title": "Skill Name",
    "description": "Brief description",
    "icon": "Code2|Layers|Cpu|Database|Globe|Shield|Terminal|Server|Lock|Zap",
    "status": "completed|available|locked",
    "level": 1-4,
    "xp": 0-200,
    "maxXp": 100-250,
    "prerequisites": ["skill-id"],
    "challenges": 5-15,
    "color": "emerald|blue|purple|amber|rose|cyan|indigo|orange"
  }
]

Rules:
- Level 1 (Foundations): 3 nodes, status can be "completed" or "available", no prerequisites
- Level 2 (Intermediate): 3 nodes, require Level 1 skills
- Level 3 (Advanced): 3 nodes, require Level 2 skills  
- Level 4 (Expert): 3 nodes, require Level 3 skills
- Use varied icons from the list
- XP should reflect progress (completed=maxXp, available=partial, locked=0)
- Make it realistic for a programming learning path

Return ONLY the JSON array.`;

        const result = await client.chat.completions.create({
            model: deploymentName,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert curriculum designer for programming education. Always return valid JSON arrays.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            // temperature: 0.8,
        });

        const content = result.choices[0]?.message?.content?.trim() || '';

        // Extract JSON from response
        let jsonContent = content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            jsonContent = jsonMatch[0];
        }

        const skillNodes = JSON.parse(jsonContent);

        return res.status(200).json({ skillNodes });

    } catch (error: any) {
        console.error('Skill tree generation error:', error);
        return res.status(500).json({
            error: 'Failed to generate skill tree',
            details: error.message
        });
    }
}
