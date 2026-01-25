
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Using Anon key as client would
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
    console.error('❌ Missing environment variables.');
    console.log('URL:', SUPABASE_URL ? 'OK' : 'MISSING');
    console.log('KEY:', SUPABASE_KEY ? 'OK' : 'MISSING');
    console.log('GEMINI:', GEMINI_API_KEY ? 'OK' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testChatbot() {
    console.log('🤖 Starting AI Chatbot Test...');

    // 1. Fetch Context (Same logic as useGeminiChat.ts)
    console.log('📊 Fetching Context from Supabase...');
    const { data: countryScores, error } = await supabase
        .from('country_scores')
        .select('country_id, raw_coverage, total_aid_presence')
        .order('raw_coverage', { ascending: true })
        .limit(5);

    if (error) {
        console.error('❌ Supabase Error:', error);
        process.exit(1);
    }

    // Fetch country names to make it human readable
    const { data: countries } = await supabase
        .from('countries')
        .select('id, name')
        .in('id', countryScores?.map(cs => cs.country_id) || []);

    const countryMap = new Map(countries?.map(c => [c.id, c.name]));

    const contextDescription = countryScores?.map(cs => {
        const name = countryMap.get(cs.country_id) || cs.country_id;
        return `- ${name}: High Need (Coverage Index: ${cs.raw_coverage.toFixed(2)})`;
    }).join('\n');

    console.log('✅ Context Loaded:');
    console.log(contextDescription);

    // 2. Query Gemini
    const userQuestion = "Which country needs the most help right now?";
    console.log(`\n🗣️  User Question: "${userQuestion}"`);
    console.log('⏳ Querying Gemini...');

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
      System: You are a helpful assistant for "UmmaHacks AidGap", a humanitarian aid platform.
      Use the following real-time data context to answer the user's question.
      
      ${contextDescription}
      
      User: ${userQuestion}
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('\n🤖 AI Response:');
        console.log('---------------------------------------------------');
        console.log(text);
        console.log('---------------------------------------------------');
        console.log('✅ Test Passed!');

    } catch (err) {
        console.error('❌ Gemini API Error:', err);
        process.exit(1);
    }
}

testChatbot();
