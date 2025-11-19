import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

// Helper to check if code is actually answered
function isCodeAnswered(userCode: string, starterCode: string): boolean {
    const cleanUserCode = (userCode || '').trim();
    const cleanStarterCode = (starterCode || '').trim();

    if (!cleanUserCode || cleanUserCode.length < 5) return false;
    if (cleanUserCode === cleanStarterCode) return false;
    if (cleanUserCode.includes('Write your DAX expression here')) return false;
    if (cleanUserCode.includes('// Write your')) return false;

    return true;
}

// Helper to evaluate DAX code (basic validation)
function evaluateDAXCode(userCode: string, question: any): boolean {
    if (!userCode) return false;

    const codeLower = userCode.toLowerCase().trim();
    const questionLower = (question.question || '').toLowerCase();
    const descriptionLower = (question.description || '').toLowerCase();

    // Pattern matching based on question requirements
    const patterns = {
        sum: /sum\s*\(/i,
        average: /average\s*\(/i,
        count: /count(rows|a)?\s*\(/i,
        max: /max\s*\(/i,
        min: /min\s*\(/i,
        calculate: /calculate\s*\(/i,
        filter: /filter\s*\(/i,
    };

    // Check for "Total Sales" type questions
    if ((questionLower.includes('total') || descriptionLower.includes('total')) &&
        (questionLower.includes('sales') || questionLower.includes('amount'))) {
        return patterns.sum.test(userCode) && /sales\[amount\]/i.test(userCode);
    }

    // Check for "Average" questions
    if (questionLower.includes('average') || descriptionLower.includes('average')) {
        return patterns.average.test(userCode);
    }

    // Check for "Count" questions
    if (questionLower.includes('count') || descriptionLower.includes('count')) {
        return patterns.count.test(userCode);
    }

    // Check for "Max" questions
    if (questionLower.includes('max') || descriptionLower.includes('maximum') ||
        descriptionLower.includes('highest') || descriptionLower.includes('largest')) {
        return patterns.max.test(userCode);
    }

    // Check for "Min" questions
    if (questionLower.includes('min') || descriptionLower.includes('minimum') ||
        descriptionLower.includes('lowest') || descriptionLower.includes('smallest')) {
        return patterns.min.test(userCode);
    }

    // Check for CALCULATE with filter (West Region type questions)
    if (descriptionLower.includes('region') || descriptionLower.includes('west')) {
        return patterns.calculate.test(userCode) &&
            (patterns.filter.test(userCode) || /customers\[region\]/i.test(userCode));
    }

    // If we have a solution, do basic comparison
    if (question.solution) {
        const solutionLower = question.solution.toLowerCase().trim();
        // Remove whitespace for comparison
        const codeClean = codeLower.replace(/\s+/g, '');
        const solutionClean = solutionLower.replace(/\s+/g, '');

        if (codeClean === solutionClean) return true;

        // Check if key functions match
        const userFunctions = codeLower.match(/\b(sum|average|count|max|min|calculate)\b/g) || [];
        const solutionFunctions = solutionLower.match(/\b(sum|average|count|max|min|calculate)\b/g) || [];

        if (userFunctions.length > 0 &&
            userFunctions.every(fn => solutionFunctions.includes(fn))) {
            return true;
        }
    }

    return false;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const {
        topic,
        difficulty,
        answers,
        questions,
        timeSpent,
        sessionId,
    } = req.body;

    if (!topic || !difficulty || !answers || !questions) {
        return res.status(400).json({
            error: "Missing required fields",
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Calculate score based on question type
        let correctAnswers = 0;
        let mcqIndex = 0;
        let codingIndex = 0;

        questions.forEach((q: any) => {
            if (q.type === 'mcq') {
                const userAnswer = answers.mcq[mcqIndex];
                if (userAnswer !== undefined && userAnswer !== -1 && userAnswer === q.correctAnswer) {
                    correctAnswers++;
                }
                mcqIndex++;
            } else if (q.type === 'coding') {
                const userCode = answers.coding[codingIndex] || '';
                const starterCode = q.starterCode || '';

                // Check if they actually wrote code
                if (isCodeAnswered(userCode, starterCode)) {
                    // Evaluate the code based on language
                    if (q.language === 'dax') {
                        if (evaluateDAXCode(userCode, q)) {
                            correctAnswers++;
                        }
                    } else {
                        // For other languages, just mark as attempted
                        // In production, execute code against test cases
                        correctAnswers++;
                    }
                }

                codingIndex++;
            }
        });

        const score = questions.length > 0
            ? parseFloat(((correctAnswers / questions.length) * 100).toFixed(2))
            : 0.00;

        const query = `
      INSERT INTO practice_attempts (
        "sessionId",
        topic,
        difficulty,
        "questionsData",
        answers,
        score,
        "correctAnswers",
        "totalQuestions",
        "timeSpent",
        "completedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, score, "correctAnswers", "totalQuestions";
    `;

        const values = [
            sessionId || `guest_${Date.now()}`,
            topic,
            difficulty,
            JSON.stringify(questions),
            JSON.stringify(answers),
            score,
            correctAnswers,
            questions.length,
            timeSpent || 0,
        ];

        const result = await client.query(query, values);

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            ...result.rows[0],
        });
    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error("Practice submission error:", error);
        return res.status(500).json({
            error: "Failed to save practice attempt",
            message: error.message,
        });
    } finally {
        client.release();
    }
}