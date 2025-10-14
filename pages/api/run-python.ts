import { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Only POST allowed");

    const { code, examId } = req.body;
    if (!code) return res.status(400).json({ error: "No Python code provided" });

    const timestamp = Date.now();
    const filename = `user_code_${timestamp}.py`;
    const tempDir = path.join(process.cwd(), "temp", `exam_${timestamp}`);
    const filePath = path.join(tempDir, filename);

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        // If examId provided, copy exam files to temp directory
        if (examId) {
            const client = await pool.connect();
            const result = await client.query(
                'SELECT file_name, file_url FROM exam_files WHERE exam_id = $1',
                [examId]
            );
            client.release();

            // Copy each file to temp directory
            for (const file of result.rows) {
                const sourceFile = path.join(process.cwd(), 'public', file.file_url);
                const destFile = path.join(tempDir, file.file_name);

                if (fs.existsSync(sourceFile)) {
                    fs.copyFileSync(sourceFile, destFile);
                }
            }
        }

        // Write user code
        fs.writeFileSync(filePath, code);

        // Execute Python in the temp directory
        exec(
            `python "${filename}"`,
            {
                timeout: 10000,
                cwd: tempDir  // Run in temp directory where files are
            },
            (error, stdout, stderr) => {
                // Cleanup
                fs.rmSync(tempDir, { recursive: true, force: true });

                if (error) {
                    return res.status(200).json({ output: stderr || error.message });
                }

                return res.status(200).json({ output: stdout });
            }
        );
    } catch (error) {
        // Cleanup on error
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        return res.status(500).json({ error: "Failed to execute code" });
    }
}