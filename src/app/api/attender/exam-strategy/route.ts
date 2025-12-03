import { predictQuestionDifficulty } from "@/lib/ai/azureOpenAI";
import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { examId, email } = await request.json();

  if (!examId || !email) {
    return NextResponse.json(
      { error: "Missing examId or email" },
      { status: 400 }
    );
  }

  try {
    const examQuery = `
        SELECT title, duration, questions, language, "questionConfig"
        FROM "Assessment"
        WHERE title = $1
    `;

    const examResult = await pool.query(examQuery, [examId]);

    if (examResult.rows.length === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const exam = examResult.rows[0];
    const questions = JSON.parse(exam.questions || "[]");
    const duration = exam.duration;

    const historyQuery = `
        SELECT 
            s."answersWithQuestionIds",
            s."ai_feedback",
            a.questions,
            a.language
        FROM submissions s
        INNER JOIN "Assessment" a ON s."examId" = a.title
        WHERE s.email = $1
        AND a.language = $2
        AND s.disqualified = false
        ORDER BY s."submittedAt" DESC
        LIMIT 5
    `;

    const historyResult = await pool.query(historyQuery, [
      email,
      exam.language,
    ]);

    const topicPerformance: { [key: string]: number[] } = {};

    for (const row of historyResult.rows) {
      const answers = JSON.parse(row.answersWithQuestionIds || "[]");
      const feedback = JSON.parse(row.ai_feedback || "[]");
      const pastQuestions = JSON.parse(row.questions || "[]");

      answers.forEach((answer: any, idx: number) => {
        const feedbackItem = feedback[idx] || {};
        const question = pastQuestions.find(
          (q: any) => q.id === answer.questionId
        );

        if (question) {
          const topic = question.topic || question.category || "general";
          const score = parseFloat(feedbackItem.marks || 0);
          const maxMarks = parseFloat(answer.marks || 0);
          const percentage = maxMarks > 0 ? (score / maxMarks) * 100 : 0;

          if (!topicPerformance[topic]) topicPerformance[topic] = [];
          topicPerformance[topic].push(percentage);
        }
      });
    }

    const topicAverages: { [key: string]: number } = {};
    Object.entries(topicPerformance).forEach(([topic, scores]) => {
      topicAverages[topic] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    const questionAnalysis = await Promise.all(
      questions.slice(0, 10).map(async (question: any, idx: number) => {
        const topic = question.topic || question.category || "general";
        const userTopicStrength = topicAverages[topic] || 50;

        // Use AI to predict difficulty
        const aiPrediction = await predictQuestionDifficulty(
          question.questionText || question.text || "",
          exam.language,
          question.marks || 10
        );

        return {
          questionId: question.id || idx,
          questionNumber: idx + 1,
          topic,
          marks: question.marks || 10,
          predictedDifficulty: aiPrediction.predictedDifficulty,
          aiConfidence: aiPrediction.confidence,
          estimatedTime: calculateEstimatedTime(
            question.marks,
            aiPrediction.predictedDifficulty
          ),
          userStrength: userTopicStrength,
          recommendation: generateRecommendation(
            userTopicStrength,
            aiPrediction.predictedDifficulty
          ),
          successProbability: calculateSuccessProbability(
            userTopicStrength,
            aiPrediction.estimatedSuccessRate
          ),
        };
      })
    );

    const strategy = generateExamStrategy(questionAnalysis, duration);

    return NextResponse.json(
      {
        success: true,
        examTitle: exam.title,
        duration,
        totalQuestions: questions.length,
        questionAnalysis,
        strategy,
        userReadiness: calculateReadiness(topicAverages, questionAnalysis),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Exam Strategy Error:", error);
    return NextResponse.json(
      { error: "Failed to generate exam strategy" },
      { status: 500 }
    );
  }
}

function calculateEstimatedTime(marks: number, difficulty: string): number {
  const baseTime = marks * 2; // 2 minutes per mark
  const multiplier =
    difficulty === "Hard" ? 1.5 : difficulty === "Medium" ? 1.2 : 1;
  return Math.round(baseTime * multiplier);
}

function generateRecommendation(
  userStrength: number,
  difficulty: string
): string {
  if (userStrength >= 80 && difficulty === "Easy")
    return "Quick win - solve first";
  if (userStrength >= 70 && difficulty === "Medium")
    return "Good opportunity - attempt early";
  if (userStrength < 50 && difficulty === "Hard") return "Skip if time-limited";
  if (userStrength >= 60) return "Attempt with confidence";
  return "Review carefully before attempting";
}

function calculateSuccessProbability(
  userStrength: number,
  aiEstimate: number
): number {
  return Math.round(userStrength * 0.6 + aiEstimate * 0.4);
}

function generateExamStrategy(questions: any[], duration: number) {
  const totalEstimatedTime = questions.reduce(
    (sum, q) => sum + q.estimatedTime,
    0
  );
  const buffer = duration - totalEstimatedTime;

  // Sort questions by recommendation priority
  const easyWins = questions.filter((q) =>
    q.recommendation.includes("Quick win")
  );
  const goodOpportunities = questions.filter((q) =>
    q.recommendation.includes("Good opportunity")
  );
  const challenging = questions.filter((q) =>
    q.recommendation.includes("Review carefully")
  );
  const skip = questions.filter((q) => q.recommendation.includes("Skip"));

  return {
    timeManagement: {
      totalAvailable: duration,
      estimatedRequired: totalEstimatedTime,
      buffer: Math.max(0, buffer),
      recommendation:
        buffer < 0
          ? "Time is tight - prioritize high-value questions"
          : "You have time - aim for completeness",
    },
    questionOrder: {
      phase1: {
        title: "Quick Wins (First 20-30%)",
        questions: easyWins.map((q) => q.questionNumber),
        estimatedTime: easyWins.reduce((sum, q) => sum + q.estimatedTime, 0),
        strategy: "Start with these to build confidence and secure easy marks",
      },
      phase2: {
        title: "Core Questions (Next 40-50%)",
        questions: goodOpportunities.map((q) => q.questionNumber),
        estimatedTime: goodOpportunities.reduce(
          (sum, q) => sum + q.estimatedTime,
          0
        ),
        strategy: "Focus on questions matching your strengths",
      },
      phase3: {
        title: "Challenging Questions (Next 20-30%)",
        questions: challenging.map((q) => q.questionNumber),
        estimatedTime: challenging.reduce((sum, q) => sum + q.estimatedTime, 0),
        strategy: "Attempt if time permits, review carefully",
      },
      phase4: {
        title: "Skip or Last Resort",
        questions: skip.map((q) => q.questionNumber),
        strategy: "Only attempt if you have extra time",
      },
    },
    tips: [
      "Read all questions quickly first (5 minutes)",
      `Allocate ${Math.round(
        duration * 0.8
      )} minutes for answering, ${Math.round(duration * 0.2)} for review`,
      "Mark difficult questions and return to them",
      buffer > 15
        ? "You have comfortable time - be thorough"
        : "Manage time strictly",
    ],
  };
}

function calculateReadiness(
  topicAverages: { [key: string]: number },
  questions: any[]
) {
  const avgStrength =
    Object.values(topicAverages).reduce((a, b) => a + b, 0) /
    Math.max(Object.values(topicAverages).length, 1);
  const avgSuccessProb =
    questions.reduce((sum, q) => sum + q.successProbability, 0) /
    questions.length;

  const readinessScore = Math.round(avgStrength * 0.4 + avgSuccessProb * 0.6);

  return {
    score: readinessScore,
    level:
      readinessScore >= 80
        ? "Excellent"
        : readinessScore >= 60
        ? "Good"
        : readinessScore >= 40
        ? "Fair"
        : "Needs Preparation",
    recommendation:
      readinessScore >= 70
        ? "You're well prepared! Go for it with confidence."
        : readinessScore >= 50
        ? "Review weak areas before attempting."
        : "Consider more practice before taking this exam.",
  };
}
