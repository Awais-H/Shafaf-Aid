import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'Shafaf Aid - AidGap Explorer',
  description: 'Exploratory analytics platform for humanitarian aid coverage analysis using graph theory and geospatial visualization',
  keywords: ['humanitarian aid', 'coverage analysis', 'geospatial', 'visualization'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
