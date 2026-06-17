import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Database,
  Download,
  FileUp,
  LineChart,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  TableProperties,
  UploadCloud
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GradientActionCard } from '@/components/GradientActionCard';
import { Panel } from '@/components/Panel';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { BarCountChart, HistogramChart } from '@/components/charts/AnalyticsCharts';
import { useActiveDataset, useAppStore } from '@/store/useAppStore';
import DataUpload from '@/pages/DataUpload';
import DatasetOverview from '@/pages/DatasetOverview';
import { UserProfilePanel } from '@/components/UserProfilePanel';

const features = [
  { title: 'Upload once', detail: 'CSV, Excel, JSON, TSV, or TXT stays saved with IndexedDB.', icon: UploadCloud },
  { title: 'Profile data', detail: 'Rows, columns, missing values, duplicates, and column types.', icon: TableProperties },
  { title: 'Run tests', detail: 'T-test, z-test, chi-square, ANOVA, regression, and non-parametrics.', icon: PlayCircle },
  { title: 'Plot charts', detail: 'Create charts from your own columns and export PNG/JPG.', icon: BarChart3 },
  { title: 'Convert variables', detail: 'Turn categories, dates, percentages, and text into numeric helper columns.', icon: Sparkles },
  { title: 'Download output', detail: 'Download completed test results and generated graphs only.', icon: Download }
];

