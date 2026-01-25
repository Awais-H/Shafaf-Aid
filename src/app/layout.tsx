import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AIChatWindow } from '@/components/ai/AIChatWindow';

export const metadata: Metadata = {
  title: 'Shafaf - Global Aid Explorer',
  description: 'Shafaf: Exploratory analytics platform for humanitarian aid coverage analysis using graph theory and geospatial visualization',
  keywords: ['humanitarian aid', 'coverage analysis', 'geospatial', 'visualization', 'shafaf'],
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
          {/* Global AI Chatbot - Available on all pages */}
          <AIChatWindow />
        </AuthProvider>
      </body>
    </html>
  );
}
