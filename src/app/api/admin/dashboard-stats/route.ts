import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// Simple in-memory cache
let statsCache: {
  data: any;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET(request: Request) {
  try {
    const now = Date.now();
    if (statsCache.data && now - statsCache.timestamp < CACHE_TTL) {
      // logger.info("Serving dashboard stats from cache");
      return NextResponse.json(statsCache.data, { status: 200 });
    }

    logger.info("Admin dashboard stats requested (Cache miss/expired)");

    // Run queries in parallel
    const [
      usersResult,
      lastMonthUsersResult,
      activeExamsResult,
      lastMonthExamsResult,
      questionsResult,
      lastMonthQuestionsResult,
      completionResult,
      lastMonthCompletionResult,
      recentExamsResult,
    ] = await Promise.all([
      // 1. Total users
      pool.query(`SELECT COUNT(*) as count FROM users`),

      // 2. Last month users
      pool.query(`
        SELECT COUNT(*) as count 
        FROM users u  
        WHERE u.created_at  >= NOW() - INTERVAL '2 months' 
        AND u.created_at < NOW() - INTERVAL '1 month'
      `),

      // 3. Active exams (Optimized: Query mapping tables directly)
      pool.query(`
        SELECT COUNT(DISTINCT "assessmentId") as count FROM (
            SELECT "assessmentId" FROM "AssessmentBatchMapping" 
            WHERE "startTime" <= NOW() AND "endTime" >= NOW()
            UNION
            SELECT "assessmentId" FROM "AssessmentUserMapping" 
            WHERE starttime <= NOW() AND endtime >= NOW()
        ) as active
      `),

      // 4. Last month active exams (Optimized)
      pool.query(`
        SELECT COUNT(DISTINCT "assessmentId") as count FROM (
            SELECT "assessmentId" FROM "AssessmentBatchMapping" 
            WHERE "startTime" >= NOW() - INTERVAL '2 months' 
            AND "startTime" < NOW() - INTERVAL '1 month'
            UNION
            SELECT "assessmentId" FROM "AssessmentUserMapping" 
            WHERE starttime >= NOW() - INTERVAL '2 months' 
            AND starttime < NOW() - INTERVAL '1 month'
        ) as previous_active
      `),

      // 5. Total questions
      pool.query(`SELECT COUNT(*) as count FROM "Questions"`),

      // 6. Last month questions
      pool.query(`
        SELECT COUNT(*) as count 
        FROM "Questions" 
        WHERE "createdAt" >= NOW() - INTERVAL '2 months' 
        AND "createdAt" < NOW() - INTERVAL '1 month'
      `),

      // 7. Completion rate
      pool.query(`
        SELECT 
            COUNT(CASE WHEN "submittedAt" IS NOT NULL THEN 1 END)::float / 
            NULLIF(COUNT(*)::float, 0) * 100 as completion_rate
        FROM submissions
      `),

      // 8. Last month completion rate
      pool.query(`
        SELECT 
            COUNT(CASE WHEN "submittedAt" IS NOT NULL THEN 1 END)::float / 
            NULLIF(COUNT(*)::float, 0) * 100 as completion_rate
        FROM submissions
        WHERE "submittedAt" >= NOW() - INTERVAL '2 months' 
        AND "submittedAt" < NOW() - INTERVAL '1 month'
      `),

      // 9. Recent exams
      pool.query(`
        SELECT 
            a.id,
            a.title,
            a.language as category,
            a."createdAt",
            COUNT(DISTINCT s.email) as participants,
            COUNT(CASE WHEN s."submittedAt" IS NOT NULL THEN 1 END)::float / 
            NULLIF(COUNT(*)::float, 0) * 100 as completion_rate,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM "AssessmentBatchMapping" abm 
                    WHERE abm."assessmentId" = a.id 
                    AND abm."startTime" <= NOW() 
                    AND abm."endTime" >= NOW()
                ) OR EXISTS (
                    SELECT 1 FROM "AssessmentUserMapping" aum 
                    WHERE aum."assessmentId" = a.id 
                    AND aum.starttime <= NOW() 
                    AND aum.endtime >= NOW()
                ) THEN 'active'
                ELSE 'completed'
            END as status
        FROM "Assessment" a
        LEFT JOIN submissions s ON a.id::text = s."examId"
        GROUP BY a.id, a.title, a.language, a."createdAt"
        ORDER BY a."createdAt" DESC
        LIMIT 4
      `),
    ]);

    // Parse results
    const totalUsers = parseInt(usersResult.rows[0].count);
    const lastMonthUsers = parseInt(lastMonthUsersResult.rows[0].count);

    const activeExams = parseInt(activeExamsResult.rows[0].count);
    const lastMonthExams = parseInt(lastMonthExamsResult.rows[0].count);

    const totalQuestions = parseInt(questionsResult.rows[0].count);
    const lastMonthQuestions = parseInt(lastMonthQuestionsResult.rows[0].count);

    const avgCompletion = parseFloat(
      completionResult.rows[0].completion_rate || 0
    );
    const lastMonthCompletion = parseFloat(
      lastMonthCompletionResult.rows[0].completion_rate || 0
    );

    // Calculate percentage changes
    // Helper to calculate change
    const calculateChange = (current: number, previous: number) => {
      if (previous > 0) return (((current - previous) / previous) * 100).toFixed(1);
      return current > 0 ? "100.0" : "0.0";
    };

    const usersChange = calculateChange(totalUsers, lastMonthUsers);
    const examsChange = calculateChange(activeExams, lastMonthExams);
    const questionsChange = calculateChange(totalQuestions, lastMonthQuestions);
    const completionChange = calculateChange(avgCompletion, lastMonthCompletion);

    const recentExams = recentExamsResult.rows.map((exam) => ({
      id: exam.id,
      title: exam.title,
      category: exam.category || "General",
      participants: parseInt(exam.participants) || 0,
      completionRate: Math.round(parseFloat(exam.completion_rate) || 0),
      status: exam.status,
      createdAt: getRelativeTime(new Date(exam.createdAt)),
    }));

    const responseData = {
      stats: {
        totalUsers,
        usersChange:
          parseFloat(usersChange) >= 0
            ? `+${usersChange}%`
            : `${usersChange}%`,
        usersTrend: parseFloat(usersChange) >= 0 ? "up" : "down",
        activeExams,
        examsChange:
          parseFloat(examsChange) >= 0
            ? `+${examsChange}%`
            : `${examsChange}%`,
        examsTrend: parseFloat(examsChange) >= 0 ? "up" : "down",
        totalQuestions,
        questionsChange:
          parseFloat(questionsChange) >= 0
            ? `+${questionsChange}%`
            : `${questionsChange}%`,
        questionsTrend: parseFloat(questionsChange) >= 0 ? "up" : "down",
        avgCompletion: avgCompletion.toFixed(1),
        completionChange:
          parseFloat(completionChange) >= 0
            ? `+${completionChange}%`
            : `${completionChange}%`,
        completionTrend: parseFloat(completionChange) >= 0 ? "up" : "down",
      },
      recentExams,
    };

    // Update cache
    statsCache = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return diffMins <= 1 ? "1 minute ago" : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
}
