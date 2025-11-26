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
    project?: string; // Inferred project name
}

export async function analyzeNotes(notes: string, activeIssues: import('./linear').LinearIssue[], users: import('./linear').LinearUser[] = [], projectName?: string): Promise<SuggestedAction[]> {
    const issuesContext = activeIssues
        .map((i) => {
            const comments = i.comments?.map(c => `    - ${c.user?.name}: ${c.body}`).join('\n') || '';
            return `[${i.identifier}] ${i.title}
  Status: ${i.state.name}
  Project: ${i.project?.name || 'None'}
  Priority: ${i.priorityLabel || 'None'}
  Comments:
${comments}`;
        })
        .join('\n\n');

    const usersContext = users.map(u => `${u.name} (@${u.displayName})`).join(', ');

    const projectContextNote = projectName
        ? `\n**IMPORTANT:** The user has selected the project "${projectName}". Focus your analysis ONLY on issues related to this project. When creating new issues, assign them to this project.`
        : '';

    const prompt = `
You are a highly intelligent work assistant for Linear. Your goal is to analyze unstructured daily notes and convert them into structured, actionable Linear updates.

**Context:**
- **Active Issues:**
${issuesContext}

- **Team Members:**
${usersContext}
${projectContextNote}

**User's Notes:**
${notes}

**Instructions:**
Analyze the notes and extract actions.
1. **Match Existing Issues:** If the note refers to an existing issue (by ID or fuzzy title match), suggest a **comment** or **status update**.
   - *Crucial:* Check the "Active Issues" list carefully. If a note says "Fixed login bug", look for an issue like "Login page error" and use its ID.
2. **Create New Issues:** If the note describes a new task not in the list, suggest **creating a new issue**.
   - Infer the **Project** if possible based on the context or similar issues.
   - Write a clear, professional **Title** and **Description**.
3. **Smart Context:**
   - If the user mentions a name, tag them (e.g., "@alice").
   - If the user implies a status change (e.g., "done with...", "started..."), suggest a status update.

**Output Format:**
Return a JSON object with an "actions" array. Each action object must have:
- \`type\`: "comment" | "create_issue" | "update_status"
- \`issueIdentifier\`: string (Required for comment/update. Use the exact ID from the context, e.g., "LIN-123")
- \`title\`: string (Required for create_issue)
- \`description\`: string (The comment body or new issue description)
- \`reasoning\`: string (Why you chose this action and issue)
- \`project\`: string (Optional: The name of the project this belongs to, inferred from context)

**Example JSON:**
{
  "actions": [
    {
      "type": "comment",
      "issueIdentifier": "LIN-123",
      "description": "Fixed the validation logic. @alice can you verify?",
      "reasoning": "Matched 'validation fix' to LIN-123. User asked for verification.",
      "project": "Auth System"
    },
    {
      "type": "create_issue",
      "title": "Update Landing Page Hero",
      "description": "Change the hero image to the new assets provided by design.",
      "reasoning": "New task mentioned in notes.",
      "project": "Website Redesign"
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
