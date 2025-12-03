import { runJavaScriptCode } from "@/lib/executor/javascript";
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

// Test execution
try {
    const input_data = ${testCase?.input || "null"};
    
    // Check if solution function exists
    if (typeof solution === 'function') {
        // Check function signature
        const params = solution.length;
        
        let result;
        if (params > 0) {
            result = solution(input_data);
        } else {
            result = solution();
        }
        
        console.log(JSON.stringify(result));
    } else {
        throw new Error('Function "solution" is not defined');
    }
} catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
}
`;
    const result = await runJavaScriptCode(fullCode);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("JavaScript execution error:", error);
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
