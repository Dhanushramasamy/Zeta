import { NextResponse } from 'next/server';
import { getIssuesFromSupabase } from '@/lib/linear';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const project = searchParams.get('project') || undefined;

        // Note: getIssuesFromSupabase currently only supports filtering by project.
        // Future improvement: Add support for assignee, state, limit in the lib function if needed.
        const issues = await getIssuesFromSupabase(project);

        return NextResponse.json({ issues });
    } catch (error) {
        console.error('Error fetching issues:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
