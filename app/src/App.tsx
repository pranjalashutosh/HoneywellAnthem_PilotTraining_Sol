// T2.8 — Tab-based routing using ui-store.activeTab

import { TopNavBar } from '@/components/layout/TopNavBar';
import { AmbientCockpitView } from '@/components/cockpit/AmbientCockpitView';
import { StatusBar } from '@/components/layout/StatusBar';
import { DrillsTab } from '@/components/drill/DrillsTab';
import { AssessmentDashboard } from '@/components/assessment/AssessmentDashboard';
import { useUIStore } from '@/stores/ui-store';
import { useLiveKit } from '@/hooks/useLiveKit';

export function App() {
  const activeTab = useUIStore((s) => s.activeTab);

  // Mount LiveKit hook — auto-connects when drill phase becomes 'active'
  useLiveKit();

  return (
    <div className="flex flex-col h-screen bg-anthem-bg-primary text-anthem-text-primary font-sans">
      <TopNavBar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'cockpit' && <AmbientCockpitView />}
        {activeTab === 'drills' && <DrillsTab />}
        {activeTab === 'assessment' && <AssessmentDashboard />}
      </main>
      <StatusBar />
    </div>
  );
}
