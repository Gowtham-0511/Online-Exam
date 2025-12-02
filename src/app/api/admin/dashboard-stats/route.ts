import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Get total users count from users table
    const usersQuery = `SELECT COUNT(*) as count FROM users`;
    const usersResult = await pool.query(usersQuery);
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get previous month users count for comparison
    const lastMonthQuery = `
            SELECT COUNT(*) as count 
            FROM users u  
            WHERE u.created_at  >= NOW() - INTERVAL '2 months' 
            AND u.created_at < NOW() - INTERVAL '1 month'
        `;
    const lastMonthResult = await pool.query(lastMonthQuery);
    const lastMonthUsers = parseInt(lastMonthResult.rows[0].count);

    // Get active exams count (exams that have been assigned to batches or users)
    const activeExamsQuery = `
            SELECT COUNT(DISTINCT a.id) as count
            FROM "Assessment" a
            WHERE EXISTS (
                SELECT 1 FROM "AssessmentBatchMapping" abm 
                WHERE abm."assessmentId" = a.id 
                AND abm."startTime" <= NOW() 
                AND abm."endTime" >= NOW()
            )
            OR EXISTS (
                SELECT 1 FROM "AssessmentUserMapping" aum 
                WHERE aum."assessmentId" = a.id 
                AND aum.starttime <= NOW() 
                AND aum.endtime >= NOW()
            )
        `;
    const activeExamsResult = await pool.query(activeExamsQuery);
    const activeExams = parseInt(activeExamsResult.rows[0].count);

    // Get last month active exams for comparison
    const lastMonthExamsQuery = `
            SELECT COUNT(DISTINCT a.id) as count
            FROM "Assessment" a
            WHERE EXISTS (
                SELECT 1 FROM "AssessmentBatchMapping" abm 
                WHERE abm."assessmentId" = a.id 
                AND abm."startTime" >= NOW() - INTERVAL '2 months' 
                AND abm."startTime" < NOW() - INTERVAL '1 month'
            )
            OR EXISTS (
                SELECT 1 FROM "AssessmentUserMapping" aum 
                WHERE aum."assessmentId" = a.id 
                AND aum.starttime >= NOW() - INTERVAL '2 months' 
                AND aum.starttime < NOW() - INTERVAL '1 month'
            )
        `;
    const lastMonthExamsResult = await pool.query(lastMonthExamsQuery);
    const lastMonthExams = parseInt(lastMonthExamsResult.rows[0].count);

    // Get total questions count from Questions table
    const questionsQuery = `SELECT COUNT(*) as count FROM "Questions"`;
    const questionsResult = await pool.query(questionsQuery);
    const totalQuestions = parseInt(questionsResult.rows[0].count);

    // Get last month questions for comparison
    const lastMonthQuestionsQuery = `
            SELECT COUNT(*) as count 
            FROM "Questions" 
            WHERE "createdAt" >= NOW() - INTERVAL '2 months' 
            AND "createdAt" < NOW() - INTERVAL '1 month'
        `;
    const lastMonthQuestionsResult = await pool.query(lastMonthQuestionsQuery);
    const lastMonthQuestions = parseInt(lastMonthQuestionsResult.rows[0].count);

    // Get average completion rate from submissions table
    const completionQuery = `
            SELECT 
                COUNT(CASE WHEN "submittedAt" IS NOT NULL THEN 1 END)::float / 
                NULLIF(COUNT(*)::float, 0) * 100 as completion_rate
            FROM submissions
        `;
    const completionResult = await pool.query(completionQuery);
    const avgCompletion = parseFloat(
      completionResult.rows[0].completion_rate || 0
    );

    // Get last month completion rate
    const lastMonthCompletionQuery = `
            SELECT 
                COUNT(CASE WHEN "submittedAt" IS NOT NULL THEN 1 END)::float / 
                NULLIF(COUNT(*)::float, 0) * 100 as completion_rate
            FROM submissions
            WHERE "submittedAt" >= NOW() - INTERVAL '2 months' 
            AND "submittedAt" < NOW() - INTERVAL '1 month'
        `;
    const lastMonthCompletionResult = await pool.query(
      lastMonthCompletionQuery
    );
    const lastMonthCompletion = parseFloat(
      lastMonthCompletionResult.rows[0].completion_rate || 0
    );

    // Calculate percentage changes
    const usersChange =
      lastMonthUsers > 0
        ? (((totalUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1)
        : totalUsers > 0
        ? "100.0"
        : "0.0";

    const examsChange =
      lastMonthExams > 0
        ? (((activeExams - lastMonthExams) / lastMonthExams) * 100).toFixed(1)
        : activeExams > 0
        ? "100.0"
        : "0.0";

    const questionsChange =
      lastMonthQuestions > 0
        ? (
            ((totalQuestions - lastMonthQuestions) / lastMonthQuestions) *
            100
          ).toFixed(1)
        : totalQuestions > 0
        ? "100.0"
        : "0.0";

    const completionChange =
      lastMonthCompletion > 0
        ? (
            ((avgCompletion - lastMonthCompletion) / lastMonthCompletion) *
            100
          ).toFixed(1)
        : avgCompletion > 0
        ? "100.0"
        : "0.0";

    // Get recent exams with status based on AssessmentBatchMapping and AssessmentUserMapping
    const recentExamsQuery = `
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
        `;
    const recentExamsResult = await pool.query(recentExamsQuery);

    const recentExams = recentExamsResult.rows.map((exam) => ({
      id: exam.id,
      title: exam.title,
      category: exam.category || "General",
      participants: parseInt(exam.participants) || 0,
      completionRate: Math.round(parseFloat(exam.completion_rate) || 0),
      status: exam.status,
      createdAt: getRelativeTime(new Date(exam.createdAt)),
    }));

    return NextResponse.json(
      {
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
      },
      { status: 200 }
    );
  } catch (error) {}
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
