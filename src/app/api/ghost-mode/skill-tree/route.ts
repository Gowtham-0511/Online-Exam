
import { NextRequest, NextResponse } from 'next/server';
import { generateSkillTree } from '@/lib/ai/azureOpenAI';

export async function POST(req: NextRequest) {
    try {
        const { topic, userLevel } = await req.json();

        if (!topic) {
            return NextResponse.json(
                { error: 'Topic is required' },
                { status: 400 }
            );
        }

        const skillTree = await generateSkillTree(topic, userLevel);

        return NextResponse.json(skillTree);

    } catch (error) {
        console.error('Skill Tree API Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate skill tree' },
            { status: 500 }
        );
    }
}
