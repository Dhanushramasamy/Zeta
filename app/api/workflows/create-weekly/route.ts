
import { NextResponse } from 'next/server';
import { LinearClient } from '@linear/sdk';

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

const CLIENT_PROJECTS: Record<string, string> = {
    'Divank': '6861ae96-6816-428f-ac71-8bf711ba4f98',
    'Insight-Ally': '1c88459b-5419-4e62-a15c-795d5d52860a',
    'Acolyte': '5f2dba25-d6c9-47dd-88f1-bdbb4b23df81'
};

const TEMPLATE_ID = 'adfd6574-41dd-4d64-aa43-7cdc9aa37aa5';

export async function POST(request: Request) {
    try {
        const { clientName, weekStart } = await request.json();

        if (!clientName || !CLIENT_PROJECTS[clientName]) {
            return NextResponse.json({ error: 'Invalid client name' }, { status: 400 });
        }

        const projectId = CLIENT_PROJECTS[clientName];
        const me = await linearClient.viewer;

        // Calculate Week Number and Month
        const date = new Date();
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDays = Math.floor((date.valueOf() - startOfYear.valueOf()) / 86400000);
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const month = date.toLocaleString('default', { month: 'long' });

        const title = `Status Updates - ${clientName} Week ${weekNum} ${month}`;

        // Create issue using the specific Template ID
        // We cast to any because templateId might not be in the stricter type definitions yet
        const issuePayload: any = {
            teamId: (await (await linearClient.project(projectId)).teams()).nodes[0].id,
            projectId: projectId,
            title: title,
            assigneeId: me.id,
            templateId: TEMPLATE_ID
        };

        const issue = await linearClient.createIssue(issuePayload);

        if (issue.success) {
            const createdIssue = await issue.issue;
            return NextResponse.json({ success: true, issue: { id: createdIssue?.id, identifier: createdIssue?.identifier, url: createdIssue?.url } });
        } else {
            throw new Error('Failed to create issue');
        }

    } catch (error) {
        console.error('Error creating weekly ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
