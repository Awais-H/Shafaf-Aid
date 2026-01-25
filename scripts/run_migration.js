const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Updated with new password 'ummahhacks2026'
const connectionString = 'postgresql://postgres:ummahhacks2026@db.jftwypknxmlxtahexxzd.supabase.co:5432/postgres';

async function runMigration() {
    console.log('Connecting to database...');
    console.log('Target:', 'db.jftwypknxmlxtahexxzd.supabase.co');

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000 // 10s timeout
    });

    try {
        await client.connect();
        console.log('Connected successfully!');

        const sqlPath = path.join(__dirname, 'supabase_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration completed successfully values inserted!');

    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
