import { AzureOpenAI } from "openai";
import logger from "@/lib/logger";

export async function POST(req: Request) {
    const endpoint = (process.env.AZURE_OAI_ENDPOINT || "").replace(/^['"]|['"]$/g, "");
    const apiKey = process.env.AZURE_OAI_API_KEY || "";
    const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
    const apiVersion = process.env.AZURE_OAI_API_VER || "";

    const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });

    try {
        const { action, currentCase, userModel } = await req.json();

        if (action === 'generate') {
            const systemPrompt = `You are a Principal Data Architect. Generate a realistic and challenging "Schema Design" scenario.
      
      The request should come from a non-technical Stakeholder (CFO, Head of Marketing, etc.) who has a complex business need but vague technical requirements.
      
      Parameters:
      - Platform: Snowflake or Databricks (choose one randomly or mix)
      - Domain: Retail, FinTech, AdTech, or SaaS.
      
      Return ONLY valid JSON:
      {
        "title": "string",
        "stakeholder": "string (Title of the person)",
        "businessRequest": "string (The vague, complex request)",
        "constraints": ["string", "string"],
        "recommendedPlatform": "Snowflake | Databricks",
        "evaluationCriteria": "string (How the AI will judge the model)"
      }`;

            const completion = await client.chat.completions.create({
                model: deploymentName,
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate a new schema design mission." }],
                response_format: { type: "json_object" }
            });

            const response = JSON.parse(completion.choices[0]?.message?.content || "{}");
            return new Response(JSON.stringify(response), { status: 200 });
        }

        if (action === 'evaluate') {
            const systemPrompt = `You are a Lead Data Modeler. Evaluate the user's proposed data model for the following scenario:
      
      Scenario: ${currentCase.title}
      Business Request: ${currentCase.businessRequest}
      Platform: ${currentCase.recommendedPlatform}
      
      User's Proposed Model:
      ${userModel}
      
      Provide a rigorous evaluation:
      1. Score (0-100)
      2. Performance Analysis (How will this scale on ${currentCase.recommendedPlatform}?)
      3. Cost Impact (Is it efficient or will it blow the budget?)
      4. Suggested Improvements
      
      Return JSON:
      {
        "score": number,
        "feedback": "string",
        "performanceAnalysis": "string",
        "costImpact": "string",
        "isApproved": boolean
      }`;

            const completion = await client.chat.completions.create({
                model: deploymentName,
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Critique my data model." }],
                response_format: { type: "json_object" }
            });

            const response = JSON.parse(completion.choices[0]?.message?.content || "{}");
            return new Response(JSON.stringify(response), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

    } catch (error: any) {
        logger.error("Schema Architect API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
