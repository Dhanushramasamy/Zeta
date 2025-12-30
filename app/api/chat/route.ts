import { NextResponse } from 'next/server';
import { getIssuesFromSupabase, getUsers, getIssueDetailsByIdentifier } from '@/lib/linear';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define tools available to the agent
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'create_issue',
            description: 'Create a new standalone issue in Linear. Prefer providing status/state, project, priority, milestone, due date, and labels when possible. If missing, ask the user for the missing fields in ONE consolidated question.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'The title of the issue' },
                    description: { type: 'string', description: 'The description of the issue' },
                    teamId: { type: 'string', description: 'The team ID (optional, will default if not provided)' },
                    stateId: { type: 'string', description: 'Workflow state ID (status) to set for the issue' },
                    projectId: { type: 'string', description: 'Project ID to assign' },
                    priority: { type: 'number', description: 'Priority (Linear numeric priority). Use 1=Urgent, 2=High, 3=Medium, 4=Low when possible.' },
                    milestoneId: { type: 'string', description: 'Milestone/Cycle ID to assign (cycles are treated as milestones)' },
                    dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
                    labelIds: { type: 'array', items: { type: 'string' }, description: 'Label IDs to apply' },
                },
                required: ['title', 'description'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_sub_issue',
            description: 'Create a sub-issue under an existing parent issue. Automatically inherits team, labels, project from parent and assigns to Dhanush.',
            parameters: {
                type: 'object',
                properties: {
                    parentIssueId: { type: 'string', description: 'The parent issue identifier (e.g., PROB2B-77)' },
                    title: { type: 'string', description: 'The title of the sub-issue' },
                    description: { type: 'string', description: 'The description of the sub-issue' },
                    initialState: { type: 'string', enum: ['Todo', 'In Progress', 'Backlog'], description: 'The initial state. Defaults to In Progress' },
                },
                required: ['parentIssueId', 'title', 'description'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'post_comment',
            description: 'Post a comment on an existing issue',
            parameters: {
                type: 'object',
                properties: {
                    issueId: { type: 'string', description: 'The ID of the issue (e.g., LIN-123)' },
                    body: { type: 'string', description: 'The content of the comment' },
                },
                required: ['issueId', 'body'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_issue_status',
            description: 'Update the status/state of an existing issue',
            parameters: {
                type: 'object',
                properties: {
                    issueId: { type: 'string', description: 'The ID of the issue (e.g., LIN-123)' },
                    stateId: { type: 'string', description: 'The name or ID of the new state (e.g., "Done", "In Progress", "Canceled")' },
                },
                required: ['issueId', 'stateId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'find_issue',
            description: 'Search for an existing issue. Use this BEFORE creating a new issue or logging work if the Issue ID is unknown.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search keywords (e.g., "login page", "API refactor")' },
                    project: { type: 'string', description: 'Optional project name filter (Divank, Insight-Ally, Acolyte)' },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_status_ticket',
            description: 'Update a Status Update ticket description with planned or completed work items for today. The status ticket is identified by having "Status Update" in its title OR explicitly mentioned with "update to [TICKET-ID]". This updates the DESCRIPTION of the ticket, NOT a comment.',
            parameters: {
                type: 'object',
                properties: {
                    statusTicketId: { type: 'string', description: 'The ID of the status update ticket (e.g., IA-232)' },
                    logType: { 
                        type: 'string', 
                        enum: ['planned', 'completed'],
                        description: 'Whether these items are planned (A section) or completed (B section)' 
                    },
                    items: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Array of work items to add to the description' 
                    },
                    workTickets: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional array of work ticket IDs referenced in the items (e.g., ["IA-234", "IA-225"])'
                    }
                },
                required: ['statusTicketId', 'logType', 'items'],
            },
        },
    },
];

export async function POST(request: Request) {
    try {
        const { messages: rawMessages, statusUpdateMode = false, clientDateStr, chatMode = 'general' } = (await request.json()) as {
            messages: any[];
            statusUpdateMode?: boolean;
            clientDateStr?: string;
            chatMode?: 'general' | 'create_issue' | 'update_issue' | 'issue_qa' | 'status_update';
        };

        // Helper to sanitize messages: ensure every tool_call in assistant messages has a corresponding tool response
        const sanitizeMessages = (msgs: any[]) => {
            const sanitized = [...msgs];
            for (let i = 0; i < sanitized.length; i++) {
                const msg = sanitized[i];
                if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
                    // Find all subsequent tool messages that respond to this assistant message
                    const respondingToolIds = new Set();
                    for (let j = i + 1; j < sanitized.length; j++) {
                        if (sanitized[j].role === 'tool' && sanitized[j].tool_call_id) {
                            respondingToolIds.add(sanitized[j].tool_call_id);
                        }
                    }

                    // Filter tool_calls to only those that have a response
                    const validToolCalls = msg.tool_calls.filter((tc: any) => respondingToolIds.has(tc.id));

                    // If we filtered out some calls, update the message
                    if (validToolCalls.length !== msg.tool_calls.length) {
                        // Create a new message object to avoid mutating the original if needed, 
                        // though here we are working on a copy of the array logic
                        sanitized[i] = { ...msg, tool_calls: validToolCalls };
                    }

                    // If no valid tool calls remain, and content is empty, this message is invalid. 
                    // However, we usually keep it if it has content.
                    if (sanitized[i].tool_calls.length === 0 && !sanitized[i].content) {
                        // This is an edge case; usually there's content or we just remove the tool_calls property
                        delete sanitized[i].tool_calls;
                    }
                }
            }
            return sanitized;
        };

        const messages = sanitizeMessages(rawMessages);

        // 1. Detect and Fetch Explicit Issue Context
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
        const issueIdRegex = /\b([A-Z]+[A-Z0-9]*-\d+)\b/g;
        const mentionedIssueIds: string[] = Array.from(new Set(lastUserMessage.match(issueIdRegex) || []));

        let explicitIssuesContext = '';
        if (mentionedIssueIds.length > 0) {
            const detailPromises = mentionedIssueIds.map(id => getIssueDetailsByIdentifier(id));
            const details = await Promise.all(detailPromises);

            explicitIssuesContext = details
                .filter(d => d !== null)
                .map(d => {
                    const labels = d!.labels?.map(l => l.name).join(', ') || 'None';
                    const comments = d!.comments?.map(c => `[${c.user?.name}]: ${c.body}`).join('\n') || 'No comments';
                    return `
--- DETAILED DATA FOR MENTIONED ISSUE: ${d!.identifier} ---
Title: ${d!.title}
Status: ${d!.state.name}
Priority: ${d!.priorityLabel || 'No Priority'}
Project: ${d!.project?.name || 'No Project'}
Team: ${d!.team?.name}
Labels: ${labels}
Due Date: ${d!.dueDate || 'None'}
Description: ${d!.description || 'No description'}
Recent Comments:
${comments}
`;
                }).join('\n');
        }

        // 2. Fetch General Context (Active Issues & Users)
        const [issues, users] = await Promise.all([
            getIssuesFromSupabase(),
            getUsers()
        ]);

        // 3. Prepare System Prompt with Context
        const issuesContext = issues
            .map((i) => {
                const labels = i.labels?.map(l => l.name).join(', ') || 'None';
                const project = i.project?.name || 'No Project';
                const priority = i.priorityLabel || 'No Priority';

                return `
Ticket: ${i.identifier}
Title: ${i.title}
Status: ${i.state.name}
Priority: ${priority}
Project: ${project}
Team: ${i.team?.name}
Labels: ${labels}
Due Date: ${i.dueDate || 'None'}
Description: ${i.description || 'No description'}
`;
            })
            .join('\n---\n');

        const usersContext = users.map(u => `${u.name} (@${u.displayName})`).join(', ');

        // Build status update mode instructions
        const statusUpdateInstructions = statusUpdateMode ? `
**🔵 STATUS UPDATE MODE IS ACTIVE**
When the user mentions work items, you should use the 'update_status_ticket' tool to update a Status Update ticket's DESCRIPTION (not comment).

How to identify the Status Update ticket:
1. User explicitly says "update to [TICKET-ID]" or "add to [TICKET-ID]"
2. Ticket has "Status Update" in its title

The other mentioned tickets are work tickets that should be referenced in the items.

${clientDateStr ? `IMPORTANT: The user's local date is "${clientDateStr}". When updating the status ticket, update the Day section that matches this date.` : ''}

The description format uses:
- 🧩Day X: [Date]
- A. Planned items (for planned work)
- B. Completed items (for completed work)

When user says something like "[IA-234] [IA-225] update this to [IA-232] - completed the API work":
- IA-232 is the status update ticket
- IA-234, IA-225 are work tickets
- Add items mentioning the work tickets under the appropriate section

ALWAYS use 'update_status_ticket' tool in status update mode.
` : '';

        const createIssueModeInstructions = chatMode === 'create_issue' ? `
**🟣 CREATE ISSUE MODE**
Focus on creating a new Linear issue. Before calling 'create_issue', you MUST collect:
- Status (state)
- Project
- Priority
- Milestone/Cycle
- Due date
- Labels
If any are missing, ask ONE consolidated question listing the missing fields. Do not call the tool until user answers.
` : '';

        const updateIssueModeInstructions = chatMode === 'update_issue' ? `
**🟠 UPDATE ISSUE MODE**
Focus on updating an existing issue. Prefer:
- 'update_issue_status' when the user wants status change
- 'post_comment' only if the user explicitly asks to comment
If the user did not provide an issue id, use 'find_issue' first.
` : '';

        const issueQaModeInstructions = chatMode === 'issue_qa' ? `
**🟢 ASK ABOUT ISSUE MODE**
Focus on answering questions about the mentioned issue(s) using the provided context. Avoid tool calls unless the user explicitly requests an action (create/update/comment).
` : '';

        const systemMessage = {
            role: 'system',
            content: `You are Zeta, the premium personal project management assistant for Dhanush. 
      
Your goal is to help Dhanush manage his tickets, track mentions, and update his work efficiently.
${statusUpdateInstructions}
${createIssueModeInstructions}
${updateIssueModeInstructions}
${issueQaModeInstructions}
${explicitIssuesContext ? `**IMPORTANT: DHANUSH HAS SPECIFICALLY MENTIONED THESE ISSUES. FOCUS YOUR RESPONSE ON THESE:**
${explicitIssuesContext}
---
` : ''}

**Context:**
- Active Issues for Dhanush:
${issuesContext}

- Team Members:
${usersContext}

**Operational Rules:**
1. **Dhanush First**: Always prioritize issues assigned to Dhanush or where he is mentioned.
2. **Be Zeta**: Maintain a professional, sleek, and highly efficient helpful persona.
3. **Response Guidelines:**
   - Use emojis strategically: 🔴 Urgent, 🟡 High, 📅 Due, ✅ Done, 🏃 In Progress, 📨 Mentioned
   - Group information logically (by Status, Priority, or Project)
   - Keep it concise. Use bullet points.
4. **Issue References**: Always use identifiers like [LIN-123].
5. **Creating Issues Requires Details**: When the user asks to create a new issue, you MUST collect these fields before calling 'create_issue':
   - Status (state)
   - Project
   - Priority
   - Milestone/Cycle
   - Due date
   - Labels
   If any are missing, ask ONE consolidated question that lists the missing fields and gives short options/examples for each. Do not call 'create_issue' until the user answers.

**Actions:**
- Use 'create_issue' to start new tasks.
- Use 'post_comment' to add updates to existing tickets.
- Use 'update_issue_status' to change the state of a ticket.
- Use 'update_status_ticket' to update a Status Update ticket's description with planned/completed items.
- ALWAYS use tool calls for these actions. Combos are encouraged (e.g. create_sub_issue + update_issue_status).
`,
        };

        // 3. Call OpenAI
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [systemMessage, ...messages],
            tools: tools,
            tool_choice: 'auto',
        });

        const message = response.choices[0].message;

        // 4. Return the response (which might contain tool calls)
        return NextResponse.json({ message });

    } catch (error) {
        console.error('Error in chat route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
