import type { NextApiRequest, NextApiResponse } from "next";
import { runDaxExpression } from "@/lib/dockerDaxExecutor";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { expression, testCase, dataset, validateOnly } = req.body;

    if (!expression) {
        return res.status(400).json({ error: "DAX expression is required" });
    }

    try {
        // Validate expression syntax before execution
        if (validateOnly) {
            const isValid = validateDaxSyntax(expression);
            return res.status(200).json({
                success: true,
                valid: isValid.valid,
                errors: isValid.errors,
                warnings: isValid.warnings
            });
        }

        // Execute DAX expression with optional custom dataset
        const result = await runDaxExpression(expression, dataset);

        // If test case is provided, validate output
        if (testCase && testCase.expectedOutput) {
            const actualOutput = result.output?.trim() || result.result?.toString().trim() || "";
            const expectedOutput = testCase.expectedOutput.trim();
            const passed = actualOutput === expectedOutput;

            return res.status(200).json({
                ...result,
                testPassed: passed,
                expectedOutput,
                actualOutput
            });
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("DAX execution error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Execution failed",
        });
    }
}

// Validate DAX syntax
function validateDaxSyntax(expression: string): {
    valid: boolean;
    errors: string[];
    warnings: string[]
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for balanced parentheses
    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        errors.push(`Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`);
    }

    // Check for balanced square brackets (table/column references)
    const openBrackets = (expression.match(/\[/g) || []).length;
    const closeBrackets = (expression.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
        errors.push(`Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing`);
    }

    // Check for common syntax errors
    if (expression.includes(',,')) {
        errors.push('Double commas detected');
    }

    if (expression.includes('==')) {
        warnings.push('Use single = for comparison in DAX, not ==');
    }

    // Check for empty expression
    if (!expression.trim()) {
        errors.push('Expression cannot be empty');
    }

    // Check for valid DAX function names (basic check)
    const functionPattern = /([A-Z]+)\s*\(/g;
    const functions = [...expression.matchAll(functionPattern)].map(m => m[1]);

    const validFunctions = [
        // Basic
        'SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'COUNTA', 'COUNTBLANK', 'DISTINCTCOUNT',
        // Iterators
        'SUMX', 'AVERAGEX', 'COUNTX', 'MINX', 'MAXX', 'RANKX', 'CONCATENATEX',
        // Filters
        'FILTER', 'CALCULATE', 'CALCULATETABLE', 'ALL', 'ALLEXCEPT', 'ALLSELECTED',
        'VALUES', 'DISTINCT', 'KEEPFILTERS',
        // Time Intelligence
        'TOTALYTD', 'TOTALQTD', 'TOTALMTD', 'DATESYTD', 'DATESQTD', 'DATESMTD',
        'SAMEPERIODLASTYEAR', 'PREVIOUSMONTH', 'PREVIOUSQUARTER', 'PREVIOUSYEAR',
        'DATEADD', 'DATESBETWEEN', 'DATESINPERIOD',
        'STARTOFYEAR', 'ENDOFYEAR', 'STARTOFQUARTER', 'ENDOFQUARTER',
        'STARTOFMONTH', 'ENDOFMONTH',
        // Logical
        'IF', 'IFERROR', 'SWITCH', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'BLANK',
        // Information
        'ISBLANK', 'ISERROR', 'ISNUMBER', 'ISTEXT',
        'HASONEVALUE', 'HASONEFILTER', 'ISFILTERED', 'SELECTEDVALUE', 'COUNTROWS',
        // Relationship
        'RELATED', 'RELATEDTABLE', 'USERELATIONSHIP', 'CROSSFILTER',
        // Text
        'CONCATENATE', 'FORMAT', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM',
        'UPPER', 'LOWER', 'SUBSTITUTE',
        // Date
        'DATE', 'YEAR', 'MONTH', 'DAY', 'TODAY', 'NOW', 'WEEKDAY', 'WEEKNUM',
        'EOMONTH', 'EDATE',
        // Math
        'ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'CEILING', 'FLOOR',
        'MOD', 'DIVIDE', 'POWER', 'SQRT', 'EXP', 'LN', 'LOG', 'LOG10'
    ];

    functions.forEach(func => {
        if (!validFunctions.includes(func)) {
            warnings.push(`Unknown function: ${func} (may not be supported)`);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}