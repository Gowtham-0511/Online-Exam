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

    const basePrompt = `Analyze the following ${questionType} question${language ? ` (${language})` : ""
        } and return 1–3 relevant technical tags describing its key topic or concept.
Question:
${cleanText}

Return tags as comma-separated words (like: joins, subquery, recursion, oop).`;

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
