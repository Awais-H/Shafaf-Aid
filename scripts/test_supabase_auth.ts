#!/usr/bin/env npx ts-node --esm

/**
 * Test script to verify Supabase profiles table and RLS policies
 * Run: npx ts-node --esm scripts/test_supabase_auth.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jftwypknxmlxtahexxzd.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdHd5cGtueG1seHRhaGV4eHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTA5NjcsImV4cCI6MjA4NDkyNjk2N30.8lmIHi3mmw0s1NqcD95KFVLlmxbYyZJSb1R_ToIj9yU';

async function main() {
    console.log('🔍 Testing Supabase Auth & Profiles...\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Check if we can connect (using a table we know exists)
    console.log('1️⃣ Testing connection to Supabase...');
    const { data: health, error: healthError } = await supabase.from('donor_profiles').select('count');
    if (healthError && healthError.message.includes('relation')) {
        console.error('   ❌ Connection error:', healthError.message);
    } else {
        console.log('   ✅ Connection successful');
    }

    // NOTE: The 'profiles' table is DEPRECATED. We now use separate tables:
    // - admin_profiles
    // - donor_profiles  
    // - mosque_profiles

    // 2. Check profiles table structure
    console.log('\n2️⃣ Fetching profiles (if RLS allows)...');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, role, created_at')
        .limit(10);

    if (profilesError) {
        console.error('   ❌ Cannot read profiles:', profilesError.message);
        console.log('   Hint: RLS might be blocking reads for anon users.');
    } else if (!profiles || profiles.length === 0) {
        console.log('   ⚠️ No profiles found in table (empty or RLS filtered)');
    } else {
        console.log(`   ✅ Found ${profiles.length} profile(s):`);
        profiles.forEach(p => {
            console.log(`      - ${p.user_id?.substring(0, 8)}... | role: ${p.role} | created: ${p.created_at}`);
        });
    }

    // 3. Check mosque_profiles table
    console.log('\n3️⃣ Checking mosque_profiles table...');
    const { data: mosqueProfiles, error: mosqueError } = await supabase
        .from('mosque_profiles')
        .select('user_id, mosque_name, city, country')
        .limit(10);

    if (mosqueError) {
        console.error('   ❌ Cannot read mosque_profiles:', mosqueError.message);
    } else if (!mosqueProfiles || mosqueProfiles.length === 0) {
        console.log('   ⚠️ No mosque_profiles found');
    } else {
        console.log(`   ✅ Found ${mosqueProfiles.length} mosque profile(s):`);
        mosqueProfiles.forEach(p => {
            console.log(`      - ${p.mosque_name} (${p.city}, ${p.country})`);
        });
    }

    // 4. Check donor_profiles table
    console.log('\n4️⃣ Checking donor_profiles table...');
    const { data: donorProfiles, error: donorError } = await supabase
        .from('donor_profiles')
        .select('user_id, display_name')
        .limit(10);

    if (donorError) {
        console.error('   ❌ Cannot read donor_profiles:', donorError.message);
    } else if (!donorProfiles || donorProfiles.length === 0) {
        console.log('   ⚠️ No donor_profiles found');
    } else {
        console.log(`   ✅ Found ${donorProfiles.length} donor profile(s):`);
        donorProfiles.forEach(p => {
            console.log(`      - ${p.display_name || '(no name)'}`);
        });
    }

    // 5. Check aid_requests table
    console.log('\n5️⃣ Checking aid_requests table...');
    const { data: requests, error: requestsError } = await supabase
        .from('aid_requests')
        .select('id, purpose_category, status, created_at')
        .limit(10);

    if (requestsError) {
        console.error('   ❌ Cannot read aid_requests:', requestsError.message);
    } else if (!requests || requests.length === 0) {
        console.log('   ⚠️ No aid_requests found');
    } else {
        console.log(`   ✅ Found ${requests.length} request(s):`);
        requests.forEach(r => {
            console.log(`      - ${r.id?.substring(0, 8)}... | ${r.purpose_category} | status: ${r.status}`);
        });
    }

    console.log('\n📋 Summary:');
    console.log('If you see "❌ Cannot read..." errors, check your RLS policies in Supabase.');
    console.log('The INSERT on signup might be failing silently due to RLS restrictions.');
    console.log('\nRun this SQL in Supabase to check all profiles:');
    console.log('  SELECT * FROM profiles ORDER BY created_at DESC LIMIT 20;');
}

main().catch(console.error);
