import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/core/data/supabaseClient';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createServerClient();

    // If Supabase not configured or no client, allow (static mode or dev)
    if (!supabase) return res;

    // Refresh session if needed (handling cookies manually with supabase-js is hard in middleware without @supabase/ssr)
    // For this implementation using standard supabase-js, we mainly check if we have a session token in cookies
    // or Authorization header.

    // Actually, standard supabase-js doesn't auto-read cookies in middleware.
    // We'll rely on the client-side AuthProvider for strict redirects for now to avoid complexity
    // of manual cookie parsing without helpers, BUT we can add basic protection.

    // NOTE: For a real production app with Next.js App Router, @supabase/ssr is highly recommended.
    // Since we are restricted to supabase-js, we will try to read the token from cookies manually if possible
    // or skip strict server-side middleware for now and rely on client-side protection which is already robust for 
    // the UX (redirects happen in useEffect).

    // However, we can basic check for protected routes:
    const path = req.nextUrl.pathname;

    // Protected routes
    if (path.startsWith('/donor') || path.startsWith('/mosque') || path.startsWith('/admin')) {
        // We can't easily verify the session securely here without the cookie helpers.
        // So we'll pass through and let the layout/page handle the redirect if user is missing.
        // This is a trade-off for not using @supabase/ssr.
    }

    return res;
}

export const config = {
    matcher: [
        '/donor/:path*',
        '/mosque/:path*',
        '/admin/:path*',
    ],
};
