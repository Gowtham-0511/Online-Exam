// pages/api/attender/ghost-mode/study-buddy.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { AzureOpenAI } from 'openai';

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

    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

        const systemPrompt = `You are an AI Study Buddy - a friendly, patient, and knowledgeable learning companion. Your role is to help students learn effectively through:

**Teaching Style:**
- Explain concepts clearly with examples and analogies
- Break down complex topics into digestible parts
- Encourage active learning through questions
- Adapt explanations to the student's level
- Use Socratic method when appropriate

**Capabilities:**
1. **Concept Explanations**: Explain any topic with examples, analogies, and real-world applications
2. **Code Debugging**: Help identify and fix coding issues, explain errors, suggest improvements
3. **Practice Problems**: Create custom practice questions and exercises
4. **Quiz Generation**: Test understanding with questions and immediate feedback
5. **Study Strategies**: Suggest effective learning techniques and study methods

**Interaction Guidelines:**
- Be encouraging and supportive
- Celebrate progress and learning moments
- Ask follow-up questions to ensure understanding
- Provide hints before giving full answers
- Use formatting (code blocks, lists, bold) for clarity
- Keep responses concise but thorough (2-4 paragraphs max unless explaining complex topics)

**When helping with code:**
- Always format code in proper markdown code blocks with language tags
- Explain what the code does
- Point out common pitfalls
- Suggest best practices

Remember: This is Ghost Mode - the student is here to learn without pressure. Make mistakes a positive learning opportunity!`;

        const params: any = {
            model: deploymentName,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            // max_tokens: 1000,
        };

        if (!isDeterministicModel) {
            params.temperature = 0.7;
            params.top_p = 0.9;
        }

        const completion = await client.chat.completions.create(params);

        const response = completion.choices[0]?.message?.content ||
            "I apologize, but I'm having trouble responding right now. Could you try asking again?";

        return res.status(200).json({ response });

    } catch (error: any) {
        console.error('AI Study Buddy Error:', error);

        // Handle specific Azure OpenAI errors
        if (error.status === 429) {
            return res.status(429).json({
                error: 'Too many requests. Please wait a moment and try again.'
            });
        }

        if (error.status === 400) {
            return res.status(400).json({
                error: 'Invalid request. Please try rephrasing your question.'
            });
        }

        return res.status(500).json({
            error: 'An error occurred while processing your request.'
        });
    }
}