import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { examData } = body;

    const { AzureOpenAI } = require("openai");

    const endpoint = process.env.AZURE_OAI_ENDPOINT!.replace(
      /^['"]|['"]$/g,
      ""
    );
    const apiKey = process.env.AZURE_OAI_API_KEY!;
    const deploymentName = process.env.AZURE_OAI_DEPLOY!;
    const apiVersion = process.env.AZURE_OAI_API_VER!;

    const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
    const isDeterministicModel = /(mini|instruct)/i.test(deploymentName);

    const prompt = `Generate a comprehensive exam performance report:
        Exam: ${examData.examTitle}
        Exam ID: ${examData.examId}

        Performance Metrics:
        - Total Students: ${examData.totalStudents}
        - Total Submissions: ${examData.totalSubmissions}
        - Average Score: ${examData.avgScore.toFixed(1)}%
        - Success Rate: ${examData.successRate.toFixed(1)}%
        - Completion Rate: ${examData.completionRate.toFixed(1)}%
        
        Score Distribution:
        - High Performers (≥70%): ${examData.highScores} students
        - Medium Performers (40-69%): ${examData.mediumScores} students
        - Low Performers (<40%): ${examData.lowScores} students
        - Disqualified: ${examData.disqualifiedCount} students

        Generate:
        1. Executive summary (2-3 sentences)
        2. 4-6 key findings about student performance
        3. 3-5 actionable recommendations for improvement

        Return JSON:
        {
            "summary": "Brief executive summary",
            "keyFindings": [
                "Finding 1 with specific data",
                "Finding 2 with specific data"
            ],
            "recommendations": [
                "Actionable recommendation 1",
                "Actionable recommendation 2"
            ]
        }
    `;

    const params: any = {
      model: deploymentName,
      messages: [
        {
          role: "system",
          content:
            "You are an educational AI generating detailed exam reports. Be specific and data-driven. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    };

    if (!isDeterministicModel) {
      params.temperature = 0.6;
    }
    const result = await client.chat.completions.create(params);
    const report = JSON.parse(result.choices[0]?.message?.content || "{}");
    // console.log(report);
    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate exam report" },
      { status: 500 }
    );
  }
}
