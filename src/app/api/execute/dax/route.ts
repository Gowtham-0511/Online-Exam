import { runDaxExpression } from "@/lib/executor/dax";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { expression, testCase, dataset, validateOnly } = body;

  if (!expression) {
    return NextResponse.json(
      { error: "DAX expression is required" },
      { status: 400 }
    );
  }

  try {
    if (validateOnly) {
      const isValid = validateDaxSyntax(expression);
      return NextResponse.json(
        {
          success: true,
          valid: isValid.valid,
          errors: isValid.errors,
          warnings: isValid.warnings,
        },
        { status: 200 }
      );
    }
    const result = await runDaxExpression(expression, dataset);

    if (testCase && testCase.expectedOutput) {
      const actualOutput =
        result.output?.trim() || result.result?.toString().trim() || "";
      const expectedOutput = testCase.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;

      return NextResponse.json(
        {
          ...result,
          testPassed: passed,
          expectedOutput,
          actualOutput,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    logger.error("DAX execution error:", error);
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        error: errMsg,
      },
      { status: 500 }
    );
  }
}

// Validate DAX syntax
function validateDaxSyntax(expression: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for balanced parentheses
  const openParens = (expression.match(/\(/g) || []).length;
  const closeParens = (expression.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(
      `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`
    );
  }

  // Check for balanced square brackets (table/column references)
  const openBrackets = (expression.match(/\[/g) || []).length;
  const closeBrackets = (expression.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push(
      `Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing`
    );
  }

  // Check for common syntax errors
  if (expression.includes(",,")) {
    errors.push("Double commas detected");
  }

  if (expression.includes("==")) {
    warnings.push("Use single = for comparison in DAX, not ==");
  }

  // Check for empty expression
  if (!expression.trim()) {
    errors.push("Expression cannot be empty");
  }

  // Check for valid DAX function names (basic check)
  const functionPattern = /([A-Z]+)\s*\(/g;
  const functions = [...expression.matchAll(functionPattern)].map((m) => m[1]);

  const validFunctions = [
    // Basic
    "SUM",
    "AVERAGE",
    "COUNT",
    "MIN",
    "MAX",
    "COUNTA",
    "COUNTBLANK",
    "DISTINCTCOUNT",
    // Iterators
    "SUMX",
    "AVERAGEX",
    "COUNTX",
    "MINX",
    "MAXX",
    "RANKX",
    "CONCATENATEX",
    // Filters
    "FILTER",
    "CALCULATE",
    "CALCULATETABLE",
    "ALL",
    "ALLEXCEPT",
    "ALLSELECTED",
    "VALUES",
    "DISTINCT",
    "KEEPFILTERS",
    // Time Intelligence
    "TOTALYTD",
    "TOTALQTD",
    "TOTALMTD",
    "DATESYTD",
    "DATESQTD",
    "DATESMTD",
    "SAMEPERIODLASTYEAR",
    "PREVIOUSMONTH",
    "PREVIOUSQUARTER",
    "PREVIOUSYEAR",
    "DATEADD",
    "DATESBETWEEN",
    "DATESINPERIOD",
    "STARTOFYEAR",
    "ENDOFYEAR",
    "STARTOFQUARTER",
    "ENDOFQUARTER",
    "STARTOFMONTH",
    "ENDOFMONTH",
    // Logical
    "IF",
    "IFERROR",
    "SWITCH",
    "AND",
    "OR",
    "NOT",
    "TRUE",
    "FALSE",
    "BLANK",
    // Information
    "ISBLANK",
    "ISERROR",
    "ISNUMBER",
    "ISTEXT",
    "HASONEVALUE",
    "HASONEFILTER",
    "ISFILTERED",
    "SELECTEDVALUE",
    "COUNTROWS",
    // Relationship
    "RELATED",
    "RELATEDTABLE",
    "USERELATIONSHIP",
    "CROSSFILTER",
    // Text
    "CONCATENATE",
    "FORMAT",
    "LEFT",
    "RIGHT",
    "MID",
    "LEN",
    "TRIM",
    "UPPER",
    "LOWER",
    "SUBSTITUTE",
    // Date
    "DATE",
    "YEAR",
    "MONTH",
    "DAY",
    "TODAY",
    "NOW",
    "WEEKDAY",
    "WEEKNUM",
    "EOMONTH",
    "EDATE",
    // Math
    "ABS",
    "ROUND",
    "ROUNDUP",
    "ROUNDDOWN",
    "CEILING",
    "FLOOR",
    "MOD",
    "DIVIDE",
    "POWER",
    "SQRT",
    "EXP",
    "LN",
    "LOG",
    "LOG10",
  ];

  functions.forEach((func) => {
    if (!validFunctions.includes(func)) {
      warnings.push(`Unknown function: ${func} (may not be supported)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
