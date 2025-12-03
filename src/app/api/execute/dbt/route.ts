import {
  runDbtCommand,
  validateDbtModel,
  getDbtInfo,
} from "@/lib/executor/dbt";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "info") {
    const info = await getDbtInfo();
    return NextResponse.json(info || { error: "Failed to get DBT info" }, {
      status: info ? 200 : 500,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { command, models, seeds, use_cache, validateOnly } = body;

  try {
    if (validateOnly) {
      if (!models) {
        return NextResponse.json(
          { error: "Models are required for validation" },
          { status: 400 }
        );
      }
      const result = await validateDbtModel(models);
      return NextResponse.json(result, { status: 200 });
    }

    // Default to 'run' if no command provided but models exist
    const dbtCommand = command || "run";

    const result = await runDbtCommand(dbtCommand, models, seeds, use_cache);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("DBT execution error:", error);
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
