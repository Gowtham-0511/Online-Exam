import { NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { generateSmartHintPrompt } from "@/lib/ai/question-generation";
import logger from "@/lib/logger";

export async function POST(req: Request) {
    const endpoint = process.env.AZURE_OAI_ENDPOINT
        ? process.env.AZURE_OAI_ENDPOINT.replace(/^['"]|['"]$/g, "")
        : "";
    const apiKey = process.env.AZURE_OAI_API_KEY || "";
    const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
    const apiVersion = process.env.AZURE_OAI_API_VER || "";

    if (!endpoint || !apiKey || !deploymentName || !apiVersion) {
        logger.error("Azure OpenAI configuration missing for smart hints");
        return NextResponse.json(
            {
                message: "Server configuration error",
            },
            { status: 500 }
        );
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const { question, userCode, language, error } = body;

    if (!question || !language) {
        return NextResponse.json(
            { message: "Missing required fields (question, language)" },
            { status: 400 }
        );
    }

    // If no user code, maybe just give a general hint about the problem?
    // But for now, let's assume we want to help with their code.
    const prompt = generateSmartHintPrompt(question, userCode || "(No code provided yet)", language, error);

    const client = new AzureOpenAI({
        endpoint,
        apiKey,
        apiVersion,
    });

    const params: any = {
        model: deploymentName,
        messages: [
            { role: "system", content: "You are a helpful coding tutor." },
            { role: "user", content: prompt },
        ],
        // No JSON response format needed, just text
    };

    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);
    if (!isDeterministicModel) {
        params.temperature = 0.5;
    }

    try {
        const result = await client.chat.completions.create(params);
        const hint = result.choices[0]?.message?.content?.trim() || "Try breaking the problem down into smaller steps.";

        return NextResponse.json({ hint });
    } catch (error: any) {
        logger.error("Error generating smart hint:", error);
        return NextResponse.json(
            {
                message: "Failed to generate hint",
                error: error.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}
