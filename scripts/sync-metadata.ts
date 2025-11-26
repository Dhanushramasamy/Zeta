import { LinearClient } from '@linear/sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY!,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncMetadata() {
    console.log('🚀 Starting Linear Metadata Sync...\n');

    try {
        // 1. Sync Projects
        console.log('📦 Syncing Projects...');
        const projects = await linearClient.projects();
        let projectCount = 0;
        for (const project of projects.nodes) {
            const { error } = await supabase
                .from('linear_projects')
                .upsert({
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    state: project.state,
                    created_at: project.createdAt,
                    updated_at: project.updatedAt,
                });
            if (error) console.error(`❌ Error syncing project ${project.name}:`, error.message);
            else projectCount++;
        }
        console.log(`   ✅ Synced ${projectCount} projects`);

        // 2. Sync Labels
        console.log('\n🏷️ Syncing Labels...');
        const labels = await linearClient.issueLabels();
        let labelCount = 0;
        for (const label of labels.nodes) {
            const { error } = await supabase
                .from('linear_labels')
                .upsert({
                    id: label.id,
                    name: label.name,
                    color: label.color,
                    created_at: label.createdAt,
                    updated_at: label.updatedAt,
                });
            if (error) console.error(`❌ Error syncing label ${label.name}:`, error.message);
            else labelCount++;
        }
        console.log(`   ✅ Synced ${labelCount} labels`);

        // 3. Sync Milestones (Cycles)
        // Note: Linear has both Cycles and Milestones. We'll sync Cycles as milestones for now as they are more commonly used for "sprints".
        // You can add Milestones separately if needed.
        console.log('\n🔄 Syncing Cycles (as Milestones)...');
        const cycles = await linearClient.cycles();
        let cycleCount = 0;
        for (const cycle of cycles.nodes) {
            const { error } = await supabase
                .from('linear_milestones')
                .upsert({
                    id: cycle.id,
                    name: cycle.name || `Cycle ${cycle.number}`,
                    description: cycle.description,
                    target_date: cycle.endsAt,
                    created_at: cycle.createdAt,
                    updated_at: cycle.updatedAt,
                });
            if (error) console.error(`❌ Error syncing cycle ${cycle.number}:`, error.message);
            else cycleCount++;
        }
        console.log(`   ✅ Synced ${cycleCount} cycles`);

        console.log('\n🎉 Metadata Sync Complete!');

    } catch (error) {
        console.error('💥 Fatal error during sync:', error);
        process.exit(1);
    }
}

syncMetadata();
