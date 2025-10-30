import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { analyzeCommonMistakes } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId, email } = req.query;
    if (!examId || !email) {
        return res.status(400).json({ error: "ExamId and email are required" });
    }

    try {
        // Get user's submission
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
            return res.status(404).json({ error: "Submission not found" });
        }

        const userSubmission = userResult.rows[0];
        const questions = JSON.parse(userSubmission.questions || "[]");
        const userAnswers = JSON.parse(userSubmission.answersWithQuestionIds || "[]");
        const userFeedback = JSON.parse(userSubmission.ai_feedback || "[]");

        // Get all submissions for this exam for pattern analysis
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

        // Analyze user's specific mistakes
        const userInsights = {
            totalQuestions: userAnswers.length,
            correctAnswers: 0,
            partialCredit: 0,
            incorrectAnswers: 0,
            questionBreakdown: [] as any[]
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
                category: percentage >= 90 ? 'correct' : percentage >= 40 ? 'partial' : 'incorrect'
            });
        });

        // Prepare data for common mistakes analysis (if enough submissions)
        let commonMistakesAnalysis = null;
        if (allResults.rows.length >= 3) {
            const studentAnswersForAnalysis = allResults.rows.map(row => {
                const answers = JSON.parse(row.answersWithQuestionIds || "[]");
                const feedback = JSON.parse(row.ai_feedback || "[]");

                return answers.map((ans: any, idx: number) => ({
                    answer: ans.answer || "",
                    score: parseFloat(feedback[idx]?.marks || 0),
                    maxMarks: parseFloat(ans.marks || 0),
                    feedback: feedback[idx]?.feedback || ""
                }));
            }).flat();

            const firstQuestion = questions[0];
            if (firstQuestion && studentAnswersForAnalysis.length > 0) {
                commonMistakesAnalysis = await analyzeCommonMistakes(
                    firstQuestion.questionText || firstQuestion.text || "",
                    studentAnswersForAnalysis.slice(0, 10)
                );
            }
        }

        return res.status(200).json({
            hasData: true,
            examTitle: userSubmission.title,
            language: userSubmission.language,
            submittedAt: userSubmission.submittedAt,
            userInsights,
            commonMistakes: commonMistakesAnalysis
        });

    } catch (error: any) {
        console.error("Post-Exam Insights Error:", error);
        return res.status(500).json({ error: "Failed to generate insights" });
    }
}