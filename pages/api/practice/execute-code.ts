import { NextApiRequest, NextApiResponse } from "next";
import { runPythonCode } from "@/lib/dockerPythonExecutor";
import dockerSqlExecutor from "@/lib/dockerSqlExecutor";

interface TestCase {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
}

interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
    testCasesPassed?: number;
    totalTestCases?: number;
    testResults?: Array<{
        testCase: TestCase;
        passed: boolean;
        actualOutput: string;
        error?: string;
    }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const { code, language, testCases } = req.body;

    if (!code || !language || !testCases) {
        return res.status(400).json({ error: "Code, language, and test cases are required" });
    }

    try {
        let result: ExecutionResult;

        switch (language.toLowerCase()) {
            case 'python':
                result = await executePython(code, testCases);
                break;
            case 'javascript':
            case 'js':
                result = await executeJavaScript(code, testCases);
                break;
            case 'sql':
                result = await executeSQL(code, testCases);
                break;
            default:
                return res.status(400).json({ error: `Unsupported language: ${language}` });
        }

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Code Execution Error:", error);
        return res.status(500).json({
            success: false,
            error: "Code execution failed",
            details: error.message
        });
    }
}

async function executePython(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    const startTime = Date.now();
    const testResults = [];
    let passedCount = 0;

    for (const testCase of testCases) {
        try {
            const functionMatch = code.match(/def\s+(\w+)\s*\(/);

            if (!functionMatch) {
                throw new Error('No function definition found in code');
            }

            const functionName = functionMatch[1];

            const wrappedCode = `
import json
import sys
import inspect

${code}

# Test execution
try:
    test_input_str = '''${testCase.input.replace(/'/g, "\\'")}'''
    test_input = json.loads(test_input_str)
    
    # Get function signature to determine how to call it
    func = ${functionName}
    sig = inspect.signature(func)
    param_count = len(sig.parameters)
    
    # Determine how to call the function based on input type and parameter count
    if isinstance(test_input, dict):
        # Check if dict should be unpacked or passed as single argument
        if param_count == 1:
            # Single parameter - pass entire dict as one argument
            result = func(test_input)
        else:
            # Multiple parameters - try unpacking as keyword arguments
            try:
                result = func(**test_input)
            except TypeError:
                # If unpacking fails, pass as single argument
                result = func(test_input)
    elif isinstance(test_input, list):
        if param_count == 1:
            # Single parameter function - pass the entire list as one argument
            result = func(test_input)
        else:
            # Multiple parameters - unpack the list
            result = func(*test_input)
    else:
        # Single primitive value - pass directly
        result = func(test_input)
    
    # Print result as JSON for consistency
    if isinstance(result, (dict, list, tuple)):
        print(json.dumps(result, separators=(',', ':')))
    else:
        print(result)
    
except json.JSONDecodeError:
    # Try Python literal evaluation
    import ast
    try:
        test_input = ast.literal_eval(test_input_str)
        
        # Get function signature
        func = ${functionName}
        sig = inspect.signature(func)
        param_count = len(sig.parameters)
        
        if isinstance(test_input, dict):
            if param_count == 1:
                result = func(test_input)
            else:
                try:
                    result = func(**test_input)
                except TypeError:
                    result = func(test_input)
        elif isinstance(test_input, list):
            if param_count == 1:
                result = func(test_input)
            else:
                result = func(*test_input)
        else:
            result = func(test_input)
        
        if isinstance(result, (dict, list, tuple)):
            print(json.dumps(result, separators=(',', ':')))
        else:
            print(result)
            
    except Exception as e2:
        print(f"Input parsing error: {str(e2)}", file=sys.stderr)
        sys.exit(1)
        
except Exception as e:
    print(f"Execution error: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`;

            const executionResult = await runPythonCode(wrappedCode);

            const actualOutput = executionResult.output.trim();
            const expectedOutput = testCase.expectedOutput.trim();

            // Smart comparison - try JSON first, then string
            let passed = false;
            try {
                // Convert Python format to JSON
                const actualJSON = JSON.parse(actualOutput.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false'));
                const expectedJSON = JSON.parse(expectedOutput.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false'));
                passed = deepEqual(actualJSON, expectedJSON);
            } catch {
                // Fall back to normalized string comparison
                passed = normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);
            }

            if (passed) passedCount++;

            testResults.push({
                testCase: { ...testCase, input: testCase.isHidden ? '[Hidden]' : testCase.input },
                passed,
                actualOutput: testCase.isHidden && !passed ? '[Hidden]' : actualOutput,
                error: executionResult.error
            });

        } catch (error: any) {
            testResults.push({
                testCase: { ...testCase, input: testCase.isHidden ? '[Hidden]' : testCase.input },
                passed: false,
                actualOutput: '',
                error: error.message.substring(0, 200)
            });
        }
    }

    const executionTime = Date.now() - startTime;

    return {
        success: passedCount === testCases.length,
        executionTime,
        testCasesPassed: passedCount,
        totalTestCases: testCases.length,
        testResults
    };
}

function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length || keysA.join(',') !== keysB.join(',')) return false;

    for (const key of keysA) {
        if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
}

function normalizeOutput(output: string): string {
    try {
        const parsed = JSON.parse(output.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false'));
        return JSON.stringify(parsed);
    } catch {
        return output.trim();
    }
}

async function executeJavaScript(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    const startTime = Date.now();
    const testResults = [];
    let passedCount = 0;

    for (const testCase of testCases) {
        try {
            // Wrap user code to handle input/output
            const wrappedCode = `
const input = \`${testCase.input.replace(/`/g, '\\`')}\`;
const lines = input.split('\\n');
let currentLine = 0;

// Mock readline
const readline = () => lines[currentLine++] || '';

// User code
${code}
`;

            // For JavaScript, we'll use Python executor with Node.js image
            // You can create a similar executor for Node.js or use vm module
            // For now, let's use a simple eval approach (not recommended for production)

            // Simple synchronous execution
            const result = await executeJavaScriptSafe(wrappedCode);

            const actualOutput = result.output.trim();
            const expectedOutput = testCase.expectedOutput.trim();
            const passed = actualOutput === expectedOutput;

            if (passed) passedCount++;

            testResults.push({
                testCase: { ...testCase, input: testCase.isHidden ? '[Hidden]' : testCase.input },
                passed,
                actualOutput: testCase.isHidden && !passed ? '[Hidden]' : actualOutput,
                error: result.error
            });

        } catch (error: any) {
            testResults.push({
                testCase: { ...testCase, input: testCase.isHidden ? '[Hidden]' : testCase.input },
                passed: false,
                actualOutput: '',
                error: error.message.substring(0, 200)
            });
        }
    }

    const executionTime = Date.now() - startTime;

    return {
        success: passedCount === testCases.length,
        executionTime,
        testCasesPassed: passedCount,
        totalTestCases: testCases.length,
        testResults
    };
}

