import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
    console.log('🔍 Checking Supabase Connection and Tables...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // 1. Check connection by reading a known table
    const { data: issues, error: issueError } = await supabase
        .from('linear_issues')
        .select('id')
        .limit(1);

    if (issueError) {
        console.error('❌ Error reading linear_issues (Connection might be bad):', issueError.message);
    } else {
        console.log('✅ Connection successful. Can read linear_issues.');
    }

    // 2. Check linear_projects
    const { data: projects, error: projectError } = await supabase
        .from('linear_projects')
        .select('id')
        .limit(1);

    if (projectError) {
        console.error('❌ Error reading linear_projects:', projectError.message);
        if (projectError.message.includes('relation "public.linear_projects" does not exist')) {
            console.error('   👉 The table "linear_projects" DEFINITELY does not exist.');
        }
    } else {
        console.log('✅ Table linear_projects exists.');
    }
}

checkTables();
