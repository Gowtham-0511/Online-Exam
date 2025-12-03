import { runPythonCode } from "@/lib/executor/python";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { code, testCase } = body;

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  try {
    const fullCode = `
${code}

# Test execution
import json
try:
    input_data = ${testCase?.input || "None"}
    
    # Check if solution accepts parameters
    import inspect
    sig = inspect.signature(solution)
    
    if len(sig.parameters) > 0:
        result = solution(input_data)
    else:
        result = solution()
    
    print(str(result))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
    const result = await runPythonCode(fullCode);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Python execution error:", error);
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
