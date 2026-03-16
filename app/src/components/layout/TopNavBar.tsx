// T2.5 — Top navigation bar: 3 tabs + PilotSelector

import { useUIStore } from '@/stores/ui-store';
import { PilotSelector } from '@/components/shared/PilotSelector';

const TABS = [
  { id: 'cockpit' as const, label: 'Cockpit' },
  { id: 'drills' as const, label: 'Drills' },
  { id: 'assessment' as const, label: 'Assessment' },
];

export function TopNavBar() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  return (
    <nav className="flex items-center justify-between h-12 px-4 bg-anthem-bg-secondary border-b border-anthem-border">
      <div className="flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'relative min-h-[44px] px-4 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-anthem-cyan'
                : 'text-anthem-text-secondary hover:text-anthem-text-primary',
            ].join(' ')}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-anthem-cyan rounded-full" />
            )}
          </button>
        ))}
      </div>
      <PilotSelector />
    </nav>
  );
}
