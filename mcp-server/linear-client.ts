import { LinearClient } from '@linear/sdk';

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface IssueDetails {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    url: string;
    state: string;
    priority: number;
    priorityLabel: string;
    assignee?: string;
    project?: string;
    labels: string[];
    team: string;
    dueDate?: string;
    comments: { body: string; author: string }[];
}

export interface CreateIssueParams {
    title: string;
    description?: string;
    priority?: number;         // 0=none, 1=urgent, 2=high, 3=medium, 4=low
    labelNames?: string[];
    assigneeName?: string;
    dueDate?: string;          // ISO date string e.g. "2025-04-01"
    projectName?: string;
    firstComment?: string;     // Optional initial progress comment
}

export interface UpdateIssueParams {
    title?: string;
    description?: string;
    priority?: number;
    labelNames?: string[];
    assigneeName?: string;
    dueDate?: string;
    projectName?: string;
    progressComment?: string;  // Optional comment about the update
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getDefaultTeamId(): Promise<string> {
    const me = await linearClient.viewer;
    const teams = await me.teams();
    if (teams.nodes.length === 0) throw new Error('No team found for user');
    return teams.nodes[0].id;
}

async function resolveLabelIds(labelNames: string[]): Promise<string[]> {
    if (!labelNames.length) return [];
    const labels = await linearClient.issueLabels();
    return labelNames
        .map(name => {
            const found = labels.nodes.find(
                l => l.name.toLowerCase() === name.toLowerCase()
            );
            return found?.id;
        })
        .filter((id): id is string => !!id);
}

async function resolveAssigneeId(name: string): Promise<string | undefined> {
    const users = await linearClient.users();
    const found = users.nodes.find(
        u => u.name.toLowerCase().includes(name.toLowerCase()) ||
             u.displayName.toLowerCase().includes(name.toLowerCase())
    );
    return found?.id;
}

async function resolveProjectId(name: string): Promise<string | undefined> {
    const projects = await linearClient.projects();
    const found = projects.nodes.find(
        p => p.name.toLowerCase().includes(name.toLowerCase())
    );
    return found?.id;
}

async function resolveStateId(teamId: string, stateName: string): Promise<string | undefined> {
    const team = await linearClient.team(teamId);
    const states = await team.states();
    const found = states.nodes.find(
        s => s.name.toLowerCase() === stateName.toLowerCase()
    );
    return found?.id;
}

async function getCanceledStateId(teamId: string): Promise<string | undefined> {
    const team = await linearClient.team(teamId);
    const states = await team.states();
    const found = states.nodes.find(s => s.type === 'cancelled');
    return found?.id;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function createIssue(params: CreateIssueParams) {
    const teamId = await getDefaultTeamId();

    const [labelIds, assigneeId, projectId] = await Promise.all([
        params.labelNames ? resolveLabelIds(params.labelNames) : Promise.resolve([]),
        params.assigneeName ? resolveAssigneeId(params.assigneeName) : Promise.resolve(undefined),
        params.projectName ? resolveProjectId(params.projectName) : Promise.resolve(undefined),
    ]);

    const result = await linearClient.createIssue({
        teamId,
        title: params.title,
        description: params.description,
        priority: params.priority,
        labelIds: labelIds.length ? labelIds : undefined,
        assigneeId,
        dueDate: params.dueDate,
        projectId,
    });

    if (!result.success) throw new Error('Failed to create issue');

    const issue = await result.issue;
    if (!issue) throw new Error('Issue created but could not be retrieved');

    // Add first comment if provided
    if (params.firstComment) {
        await linearClient.createComment({ issueId: issue.id, body: params.firstComment });
    }

    return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        url: issue.url,
    };
}

export async function updateIssue(identifier: string, params: UpdateIssueParams) {
    const issue = await linearClient.issue(identifier);
    if (!issue) throw new Error(`Issue not found: ${identifier}`);

    const teamNode = await issue.team;
    const teamId = teamNode?.id ?? await getDefaultTeamId();

    const [labelIds, assigneeId, projectId] = await Promise.all([
        params.labelNames ? resolveLabelIds(params.labelNames) : Promise.resolve(undefined),
        params.assigneeName ? resolveAssigneeId(params.assigneeName) : Promise.resolve(undefined),
        params.projectName ? resolveProjectId(params.projectName) : Promise.resolve(undefined),
    ]);

    const updates: Record<string, unknown> = {};
    if (params.title !== undefined) updates.title = params.title;
    if (params.description !== undefined) updates.description = params.description;
    if (params.priority !== undefined) updates.priority = params.priority;
    if (labelIds !== undefined) updates.labelIds = labelIds;
    if (assigneeId !== undefined) updates.assigneeId = assigneeId;
    if (params.dueDate !== undefined) updates.dueDate = params.dueDate;
    if (projectId !== undefined) updates.projectId = projectId;

    const result = await linearClient.updateIssue(issue.id, updates);
    if (!result.success) throw new Error('Failed to update issue');

    if (params.progressComment) {
        await linearClient.createComment({ issueId: issue.id, body: params.progressComment });
    }

    return { id: issue.id, identifier: issue.identifier, url: issue.url };
}

export async function cancelIssue(identifier: string) {
    const issue = await linearClient.issue(identifier);
    if (!issue) throw new Error(`Issue not found: ${identifier}`);

    const teamNode = await issue.team;
    const teamId = teamNode?.id ?? await getDefaultTeamId();
    const stateId = await getCanceledStateId(teamId);
    if (!stateId) throw new Error('No canceled state found for this team');

    const result = await linearClient.updateIssue(issue.id, { stateId });
    if (!result.success) throw new Error('Failed to cancel issue');

    return { identifier: issue.identifier, status: 'canceled' };
}

export async function addComment(identifier: string, body: string) {
    const issue = await linearClient.issue(identifier);
    if (!issue) throw new Error(`Issue not found: ${identifier}`);

    const result = await linearClient.createComment({ issueId: issue.id, body });
    if (!result.success) throw new Error('Failed to add comment');

    return { issueIdentifier: identifier, commentAdded: true };
}

export async function updateIssueStatus(identifier: string, stateName: string) {
    const issue = await linearClient.issue(identifier);
    if (!issue) throw new Error(`Issue not found: ${identifier}`);

    const teamNode = await issue.team;
    const teamId = teamNode?.id ?? await getDefaultTeamId();
    const stateId = await resolveStateId(teamId, stateName);
    if (!stateId) throw new Error(`State "${stateName}" not found for this team`);

    const result = await linearClient.updateIssue(issue.id, { stateId });
    if (!result.success) throw new Error('Failed to update issue status');

    return { identifier: issue.identifier, newState: stateName };
}

export async function searchIssues(query: string, projectName?: string) {
    const issues = await linearClient.issueSearch({ query, first: 20 });

    let results = await Promise.all(issues.nodes.map(async (issue) => {
        const state = await issue.state;
        const assignee = await issue.assignee;
        const project = await issue.project;
        return {
            identifier: issue.identifier,
            title: issue.title,
            state: state?.name ?? 'Unknown',
            assignee: assignee?.name ?? 'Unassigned',
            project: project?.name,
            url: issue.url,
            priority: issue.priorityLabel,
        };
    }));

    if (projectName) {
        results = results.filter(
            r => r.project?.toLowerCase().includes(projectName.toLowerCase())
        );
    }

    return results;
}

export async function getIssueDetails(identifier: string): Promise<IssueDetails> {
    const issue = await linearClient.issue(identifier);
    if (!issue) throw new Error(`Issue not found: ${identifier}`);

    const [state, assignee, project, labels, team, commentsConn] = await Promise.all([
        issue.state,
        issue.assignee,
        issue.project,
        issue.labels(),
        issue.team,
        issue.comments({ last: 10 }),
    ]);

    const comments = await Promise.all(commentsConn.nodes.map(async (c) => {
        const user = await c.user;
        return { body: c.body, author: user?.name ?? 'Unknown' };
    }));

    return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        state: state?.name ?? 'Unknown',
        priority: issue.priority,
        priorityLabel: issue.priorityLabel,
        assignee: assignee?.name,
        project: project?.name,
        labels: labels.nodes.map(l => l.name),
        team: team?.name ?? 'Unknown',
        dueDate: issue.dueDate,
        comments,
    };
}

export async function listProjects() {
    const projects = await linearClient.projects({ first: 50 });
    return projects.nodes.map(p => ({
        id: p.id,
        name: p.name,
        state: p.state,
        description: p.description,
    }));
}

export async function listLabels() {
    const labels = await linearClient.issueLabels({ first: 100 });
    return labels.nodes.map(l => ({
        id: l.id,
        name: l.name,
        color: l.color,
    }));
}

export async function listUsers() {
    const users = await linearClient.users({ first: 100 });
    return users.nodes.map(u => ({
        id: u.id,
        name: u.name,
        displayName: u.displayName,
        email: u.email,
    }));
}

export async function listStates() {
    const teams = await linearClient.teams();
    const allStates: { id: string; name: string; type: string; team: string }[] = [];

    for (const team of teams.nodes) {
        const states = await team.states();
        for (const s of states.nodes) {
            allStates.push({ id: s.id, name: s.name, type: s.type, team: team.name });
        }
    }

    return allStates;
}
