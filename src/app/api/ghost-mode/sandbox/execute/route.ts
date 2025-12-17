import { NextResponse } from 'next/server';
import { executeCodeInSandbox } from '@/lib/ai/azureOpenAI';

export async function POST(req: Request) {
    try {
        const { code, language, stdin } = await req.json();

        if (!code || !language) {
            return NextResponse.json(
                { error: 'Code and language are required' },
                { status: 400 }
            );
        }

        const result = await executeCodeInSandbox(code, language, stdin);

        return NextResponse.json(result);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
