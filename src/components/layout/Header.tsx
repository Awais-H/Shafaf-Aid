'use client';

/**
 * Global header with World / Mosques navigation
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isMosquesMode = pathname?.startsWith('/mosques') ?? false;

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-gray-900/95 border-b border-gray-700 z-30 flex items-center px-4 gap-4">
      <Link
        href="/"
        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
          !isMosquesMode ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        World
      </Link>
      <Link
        href="/mosques"
        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
          isMosquesMode ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        Mosques
      </Link>
    </header>
  );
}
