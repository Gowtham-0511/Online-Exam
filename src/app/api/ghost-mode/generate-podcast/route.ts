import { NextRequest, NextResponse } from "next/server";
import { generatePodcastScript, generateSpeech } from "@/lib/ai/azureOpenAI";
// Lazy load pdf-parse inside the function

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const hostStyle = (formData.get("hostStyle") as string) || "Conversational";
    const duration = (formData.get("duration") as string) || "5 minutes";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Extract Text
    let text = "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === "application/pdf") {
      try {
        const PDFParser = require("pdf2json");
        text = await new Promise((resolve, reject) => {
          const pdfParser = new PDFParser(null, 1); // 1 = text content only

          pdfParser.on("pdfParser_dataError", (errData: any) =>
            reject(new Error(errData.parserError))
          );

          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            // Manually extract text from ALL pages to ensure nothing is missed
            let fullText = "";
            if (pdfData && pdfData.formImage && pdfData.formImage.Pages) {
              pdfData.formImage.Pages.forEach((page: any) => {
                if (page.Texts) {
                  page.Texts.forEach((textItem: any) => {
                    // R is the array of text runs. typically R[0].T is the text (URI encoded)
                    if (textItem.R && textItem.R.length > 0) {
                      const str = textItem.R[0].T;
                      try {
                        fullText += decodeURIComponent(str) + " ";
                      } catch (e) {
                        fullText += str + " ";
                      }
                    }
                  });
                }
                fullText += "\n"; // Add newline between pages
              });
            }

            // Fallback: if manual extraction yield nothing, try built-in method
            if (!fullText.trim()) {
              fullText = pdfParser.getRawTextContent();
            }

            resolve(fullText);
          });

          pdfParser.parseBuffer(buffer);
        });
      } catch (e: any) {
        console.error("PDF Parse Error:", e);
        return NextResponse.json(
          { error: "Failed to parse PDF: " + e.message },
          { status: 500 }
        );
      }
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx")
    ) {
      try {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer: buffer });
        text = result.value;
      } catch (e: any) {
        console.error("DOCX Parse Error:", e);
        return NextResponse.json(
          { error: "Failed to parse DOCX: " + e.message },
          { status: 500 }
        );
      }
    } else {
      // Default to text (handles .txt, .md, etc.)
      text = buffer.toString("utf-8");
    }

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: "Not enough text content found" },
        { status: 400 }
      );
    }

    console.log("Extracted Text Length:", text.length);
    console.log("Extracted Text Preview:", text.substring(0, 500) + "...");

    // 2. Generate Script
    const scriptData = await generatePodcastScript(text, hostStyle, duration);

    if (!scriptData.script || scriptData.script.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate script" },
        { status: 500 }
      );
    }

    // 3. Generate Audio
    const scriptSegments = scriptData.script;
    const audioBuffers: Buffer[] = [];

    for (const segment of scriptSegments) {
      let voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" =
        "alloy";
      if (segment.speaker.includes("A")) voice = "shimmer";
      if (segment.speaker.includes("B")) voice = "onyx";
      const segmentAudio = await generateSpeech(segment.text, voice);
      if (segmentAudio) {
        audioBuffers.push(segmentAudio);
      }
    }

    const finalAudio = Buffer.concat(audioBuffers);

    // Sanitize title for HTTP headers (ASCII only)
    const safeTitle = scriptData.title
      .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes
      .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
      .replace(/[^\x20-\x7E]/g, ""); // Remove other non-ASCII chars

    return new NextResponse(finalAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": finalAudio.length.toString(),
        "X-Podcast-Title": safeTitle,
        "X-Podcast-Context": encodeURIComponent(text.substring(0, 5000)),
      },
    });
  } catch (error: any) {
    console.error("Podcast Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
