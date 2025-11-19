import { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { image, detectionType, context } = req.body;

        if (!image) {
            return res.status(400).json({
                error: "Missing required field: image (base64)",
            });
        }

        // Remove data URL prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

        // Initialize Gemini 1.5 Flash model (stable, better rate limits)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        // Create prompt based on detection type
        const prompt = createPrompt(detectionType, context);

        // Prepare image part
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        // Generate analysis
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const analysisText = response.text();

        // Parse the JSON response
        let analysis;
        try {
            // Extract JSON from potential markdown code blocks
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
        } catch (parseError) {
            console.error("Failed to parse Gemini response:", analysisText);
            // Fallback response
            analysis = {
                isViolation: false,
                confidence: 0,
                reason: "Failed to parse AI response",
                severity: "low",
                recommendation: "manual_review"
            };
        }

        console.log("✅ Gemini analysis completed:", analysis);

        return res.status(200).json({
            success: true,
            analysis: analysis,
            raw: analysisText
        });

    } catch (error: any) {
        console.error("❌ Gemini analysis error:", error);
        return res.status(500).json({
            error: "Failed to analyze with Gemini",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

function createPrompt(detectionType: string, context: any): string {
    const basePrompt = `You are an AI proctoring assistant analyzing exam behavior. 
Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, no extra text):

{
  "isViolation": true/false,
  "confidence": 0-100,
  "reason": "detailed explanation",
  "severity": "low/medium/high/critical",
  "recommendation": "allow/warn/flag/disqualify"
}`;

    switch (detectionType) {
        case "multiple_faces":
            return `${basePrompt}

TASK: Analyze if there are multiple people in this exam frame.

RULES:
- Single person clearly visible = NOT a violation
- Multiple distinct faces = VIOLATION
- Reflections or posters in background = NOT a violation
- Someone partially visible helping = VIOLATION

Analyze the image and respond with JSON.`;

        case "no_face":
            return `${basePrompt}

TASK: Analyze why no face is detected in this exam frame.

RULES:
- Person looking down briefly = low severity (allow)
- Person turned away reading something = medium severity (warn)
- Person completely absent = high severity (flag)
- Camera covered/blocked = critical severity (disqualify)

Analyze the image and respond with JSON.`;

        case "suspicious_object":
            return `${basePrompt}

TASK: Analyze if there are unauthorized items in this exam frame.

DETECTED OBJECT: ${context?.objectName || "unknown"}

RULES FOR VIOLATIONS:
- Phone/smartphone in hand or being looked at = VIOLATION (high severity)
- Book/notes being read = VIOLATION (high severity)
- Second laptop/screen visible = VIOLATION (critical severity)
- Writing materials (pen, paper) = NOT a violation (allowed)
- Water bottle, coffee, glasses = NOT a violation (allowed)
- Book/phone in background not being used = low severity (warn only)

IMPORTANT: Consider if the object is ACTIVELY BEING USED for cheating, not just present in frame.

Analyze the image and respond with JSON.`;

        case "behavioral_analysis":
            return `${basePrompt}

TASK: Perform comprehensive behavioral analysis of exam-taker.

ANALYZE:
1. Eye gaze direction (looking at screen vs looking away)
2. Head position and orientation
3. Hand movements and gestures
4. Body posture and positioning
5. Any unusual or suspicious behavior

VIOLATIONS:
- Consistently looking away from screen = medium severity
- Reading from off-screen location = high severity
- Unusual hand movements suggesting note-passing = medium severity
- Suspicious gestures (sign language cheating) = high severity

Analyze the image and respond with JSON.`;

        default:
            return `${basePrompt}

TASK: General exam proctoring analysis.

Analyze the image for any suspicious behavior or violations and respond with JSON.`;
    }
}