#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
    createIssue,
    updateIssue,
    cancelIssue,
    addComment,
    updateIssueStatus,
    searchIssues,
    getIssueDetails,
    listProjects,
    listLabels,
    listUsers,
    listStates,
} from './linear-client.js';

const server = new Server(
    { name: 'linear-mcp-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

// ── Tool definitions ───────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'create_linear_issue',
            description: 'Create a new Linear issue. Always consider: title, description (brief, not too technical), priority (urgent/high/medium/low/none), labels, assignee, due date, and an optional first comment about progress.',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Issue title' },
                    description: { type: 'string', description: 'Brief description — slightly technical but focused on the feature/goal, not implementation details' },
                    priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low', 'none'], description: 'Issue priority' },
                    labelNames: { type: 'array', items: { type: 'string' }, description: 'Label names (e.g. ["Feature", "Backend"])' },
                    assigneeName: { type: 'string', description: 'Assignee name (partial match works)' },
                    dueDate: { type: 'string', description: 'Due date in ISO format (e.g. "2025-04-01")' },
                    projectName: { type: 'string', description: 'Project name to assign the issue to (partial match works)' },
                    firstComment: { type: 'string', description: 'Optional first comment about current progress or context' },
                },
                required: ['title'],
            },
        },
        {
            name: 'update_linear_issue',
            description: 'Update an existing Linear issue by its identifier (e.g. "ENG-123"). Only include fields you want to change.',
            inputSchema: {
                type: 'object',
                properties: {
                    identifier: { type: 'string', description: 'Issue identifier, e.g. "ENG-123"' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low', 'none'] },
                    labelNames: { type: 'array', items: { type: 'string' } },
                    assigneeName: { type: 'string' },
                    dueDate: { type: 'string' },
                    projectName: { type: 'string' },
                    progressComment: { type: 'string', description: 'Optional comment describing what was updated or current progress' },
                },
                required: ['identifier'],
            },
        },
        {
            name: 'delete_linear_issue',
            description: 'Cancel a Linear issue (Linear does not support hard delete — this moves it to Canceled state).',
            inputSchema: {
                type: 'object',
                properties: {
                    identifier: { type: 'string', description: 'Issue identifier, e.g. "ENG-123"' },
                },
                required: ['identifier'],
            },
        },
        {
            name: 'add_comment',
            description: 'Add a comment or progress note to a Linear issue.',
            inputSchema: {
                type: 'object',
                properties: {
                    identifier: { type: 'string', description: 'Issue identifier, e.g. "ENG-123"' },
                    body: { type: 'string', description: 'Comment text' },
                },
                required: ['identifier', 'body'],
            },
        },
        {
            name: 'update_issue_status',
            description: 'Move a Linear issue to a different status/state (e.g. "In Progress", "Done", "Backlog").',
            inputSchema: {
                type: 'object',
                properties: {
                    identifier: { type: 'string', description: 'Issue identifier, e.g. "ENG-123"' },
                    stateName: { type: 'string', description: 'Target state name (e.g. "In Progress", "Done", "Todo")' },
                },
                required: ['identifier', 'stateName'],
            },
        },
        {
            name: 'search_issues',
            description: 'Search Linear issues by keyword. Optionally filter by project name.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search keyword(s)' },
                    projectName: { type: 'string', description: 'Optional project name filter' },
                },
                required: ['query'],
            },
        },
        {
            name: 'get_issue_details',
            description: 'Get full details of a Linear issue including description, status, labels, assignee, and recent comments.',
            inputSchema: {
                type: 'object',
                properties: {
                    identifier: { type: 'string', description: 'Issue identifier, e.g. "ENG-123"' },
                },
                required: ['identifier'],
            },
        },
        {
            name: 'list_projects',
            description: 'List all active Linear projects.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'list_labels',
            description: 'List all available Linear issue labels.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'list_users',
            description: 'List all workspace users in Linear.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'list_states',
            description: 'List all workflow states across all teams in Linear.',
            inputSchema: { type: 'object', properties: {} },
        },
    ],
}));

// ── Priority mapping ───────────────────────────────────────────────────────

function priorityNameToNumber(name?: string): number | undefined {
    if (!name) return undefined;
    const map: Record<string, number> = {
        urgent: 1,
        high: 2,
        medium: 3,
        low: 4,
        none: 0,
    };
    return map[name.toLowerCase()];
}

// ── Tool handler ───────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result: unknown;

        switch (name) {
            case 'create_linear_issue': {
                const a = args as {
                    title: string;
                    description?: string;
                    priority?: string;
                    labelNames?: string[];
                    assigneeName?: string;
                    dueDate?: string;
                    projectName?: string;
                    firstComment?: string;
                };
                result = await createIssue({
                    title: a.title,
                    description: a.description,
                    priority: priorityNameToNumber(a.priority),
                    labelNames: a.labelNames,
                    assigneeName: a.assigneeName,
                    dueDate: a.dueDate,
                    projectName: a.projectName,
                    firstComment: a.firstComment,
                });
                break;
            }

            case 'update_linear_issue': {
                const a = args as {
                    identifier: string;
                    title?: string;
                    description?: string;
                    priority?: string;
                    labelNames?: string[];
                    assigneeName?: string;
                    dueDate?: string;
                    projectName?: string;
                    progressComment?: string;
                };
                result = await updateIssue(a.identifier, {
                    title: a.title,
                    description: a.description,
                    priority: priorityNameToNumber(a.priority),
                    labelNames: a.labelNames,
                    assigneeName: a.assigneeName,
                    dueDate: a.dueDate,
                    projectName: a.projectName,
                    progressComment: a.progressComment,
                });
                break;
            }

            case 'delete_linear_issue': {
                const a = args as { identifier: string };
                result = await cancelIssue(a.identifier);
                break;
            }

            case 'add_comment': {
                const a = args as { identifier: string; body: string };
                result = await addComment(a.identifier, a.body);
                break;
            }

            case 'update_issue_status': {
                const a = args as { identifier: string; stateName: string };
                result = await updateIssueStatus(a.identifier, a.stateName);
                break;
            }

            case 'search_issues': {
                const a = args as { query: string; projectName?: string };
                result = await searchIssues(a.query, a.projectName);
                break;
            }

            case 'get_issue_details': {
                const a = args as { identifier: string };
                result = await getIssueDetails(a.identifier);
                break;
            }

            case 'list_projects':
                result = await listProjects();
                break;

            case 'list_labels':
                result = await listLabels();
                break;

            case 'list_users':
                result = await listUsers();
                break;

            case 'list_states':
                result = await listStates();
                break;

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
        };
    }
});

// ── Start server ───────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
