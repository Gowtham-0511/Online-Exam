import { NextRequest, NextResponse } from 'next/server';
import { generateLearningPlanQuestions } from '@/lib/ai/azureOpenAI';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { difficulty = "intermediate", language = "python" } = body;

        let topics: string[] = [];

        // Select topics based on language
        if (language === 'sql' || language === 'snowflake') {
            topics = ["Complex Joins", "Window Functions", "Common Table Expressions (CTEs)", "Aggregations", "Data Filtering", "Subqueries"];
        } else if (language === 'pyspark') {
            topics = ["DataFrames API", "RDD Transformations", "Spark SQL", "Aggregations", "Filtering and Sorting", "UDFs"];
        } else {
            // Default Python/Algo
            topics = ["Algorithms", "Data Structures", "Dynamic Programming", "Recursion", "String Manipulation", "Arrays"];
        }

        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        // Add a context hint for SQL/Data questions
        const isDataQuestion = ['sql', 'snowflake', 'pyspark'].includes(language);
        const goals = ["Assess problem solving skills in a competitive environment"];

        if (isDataQuestion) {
            goals.push("Include a sample schema/dataframe definition in the problem description.");
        }

        const questions = await generateLearningPlanQuestions({
            weekNumber: 1,
            topics: [randomTopic],
            goals: goals,
            language: language,
            difficulty: difficulty
        }, 1);

        if (!questions || questions.length === 0) {
            return NextResponse.json({ error: "Failed to generate battle question" }, { status: 500 });
        }

        const question = questions[0];

        // Format for frontend
        return NextResponse.json({
            id: `battle_${Date.now()}`,
            title: `Battle: ${randomTopic} Challenge`,
            description: question.questionText,
            difficulty: question.difficulty,
            timeLimit: difficulty === 'hard' ? 900 : 600, // 15 mins for hard, 10 for others
            starterCode: question.starterCode,
            testCases: question.testCases,
            opponent: {
                name: "Ghost_Bot_v1",
                rating: 1500 + Math.floor(Math.random() * 500)
            }
        });

    } catch (error: any) {
        console.error("Battle start error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
