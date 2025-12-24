import { NextResponse } from 'next/server';
import { LinearClient } from '@linear/sdk';

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const project = searchParams.get('project');
        const priority = searchParams.get('priority');
        const assigneeName = searchParams.get('assigneeName');
        const mentionsDhanush = searchParams.get('mentionsDhanush') === 'true';

        const projects = searchParams.get('projects')?.split(',').filter(Boolean);
        const statuses = searchParams.get('statuses')?.split(',').filter(Boolean);

        // Build Linear Filter
        const filter: any = {};

        // Status Filter
        if (statuses && statuses.length > 0) {
            filter.state = { name: { in: statuses } };
        } else {
            // Default: Show everything except Canceled
            filter.state = { name: { nin: ["Canceled"] } };
        }

        // Project Filter
        if (projects && projects.length > 0) {
            filter.project = { name: { in: projects } };
        } else if (project) {
            // Backward compatibility for single search
            filter.project = { name: { containsIgnoreCase: project } };
        }

        if (priority) {
            filter.priority = { eq: parseInt(priority) };
        }

        // Combine Assignee and Mentions into a single OR group (Union logic)
        const orFilters: any[] = [];

        if (assigneeName) {
            orFilters.push({ assignee: { name: { containsIgnoreCase: assigneeName } } });
        }

        if (mentionsDhanush) {
            orFilters.push(
                { title: { containsIgnoreCase: "Dhanush" } },
                { description: { containsIgnoreCase: "Dhanush" } },
                // Linear API allows filtering issues by related comments content
                { comments: { body: { containsIgnoreCase: "Dhanush" } } }
            );
        }

        if (orFilters.length > 0) {
            filter.or = orFilters;
        }

        // We fetch comments nodes to perform the local "isMentioned" check accurately for the dashboard boolean
        const issues = await linearClient.issues({
            first: 50, // Page size
            orderBy: 'updatedAt' as any, // Cast to any to avoid strict enum lint error
            filter
        });

        // Fetch details needed for the dashboard (Graph traversal)
        // To avoid N+1, we rely on the SDK's internal batching or simple field fetching.
        // Ideally we requested specific fields via GraphQL, but SDK `issues()` returns nodes.
        // We need to resolve relations. SDK lazy loads, so strictly we should `await` them.

        const mappedIssues = await Promise.all(issues.nodes.map(async (issue) => {
            const state = await issue.state;
            const assignee = await issue.assignee;
            const project = await issue.project;
            // Fetch comments for accurate mention flagging in the UI list
            const comments = await issue.comments({ last: 5 });

            // Robust mention detection: Title, Description, or any recent Comment
            const isMentioned = (
                issue.title.toLowerCase().includes('dhanush') ||
                (issue.description || '').toLowerCase().includes('dhanush') ||
                comments.nodes.some(c => c.body?.toLowerCase().includes('dhanush'))
            );

            return {
                id: issue.id,
                identifier: issue.identifier,
                title: issue.title,
                description: issue.description,
                state: state?.name || 'Unknown',
                priority: issue.priority,
                priority_label: issue.priorityLabel,
                assignee_name: assignee?.name || 'Unassigned',
                project_name: project?.name || 'No Project',
                due_date: issue.dueDate,
                url: issue.url,
                mentions_dhanush: isMentioned,
                updated_at: issue.updatedAt
            };
        }));

        return NextResponse.json({ issues: mappedIssues });

    } catch (error) {
        console.error('Error searching issues with Linear SDK:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
