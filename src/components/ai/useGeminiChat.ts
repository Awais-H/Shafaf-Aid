
import { useState, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createBrowserClient } from '@/core/data/supabaseClient';

// NOTE: This exposes the API key to the browser. Acceptable for demo, but for production
// this should be routed through a Next.js API route to hide the key server-side.
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export function useGeminiChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState<string>('');

    // 1. Load Context from Supabase (Real Database Data)
    useEffect(() => {
        async function loadContext() {
            const supabase = createBrowserClient();
            if (!supabase) return;

            // Fetch top needs by country
            const { data: countryScores } = await supabase
                .from('country_scores')
                .select('country_id, raw_coverage, total_aid_presence')
                .order('raw_coverage', { ascending: true }) // Lower coverage = higher need
                .limit(5);

            // Fetch countries names
            const { data: countries } = await supabase
                .from('countries')
                .select('id, name')
                .in('id', countryScores?.map(cs => cs.country_id) || []);

            const countryMap = new Map(countries?.map(c => [c.id, c.name]));

            const contextDescription = countryScores?.map(cs => {
                const name = countryMap.get(cs.country_id) || cs.country_id;
                return `- ${name}: High Need (Coverage Index: ${cs.raw_coverage.toFixed(2)})`;
            }).join('\n');

            setContext(`Current Humanitarian Data:\n${contextDescription || 'No data available yet.'}`);
        }

        loadContext();
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!GEMINI_API_KEY) {
            // Fallback for demo if key is missing/client-side env issue
            setMessages(prev => [
                ...prev,
                { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() },
                { id: (Date.now() + 1).toString(), role: 'model', text: "I'm sorry, I cannot connect to my brain right now (Missing API Key).", timestamp: Date.now() }
            ]);
            return;
        }

        setLoading(true);
        // Add user message
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `
        System: You are a helpful assistant for "UmmaHacks AidGap", a humanitarian aid platform.
        Use the following real-time data context to answer the user's question.
        
        ${context}
        
        User: ${text}
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Gemini Error:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "I'm having trouble analyzing the data right now. Please try again.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    }, [context]);

    return { messages, loading, sendMessage };
}
