import { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Check if API key exists
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "GEMINI_API_KEY not found in environment variables",
                solution: "Add GEMINI_API_KEY to your .env.local file",
                example: 'GEMINI_API_KEY=AIzaSy...'
            });
        }

        console.log("🔍 Testing Gemini API key and models...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Comprehensive list of known Gemini models
        const allKnownModels = [
            // Latest Flash models (Recommended for proctoring)
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",

            // Latest Pro models (More capable, slower)
            "gemini-1.5-pro-latest",
            "gemini-1.5-pro",
            "gemini-1.5-pro-001",
            "gemini-1.5-pro-002",

            // Vision-specific models
            "gemini-pro-vision",

            // Older/Standard models
            "gemini-pro",

            // Experimental models
            "gemini-2.0-flash-exp",

            // Alternative naming conventions
            "models/gemini-1.5-flash-latest",
            "models/gemini-1.5-flash",
            "models/gemini-1.5-pro-latest",
        ];

        const modelResults = [];
        let workingCount = 0;

        // Test each model
        for (const modelName of allKnownModels) {
            try {
                console.log(`Testing: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                // Try a very simple generation to verify it works
                const result = await model.generateContent("Hello");
                const response = await result.response;
                const text = response.text();

                // Model works!
                workingCount++;
                modelResults.push({
                    model: modelName,
                    status: "✅ Available",
                    type: getModelType(modelName),
                    recommended: isRecommendedForProctoring(modelName),
                    speed: getModelSpeed(modelName),
                    quality: getModelQuality(modelName),
                    testResponse: text.substring(0, 50)
                });

                console.log(`✅ ${modelName} works!`);

            } catch (error: any) {
                // Model doesn't work
                const errorMsg = error.message || String(error);
                const errorType = getErrorType(errorMsg);

                modelResults.push({
                    model: modelName,
                    status: "❌ Not Available",
                    type: getModelType(modelName),
                    recommended: false,
                    errorType: errorType,
                    errorMessage: errorMsg.substring(0, 100)
                });

                console.log(`❌ ${modelName} failed: ${errorType}`);
            }
        }

        // Filter results
        const availableModels = modelResults.filter(m => m.status === "✅ Available");
        const unavailableModels = modelResults.filter(m => m.status === "❌ Not Available");

        // Get best recommendation
        const recommendedForProctoring = availableModels.filter(m => m.recommended);
        const bestModel = recommendedForProctoring[0] || availableModels[0];

        // Summary statistics
        const summary = {
            totalTested: allKnownModels.length,
            available: availableModels.length,
            unavailable: unavailableModels.length,
            apiKeyValid: availableModels.length > 0,
        };

        console.log(`\n📊 Summary: ${summary.available}/${summary.totalTested} models available`);

        return res.status(200).json({
            success: true,
            summary,
            recommendedModel: bestModel ? {
                name: bestModel.model,
                reason: "Best balance of speed, quality, and rate limits for proctoring",
                speed: bestModel.speed,
                quality: bestModel.quality,
                type: bestModel.type
            } : null,
            availableModels: availableModels.map(m => ({
                name: m.model,
                type: m.type,
                speed: m.speed,
                quality: m.quality,
                recommended: m.recommended
            })),
            unavailableModels: unavailableModels.map(m => ({
                name: m.model,
                errorType: m.errorType,
                // reason: getErrorExplanation(m.errorType)
            })),
            instructions: availableModels.length > 0 ? {
                step1: `Update your analyze-with-gemini.ts file`,
                step2: `Change model to: "${bestModel?.model}"`,
                step3: `Restart your server and test proctoring`
            } : {
                issue: "No working models found",
                solution1: "Regenerate your API key at https://aistudio.google.com/app/apikey",
                solution2: "Ensure API key has proper permissions",
                solution3: "Check if you're in a supported region"
            }
        });

    } catch (error: any) {
        console.error("❌ API test failed:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to test Gemini API",
            message: error.message,
            suggestions: [
                "Verify GEMINI_API_KEY is set correctly in .env.local",
                "Regenerate API key at https://aistudio.google.com/app/apikey",
                "Check if you have network access to Google AI APIs",
                "Ensure your API key hasn't expired"
            ]
        });
    }
}

// Helper functions
function getModelType(modelName: string): string {
    if (modelName.includes('flash')) return 'Flash (Fast)';
    if (modelName.includes('pro')) return 'Pro (High Quality)';
    if (modelName.includes('vision')) return 'Vision';
    return 'Standard';
}

function isRecommendedForProctoring(modelName: string): boolean {
    const recommended = [
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-flash-001'
    ];
    return recommended.includes(modelName);
}

function getModelSpeed(modelName: string): string {
    if (modelName.includes('flash')) return 'Very Fast (0.5-1s)';
    if (modelName.includes('pro')) return 'Moderate (2-4s)';
    return 'Fast (1-2s)';
}

function getModelQuality(modelName: string): string {
    if (modelName.includes('pro')) return 'Excellent';
    if (modelName.includes('flash')) return 'Very Good';
    return 'Good';
}

function getErrorType(errorMessage: string): string {
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return 'Model Not Found';
    }
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        return 'Rate Limit Exceeded';
    }
    if (errorMessage.includes('403') || errorMessage.includes('permission')) {
        return 'Permission Denied';
    }
    if (errorMessage.includes('401') || errorMessage.includes('API key')) {
        return 'Invalid API Key';
    }
    return 'Unknown Error';
}

function getErrorExplanation(errorType: string): string {
    switch (errorType) {
        case 'Model Not Found':
            return 'This model name is not available with your API key version';
        case 'Rate Limit Exceeded':
            return 'Too many requests - wait a minute or upgrade plan';
        case 'Permission Denied':
            return 'Your API key does not have access to this model';
        case 'Invalid API Key':
            return 'API key is invalid or expired';
        default:
            return 'Unable to access this model';
    }
}