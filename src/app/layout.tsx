import type { Metadata } from 'next';
import './globals.css';
import GlobalSearch from '@/components/layout/GlobalSearch';

export const metadata: Metadata = {
  title: 'Shafaf Aid 2.0 - Humanitarian Command Center',
  description: 'Advanced analytics platform for humanitarian aid coverage analysis with simulation and real-time visualization',
  keywords: ['humanitarian aid', 'coverage analysis', 'geospatial', 'visualization', 'simulation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cmd-bg text-white antialiased font-inter">
        {children}
        <GlobalSearch />
      </body>
    </html>
  );
}
