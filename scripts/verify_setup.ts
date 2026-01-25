
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually from process.cwd()
const envPath = path.resolve(process.cwd(), '.env');
let envVars: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            envVars[key] = value;
        }
    });
}

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    console.log('Found vars:', Object.keys(envVars));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetup() {
    console.log('🔍 Verifying Supabase Connection and Setup...');
    console.log(`   URL: ${supabaseUrl}`);

    // Check expected tables
    const tables = ['aid_requests', 'donor_pledges', 'mosque_profiles', 'donor_profiles', 'admin_profiles', 'countries', 'regions', 'orgs', 'aid_edges'];

    console.log('\n🔍 Checking for expected tables...');

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('id').limit(1);

        if (error) {
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                console.error(`❌ Table '${table}' DOES NOT EXIST.`);
            } else {
                console.log(`✅ Table '${table}' detected (Status: ${error.message})`);
            }
        } else {
            console.log(`✅ Table '${table}' exists and is accessible.`);
        }
    }

    // Verify Local Data Files
    console.log('\n🔍 Verifying Local Data Files...');
    const dataDir = path.resolve(process.cwd(), 'src/data');
    const files = ['countries.json', 'regions.json', 'orgs.json', 'aid_edges.json'];

    if (fs.existsSync(dataDir)) {
        files.forEach(file => {
            const filePath = path.join(dataDir, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.log(`✅ Data file '${file}' found (${(stats.size / 1024).toFixed(2)} KB).`);
            } else {
                console.error(`❌ Data file '${file}' MISSING in ${dataDir}.`);
            }
        });
    } else {
        console.error(`❌ Data directory '${dataDir}' DOES NOT EXIST.`);
    }
}

verifySetup();
