import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface SuggestedAction {
    type: 'comment' | 'create_issue' | 'update_status';
    issueIdentifier?: string; // e.g., LIN-123 (required for comment/update)
    title?: string; // Required for create_issue
    description?: string; // For comment body or issue description
    reasoning: string;
}

export async function analyzeNotes(notes: string, activeIssues: import('./linear').LinearIssue[], users: import('./linear').LinearUser[] = []): Promise<SuggestedAction[]> {
    const issuesContext = activeIssues
        .map((i) => {
            const comments = i.comments?.map(c => `    - ${c.user?.name}: ${c.body}`).join('\n') || '';
            return `${i.identifier}: ${i.title} (Status: ${i.state.name})\n  Comments:\n${comments}`;
        })
        .join('\n\n');

    const usersContext = users.map(u => `${u.name} (@${u.displayName})`).join(', ');

    const prompt = `
You are a helpful assistant that analyzes daily work notes and suggests updates for Linear issues.

Current Active Issues for the user (with recent comments):
${issuesContext}

Available Users for tagging:
${usersContext}

User's Daily Notes:
${notes}

Based on the notes, suggest actions to take on Linear.
- If the user mentions working on an existing issue, suggest posting a comment.
- If the user mentions a new task that doesn't match an existing issue, suggest creating a new issue.
- If the user says they finished an issue, suggest updating the status.
- **Context Awareness**: Read the recent comments to ensure your new comment adds value and doesn't repeat things.
- **Tagging**: If the user mentions a name (e.g. "Alice"), try to tag them using their Linear handle if available (e.g. "@alice").
- **Detailed Creation**: When creating a new issue, use all available details to write a comprehensive description.

Return a JSON object with a key "actions" which is an array of objects.
Each object should have:
- type: "comment" | "create_issue" | "update_status"
- issueIdentifier: string (e.g. "LIN-123") - ONLY for "comment"
- title: string - ONLY for "create_issue"
- description: string - The content of the comment or the description of the new issue.
- reasoning: string - Brief explanation of why this action is suggested.

Example JSON:
{
  "actions": [
    {
      "type": "comment",
      "issueIdentifier": "LIN-123",
      "description": "Fixed the login bug. @alice please review.",
      "reasoning": "User mentioned fixing login bug and asked Alice to review."
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a helpful assistant designed to output JSON.' },
            { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    try {
        const parsed = JSON.parse(content);
        return parsed.actions || [];
    } catch (e) {
        console.error('Failed to parse OpenAI response', e);
        return [];
    }
}

export async function refineSuggestion(suggestion: SuggestedAction, userPrompt: string, issueContext?: unknown): Promise<SuggestedAction> {
    const prompt = `
    Refine the following Linear action based on the user's feedback.

    Original Action:
    Type: ${suggestion.type}
    Title: ${suggestion.title || 'N/A'}
    Description: ${suggestion.description}

    Issue Context (if any):
    ${JSON.stringify(issueContext || {})}

    User's Feedback/Prompt:
    ${userPrompt}

    Return the updated action as a JSON object (same structure as before).
    `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a helpful assistant designed to output JSON.' },
            { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) return suggestion;

    try {
        const parsed = JSON.parse(content);
        return { ...suggestion, ...parsed };
    } catch (e) {
        console.error('Failed to parse OpenAI response for refinement', e);
        return suggestion;
    }
}
