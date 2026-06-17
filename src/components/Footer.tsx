import { BarChart3, Code2, GraduationCap } from 'lucide-react';
import { LogoMark } from '@/components/LogoMark';

export function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white/76 px-4 py-7 text-sm text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="font-semibold text-slate-950 dark:text-white">Calcsty · Data Garage</p>
            <p className="text-xs">A browser-based statistical analysis toolkit for datasets, tests, charts, and downloadable results.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Created by Yogesh Balasubramanian</span>
          <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Statistics Toolkit</span>
          <span className="inline-flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> Portfolio Project</span>
        </div>
      </div>
    </footer>
  );
}
