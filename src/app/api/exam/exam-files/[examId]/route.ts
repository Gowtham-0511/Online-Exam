import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

const filesCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  // Await the params object
  const { examId } = await params;

  console.log(typeof examId);

  const cached = filesCache.get(examId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=180",
      },
    });
  }

  try {
    const client = await pool.connect();

    try {
      const result = await client.query(
        "SELECT file_name, file_url, file_size, created_at FROM exam_files WHERE exam_id = $1 ORDER BY created_at ASC",
        [examId]
      );

      const response = { files: result.rows };

      // Cache the result
      filesCache.set(examId, { data: response, timestamp: Date.now() });

      return NextResponse.json(response, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=180",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
