'use client';

/**
 * Header component for Shafaf
 * Shows app title, navigation, and data mode indicator
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useViewStore } from '@/app_state/viewStore';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';

export default function Header() {
  const currentView = useViewStore((state) => state.currentView);
  const selectedCountryId = useViewStore((state) => state.selectedCountryId);
  const appData = useViewStore((state) => state.appData);

  const selectedCountry = appData?.countries.find(
    (c) => c.id === selectedCountryId
  );

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: 'rgba(5, 5, 5, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Title */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1
              className="text-lg font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              Shafaf
            </h1>
          </Link>

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 ml-4 text-sm">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentView === 'world'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
            >
              World
            </Link>
            {selectedCountry && (
              <>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>/</span>
                <span className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white">
                  {selectedCountry.name}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <MosquesOrDonationsLink />
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}

function MosquesOrDonationsLink() {
  const pathname = usePathname();
  const onMosquesPage = pathname === '/mosques' || pathname.startsWith('/mosques/');
  const base =
    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-400 hover:text-gray-200 hover:bg-white/5';

  if (onMosquesPage) {
    return (
      <Link href="/" className={base}>
        Donations
      </Link>
    );
  }
  return (
    <Link href="/mosques" className={base}>
      Mosques
    </Link>
  );
}

function AuthButtons() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white/10 text-white hover:bg-white/15"
      >
        Login
      </Link>
    );
  }

  const dashboardLink = role === 'donor' ? '/donor' : role === 'mosque' ? '/mosque' : '/admin';

  return (
    <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-2">
      <Link
        href={dashboardLink}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-400 hover:text-gray-200 hover:bg-white/5 capitalize"
      >
        {role || 'Dashboard'}
      </Link>
      <button
        onClick={signOut}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-white/5"
      >
        Sign Out
      </button>
    </div>
  );
}
