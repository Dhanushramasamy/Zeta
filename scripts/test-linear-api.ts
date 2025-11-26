import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testLinearIntegration() {
    // Dynamic import to ensure env vars are loaded first
    const { getTeams, getLabels, getUsers, createIssue, getIssuesFromSupabase } = await import('../lib/linear');

    console.log('🚀 Starting Linear Integration Test...\n');

    try {
        // 1. Test Fetching Teams
        console.log('📦 Fetching Teams...');
        const teams = await getTeams();
        console.log(`   ✅ Found ${teams.length} teams`);
        if (teams.length > 0) console.log(`   Example: ${teams[0].name} (${teams[0].id})`);

        // 2. Test Fetching Labels
        console.log('\n🏷️ Fetching Labels...');
        const labels = await getLabels();
        console.log(`   ✅ Found ${labels.length} labels`);
        if (labels.length > 0) console.log(`   Example: ${labels[0].name} (${labels[0].id})`);

        // 3. Test Fetching Users
        console.log('\n👥 Fetching Users...');
        const users = await getUsers();
        console.log(`   ✅ Found ${users.length} users`);
        if (users.length > 0) console.log(`   Example: ${users[0].name} (${users[0].id})`);

        // 4. Test Creating an Issue (Dry run / Real run)
        // Uncomment the following block to actually create an issue
        /*
        console.log('\n📝 Creating Test Issue...');
        const newIssue = await createIssue({
            title: "Test Issue from Script",
            description: "This is a test issue created via the verification script.",
            teamId: teams[0]?.id,
            priority: 1, // Urgent
        });
        console.log(`   ✅ Created Issue: ${newIssue.success ? 'Success' : 'Failed'}`);
        if (newIssue.success) {
            const issueData = await newIssue.issue;
            console.log(`   Issue ID: ${issueData?.id}`);
            console.log(`   Issue Title: ${issueData?.title}`);
        }
        */
        console.log('\n📝 Skipping Issue Creation (Uncomment in script to run)');

        // 5. Test Fetching Issues from Supabase (Flexible Match)
        console.log('\n📥 Fetching Issues from Supabase (Flexible Match: "hash")...');
        const issues = await getIssuesFromSupabase("hash");
        console.log(`   ✅ Found ${issues.length} issues`);
        if (issues.length > 0) {
            console.log(`   Example: ${issues[0].identifier} - ${issues[0].title} (Project: ${issues[0].project?.name})`);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

testLinearIntegration();
