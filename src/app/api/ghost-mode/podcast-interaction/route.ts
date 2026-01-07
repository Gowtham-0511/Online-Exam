
import { NextRequest, NextResponse } from "next/server";
import {
    transcribeAudio,
    generatePodcastInteraction,
} from "@/lib/ai/azureOpenAI";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get("audio") as File | null;
        const userText = formData.get("text") as string | null;
        const context = formData.get("context") as string;

        // We can also accept chat history if we want a conversation loop
        // const history = JSON.parse(formData.get("history") as string || "[]");
        const history: any[] = []; // Stateless for now

        let inputText = userText || "";

        if (audioFile && audioFile.size > 0) {
            logger.info("Transcribing user audio...");
            const arrayBuffer = await audioFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const transcription = await transcribeAudio(buffer);
            if (transcription) {
                inputText = transcription;
            }
        }

        if (!inputText) {
            return NextResponse.json(
                { error: "No input provided (audio or text)" },
                { status: 400 }
            );
        }

        logger.info("User Input: %s", inputText);

        const interaction = await generatePodcastInteraction(
            inputText,
            context || "No context provided",
            history
        );

        if (!interaction.audio) {
            return NextResponse.json(
                { error: "Failed to generate response audio" },
                { status: 500 }
            );
        }

        return new NextResponse(interaction.audio as any, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": interaction.audio.length.toString(),
                "X-Response-Text": encodeURIComponent(interaction.text),
            },
        });
    } catch (error: any) {
        logger.error("Podcast Interaction Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
