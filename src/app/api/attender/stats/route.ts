import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    // 1. Get User's Total Points and Solved Count
    const userStatsQuery = `
        WITH UserScores AS (
            SELECT 
                email,
                COUNT(DISTINCT "examId") as solved,
                SUM(
                    (SELECT COALESCE(SUM((feedback->>'marks')::numeric), 0)
                        FROM jsonb_array_elements("ai_feedback"::jsonb) AS feedback)
                ) as points
            FROM submissions
            WHERE disqualified = false
            GROUP BY email
        )
        SELECT * FROM UserScores WHERE email = $1;
    `;

    const userStatsResult = await pool.query(userStatsQuery, [email]);
    const userStats = userStatsResult.rows[0] || { solved: 0, points: 0 };

    // 2. Calculate Rank
    const rankQuery = `
        WITH UserScores AS (
            SELECT 
                email,
                SUM(
                    (SELECT COALESCE(SUM((feedback->>'marks')::numeric), 0)
                        FROM jsonb_array_elements("ai_feedback"::jsonb) AS feedback)
                ) as points
            FROM submissions
            WHERE disqualified = false
            GROUP BY email
        )
        SELECT COUNT(*) + 1 as rank
        FROM UserScores
        WHERE points > $1
    `;
    const rankResult = await pool.query(rankQuery, [userStats.points || 0]);
    const rank = parseInt(rankResult.rows[0]?.rank || 1);

    // 3. Get Skills (Average score per language)
    const skillsQuery = `
        SELECT 
            a.language as name,
            AVG(
                (SELECT COALESCE(SUM((feedback->>'marks')::numeric), 0)
                    FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback)
            ) as avg_score
        FROM submissions s
        JOIN "Assessment" a ON s."examId" = a.title
        WHERE s.email = $1 AND s.disqualified = false
        GROUP BY a.language
    `;
    const skillsResult = await pool.query(skillsQuery, [email]);
    const skills = skillsResult.rows.map((row) => ({
      name: row.name,
      progress: Math.round(parseFloat(row.avg_score || 0)), // Assuming score is roughly 0-100 or similar
    }));

    // 4. Get Submission History for Heatmap & Streak
    const historyQuery = `
        SELECT "submittedAt"
        FROM submissions
        WHERE email = $1 AND disqualified = false
        ORDER BY "submittedAt" ASC
    `;
    const historyResult = await pool.query(historyQuery, [email]);
    const dates = historyResult.rows.map(
      (row) => new Date(row.submittedAt).toISOString().split("T")[0]
    );

    // Calculate Streak
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    const uniqueDates = Array.from(new Set(dates)).sort();

    if (uniqueDates.length > 0) {
      let currentStreak = 0;
      // Check if last submission was today or yesterday
      const lastDate = uniqueDates[uniqueDates.length - 1];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      if (lastDate === today || lastDate === yesterday) {
        currentStreak = 1;
        for (let i = uniqueDates.length - 2; i >= 0; i--) {
          const curr = new Date(uniqueDates[i + 1]);
          const prev = new Date(uniqueDates[i]);
          const diffTime = Math.abs(curr.getTime() - prev.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      streak = currentStreak;
    }

    // 5. Badges (Simple logic for now)
    const badges = {
      gold: Math.floor(userStats.points / 1000),
      silver: Math.floor(userStats.points / 500),
      bronze: Math.floor(userStats.points / 100),
    };

    // 6. Skill Rating Calculation
    const skillRating = 1000 + Math.round(userStats.points);

    // 7. Get Profile Image
    const profileQuery = `SELECT profile_image FROM "UserProfile" WHERE user_email = $1`;
    const profileResult = await pool.query(profileQuery, [email]);
    const profileImage = profileResult.rows[0]?.profile_image || null;

    return NextResponse.json(
      {
        rank,
        points: Math.round(userStats.points),
        badges,
        solved: parseInt(userStats.solved),
        streak,
        skills,
        submissionHistory: dates,
        skillRating,
        profileImage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
