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

// Helper to delay between batches to avoid rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function syncLinearToSupabase() {
    console.log('🚀 Starting Linear → Supabase sync...\n');

    try {
        const me = await linearClient.viewer;
        let successCount = 0;
        let errorCount = 0;
        let totalIssues = 0;
        let hasNextPage = true;
        let cursor: string | undefined = undefined;
        const pageSize = 25; // Smaller batches to avoid rate limits

        // 1. Paginate through all issues
        while (hasNextPage) {
            console.log(`\n📦 Fetching batch (cursor: ${cursor || 'start'})...`);

            const issuesPage = await me.assignedIssues({
                filter: {
                    state: {
                        name: {
                            nin: ['Done', 'Canceled'],
                        },
                    },
                },
                first: pageSize,
                after: cursor,
            });

            const issues = issuesPage.nodes;
            totalIssues += issues.length;
            console.log(`   Found ${issues.length} issues in this batch (Total so far: ${totalIssues})\n`);

            // 2. Process each issue in the batch
            for (const issue of issues) {
                try {
                    const state = await issue.state;
                    const assignee = await issue.assignee;
                    const project = await issue.project;
                    const team = await issue.team;
                    const labels = await issue.labels();
                    const comments = await issue.comments({ last: 5 });

                    // Upsert issue
                    const { error: issueError } = await supabase
                        .from('linear_issues')
                        .upsert({
                            id: issue.id,
                            identifier: issue.identifier,
                            title: issue.title,
                            description: issue.description,
                            state: state?.name || 'Unknown',
                            priority: issue.priority,
                            priority_label: issue.priorityLabel,
                            assignee_id: assignee?.id,
                            assignee_name: assignee?.name || 'Unassigned',
                            project_name: project?.name,
                            team_name: team?.name || 'Unknown',
                            labels: labels.nodes.map(l => l.name),
                            due_date: issue.dueDate,
                            created_at: issue.createdAt,
                            updated_at: issue.updatedAt,
                            url: issue.url,
                        });

                    if (issueError) {
                        console.error(`❌ Error syncing issue ${issue.identifier}:`, issueError.message);
                        errorCount++;
                        continue;
                    }

                    // Upsert comments
                    for (const comment of comments.nodes) {
                        const user = await comment.user;
                        const { error: commentError } = await supabase
                            .from('linear_comments')
                            .upsert({
                                id: comment.id,
                                issue_id: issue.id,
                                body: comment.body,
                                user_name: user?.name || 'Unknown',
                                created_at: comment.createdAt,
                            });

                        if (commentError) {
                            console.error(`❌ Error syncing comment for ${issue.identifier}:`, commentError.message);
                        }
                    }

                    console.log(`✅ Synced ${issue.identifier}: ${issue.title}`);
                    successCount++;

                    // Small delay between issues to be gentle on the API
                    await delay(100);

                } catch (err) {
                    console.error(`❌ Error processing issue:`, err);
                    errorCount++;
                }
            }

            // Check if there are more pages
            hasNextPage = issuesPage.pageInfo.hasNextPage;
            cursor = issuesPage.pageInfo.endCursor || undefined;

            // Delay between pages to avoid rate limits (2 seconds)
            if (hasNextPage) {
                console.log('\n⏳ Waiting 2 seconds before next batch to avoid rate limits...');
                await delay(2000);
            }
        }

        console.log(`\n🎉 Sync complete!`);
        console.log(`   📊 Total issues processed: ${totalIssues}`);
        console.log(`   ✅ Success: ${successCount} issues`);
        console.log(`   ❌ Errors: ${errorCount} issues`);

    } catch (error) {
        console.error('💥 Fatal error during sync:', error);
        process.exit(1);
    }
}

// Run the sync
syncLinearToSupabase();
