import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import logger from "@/lib/logger";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "app"; // 'app' or 'error'
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const logFileName = type === "error" ? "error.log" : "app.log";
    const logFilePath = path.join(process.cwd(), "logs", logFileName);

    try {
        if (!fs.existsSync(logFilePath)) {
            return NextResponse.json({ logs: [] });
        }

        const fileContent = await fs.promises.readFile(logFilePath, "utf-8");
        const lines = fileContent.trim().split("\n");

        // Get last N lines and reverse them (newest first)
        const recentLines = lines.slice(-limit).reverse();

        const logs = recentLines
            .map((line) => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return { message: line, level: "unknown", timestamp: "unknown" };
                }
            })
            .filter((log) => log !== null);

        return NextResponse.json({ logs });
    } catch (error) {
        logger.error("Error reading log file: %s", error);
        return NextResponse.json(
            { error: "Failed to fetch logs" },
            { status: 500 }
        );
    }
}
