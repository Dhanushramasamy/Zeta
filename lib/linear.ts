import { LinearClient } from '@linear/sdk';
import { createClient } from '@supabase/supabase-js';

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface LinearIssue {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    url: string;
    state: { name: string };
    assignee?: { name: string };
    project?: { name: string };
    priority?: number;
    priorityLabel?: string;
    labels?: { name: string }[];
    team?: { name: string };
    dueDate?: string;
    comments?: { body: string; user?: { name: string } }[];
}

export interface LinearUser {
    id: string;
    name: string;
    displayName: string;
}

export async function getIssuesFromSupabase(): Promise<LinearIssue[]> {
    const { data: issues, error } = await supabase
        .from('linear_issues')
        .select(`
            *,
            comments:linear_comments(body, user_name)
        `)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching from Supabase:', error);
        return [];
    }

    return issues.map((i: {
        id: string;
        identifier: string;
        title: string;
        description: string;
        url: string;
        state: string;
        assignee_name: string;
        project_name: string;
        priority: number;
        priority_label: string;
        labels: string[];
        team_name: string;
        due_date: string;
        comments: { body: string; user_name: string }[];
    }) => ({
        id: i.id,
        identifier: i.identifier,
        title: i.title,
        description: i.description,
        url: i.url,
        state: { name: i.state },
        assignee: { name: i.assignee_name },
        project: i.project_name ? { name: i.project_name } : undefined,
        priority: i.priority,
        priorityLabel: i.priority_label,
        labels: i.labels ? i.labels.map((l: string) => ({ name: l })) : [],
        team: { name: i.team_name },
        dueDate: i.due_date,
        comments: i.comments?.map((c) => ({ body: c.body, user: { name: c.user_name } })) || []
    }));
}

export async function getMyIssues(): Promise<LinearIssue[]> {
    const me = await linearClient.viewer;
    const issues = await me.assignedIssues({
        filter: {
            state: {
                name: {
                    nin: ['Done', 'Canceled'],
                },
            },
        },
        first: 50,
    });

    return await Promise.all(issues.nodes.map(async (issue) => {
        const state = await issue.state;
        const assignee = await issue.assignee;
        const project = await issue.project;
        const team = await issue.team;
        const labels = await issue.labels();
        const comments = await issue.comments({ last: 5 }); // Fetch last 5 comments for context

        const commentsData = await Promise.all(comments.nodes.map(async (c) => {
            const user = await c.user;
            return { body: c.body, user: { name: user?.name || 'Unknown' } };
        }));

        return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            url: issue.url,
            state: { name: state?.name || 'Unknown' },
            assignee: { name: assignee?.name || 'Unassigned' },
            project: project ? { name: project.name } : undefined,
            priority: issue.priority,
            priorityLabel: issue.priorityLabel,
            labels: labels.nodes.map(l => ({ name: l.name })),
            team: { name: team?.name || 'Unknown' },
            dueDate: issue.dueDate,
            comments: commentsData,
        };
    }));
}

export async function getUsers(): Promise<LinearUser[]> {
    const users = await linearClient.users();
    return users.nodes.map(u => ({
        id: u.id,
        name: u.name,
        displayName: u.displayName,
    }));
}

export async function createComment(issueId: string, body: string) {
    return await linearClient.createComment({
        issueId,
        body,
    });
}

export async function createIssue(title: string, description?: string, teamId?: string) {
    // If no teamId provided, fetch the first team the user is in (simplified for now)
    let targetTeamId = teamId;
    if (!targetTeamId) {
        const me = await linearClient.viewer;
        const teams = await me.teams();
        if (teams.nodes.length > 0) {
            targetTeamId = teams.nodes[0].id;
        } else {
            throw new Error("No team found for user");
        }
    }

    return await linearClient.createIssue({
        teamId: targetTeamId,
        title,
        description,
    });
}

export async function updateIssueStatus(issueId: string, stateId: string) {
    return await linearClient.updateIssue(issueId, {
        stateId
    })
}

export async function getIssueByIdentifier(identifier: string) {
    // 1. Try to find in Supabase first (fast, no rate limit)
    const { data: issue } = await supabase
        .from('linear_issues')
        .select('id')
        .eq('identifier', identifier)
        .single();

    if (issue) {
        return { id: issue.id };
    }

    // 2. Fallback to Linear API
    try {
        const issue = await linearClient.issue(identifier);
        return issue;
    } catch (e) {
        console.error("Error fetching issue by identifier", identifier, e);
        return null;
    }
}

export async function getIssueDetailsByIdentifier(identifier: string): Promise<LinearIssue | null> {
    const { data: issue, error } = await supabase
        .from('linear_issues')
        .select(`
            *,
            comments:linear_comments(body, user_name)
        `)
        .eq('identifier', identifier)
        .single();

    if (error || !issue) return null;

    return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        state: { name: issue.state },
        assignee: { name: issue.assignee_name },
        project: issue.project_name ? { name: issue.project_name } : undefined,
        priority: issue.priority,
        priorityLabel: issue.priority_label,
        labels: issue.labels ? issue.labels.map((l: string) => ({ name: l })) : [],
        team: { name: issue.team_name },
        dueDate: issue.due_date,
        comments: issue.comments?.map((c: any) => ({ body: c.body, user: { name: c.user_name } })) || []
    };
}

