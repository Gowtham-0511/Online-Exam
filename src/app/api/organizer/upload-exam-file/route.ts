import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const examId = formData.get("examId") as string;

    if (!file || !examId) {
      return NextResponse.json(
        { message: "No file or examId provided" },
        { status: 400 }
      );
    }

    const examDir = path.join(process.cwd(), "public", "exam-files", examId);

    if (!fs.existsSync(examDir)) {
      fs.mkdirSync(examDir, { recursive: true });
    }

    const originalFilename = file.name || "file";
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const finalPath = path.join(examDir, sanitizedFilename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(finalPath, buffer);

    const fileUrl = `/exam-files/${examId}/${sanitizedFilename}`;

    return NextResponse.json(
      {
        success: true,
        fileUrl,
        filename: sanitizedFilename,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("File upload error:", error);
    return NextResponse.json(
      { message: "File upload failed" },
      { status: 500 }
    );
  }
}
