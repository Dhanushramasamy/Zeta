import { NextResponse } from 'next/server';
import { getIssuesFromSupabase, getUsers } from '@/lib/linear';
import { analyzeNotes } from '@/lib/openai';

export async function POST(request: Request) {
    try {
        const { notes, projectId } = await request.json();

        if (!notes) {
            return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
        }

        // 1. Fetch active issues from Supabase (filtered by project if provided) and Users
        const [issues, users] = await Promise.all([
            getIssuesFromSupabase(projectId),
            getUsers()
        ]);

        // 2. Analyze notes with OpenAI
        const suggestions = await analyzeNotes(notes, issues, users, projectId);

        // 3. Enrich suggestions with issue details
        const enrichedSuggestions = suggestions.map(suggestion => {
            if (suggestion.issueIdentifier) {
                const issue = issues.find(i => i.identifier === suggestion.issueIdentifier);
                if (issue) {
                    return { ...suggestion, issueDetails: issue };
                }
            }
            return suggestion;
        });

        return NextResponse.json({ suggestions: enrichedSuggestions });
    } catch (error) {
        console.error('Error in analyze route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
