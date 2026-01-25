
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY');
    process.exit(1);
}

async function listModels() {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Using the genAI instance to access the model manager if exposed, 
    // or we can try a few standard ones. 
    // The SDK doesn't expose listModels directly on the main class easily in all versions,
    // but let's try to just use the one that usually works or a different variation.

    // Actually, the error message said "Call ListModels". 
    // In the node SDK, it is sometimes under a different import or manager.
    // For quick check, let's just try known stable aliases.

    const candidates = [
        'gemini-2.5-flash',
        'gemini-3-flash',
        'gemini-2.5-flash-001',
        'gemini-3-flash-001',
        'gemini-2.5-pro',
        'gemini-3-pro',
        'gemini-2.0-flash'
    ];

    console.log('🔍 Testing models...');

    for (const modelName of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            const response = await result.response;
            console.log(`✅ ${modelName}: WORKED`);
            return; // Stop after first success
        } catch (e: any) {
            console.log(`❌ ${modelName}: Failed (${e.message.split('[')[0]})`);
        }
    }
}

listModels();
