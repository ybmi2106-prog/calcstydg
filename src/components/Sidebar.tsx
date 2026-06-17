import { NavLink } from 'react-router-dom';
import {
  Binary,
  Calculator,
  ChartArea,
  ChartColumnIncreasing,
  ChartNoAxesCombined,
  ChartPie,
  ChevronDown,
  Database,
  History,
  LifeBuoy,
  PanelsTopLeft,
  Sigma
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { LogoMark } from '@/components/LogoMark';

const groups = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: PanelsTopLeft },
      { to: '/#upload', label: 'Data Upload', icon: Database },
      { to: '/#overview', label: 'Dataset Overview', icon: ChartArea },
      { to: '/visualizations', label: 'Visualization Center', icon: ChartNoAxesCombined }
    ]
  },
  {
    label: 'Statistics',
    items: [
      { to: '/statistics/descriptive', label: 'Descriptive', icon: Calculator },
      { to: '/statistics/normality', label: 'Normality Tests', icon: ChartArea },
      { to: '/statistics/core-tests', label: 'Core Tests', icon: Sigma },
      { to: '/statistics/hypothesis', label: 'Hypothesis Testing', icon: Binary },
      { to: '/statistics/non-parametric', label: 'Non-Parametric Tests', icon: ChartPie },
      { to: '/statistics/anova', label: 'ANOVA', icon: ChartColumnIncreasing },
      { to: '/statistics/correlation', label: 'Correlation', icon: ChartNoAxesCombined },
      { to: '/statistics/regression', label: 'Regression', icon: ChartArea }
    ]
  },
  {
    label: 'Records',
    items: [
      { to: '/history', label: 'Analysis History', icon: History },
      { to: '/#guide', label: 'User Guide', icon: LifeBuoy }
    ]
  }
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-teal-950/25 bg-gradient-to-b from-[#06363b] via-[#074b52] to-[#05292e] text-teal-50 shadow-2xl lg:block">
      <div className="m-4 rounded-[1.75rem] border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <LogoMark className="h-12 w-12 drop-shadow-sm" />
          <div>
            <h1 className="font-bold tracking-tight text-white">Calcsty</h1>
            <p className="text-xs text-teal-100/75">Data Garage · deep teal</p>
          </div>
        </div>
      </div>
      <nav className="h-[calc(100vh-7.5rem)] overflow-y-auto px-4 pb-5">
        {groups.map((group) => (
          <div className="mb-5" key={group.label}>
            <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-widest text-teal-100/62">
              <ChevronDown className="h-3 w-3" /> {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition duration-200',
                        isActive
                          ? 'bg-white text-teal-950 shadow-sm'
                          : 'text-teal-50/82 hover:translate-x-1 hover:bg-white/10 hover:text-white'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'grid h-8 w-8 place-items-center rounded-xl border transition',
                            isActive
                              ? 'border-teal-100 bg-teal-50 text-teal-800'
                              : 'border-white/10 bg-white/8 text-teal-100 group-hover:border-white/20 group-hover:bg-white/12'
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.9} />
                        </span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
