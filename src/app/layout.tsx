import type { Metadata } from 'next';
import './globals.css';
import GlobalSearch from '@/components/layout/GlobalSearch';
import ActionModePanel from '@/components/layout/ActionModePanel';
import CrisisScenarioBanner from '@/components/layout/CrisisScenarioBanner';
import DemoFlowBar from '@/components/layout/DemoFlowBar';

export const metadata: Metadata = {
  title: 'Shafaf Aid - Aid Allocation & Coordination Engine',
  description: 'Humanitarian decision-support: priority regions, deployment plans, coordination, scenario planning',
  keywords: ['humanitarian aid', 'coverage analysis', 'geospatial', 'recommendations', 'Ukraine', 'Palestine'],
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
        <CrisisScenarioBanner />
        <DemoFlowBar />
        <GlobalSearch />
        <ActionModePanel />
      </body>
    </html>
  );
}
