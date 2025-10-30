import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { analyzeStudentPerformance } from "@/lib/azureOpenAI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        // Fetch completed exams with detailed feedback
        const query = `
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

        const result = await pool.query(query, [email as string]);

        if (result.rows.length === 0) {
            return res.status(200).json({
                hasData: false,
                message: "No completed exams found"
            });
        }

        // Prepare data for AI analysis
        const questionDetails = [];

        for (const exam of result.rows) {
            const answers = JSON.parse(exam.answersWithQuestionIds || "[]");
            const feedback = JSON.parse(exam.ai_feedback || "[]");
            const questions = JSON.parse(exam.questions || "[]");

            for (let i = 0; i < answers.length; i++) {
                const answer = answers[i];
                const feedbackItem = feedback[i] || {};
                const question = questions.find((q: any) => q.id === answer.questionId);

                if (question) {
                    questionDetails.push({
                        questionText: question.questionText || question.text || "",
                        questionType: exam.language,
                        score: parseFloat(feedbackItem.marks || 0),
                        maxMarks: parseFloat(answer.marks || 0),
                        feedback: feedbackItem.feedback || ""
                    });
                }
            }
        }

        if (questionDetails.length === 0) {
            return res.status(200).json({
                hasData: false,
                message: "No question data available"
            });
        }

        // Call AI analysis
        const analysis = await analyzeStudentPerformance({
            questionDetails,
            userName: result.rows[0].userName
        });

        return res.status(200).json({
            hasData: true,
            ...analysis
        });

    } catch (error: any) {
        console.error("AI Insights Error:", error);
        return res.status(500).json({ error: "Failed to generate insights" });
    }
}