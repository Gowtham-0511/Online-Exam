import axios from "axios";

const JUDGE0_API = "https://judge0-ce.p.rapidapi.com/submissions";

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY!;

export async function runCode(language: "python" | "sql", sourceCode: string) {
    const languageId = language === "python" ? 71 : 82;

    const encodedCode = Buffer.from(sourceCode).toString("base64");

    const submission = await axios.post(
        `${JUDGE0_API}?base64_encoded=true&wait=true`,
        {
            language_id: languageId,
            source_code: encodedCode,
        },
        {
            headers: {
                "content-type": "application/json",
                "X-RapidAPI-Key": RAPIDAPI_KEY,
                "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            },
        }
    );

    const result = submission.data;

    const output = Buffer.from(result.stdout || result.stderr || result.compile_output || "", "base64").toString();

    return output;
}