export default function Dashboard() {
  const location = useLocation();
  const { datasets, analyses, chartsCreated, systemStatus } = useAppStore();
  const activeDataset = useActiveDataset();
  const firstNumeric = activeDataset.columnSummary.find((column) => column.type === 'numeric')?.name;
  const firstCategory = activeDataset.columnSummary.find((column) => column.type === 'categorical')?.name;

  useEffect(() => {
    if (!location.hash) return;
    const element = document.querySelector(location.hash);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[2rem] border border-teal-100 bg-white/92 graph-paper p-6 shadow-sm md:p-8 dark:border-teal-900/70 dark:bg-slate-950/80"
      >
        <div className="absolute -right-10 -top-10 hidden h-48 w-48 rounded-full bg-teal-100/80 blur-2xl md:block dark:bg-teal-800/30" />
        <div className="absolute right-24 bottom-4 hidden h-24 w-24 rounded-full bg-cyan-100/80 blur-xl md:block dark:bg-cyan-800/20" />
        <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800 ring-1 ring-teal-100 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800">
              <Sparkles className="h-4 w-4" /> Welcome to your Calcsty Statistics Garage
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
              Calcsty makes dataset testing simple.
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Start on this dashboard: upload your data, review the dataset profile, run statistical tests, create charts, and download the results you actually produce.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">The SquadLists football demo dataset loads automatically for demonstration. You can replace it with your own file anytime.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="w-fit">{systemStatus}</Badge>
            <Badge variant="outline" className="w-fit">Browser-based toolkit</Badge>
          </div>
        </div>
      </motion.section>

      <section id="report-details" className="scroll-mt-24">
        <UserProfilePanel />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GradientActionCard title="Upload Dataset" description="Use the dashboard upload block" href="/#upload" icon={FileUp} gradient="metric-gradient" />
        <GradientActionCard title="Review Overview" description="Profile rows, columns, quality" href="/#overview" icon={TableProperties} gradient="cyan-gradient" />
        <GradientActionCard title="Run Analysis" description="Tests, non-parametrics, regression" href="/statistics/descriptive" icon={PlayCircle} gradient="amber-gradient" />
        <GradientActionCard title="Visualize Data" description="Charts with PNG/JPG export" href="/visualizations" icon={BarChart3} gradient="rose-gradient" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
              className="glass-card rounded-3xl p-5"
            >
              <div className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/60 dark:text-teal-100 dark:ring-teal-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.detail}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total datasets" value={datasets.length} delta="Upload to add more" icon={Database} />
        <StatCard title="Total analyses" value={analyses.length} delta="Created after tests run" icon={LineChart} />
        <StatCard title="Charts created" value={chartsCreated} delta="Plotted by you" icon={BarChart3} />
        <StatCard title="System status" value="Ready" delta="Runs in the browser" icon={ShieldCheck} />
      </section>

      <section id="upload" className="scroll-mt-24 rounded-[2rem] border border-teal-100/80 bg-white/55 p-4 shadow-sm dark:border-teal-900/60 dark:bg-slate-950/40">
        <DataUpload />
      </section>

      <section id="overview" className="scroll-mt-24 rounded-[2rem] border border-teal-100/80 bg-white/55 p-4 shadow-sm dark:border-teal-900/60 dark:bg-slate-950/40">
        <DatasetOverview />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Recent Analyses" description="Completed tests will appear after you run them">
          <Table>
            <THead><TR><TH>Analysis name</TH><TH>Date</TH><TH>Status</TH></TR></THead>
            <TBody>
              {analyses.length ? analyses.slice(0, 5).map((analysis) => (
                <TR key={analysis.id}>
                  <TD className="font-medium">{analysis.name}</TD>
                  <TD>{new Date(analysis.date).toLocaleString()}</TD>
                  <TD><Badge variant={analysis.status === 'Completed' ? 'success' : analysis.status === 'Running' ? 'warning' : 'danger'}>{analysis.status}</Badge></TD>
                </TR>
              )) : (
                <TR><TD colSpan={3} className="text-muted-foreground">No tests have been run yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </Panel>

        <Panel title="Datasets" description="Available data assets">
          <Table>
            <THead><TR><TH>Dataset name</TH><TH>Rows</TH><TH>Columns</TH><TH>File type</TH></TR></THead>
            <TBody>
              {datasets.length ? datasets.map((dataset) => (
                <TR key={dataset.id}>
                  <TD className="font-medium">{dataset.name}</TD>
                  <TD>{dataset.rows}</TD>
                  <TD>{dataset.columns}</TD>
                  <TD><Badge variant="outline">{dataset.type}</Badge></TD>
                </TR>
              )) : (
                <TR><TD colSpan={4} className="text-muted-foreground">No dataset uploaded yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {firstNumeric ? <HistogramChart rows={activeDataset.preview} xColumn={firstNumeric} title={`Distribution: ${firstNumeric}`} /> : null}
        {firstCategory ? <BarCountChart rows={activeDataset.preview} xColumn={firstCategory} title={`Category counts: ${firstCategory}`} /> : null}
        {!firstNumeric && !firstCategory ? (
          <Panel title="Quick chart preview" description="Upload data to unlock automatic first-chart suggestions">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-teal-600" /> Charts appear here after your dataset is available.</p>
          </Panel>
        ) : null}
      </section>
      <section id="guide" className="scroll-mt-24">
        <Panel title="User guide" description="A simple step-by-step guide for using Calcsty correctly">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: '1. Add report details', detail: 'Enter your name, email or student ID, course, and report purpose. These details are added to downloaded reports.', icon: ClipboardList },
              { title: '2. Upload dataset', detail: 'Use the dashboard upload box. CSV, XLSX, JSON, TSV, and TXT are supported. The file stays saved with IndexedDB.', icon: UploadCloud },
              { title: '3. Review and convert', detail: 'Check missing values, column types, and duplicates. Use the numeric conversion helper before tests when variables are not usable.', icon: TableProperties },
              { title: '4. Run and download', detail: 'Choose the correct variables, run a test or chart, read the description, then download only completed outputs.', icon: Download }
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-3xl border border-teal-100 bg-white/80 p-5 shadow-sm dark:border-teal-900/70 dark:bg-slate-950/70">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-800 dark:bg-teal-900/70 dark:text-teal-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-3xl bg-teal-50 p-5 text-sm leading-6 text-teal-950 dark:bg-teal-950/50 dark:text-teal-100">
            <BookOpenCheck className="mr-2 inline h-4 w-4" />
            Good workflow: upload data → convert variables if needed → read dataset overview → select matching tests → run analysis → download completed result and graph.
          </div>
        </Panel>
      </section>

    </div>
  );
}
