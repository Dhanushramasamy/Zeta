import { NextResponse } from 'next/server';
import { createIssue } from '@/lib/linear';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, teamId, assigneeId, priority, labelIds, dueDate } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        const issue = await createIssue({
            title,
            description,
            teamId,
            assigneeId,
            priority,
            labelIds,
            dueDate
        });

        return NextResponse.json({ success: true, issue });
    } catch (error) {
        console.error('Error creating issue:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
