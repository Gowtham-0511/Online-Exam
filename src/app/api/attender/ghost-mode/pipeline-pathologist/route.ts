import { AzureOpenAI } from "openai";
import logger from "@/lib/logger";

export async function POST(req: Request) {
    const endpoint = (process.env.AZURE_OAI_ENDPOINT || "").replace(/^['"]|['"]$/g, "");
    const apiKey = process.env.AZURE_OAI_API_KEY || "";
    const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
    const apiVersion = process.env.AZURE_OAI_API_VER || "";

    const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });

    try {
        const { action, currentCase, userDiagnosis } = await req.json();

        if (action === 'generate') {
            const systemPrompt = `You are a Principal Data Architect specializing in Databricks and Snowflake. Generate a complex, realistic "Data Bug" scenario that specifically occurs within a modern Data Stack (Databricks Medallion Architecture or Snowflake Data Cloud).
      
      The scenario must involve one of these infrastructures:
      - **Databricks**: Focus on Delta Lake issues, Unity Catalog permissions, PySpark transformations, Structured Streaming, or Autoloader failures.
      - **Snowflake**: Focus on Snowpipe latency, Stream & Task logic errors, Micro-partitioning performance, or Zero-copy cloning edge cases.

      The scenario should include:
      1. A Title (Professional and descriptive)
      2. A Scenario Description (The business impact: why is the CFO or Data Scientist calling you at 2 AM?)
      3. Technical Logs (Simulation of Databricks Spark UI logs, Snowflake Query Profile errors, or Airflow Task instance logs)
      4. Data Preview (A sample of corrupted/unexpected data in JSON/Table format)
      5. Pipeline Code (A high-quality snippet of PySpark or Snowflake SQL that contains the subtle bug)
      
      Categories of bugs: MERGE logic errors, late-arriving dimensions in Delta Lake, Snowflake task sequencing issues, or data type promotion side-effects.
      
      Return ONLY valid JSON in this format:
      {
        "title": "string",
        "scenario": "string",
        "logs": "string",
        "dataPreview": "string",
        "pipelineCode": "string",
        "hint": "string",
        "rootCause": "string"
      }`;

            const completion = await client.chat.completions.create({
                model: deploymentName,
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate a new complex data pipeline bug scenario." }],
                response_format: { type: "json_object" }
            });

            const response = JSON.parse(completion.choices[0]?.message?.content || "{}");
            return new Response(JSON.stringify(response), { status: 200 });
        }

        if (action === 'evaluate') {
            const systemPrompt = `You are a Senior Staff Data Engineer. Evaluate the user's diagnosis of a pipeline bug.
      
      Bug Details:
      Case: ${currentCase.title}
      Root Cause: ${currentCase.rootCause}
      
      User Diagnosis: ${userDiagnosis}
      
      Provide:
      1. Accuracy Score (0-100)
      2. Feedback (Why they are right/wrong)
      3. Deep Dive (Technical explanation of the concept for learning)
      
      Return JSON:
      {
        "score": number,
        "feedback": "string",
        "deepDive": "string",
        "isCorrect": boolean
      }`;

            const completion = await client.chat.completions.create({
                model: deploymentName,
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Evaluate my diagnosis." }],
                response_format: { type: "json_object" }
            });

            const response = JSON.parse(completion.choices[0]?.message?.content || "{}");
            return new Response(JSON.stringify(response), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

    } catch (error: any) {
        logger.error("Pipeline Pathologist API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
