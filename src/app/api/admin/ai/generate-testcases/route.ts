import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";

export async function POST(request: NextRequest) {
  const endpoint = (process.env.AZURE_OAI_ENDPOINT || "").replace(
    /^['"]|['"]$/g,
    ""
  );
  const apiKey = process.env.AZURE_OAI_API_KEY || "";
  const deploymentName = process.env.AZURE_OAI_DEPLOY || "";
  const apiVersion = process.env.AZURE_OAI_API_VER || "";

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
  });

  try {
    const body = await request.json();
    const { questionText, language } = body;

    if (!questionText) {
      return NextResponse.json({ error: "Question text is required" });
    }

    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const prompt = `
    You are an expert programming instructor. Generate comprehensive test cases for this coding question.

    Question: ${questionText.replace(/<[^>]*>/g, "")}
    Programming Language: ${language || "Python"}

    Generate 4-6 test cases that include:
    1. Basic/simple cases (2-3 cases)
    2. Edge cases (1-2 cases)
    3. Complex/challenging cases (1-2 cases)

    For each test case, provide:
    - Input: The actual input values
    - Expected Output: The correct output
    - Description: Brief explanation of what this case tests

    Format your response as JSON:
    {
        "testCases": [
            {
                "input": "actual input value",
                "expectedOutput": "expected result",
                "description": "what this tests",
                "isHidden": false
            }
        ]
    }

    Make sure inputs and outputs are realistic and properly formatted for ${
      language || "Python"
    }.
`;

    const params: any = {
      model: deploymentName,
      messages: [
        {
          role: "system",
          content:
            "You are an expert programming instructor who creates comprehensive test cases. Return only valid JSON, no markdown or explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    };

    if (!isDeterministicModel) {
      params.temperature = 0.7;
      params.top_p = 0.9;
    }

    const result = await client.chat.completions.create(params);
    const content = result.choices[0]?.message?.content?.trim() || "{}";

    try {
      const parsedData = JSON.parse(content);

      if (!parsedData.testCases || !Array.isArray(parsedData.testCases)) {
        throw new Error("Invalid response format");
      }

      // Mark some test cases as hidden (last 1-2 cases)
      const testCases = parsedData.testCases.map((tc: any, index: number) => ({
        ...tc,
        isHidden: index >= parsedData.testCases.length - 2, // Last 2 are hidden
      }));

      return NextResponse.json(
        {
          success: true,
          testCases,
        },
        { status: 200 }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        {
          error: "Failed to parse test cases from AI response",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test case generation error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to generate test cases",
        details: errMsg,
      },
      { status: 500 }
    );
  }
}
