import { NextResponse } from 'next/server';
import { createComment, createIssue, createSubIssue, getIssueByIdentifier, getIssuesFromSupabase } from '@/lib/linear';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { actions } = await request.json();

        if (!actions || !Array.isArray(actions)) {
            return NextResponse.json({ error: 'Actions array is required' }, { status: 400 });
        }

        const results = [];

        for (const action of actions) {
            try {
                const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const safeJsonParse = (s: string) => {
                    try {
                        return JSON.parse(s);
                    } catch {
                        return null;
                    }
                };
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
                    const result = await createIssue({
                        title: action.title,
                        description: action.description
                    });

                    // Get the created issue identifier for the response
                    let issueIdentifier = 'Unknown';
                    let issueUrl = '';
                    if (result.success && result.issue) {
                        const issue = await result.issue;
                        issueIdentifier = issue.identifier;
                        issueUrl = issue.url;
                    }

                    results.push({
                        status: 'success',
                        action,
                        data: {
                            ...result,
                            identifier: issueIdentifier,
                            url: issueUrl
                        }
                    });
                } else if (action.type === 'create_sub_issue') {
                    // Create sub-issue under parent
                    if (!action.parentIssueId) {
                        throw new Error('Parent issue identifier required for sub-issue');
                    }

                    const result: any = await createSubIssue(
                        action.parentIssueId,
                        action.title,
                        action.description,
                        action.initialState || 'In Progress'
                    );

                    const identifier = result.identifier || 'Unknown';
                    const url = result.url || '';
                    const parentId = result.parentIdentifier || action.parentIssueId;

                    results.push({
                        status: 'success',
                        action,
                        data: {
                            success: true,
                            identifier,
                            url,
                            parentIdentifier: parentId,
                            message: `✅ Created sub-issue [${identifier}](${url}) under ${parentId}`
                        }
                    });
                } else if (action.type === 'find_issue') {
                    const { query, project } = action;

                    let issues = await getIssuesFromSupabase(project);

                    if (query) {
                        const q = query.toLowerCase();
                        issues = issues.filter((i: any) =>
                            i.title.toLowerCase().includes(q) ||
                            (i.description && i.description.toLowerCase().includes(q)) ||
                            i.identifier.toLowerCase().includes(q)
                        );
                    }

                    // Limit to top 5
                    issues = issues.slice(0, 5);

                    results.push({
                        status: 'success',
                        action,
                        data: { foundIssues: issues }
                    });
                } else if (action.type === 'update_status') {
                    // Update Issue Status
                    if (!action.issueIdentifier) {
                        throw new Error('Issue identifier required for status update');
                    }
                    if (!action.stateId) {
                        throw new Error('State ID/Name required for status update');
                    }

                    // Import Linear SDK directly for full issue access
                    const { LinearClient } = await import('@linear/sdk');
                    const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

                    // Fetch full issue from Linear (not Supabase) to get team access
                    const issue = await linearClient.issue(action.issueIdentifier);
                    if (!issue) {
                        throw new Error(`Issue not found: ${action.issueIdentifier}`);
                    }

                    // Resolve state name to UUID if needed
                    let resolvedStateId = action.stateId;
                    if (!/^[0-9a-fA-F-]{36}$/.test(action.stateId)) {
                        // It's a name like "Done", resolve to UUID
                        const team = await issue.team;
                        if (team) {
                            const states = await team.states();
                            const matchingState = states.nodes.find(
                                (s: any) => s.name.toLowerCase() === action.stateId.toLowerCase()
                            );
                            if (matchingState) {
                                resolvedStateId = matchingState.id;
                            } else {
                                throw new Error(`State "${action.stateId}" not found in team ${team.name}`);
                            }
                        } else {
                            throw new Error(`Could not find team for issue ${action.issueIdentifier}`);
                        }
                    }

                    await linearClient.updateIssue(issue.id, { stateId: resolvedStateId });
                    results.push({ status: 'success', action, data: { issueId: issue.identifier, newState: action.stateId } });
                } else if (action.type === 'update_status_ticket') {
                    // Update Status Ticket Description
                    if (!action.statusTicketId) {
                        throw new Error('Status ticket identifier required');
                    }
                    if (!action.logType || !['planned', 'completed'].includes(action.logType)) {
                        throw new Error('logType must be "planned" or "completed"');
                    }
                    if (!action.items || !Array.isArray(action.items) || action.items.length === 0) {
                        throw new Error('items array is required and must not be empty');
                    }

                    const { LinearClient } = await import('@linear/sdk');
                    const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

                    // Fetch the status ticket
                    const issue = await linearClient.issue(action.statusTicketId);
                    if (!issue) {
                        throw new Error(`Status ticket not found: ${action.statusTicketId}`);
                    }

                    const currentDescription = issue.description || '';
                    
                    // Prefer client's local date (passed from UI) to avoid server timezone issues
                    const dateStr =
                        typeof action.targetDate === 'string' && action.targetDate.trim()
                            ? action.targetDate.trim()
                            : new Date().toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                              });
                    
                    // Determine which section to target by NAME (letters A/B/C vary by day in the template)
                    const targetSectionName = action.logType === 'planned' ? 'Planned items' : 'Completed items';
                    
                    // Format items as an unordered list (markdown bullets)
                    const formattedItems = action.items.map((x: string) => `- ${x}`).join('\n');

                    // Append-only update (never rewrite the full description).
                    // Strategy:
                    // - Split description into Day blocks
                    // - Select the Day block that contains the target date (if multiple, choose the last)
                    // - Append items under the requested section header within that block

                    // 1) Build day blocks
                    const dayHeaderRegex = /(🧩\s*)?Day\s+\d+\s*:\s*[^\n]+/gi;
                    const headers: { index: number; text: string }[] = [];
                    let headerMatch: RegExpExecArray | null;
                    while ((headerMatch = dayHeaderRegex.exec(currentDescription)) !== null) {
                        headers.push({ index: headerMatch.index, text: headerMatch[0] });
                    }
                    if (headers.length === 0) {
                        throw new Error('No Day sections found in description.');
                    }

                    const blocks = headers.map((h, idx) => {
                        const start = h.index;
                        const end = idx + 1 < headers.length ? headers[idx + 1].index : currentDescription.length;
                        const blockText = currentDescription.slice(start, end);
                        return { start, end, headerText: h.text, blockText };
                    });

                    // 2) Find candidate blocks that contain the date string anywhere inside the block
                    const dateLower = dateStr.toLowerCase();
                    const candidateBlockIndexes = blocks
                        .map((b, i) => (b.blockText.toLowerCase().includes(dateLower) ? i : -1))
                        .filter((i) => i !== -1);

                    if (candidateBlockIndexes.length === 0) {
                        throw new Error(`No Day block contains the date "${dateStr}".`);
                    }

                    // 3) Choose which block to update (default: last matching block)
                    let targetBlockIndex = candidateBlockIndexes[candidateBlockIndexes.length - 1];

                    // If ambiguous and OpenAI is available, let LLM choose WHICH block (selection only, not rewrite)
                    if (candidateBlockIndexes.length > 1 && process.env.OPENAI_API_KEY) {
                        const options = candidateBlockIndexes.map((idx) => {
                            const b = blocks[idx];
                            const preview = b.blockText.slice(0, 400);
                            return { idx, header: b.headerText.trim(), preview };
                        });

                        const llmPrompt = `Choose which Day block should be updated for date "${dateStr}".

Rules:
- Return ONLY JSON: { "chosenIndex": <number> }
- Choose the block that represents the current/latest work log for that date (usually the LAST one).
- Do not rewrite any content.

Options:
${options
    .map((o) => `- idx=${o.idx}, header="${o.header}", preview="${o.preview.replace(/\n/g, '\\n')}"`)
    .join('\n')}
`;

                        const llmRes = await openai.chat.completions.create({
                            model: 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: 'You are selecting an index. Output strict JSON only.' },
                                { role: 'user', content: llmPrompt },
                            ],
                            temperature: 0,
                        });

                        const text = llmRes.choices[0]?.message?.content?.trim() || '';
                        const parsed = safeJsonParse(text);
                        const chosen = parsed?.chosenIndex;
                        if (typeof chosen === 'number' && candidateBlockIndexes.includes(chosen)) {
                            targetBlockIndex = chosen;
                        }
                    }

                    // 4) Deterministically append under the section (by name) inside the selected block
                    const targetBlock = blocks[targetBlockIndex];
                    // Parse headings within the day block and locate the correct section by NAME.
                    // This keeps the template intact even when A/B/C letters vary, and supports
                    // Linear markdown templates like "**A. Planned items**".
                    const headingRegex = /^\s*(?:[*_]{1,3}\s*)?(?:[A-Z]|\d+)\.\s+(.+?)(?:\s*[*_]{1,3})?\s*$/gm;
                    const headings: { index: number; text: string; title: string; end: number }[] = [];
                    let hm: RegExpExecArray | null;
                    while ((hm = headingRegex.exec(targetBlock.blockText)) !== null) {
                        headings.push({
                            index: hm.index,
                            text: hm[0],
                            title: (hm[1] || '').trim(),
                            end: hm.index + hm[0].length,
                        });
                    }

                    const targetNameLower = targetSectionName.toLowerCase();
                    const targetHeadingIdx = headings.findIndex((h) => h.title.toLowerCase().includes(targetNameLower));
                    if (targetHeadingIdx === -1) {
                        throw new Error(
                            `Section "${targetSectionName}" not found in the resolved Day block for "${dateStr}". ` +
                                `Make sure the Day block contains "${targetSectionName}".`
                        );
                    }

                    const targetHeading = headings[targetHeadingIdx];
                    const nextHeading = headings[targetHeadingIdx + 1];
                    const sectionStart = targetHeading.end; // end of heading line
                    const sectionEnd = nextHeading ? nextHeading.index : targetBlock.blockText.length;

                    // Append items at the END of this section (right before the next heading), without trimming/removing anything.
                    // Ensure we always start the insertion on a new line.
                    const insertion =
                        (targetBlock.blockText.slice(sectionStart, sectionEnd).endsWith('\n') ? '' : '\n') +
                        '\n' +
                        formattedItems +
                        '\n';

                    const newBlockText =
                        targetBlock.blockText.slice(0, sectionEnd) +
                        insertion +
                        targetBlock.blockText.slice(sectionEnd);

                    const newDescription =
                        currentDescription.substring(0, targetBlock.start) +
                        newBlockText +
                        currentDescription.substring(targetBlock.end);

                    // Safety: ensure we did not remove anything (best-effort length check)
                    if (newDescription.length < currentDescription.length) {
                        throw new Error('Safety check failed: updated description is shorter than original.');
                    }

                    // Update the issue description
                    await linearClient.updateIssue(issue.id, { description: newDescription });
                    
                    results.push({ 
                        status: 'success', 
                        action, 
                        data: { 
                            issueId: issue.identifier, 
                            logType: action.logType,
                            itemsAdded: action.items.length,
                            message: `✅ Updated ${issue.identifier} with ${action.items.length} ${action.logType} item(s)`
                        } 
                    });
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
