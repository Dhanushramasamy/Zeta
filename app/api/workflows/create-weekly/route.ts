import { NextResponse } from 'next/server';
import { linearClient, CLIENT_PROJECTS, getLastStatusUpdateTicket, getStatusUpdateMetadata } from '@/lib/workflows';

const TEMPLATE_ID = 'adfd6574-41dd-4d64-aa43-7cdc9aa37aa5';

export async function POST(request: Request) {
    try {
        const { clientName } = await request.json();

        if (!clientName || !CLIENT_PROJECTS[clientName]) {
            return NextResponse.json({ error: 'Invalid client name' }, { status: 400 });
        }

        const projectId = CLIENT_PROJECTS[clientName];
        const me = await linearClient.viewer;

        // Fetch the last status update ticket to get current week and last date
        const lastTicket = await getLastStatusUpdateTicket(projectId);

        let weekNum = 1;
        let lastEndDate = new Date();

        if (lastTicket) {
            // Parse month from last ticket title: "Status Updates - Divank Week 53 December"
            const lastTicketMonthMatch = lastTicket.title.match(/Week \d+ ([A-Za-z]+)/);
            const lastTicketMonthSource = lastTicketMonthMatch ? lastTicketMonthMatch[1] : "";

            // Robust Date Parsing: Look for the latest "Day X: Date" in the description
            const description = lastTicket.description || "";
            const dayMatches = Array.from(description.matchAll(/Day \d+: ([A-Za-z]+ \d+, \d{4})/g));

            if (dayMatches.length > 0) {
                // Get the last day mentioned
                const lastDayDateStr = dayMatches[dayMatches.length - 1][1];
                lastEndDate = new Date(lastDayDateStr);
            } else {
                // Fallback to ticket creation date
                lastEndDate = new Date(lastTicket.createdAt);
            }

            // Calculate next Monday (the start of the new weekly cycle)
            const nextMondayTrial = new Date(lastEndDate);
            const daysToMonday = (1 - nextMondayTrial.getDay() + 7) % 7 || 7;
            nextMondayTrial.setDate(nextMondayTrial.getDate() + daysToMonday);

            const nextMondayMonth = nextMondayTrial.toLocaleString('default', { month: 'long' });

            // Month-based Reset: If months don't match, reset week to 1
            if (lastTicketMonthSource !== nextMondayMonth) {
                weekNum = 1;
            } else {
                // Same month, increment week number
                const weekMatch = lastTicket.title.match(/Week (\d+)/);
                if (weekMatch) {
                    weekNum = parseInt(weekMatch[1]) + 1;
                }
            }
        } else {
            // No previous ticket, start fresh
            weekNum = 1;
            lastEndDate = new Date();
            // Move back to previous Friday so next Monday calculation works
            lastEndDate.setDate(lastEndDate.getDate() - ((lastEndDate.getDay() + 2) % 7 || 7));
        }

        // Calculate next Monday (the official start date)
        const nextMonday = new Date(lastEndDate);
        const daysToMonday = (1 - nextMonday.getDay() + 7) % 7 || 7;
        nextMonday.setDate(nextMonday.getDate() + daysToMonday);

        const titleMonth = nextMonday.toLocaleString('default', { month: 'long' });
        const title = `Status Updates - ${clientName} Week ${weekNum} ${titleMonth}`;

        // Dynamic Description Generation (Overrides Template)
        const formatLongDate = (d: Date) => d.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });

        const dayDates = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(nextMonday);
            d.setDate(d.getDate() + i);
            dayDates.push(formatLongDate(d));
        }

        const dynamicDescription = `
🧩Day 1: ${dayDates[0]}

A. Carry forward from previous week
B. Planned items
C. Completed items

---

🧩Day 2: ${dayDates[1]}

A. Planned items
B. Completed items

---

🧩Day 3: ${dayDates[2]}

A. Planned items
B. Completed items

---

🧩Day 4: ${dayDates[3]}

A. Planned items
B. Completed items

---

🧩Day 5: ${dayDates[4]}

A. Planned items
B. Completed items
`.trim();

        // Fetch Label and State metadata
        const projectNode = await linearClient.project(projectId);
        const projectTeams = await projectNode.teams();
        const teamId = projectTeams.nodes[0].id;
        const { labelId, stateId } = await getStatusUpdateMetadata(teamId);

        const issuePayload: any = {
            teamId: teamId,
            projectId: projectId,
            title: title,
            description: dynamicDescription, // Override template description
            assigneeId: me.id,
            templateId: TEMPLATE_ID,
            labelIds: labelId ? [labelId] : [],
            stateId: stateId
        };

        const issue = await linearClient.createIssue(issuePayload);

        if (issue.success) {
            const createdIssue = await issue.issue;
            return NextResponse.json({
                success: true,
                issue: {
                    id: createdIssue?.id,
                    identifier: createdIssue?.identifier,
                    url: createdIssue?.url,
                    title: createdIssue?.title
                }
            });
        } else {
            throw new Error('Failed to create issue');
        }

    } catch (error) {
        console.error('Error creating weekly ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
