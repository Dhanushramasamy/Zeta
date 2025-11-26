import { NextResponse } from 'next/server';
import { createComment, createIssue, getIssueByIdentifier } from '@/lib/linear';

export async function POST(request: Request) {
    try {
        const { actions } = await request.json();

        if (!actions || !Array.isArray(actions)) {
            return NextResponse.json({ error: 'Actions array is required' }, { status: 400 });
        }

        const results = [];

        for (const action of actions) {
            try {
                if (action.type === 'comment') {
                    if (!action.issueIdentifier) {
                        throw new Error('Issue identifier required for comment');
                    }

                    const issue = await getIssueByIdentifier(action.issueIdentifier);
                    if (!issue) {
                        throw new Error(`Issue not found: ${action.issueIdentifier}`);
                    }

                    await createComment(issue.id, action.description || action.reasoning);
                    results.push({ status: 'success', action });
                } else if (action.type === 'create_issue') {
                    await createIssue({
                        title: action.title,
                        description: action.description
                    });
                    results.push({ status: 'success', action });
                }
            } catch (e) {
                console.error('Error executing action', action, e);
                results.push({ status: 'error', error: String(e), action });
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Error in execute route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
