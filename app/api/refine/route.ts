import { NextResponse } from 'next/server';
import { refineSuggestion } from '@/lib/openai';

export async function POST(request: Request) {
    try {
        const { suggestion, userPrompt, issueContext } = await request.json();

        if (!suggestion || !userPrompt) {
            return NextResponse.json({ error: 'Suggestion and userPrompt are required' }, { status: 400 });
        }

        const refinedSuggestion = await refineSuggestion(suggestion, userPrompt, issueContext);

        return NextResponse.json({ suggestion: refinedSuggestion });
    } catch (error) {
        console.error('Error in refine route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
