/**
 * Utility function to analyze video frames with Gemini AI
 */

export interface GeminiAnalysis {
    isViolation: boolean;
    confidence: number;
    reason: string;
    severity: "low" | "medium" | "high" | "critical";
    recommendation: "allow" | "warn" | "flag" | "disqualify";
}

export interface GeminiResponse {
    success: boolean;
    analysis: GeminiAnalysis;
    raw?: string;
    error?: string;
}

/**
 * Analyze a video frame using Gemini AI
 * 
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param detectionType - Type of violation detected by MediaPipe
 * @param context - Additional context (e.g., object name detected)
 * @returns Promise with Gemini's analysis
 */
export async function analyzeWithGemini(
    imageBase64: string,
    detectionType: "multiple_faces" | "no_face" | "suspicious_object" | "behavioral_analysis",
    context?: { objectName?: string; metadata?: any }
): Promise<GeminiResponse> {
    try {
        const response = await fetch("/api/analyze-with-gemini", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                image: imageBase64,
                detectionType,
                context,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to analyze with Gemini");
        }

        const data: GeminiResponse = await response.json();
        return data;

    } catch (error) {
        console.error("❌ Gemini analysis error:", error);
        return {
            success: false,
            analysis: {
                isViolation: false,
                confidence: 0,
                reason: error instanceof Error ? error.message : "Unknown error",
                severity: "low",
                recommendation: "allow",
            },
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Store violation with AI analysis
 */
export async function storeViolationWithAI(
    imageBase64: string,
    email: string,
    examId: string,
    reason: string,
    aiAnalysis: GeminiAnalysis
): Promise<{ success: boolean; violationId?: number }> {
    try {
        const response = await fetch("/api/store-violation-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                image: imageBase64,
                email,
                examId,
                reason,
                time: new Date().toISOString(),
                aiAnalysis,
                aiConfidence: aiAnalysis.confidence,
                severity: aiAnalysis.severity,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to store violation");
        }

        return {
            success: true,
            violationId: data.violationId,
        };

    } catch (error) {
        console.error("❌ Error storing violation with AI:", error);
        return {
            success: false,
        };
    }
}

/**
 * Capture frame from video element as base64
 */
export function captureVideoFrame(videoElement: HTMLVideoElement): string | null {
    try {
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Return base64 with data URL prefix
        return canvas.toDataURL("image/jpeg", 0.8);
    } catch (error) {
        console.error("Failed to capture video frame:", error);
        return null;
    }
}