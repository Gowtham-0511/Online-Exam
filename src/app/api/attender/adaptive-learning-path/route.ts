import { generateStudyPlan } from "@/lib/ai/azureOpenAI";
import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    // Get student's performance data
    const performanceQuery = `
        SELECT 
            s."userName",
            s."answersWithQuestionIds",
            s."ai_feedback",
            a.questions,
            a.language
        FROM submissions s
        INNER JOIN "Assessment" a ON s."examId" = a.title
        WHERE s.email = $1
        AND s.disqualified = false
        ORDER BY s."submittedAt" DESC
        LIMIT 10
    `;

    const result = await pool.query(performanceQuery, [email as string]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          hasData: false,
          message: "No performance data available",
        },
        { status: 200 }
      );
    }

    // Aggregate performance by topic
    const topicPerformance: {
      [key: string]: { correct: number; total: number };
    } = {};

    for (const exam of result.rows) {
      const answers = JSON.parse(exam.answersWithQuestionIds || "[]");
      const feedback = JSON.parse(exam.ai_feedback || "[]");
      const questions = JSON.parse(exam.questions || "[]");

      answers.forEach((answer: any, idx: number) => {
        const feedbackItem = feedback[idx] || {};
        const question = questions.find((q: any) => q.id === answer.questionId);

        if (question) {
          const topic = question.topic || question.category || exam.language;
          if (!topicPerformance[topic]) {
            topicPerformance[topic] = { correct: 0, total: 0 };
          }

          const score = parseFloat(feedbackItem.marks || 0);
          const maxMarks = parseFloat(answer.marks || 0);
          const percentage = maxMarks > 0 ? (score / maxMarks) * 100 : 0;

          topicPerformance[topic].total++;
          if (percentage >= 70) topicPerformance[topic].correct++;
        }
      });
    }

    // Calculate strengths and weaknesses
    const strengths = Object.entries(topicPerformance)
      .map(([topic, perf]) => ({
        topic,
        score: Math.round((perf.correct / perf.total) * 100),
      }))
      .filter((item) => item.score >= 70)
      .sort((a, b) => b.score - a.score);

    const weaknesses = Object.entries(topicPerformance)
      .map(([topic, perf]) => ({
        topic,
        score: Math.round((perf.correct / perf.total) * 100),
      }))
      .filter((item) => item.score < 70)
      .sort((a, b) => a.score - b.score);

    const totalQuestions = result.rows.reduce((sum, row) => {
      const answers = JSON.parse(row.answersWithQuestionIds || "[]");
      return sum + answers.length;
    }, 0);

    const successRate =
      strengths.length > 0
        ? strengths.reduce((sum, s) => sum + s.score, 0) / strengths.length
        : 50;

    // Generate AI study plan
    const studyPlan = await generateStudyPlan({
      userName: result.rows[0].userName,
      weaknesses: weaknesses.slice(0, 5),
      strengths: strengths.slice(0, 3),
      totalQuestions,
      successRate,
    });

    return NextResponse.json(
      {
        hasData: true,
        topicPerformance: Object.entries(topicPerformance).map(
          ([topic, perf]) => ({
            topic,
            score: Math.round((perf.correct / perf.total) * 100),
            questionsAttempted: perf.total,
            correctAnswers: perf.correct,
          })
        ),
        strengths,
        weaknesses,
        studyPlan,
        overallStats: {
          totalQuestions,
          successRate: successRate.toFixed(1),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error fetching adaptive learning path for %s:", email, error);
    return NextResponse.json(
      { error: "Failed to generate learning path" },
      { status: 500 }
    );
  }
}
