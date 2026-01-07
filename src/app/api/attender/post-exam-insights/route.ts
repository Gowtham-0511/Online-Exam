import { analyzeCommonMistakes } from "@/lib/ai/azureOpenAI";
import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const examId = searchParams.get("examId");

  if (!email || !examId) {
    return NextResponse.json(
      { error: "Missing email or examId" },
      { status: 400 }
    );
  }

  try {
    const userSubmissionQuery = `
        SELECT 
            s.*,
            a.questions,
            a.title,
            a.language
        FROM submissions s
        INNER JOIN "Assessment" a ON s."examId" = a.title
        WHERE s."examId" = $1 AND s.email = $2
    `;
    const userResult = await pool.query(userSubmissionQuery, [examId, email]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const userSubmission = userResult.rows[0];
    const questions = JSON.parse(userSubmission.questions || "[]");
    const userAnswers = JSON.parse(
      userSubmission.answersWithQuestionIds || "[]"
    );
    const userFeedback = JSON.parse(userSubmission.ai_feedback || "[]");

    const allSubmissionsQuery = `
        SELECT 
            s."answersWithQuestionIds",
            s."ai_feedback"
        FROM submissions s
        WHERE s."examId" = $1
        AND s.disqualified = false
        LIMIT 20
    `;

    const allResults = await pool.query(allSubmissionsQuery, [examId]);

    const userInsights = {
      totalQuestions: userAnswers.length,
      correctAnswers: 0,
      partialCredit: 0,
      incorrectAnswers: 0,
      questionBreakdown: [] as any[],
    };

    userAnswers.forEach((answer: any, idx: number) => {
      const feedback = userFeedback[idx] || {};
      const question = questions.find((q: any) => q.id === answer.questionId);
      const score = parseFloat(feedback.marks || 0);
      const maxMarks = parseFloat(answer.marks || 0);
      const percentage = maxMarks > 0 ? (score / maxMarks) * 100 : 0;

      if (percentage >= 90) userInsights.correctAnswers++;
      else if (percentage >= 40) userInsights.partialCredit++;
      else userInsights.incorrectAnswers++;

      userInsights.questionBreakdown.push({
        questionText: question?.questionText || question?.text || "",
        userScore: score,
        maxScore: maxMarks,
        percentage: percentage.toFixed(0),
        feedback: feedback.feedback || "",
        category:
          percentage >= 90
            ? "correct"
            : percentage >= 40
              ? "partial"
              : "incorrect",
      });
    });

    let commonMistakesAnalysis = null;
    if (allResults.rows.length >= 3) {
      const studentAnswersForAnalysis = allResults.rows
        .map((row) => {
          const answers = JSON.parse(row.answersWithQuestionIds || "[]");
          const feedback = JSON.parse(row.ai_feedback || "[]");

          return answers.map((ans: any, idx: number) => ({
            answer: ans.answer || "",
            score: parseFloat(feedback[idx]?.marks || 0),
            maxMarks: parseFloat(ans.marks || 0),
            feedback: feedback[idx]?.feedback || "",
          }));
        })
        .flat();

      const firstQuestion = questions[0];
      if (firstQuestion && studentAnswersForAnalysis.length > 0) {
        commonMistakesAnalysis = await analyzeCommonMistakes(
          firstQuestion.questionText || firstQuestion.text || "",
          studentAnswersForAnalysis.slice(0, 10)
        );
      }
    }

    return NextResponse.json(
      {
        hasData: true,
        examTitle: userSubmission.title,
        language: userSubmission.language,
        submittedAt: userSubmission.submittedAt,
        userInsights,
        commonMistakes: commonMistakesAnalysis,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Post-Exam Insights Error for %s (Exam: %s):", email, examId, error);
    return NextResponse.json(
      { error: "Failed to fetch post-exam insights" },
      { status: 500 }
    );
  }
}
