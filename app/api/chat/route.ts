import { NextResponse } from 'next/server';
import { getIssuesFromSupabase, getUsers } from '@/lib/linear';
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
            description: 'Create a new issue in Linear',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'The title of the issue' },
                    description: { type: 'string', description: 'The description of the issue' },
                    teamId: { type: 'string', description: 'The team ID (optional, will default if not provided)' },
                },
                required: ['title', 'description'],
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
];

export async function POST(request: Request) {
    try {
        const { messages } = await request.json();

        // 1. Fetch Context (Active Issues & Users)
        const [issues, users] = await Promise.all([
            getIssuesFromSupabase(),
            getUsers()
        ]);

        // 2. Prepare System Prompt with Context
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

        const systemMessage = {
            role: 'system',
            content: `You are a helpful work assistant for Dhanush. 
      
You have access to his active Linear issues with full details:
${issuesContext}

And these team members:
${usersContext}

**Response Guidelines:**
1. **Be CONCISE** - Keep responses short and scannable
2. **Use Visual Hierarchy:**
   - Use emojis for quick scanning (🔴 Urgent, 🟡 High, 📅 Due Soon, ✅ Done, 🏃 In Progress)
   - Group by Status, Priority, or Project when showing multiple issues
   - Use bullet points, not paragraphs
3. **Smart Grouping:**
   - For "what's in progress" → Group by project
   - For "what's due" → Sort by date
   - For "high priority" → Show priority first
4. **Format:**
   - Issue format: **[ID]** Title (Status, Priority, Due Date if relevant)
   - Keep descriptions to 1 line max
   - Only show relevant fields

**Example Good Response:**
🔴 **Urgent (2)**
• **IA-120** Synthesia Video Feature (In Progress, Due Nov 20)
• **DEV-2231** Email Unsubscribe (QA, Due Nov 21)

🟡 **High Priority (1)**
• **PROB2B-9** JSON Schema (In Progress, Due Nov 26)

**Actions:**
- If he asks to create/comment, use tool calls
- ALWAYS use tool calls for actions, never just say you did it
- When referring to issues, use their identifier (e.g., LIN-123)
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