async function executeJavaScriptSafe(code: string): Promise<{ output: string; error?: string }> {
    try {
        const { VM } = require('vm2');
        const vm = new VM({
            timeout: 5000,
            sandbox: {
                console: {
                    log: (...args: any[]) => {
                        output.push(args.join(' '));
                    }
                }
            }
        });

        const output: string[] = [];
        vm.run(code);

        return { output: output.join('\n') };
    } catch (error: any) {
        return { output: '', error: error.message };
    }
}

async function executeSQL(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    const startTime = Date.now();
    const testResults = [];
    let passedCount = 0;

    // Validate SQL query first
    const validation = dockerSqlExecutor.validateQuery(code);
    if (!validation.valid) {
        return {
            success: false,
            error: validation.error,
            executionTime: 0,
            testCasesPassed: 0,
            totalTestCases: testCases.length,
            testResults: []
        };
    }

    for (const testCase of testCases) {
        try {
            // Parse test case input for SQL (might include setup queries)
            const setupQueries = testCase.input ? testCase.input.split(';').filter(q => q.trim()) : [];

            // Execute main query using your existing SQL executor
            const executionResult = await dockerSqlExecutor.execute({
                query: code,
                serverType: 'postgres', // Default to postgres, adjust based on your needs
                credentials: {
                    host: process.env.PRACTICE_DB_HOST || 'localhost',
                    port: parseInt(process.env.PRACTICE_DB_PORT || '5432'),
                    username: process.env.PRACTICE_DB_USER || 'postgres',
                    password: process.env.PRACTICE_DB_PASSWORD || 'postgres',
                    database: process.env.PRACTICE_DB_NAME || 'practice_db',
                },
                timeout: 10000,
            });

            // Format output
            const actualOutput = formatSqlOutput(executionResult);
            const expectedOutput = testCase.expectedOutput.trim();
            const passed = actualOutput === expectedOutput;

            if (passed) passedCount++;

            testResults.push({
                testCase: { ...testCase, input: testCase.isHidden ? '[Hidden]' : testCase.input },
                passed,
                actualOutput: testCase.isHidden && !passed ? '[Hidden]' : actualOutput,
                error: executionResult.error
            });

        } catch (error: any) {
            testResults.push({
                testCase: { ...testCase, input: testCase.isHidden ? '[Hidden]' : testCase.input },
                passed: false,
                actualOutput: '',
                error: error.message.substring(0, 200)
            });
        }
    }

    const executionTime = Date.now() - startTime;

    return {
        success: passedCount === testCases.length,
        executionTime,
        testCasesPassed: passedCount,
        totalTestCases: testCases.length,
        testResults
    };
}

function formatSqlOutput(result: any): string {
    if (!result.success || result.rows.length === 0) {
        return '';
    }

    // Format as simple table
    const rows = result.rows.map((row: any) =>
        result.columns.map((col: string) => row[col]).join('\t')
    );

    return rows.join('\n');
}