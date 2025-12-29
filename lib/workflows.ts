
import { LinearClient } from '@linear/sdk';

export const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

export const CLIENT_PROJECTS: Record<string, string> = {
    'Divank': '6861ae96-6816-428f-ac71-8bf711ba4f98',
    'Insight-Ally': '1c88459b-5419-4e62-a15c-795d5d52860a',
    'Acolyte': '5f2dba25-d6c9-47dd-88f1-bdbb4b23df81'
};



export async function getActiveStatusTicket(clientName: string) {
    if (!CLIENT_PROJECTS[clientName]) {
        return null;
    }

    const projectId = CLIENT_PROJECTS[clientName];
    const me = await linearClient.viewer;

    const myIssues = await me.assignedIssues({
        filter: {
            project: { id: { eq: projectId } },
            title: { contains: "Status Update" },
            state: { name: { nin: ["Done", "Canceled", "Completed"] } }
        },
        first: 1
    });

    return myIssues.nodes.length > 0 ? myIssues.nodes[0] : null;
}

export async function getLastStatusUpdateTicket(projectId: string) {
    const issues = await linearClient.issues({
        filter: {
            project: { id: { eq: projectId } },
            title: { contains: "Status Update" }
        },
        first: 50
    });

    if (issues.nodes.length === 0) return null;

    // Filter to ensure it definitely matches our status update pattern and sort by createdAt desc
    return issues.nodes
        .filter(i => i.title.includes("Status Update"))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export async function getStatusUpdateMetadata(teamId: string) {
    const team = await linearClient.team(teamId);

    // Find label case-insensitively
    const labels = await team.labels();
    const statusLabel = labels.nodes.find(l =>
        l.name.toLowerCase().includes("status update")
    );

    // Find "In Progress" state case-insensitively
    const states = await team.states();
    const inProgressState = states.nodes.find(s =>
        s.name.toLowerCase() === "in progress" || s.name.toLowerCase() === "inprogress"
    );

    return {
        labelId: statusLabel?.id,
        stateId: inProgressState?.id
    };
}
