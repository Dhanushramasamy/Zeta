import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LinearClient } from '@linear/sdk';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, type, data } = body;

        console.log(`Received Linear webhook: ${type} - ${action}`);

        if (type === 'Issue') {
            // Handle Issue updates (upsert to linear_issues)
            // Note: This duplicates some logic from the sync script but is real-time
            const { error } = await supabase
                .from('linear_issues')
                .upsert({
                    id: data.id,
                    identifier: data.identifier,
                    title: data.title,
                    description: data.description,
                    state: data.state?.name || 'Unknown', // Webhook payload might differ slightly, need to be careful
                    priority: data.priority,
                    assignee_id: data.assigneeId,
                    project_name: data.project?.name, // Webhook might not have expanded project name
                    team_name: data.team?.name,
                    due_date: data.dueDate,
                    created_at: data.createdAt,
                    updated_at: data.updatedAt,
                    url: data.url,
                });
            if (error) console.error('Error syncing issue webhook:', error);

        } else if (type === 'Project') {
            const { error } = await supabase
                .from('linear_projects')
                .upsert({
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    state: data.state,
                    created_at: data.createdAt,
                    updated_at: data.updatedAt,
                });
            if (error) console.error('Error syncing project webhook:', error);

        } else if (type === 'Label') {
            const { error } = await supabase
                .from('linear_labels')
                .upsert({
                    id: data.id,
                    name: data.name,
                    color: data.color,
                    created_at: data.createdAt,
                    updated_at: data.updatedAt,
                });
            if (error) console.error('Error syncing label webhook:', error);

        } else if (type === 'Cycle' || type === 'Milestone') { // Linear calls them Cycles or Milestones
            const { error } = await supabase
                .from('linear_milestones')
                .upsert({
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    target_date: data.endsAt || data.targetDate, // Cycle has endsAt, Milestone has targetDate
                    created_at: data.createdAt,
                    updated_at: data.updatedAt,
                });
            if (error) console.error('Error syncing milestone webhook:', error);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
