import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, language, testCases } = req.body;

    if (!code || !language) {
        return res.status(400).json({ error: 'Missing code or language' });
    }

    try {
        const results = [];

        for (const testCase of testCases) {
            const result = await executeCode(code, language, testCase.input);
            const passed = result.output.trim() === testCase.expectedOutput.trim();

            results.push({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: result.output,
                passed,
                error: result.error
            });
        }

        return res.status(200).json({ success: true, results });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

async function executeCode(code: string, language: string, input: string) {
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    let filePath = '';
    let command = '';

    try {
        switch (language.toLowerCase()) {
            case 'python':
                filePath = path.join(tempDir, `code_${timestamp}.py`);
                await fs.writeFile(filePath, code);
                command = `echo "${input}" | python3 ${filePath}`;
                break;

            case 'javascript':
                filePath = path.join(tempDir, `code_${timestamp}.js`);
                await fs.writeFile(filePath, code);
                command = `echo "${input}" | node ${filePath}`;
                break;

            default:
                throw new Error(`Unsupported language: ${language}`);
        }

        const { stdout, stderr } = await execAsync(command, { timeout: 5000 });

        return { output: stdout, error: stderr };
    } catch (error: any) {
        return { output: '', error: error.message };
    } finally {
        if (filePath) {
            await fs.unlink(filePath).catch(() => { });
        }
    }
}