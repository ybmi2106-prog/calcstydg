import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useActiveDataset } from '@/store/useAppStore';

const searchItems = [
  { label: 'Dashboard', description: 'Welcome page, upload data, dataset overview, quick summary', path: '/' },
  { label: 'Report Details', description: 'Enter name and details for downloaded reports', path: '/#report-details' },
  { label: 'Data Upload', description: 'Upload CSV, XLSX, JSON, TSV, TXT from the dashboard', path: '/#upload' },
  { label: 'Dataset Overview', description: 'Rows, columns, missing values, conversion helper on dashboard', path: '/#overview' },
  { label: 'Visualization Center', description: 'Histogram, bar, scatter, line, box, violin, heatmap, correlation matrix, QQ, KDE', path: '/visualizations' },
  { label: 'Descriptive Statistics', description: 'Mean, median, mode, variance, standard deviation', path: '/statistics/descriptive' },
  { label: 'Normality Tests', description: 'Shapiro, KS, Anderson, QQ plot', path: '/statistics/normality' },
  { label: 'Core Tests', description: 'T-test, z-test, chi-square, ANOVA', path: '/statistics/core-tests' },
  { label: 'Hypothesis Testing', description: 'One sample, independent, paired tests', path: '/statistics/hypothesis' },
  { label: 'Non-Parametric Tests', description: 'Mann Whitney, Kruskal Wallis, Friedman, Wilcoxon, Spearman', path: '/statistics/non-parametric' },
  { label: 'ANOVA', description: 'One way, two way, repeated measures', path: '/statistics/anova' },
  { label: 'Correlation', description: 'Pearson, Spearman, Kendall', path: '/statistics/correlation' },
  { label: 'Regression', description: 'Simple, multiple, polynomial regression', path: '/statistics/regression' },
  { label: 'Analysis History', description: 'Saved completed test outputs', path: '/history' },
  { label: 'User Guide', description: 'Step-by-step guide for using Calcsty', path: '/#guide' }
];

export function Topbar() {
  const navigate = useNavigate();
  const dataset = useActiveDataset();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const columnItems = dataset.columnSummary.map((column) => ({
      label: column.name,
      description: `${column.type} column · ${column.missing} missing · ${column.unique} unique`,
      path: '/#overview'
    }));
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...searchItems, ...columnItems]
      .filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(q))
      .slice(0, 7);
  }, [dataset.columnSummary, query]);

  function go(path: string) {
    navigate(path);
    setQuery('');
    setOpen(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results[0]) go(results[0].path);
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-teal-100/80 bg-white/88 px-4 backdrop-blur-2xl lg:px-8 dark:border-teal-900/70 dark:bg-slate-950/78">
      <form className="relative max-w-md flex-1" onSubmit={onSubmit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-700/65 dark:text-teal-100/65" />
        <Input
          className="rounded-2xl border-teal-100 bg-white/90 pl-9 ring-teal-100 focus-visible:ring-teal-700 dark:border-teal-800 dark:bg-slate-900/85 dark:ring-teal-800"
          placeholder="Search tests, variables, charts..."
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {open && query ? (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-lg dark:border-teal-800 dark:bg-slate-950">
            {results.length ? results.map((item) => (
              <button
                key={`${item.label}-${item.path}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(item.path)}
                className="block w-full border-b border-teal-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-teal-50/70 dark:border-teal-900 dark:hover:bg-teal-950/70"
              >
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
              </button>
            )) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">No match found. Try “t-test”, “box”, “correlation”, or a column name.</div>
            )}
          </div>
        ) : null}
      </form>
      <div className="flex items-center gap-3">
        <Badge variant="success" className="hidden items-center gap-1 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5" /> Browser calculations
        </Badge>
        <ThemeToggle />
      </div>
    </header>
  );
}
