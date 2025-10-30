import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const { email, exams } = req.body;

    if (!email || !exams || !Array.isArray(exams)) {
        return res.status(400).json({ error: "Missing email or exams" });
    }

    try {
        // Get user's historical performance
        const historyQuery = `
            SELECT 
                s."answersWithQuestionIds",
                s."ai_feedback",
                a.questions,
                a.language,
                a.title
            FROM submissions s
            INNER JOIN "Assessment" a ON s."examId" = a.title
            WHERE s.email = $1
            AND s.disqualified = false
            ORDER BY s."submittedAt" DESC
            LIMIT 10
        `;

        const historyResult = await pool.query(historyQuery, [email]);

        // Calculate topic-wise performance
        const topicPerformance: { [key: string]: { scores: number[]; language: string } } = {};
        const languagePerformance: { [key: string]: number[] } = {};

        for (const row of historyResult.rows) {
            const answers = JSON.parse(row.answersWithQuestionIds || "[]");
            const feedback = JSON.parse(row.ai_feedback || "[]");
            const questions = JSON.parse(row.questions || "[]");
            const language = row.language;

            answers.forEach((answer: any, idx: number) => {
                const feedbackItem = feedback[idx] || {};
                const question = questions.find((q: any) => q.id === answer.questionId);

                if (question) {
                    const topic = question.topic || question.category || 'general';
                    const score = parseFloat(feedbackItem.marks || 0);
                    const maxMarks = parseFloat(answer.marks || 0);
                    const percentage = maxMarks > 0 ? (score / maxMarks) * 100 : 0;

                    if (!topicPerformance[topic]) {
                        topicPerformance[topic] = { scores: [], language };
                    }
                    topicPerformance[topic].scores.push(percentage);

                    if (!languagePerformance[language]) {
                        languagePerformance[language] = [];
                    }
                    languagePerformance[language].push(percentage);
                }
            });
        }

        // Calculate readiness for each exam
        const examReadiness = exams.map((exam: any) => {
            const questions = JSON.parse(exam.questions || "[]");
            const language = exam.language;

            // Base score on language performance
            let languageScore = 50; // default
            if (languagePerformance[language] && languagePerformance[language].length > 0) {
                languageScore = languagePerformance[language].reduce((a, b) => a + b, 0) / languagePerformance[language].length;
            }

            // Calculate topic match
            let topicMatchScore = 50;
            let matchedTopics = 0;
            let totalTopics = 0;

            questions.forEach((q: any) => {
                const topic = q.topic || q.category || 'general';
                totalTopics++;

                if (topicPerformance[topic] && topicPerformance[topic].scores.length > 0) {
                    matchedTopics++;
                    const topicScore = topicPerformance[topic].scores.reduce((a, b) => a + b, 0) / topicPerformance[topic].scores.length;
                    topicMatchScore = (topicMatchScore + topicScore) / 2;
                }
            });

            // Calculate difficulty factor
            const difficultyBreakdown = questions.reduce((acc: any, q: any) => {
                acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
                return acc;
            }, {});

            const hardPercentage = (difficultyBreakdown.hard || 0) / questions.length * 100;
            const mediumPercentage = (difficultyBreakdown.medium || 0) / questions.length * 100;

            let difficultyAdjustment = 0;
            if (hardPercentage > 50) difficultyAdjustment = -15;
            else if (hardPercentage > 30) difficultyAdjustment = -10;
            else if (mediumPercentage > 60) difficultyAdjustment = -5;

            // Calculate final readiness score
            const readinessScore = Math.max(0, Math.min(100, Math.round(
                languageScore * 0.4 +
                topicMatchScore * 0.4 +
                (matchedTopics / Math.max(totalTopics, 1)) * 20 +
                difficultyAdjustment
            )));

            // Determine readiness level
            let readinessLevel = 'Not Ready';
            let recommendation = 'Practice more before attempting';
            let color = 'red';
            let isRecommended = false;

            if (readinessScore >= 80) {
                readinessLevel = 'Excellent';
                recommendation = 'You\'re well prepared! Start now.';
                color = 'emerald';
                isRecommended = readinessScore >= 85;
            } else if (readinessScore >= 65) {
                readinessLevel = 'Good';
                recommendation = 'Good match! Review key topics and start.';
                color = 'blue';
                isRecommended = readinessScore >= 70;
            } else if (readinessScore >= 50) {
                readinessLevel = 'Fair';
                recommendation = 'Review weak areas before starting.';
                color = 'amber';
            } else if (readinessScore >= 35) {
                readinessLevel = 'Needs Preparation';
                recommendation = 'Significant prep needed. Practice first.';
                color = 'orange';
            }

            // Calculate estimated score
            const estimatedScore = Math.max(30, Math.min(95, readinessScore - 5 + (Math.random() * 10)));

            // Generate insights
            const insights = [];
            if (languageScore >= 70) {
                insights.push(`Strong in ${language}`);
            } else if (languageScore < 50) {
                insights.push(`Need practice in ${language}`);
            }

            if (matchedTopics > 0) {
                insights.push(`${matchedTopics}/${totalTopics} topics familiar`);
            } else {
                insights.push('New topics to explore');
            }

            if (hardPercentage > 40) {
                insights.push('High difficulty level');
            }

            return {
                examId: exam.id,
                examTitle: exam.title,
                readinessScore,
                readinessLevel,
                recommendation,
                color,
                isRecommended,
                estimatedScore: Math.round(estimatedScore),
                insights,
                topicMatch: matchedTopics > 0,
                languageStrength: languageScore,
                hasHistory: historyResult.rows.length > 0
            };
        });

        // Sort by readiness score and pick top recommendations
        const sortedExams = [...examReadiness].sort((a, b) => b.readinessScore - a.readinessScore);
        const topRecommendations = sortedExams.slice(0, 2).map(e => e.examId);

        return res.status(200).json({
            success: true,
            examReadiness: examReadiness.reduce((acc: any, item: any) => {
                acc[item.examId] = item;
                return acc;
            }, {}),
            topRecommendations,
            hasHistory: historyResult.rows.length > 0
        });

    } catch (error: any) {
        console.error("Exam Readiness Error:", error);
        return res.status(500).json({ error: "Failed to calculate exam readiness" });
    }
}