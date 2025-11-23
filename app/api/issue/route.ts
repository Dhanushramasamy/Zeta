import { NextResponse } from 'next/server';
import { getIssueDetailsByIdentifier } from '@/lib/linear';

export async function POST(request: Request) {
    try {
        const { identifier } = await request.json();
        if (!identifier) {
            return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
        }

        const issue = await getIssueDetailsByIdentifier(identifier);

        if (!issue) {
            return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
        }

        return NextResponse.json({ issue });
    } catch (error) {
        console.error('Error fetching issue:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
