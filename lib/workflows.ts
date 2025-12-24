
import { LinearClient } from '@linear/sdk';

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

const CLIENT_PROJECTS: Record<string, string> = {
    'Divank': '6861ae96-6816-428f-ac71-8bf711ba4f98',
    'Insight-Ally': '1c88459b-5419-4e62-a15c-795d5d52860a',
    'Acolyte': '5f2dba25-d6c9-47dd-88f1-bdbb4b23df81'
};

/**
 * Get the day number of the week (1=Monday to 5=Friday)
 */
function getDayOfWeek(): number {
    const day = new Date().getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    if (day === 0 || day === 6) return 5; // Weekend = Day 5
    return day; // Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
}

/**
 * Update a specific day's section in the weekly ticket description
 */
function updateDaySection(
    description: string,
    dayNumber: number,
    section: 'planned' | 'completed',
    newContent: string,
    append: boolean = true // Append to existing or replace
): string {
    // Find the day section using emoji marker
    const dayRegex = new RegExp(`(🧩Day ${dayNumber}:[^🧩]*)`, 's');
    const match = description.match(dayRegex);

    if (!match) {
        // Day section not found - this shouldn't happen if ticket is properly formatted
        console.warn(`Day ${dayNumber} section not found in ticket description`);
        return description + `\n\n${newContent}`;
    }

    let dayContent = match[1];
    let updatedDayContent = dayContent;

    if (section === 'planned') {
        // Update section A. Planned items
        // Match from "A. Planned items" up to "B." or end of day section
        const plannedRegex = /(A\. Planned items\n)([\s\S]*?)(B\. Completed items)/;
        const plannedMatch = dayContent.match(plannedRegex);

        if (plannedMatch) {
            const existingContent = plannedMatch[2].trim();
            const finalContent = append && existingContent && existingContent !== 'None'
                ? `${existingContent}\n${newContent}`
                : newContent;
            updatedDayContent = dayContent.replace(
                plannedRegex,
                `$1${finalContent}\n\n$3`
            );
        }
    } else if (section === 'completed') {
        // Update section B. Completed items
        // Match from "B. Completed items" up to "C." or next day marker or end
        const completedRegex = /(B\. Completed items\n)([\s\S]*?)($|🧩|C\. )/;
        const completedMatch = dayContent.match(completedRegex);

        if (completedMatch) {
            const existingContent = completedMatch[2].trim();
            const finalContent = append && existingContent && existingContent !== 'None'
                ? `${existingContent}\n${newContent}`
                : newContent;
            updatedDayContent = dayContent.replace(
                completedRegex,
                `$1${finalContent}\n\n$3`
            );
        }
    }

    return description.replace(match[1], updatedDayContent);
}


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

/**
 * Process a daily update by intelligently updating the correct day's section
 * 
 * @param clientName - The client name (Divank, Insight-Ally, Acolyte)
 * @param logType - Whether this is a 'planned' or 'completed' log
 * @param content - The content to add (work description)
 * @param devTicketIds - Optional array of related dev ticket IDs
 */
export async function processDailyUpdate(
    clientName: string,
    logType: 'planned' | 'completed',
    content: string,
    devTicketIds: string[] = []
) {
    if (!CLIENT_PROJECTS[clientName]) {
        throw new Error('Invalid client name');
    }

    const statusTicket = await getActiveStatusTicket(clientName);

    if (!statusTicket) {
        throw new Error('No active Weekly Status Update ticket found.');
    }

    const dayNumber = getDayOfWeek();
    const currentDescription = statusTicket.description || '';

    // Format the content with dev ticket links if provided
    let formattedContent = content;
    if (devTicketIds.length > 0) {
        formattedContent += ` (${devTicketIds.join(', ')})`;
    }

    // Update the specific day's section
    const newDescription = updateDaySection(
        currentDescription,
        dayNumber,
        logType,
        formattedContent,
        true // Append to existing content
    );

    // Update the ticket
    await linearClient.updateIssue(statusTicket.id, {
        description: newDescription
    });

    return {
        ticket: statusTicket,
        dayNumber,
        section: logType,
        content: formattedContent
    };
}

// Legacy function signature for backward compatibility
export async function processDailyUpdateLegacy(
    clientName: string,
    today: string,
    plan: string,
    completed: string,
    devTicketIds: string[]
) {
    // If plan is provided, log it
    if (plan) {
        await processDailyUpdate(clientName, 'planned', plan, devTicketIds);
    }
    // If completed is provided, log it
    if (completed) {
        await processDailyUpdate(clientName, 'completed', completed, devTicketIds);
    }

    return await getActiveStatusTicket(clientName);
}
