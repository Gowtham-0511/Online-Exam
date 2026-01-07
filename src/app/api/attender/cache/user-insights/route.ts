import {
  analyzeStudentPerformance,
  predictFuturePerformance,
} from "@/lib/ai/azureOpenAI";
import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const force = searchParams.get("force");
  try {
    // Check if cache exists and is valid
    const cacheQuery = `
            SELECT * FROM "UserInsightsCache"
            WHERE email = $1
        `;
    const cacheResult = await pool.query(cacheQuery, [email as string]);

    const cache = cacheResult.rows[0];

    // Determine if we need to regenerate
    const needsRegeneration =
      !cache ||
      force === "true" ||
      !cache.aiInsights ||
      !cache.performancePrediction;

    if (!needsRegeneration) {
      // Return cached data
      return NextResponse.json({
        fromCache: true,
        aiInsights: cache.aiInsights,
        performancePrediction: cache.performancePrediction,
        achievementPredictions: cache.achievementPredictions,
        lastUpdated: cache.updatedAt,
      });
    }

    // Need to regenerate - fetch fresh data
    const regenerated = await regenerateInsights(email as string);

    return NextResponse.json(
      {
        fromCache: false,
        ...regenerated,
        lastUpdated: new Date(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error fetching cached user insights for %s:", email, error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}

async function regenerateInsights(email: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Fetch AI Insights Data
    const insightsQuery = `
            SELECT 
                s."examId",
                s."userName",
                s."answersWithQuestionIds",
                s."ai_feedback",
                a.title,
                a.language,
                a.questions
            FROM submissions s
            INNER JOIN "Assessment" a ON s."examId" = a.title
            WHERE s.email = $1
            AND s.disqualified = false
            ORDER BY s."submittedAt" DESC
            LIMIT 10
        `;
    const insightsResult = await client.query(insightsQuery, [email]);

    let aiInsights = null;
    let userName = null;

    if (insightsResult.rows.length > 0) {
      userName = insightsResult.rows[0].userName;

      const questionDetails = [];
      for (const exam of insightsResult.rows) {
        const answers = JSON.parse(exam.answersWithQuestionIds || "[]");
        const feedback = JSON.parse(exam.ai_feedback || "[]");
        const questions = JSON.parse(exam.questions || "[]");

        for (let i = 0; i < answers.length; i++) {
          const answer = answers[i];
          const feedbackItem = feedback[i] || {};
          const question = questions.find(
            (q: any) => q.id === answer.questionId
          );

          if (question) {
            questionDetails.push({
              questionText: question.questionText || question.text || "",
              questionType: exam.language,
              score: parseFloat(feedbackItem.marks || 0),
              maxMarks: parseFloat(answer.marks || 0),
              feedback: feedbackItem.feedback || "",
            });
          }
        }
      }

      if (questionDetails.length > 0) {
        aiInsights = await analyzeStudentPerformance({
          questionDetails,
          userName,
        });
      }
    }

    // 2. Fetch Performance Prediction Data
    const predictionQuery = `
            SELECT 
                s."examId",
                s."submittedAt",
                COALESCE(
                    (SELECT SUM((feedback->>'marks')::numeric)
                     FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback),
                    0
                ) as score,
                COALESCE(
                    (SELECT SUM((ans->>'marks')::numeric)
                     FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans),
                    0
                ) as "totalPossible"
            FROM submissions s
            WHERE s.email = $1
            AND s.disqualified = false
            ORDER BY s."submittedAt" ASC
        `;
    const predictionResult = await client.query(predictionQuery, [email]);

    let performancePrediction = null;

    if (predictionResult.rows.length >= 2) {
      const studentHistory = predictionResult.rows.map((row) => ({
        examId: row.examId,
        score: parseFloat(row.score) || 0,
        totalPossible: parseFloat(row.totalPossible) || 1,
        date: row.submittedAt,
      }));

      performancePrediction = await predictFuturePerformance(studentHistory);
    }

    // 3. Calculate Achievement Predictions (non-AI, just calculations)
    const achievementQuery = `
            SELECT 
                COUNT(*) as "totalExams",
                AVG(
                    CASE 
                        WHEN (SELECT SUM((ans->>'marks')::numeric)
                              FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans) > 0 
                        THEN (
                            (SELECT SUM((feedback->>'marks')::numeric)
                             FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback) * 100.0 /
                            (SELECT SUM((ans->>'marks')::numeric)
                             FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans)
                        )
                        ELSE 0
                    END
                ) as "avgScore",
                COUNT(CASE 
                    WHEN (
                        SELECT SUM((feedback->>'marks')::numeric)
                        FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback
                    ) * 100.0 / NULLIF((
                        SELECT SUM((ans->>'marks')::numeric)
                        FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans
                    ), 0) >= 80 
                    THEN 1 
                END) as "highScores",
                COUNT(DISTINCT DATE(s."submittedAt")) as "activeDays"
            FROM submissions s
            WHERE s.email = $1
            AND s.disqualified = false
        `;
    const achievementResult = await client.query(achievementQuery, [email]);
    const stats = achievementResult.rows[0];

    const totalExams = parseInt(stats.totalExams) || 0;
    const avgScore = parseFloat(stats.avgScore) || 0;
    const highScores = parseInt(stats.highScores) || 0;
    const activeDays = parseInt(stats.activeDays) || 0;

    const achievementPredictions = {
      examsCompleted: totalExams,
      highScoresCount: highScores,
      currentStreak: activeDays,
      averageScore: avgScore,
      nextMilestones: [
        {
          type: "exams",
          current: totalExams,
          target: Math.ceil(totalExams / 10) * 10 + 10,
          progress: (totalExams % 10) * 10,
          label: `Complete ${Math.ceil(totalExams / 10) * 10 + 10} exams`,
          icon: "target",
        },
        {
          type: "highScores",
          current: highScores,
          target: Math.ceil(highScores / 5) * 5 + 5,
          progress: ((highScores % 5) / 5) * 100,
          label: `Achieve ${Math.ceil(highScores / 5) * 5 + 5
            } high scores (80%+)`,
          icon: "trophy",
        },
        {
          type: "average",
          current: avgScore,
          target: Math.min(avgScore + 10, 100),
          progress: avgScore,
          label: `Reach ${Math.min(
            Math.ceil(avgScore / 10) * 10 + 10,
            100
          )}% average`,
          icon: "trending-up",
        },
      ],
      predictions: {
        nextHighScore:
          totalExams > 0
            ? Math.min(95, avgScore + (highScores / totalExams) * 20)
            : 50,
        daysToNextMilestone: Math.max(
          1,
          Math.ceil(
            (10 - (totalExams % 10)) / (activeDays / Math.max(totalExams, 1))
          )
        ),
        improvementRate:
          totalExams > 1 ? ((avgScore / 100) * 5).toFixed(1) : "0",
      },
    };

    // 4. Store everything in cache
    const updateCacheQuery = `
            INSERT INTO "UserInsightsCache" 
            (email, "userName", "aiInsights", "insightsGeneratedAt", 
             "performancePrediction", "predictionGeneratedAt",
             "achievementPredictions", "achievementsGeneratedAt", "updatedAt")
            VALUES ($1, $2, $3, NOW(), $4, NOW(), $5, NOW(), NOW())
            ON CONFLICT (email)
            DO UPDATE SET
                "userName" = $2,
                "aiInsights" = $3,
                "insightsGeneratedAt" = NOW(),
                "performancePrediction" = $4,
                "predictionGeneratedAt" = NOW(),
                "achievementPredictions" = $5,
                "achievementsGeneratedAt" = NOW(),
                "updatedAt" = NOW()
        `;

    await client.query(updateCacheQuery, [
      email,
      userName,
      aiInsights,
      JSON.stringify(performancePrediction),
      JSON.stringify(achievementPredictions),
    ]);

    await client.query("COMMIT");

    return {
      aiInsights,
      performancePrediction,
      achievementPredictions,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
