import { NextResponse } from 'next/server';
import { createComment, createIssue, createSubIssue, getIssueByIdentifier, getIssuesFromSupabase } from '@/lib/linear';

export async function POST(request: Request) {
    try {
        const { actions } = await request.json();

        if (!actions || !Array.isArray(actions)) {
            return NextResponse.json({ error: 'Actions array is required' }, { status: 400 });
        }

        const results = [];

        for (const action of actions) {
            try {
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
