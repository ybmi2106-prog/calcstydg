import { cn } from '@/utils/cn';

export function TabList({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-2xl border bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-medium transition',
            active === tab ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
