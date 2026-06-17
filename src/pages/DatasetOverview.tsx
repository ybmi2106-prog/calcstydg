import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, RefreshCw, Rows3, ShieldCheck } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/services/api';
import { useActiveDataset, useAppStore } from '@/store/useAppStore';
import { createAnalyticsReadyRows, type ConversionReport } from '@/utils/dataConversion';

export default function DatasetOverview() {
  const dataset = useActiveDataset();
  const addDataset = useAppStore((state) => state.addDataset);
  const [conversionReport, setConversionReport] = useState<ConversionReport[]>([]);
  const [conversionMessage, setConversionMessage] = useState('');
  const hasDataset = dataset.preview.length > 0;
  const qualityScore = hasDataset ? Math.max(0, 100 - Math.round((dataset.missingValues / Math.max(dataset.rows * dataset.columns, 1)) * 100) - dataset.duplicateRows) : 0;
  const columns = dataset.preview[0] ? Object.keys(dataset.preview[0]) : [];

  async function convertForAnalytics() {
    if (!hasDataset) {
      setConversionMessage('Upload a dataset first.');
      return;
    }
    const converted = createAnalyticsReadyRows(dataset.preview);
    if (!converted.report.length) {
      setConversionMessage('No extra conversion was needed. Your dataset already has usable numeric columns.');
      setConversionReport([]);
      return;
    }
    const baseName = dataset.name.replace(/\.[^.]+$/, '');
    const response = await api.uploadDataset({
      name: `${baseName}-analytics-ready.csv`,
      type: 'CSV',
      size: JSON.stringify(converted.rows).length,
      rows: converted.rows
    });
    addDataset(response.data);
    setConversionReport(converted.report);
    setConversionMessage(`Created ${converted.report.length} numeric helper column${converted.report.length > 1 ? 's' : ''}. The converted copy is now active.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dataset Overview</h2>
          <p className="mt-2 text-muted-foreground">Profile: {dataset.name}</p>
        </div>
      </div>

      {!hasDataset ? (
        <Panel title="No dataset uploaded" description="Upload a CSV, XLSX, JSON, TSV, or TXT file to profile it here.">
          <p className="text-sm text-muted-foreground">After upload, Calcsty will show rows, columns, missing values, duplicates, column types, and analytics-ready conversion options.</p>
        </Panel>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Rows" value={dataset.rows || '—'} delta="Detected during parse" icon={Rows3} />
        <StatCard title="Columns" value={dataset.columns || '—'} delta="Column profile ready" icon={Database} />
        <StatCard title="Missing values" value={hasDataset ? dataset.missingValues : '—'} delta="Check imputation options" icon={AlertTriangle} />
        <StatCard title="Duplicate rows" value={hasDataset ? dataset.duplicateRows : '—'} delta="Review before modeling" icon={ShieldCheck} />
      </section>

      <Panel title="Data quality metrics" description="Overall readiness for statistical analysis">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-sm text-muted-foreground">Quality score</p>
            <p className="mt-2 text-3xl font-bold">{hasDataset ? `${qualityScore}/100` : '—'}</p>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-sm text-muted-foreground">Completeness</p>
            <p className="mt-2 text-3xl font-bold">{hasDataset ? `${(100 - (dataset.missingValues / Math.max(dataset.rows * dataset.columns, 1)) * 100).toFixed(1)}%` : '—'}</p>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-sm text-muted-foreground">Recommended action</p>
            <p className="mt-2 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-slate-600 dark:text-slate-300" /> {hasDataset ? 'Profile before tests' : 'Upload data first'}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Numeric conversion helper" description="Create numeric helper columns for categorical, date, currency, percentage, or text variables">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">This does not delete your original columns. It adds analytics-ready columns like <strong className="text-foreground">gender_code</strong>, <strong className="text-foreground">price_num</strong>, <strong className="text-foreground">date_days</strong>, or <strong className="text-foreground">comment_length</strong>.</p>
          <Button onClick={convertForAnalytics} disabled={!hasDataset}><RefreshCw className="h-4 w-4" /> Convert dataset</Button>
        </div>
        {conversionMessage ? <p className="mt-3 rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">{conversionMessage}</p> : null}
        {conversionReport.length ? (
          <div className="mt-4 overflow-auto">
            <Table>
              <THead><TR><TH>Original</TH><TH>New numeric column</TH><TH>Method</TH><TH>Details</TH></TR></THead>
              <TBody>{conversionReport.map((item) => <TR key={item.createdColumn}><TD>{item.column}</TD><TD className="font-medium">{item.createdColumn}</TD><TD>{item.strategy}</TD><TD>{item.details}</TD></TR>)}</TBody>
            </Table>
          </div>
        ) : null}
      </Panel>

      <Panel title="Column summary" description="Data type, missing count, and unique values">
        <div className="overflow-auto">
          <Table>
            <THead><TR><TH>Column</TH><TH>Type</TH><TH>Missing</TH><TH>Unique</TH><TH>Mean</TH><TH>Min</TH><TH>Max</TH></TR></THead>
            <TBody>
              {dataset.columnSummary.length ? dataset.columnSummary.map((col) => (
                <TR key={col.name}>
                  <TD className="font-medium">{col.name}</TD>
                  <TD><Badge variant="outline">{col.type}</Badge></TD>
                  <TD>{col.missing}</TD>
                  <TD>{col.unique}</TD>
                  <TD>{col.mean ?? '—'}</TD>
                  <TD>{col.min ?? '—'}</TD>
                  <TD>{col.max ?? '—'}</TD>
                </TR>
              )) : (
                <TR><TD colSpan={7} className="text-muted-foreground">No columns available yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </div>
      </Panel>

      <Panel title="Table preview" description="First 15 rows">
        <div className="overflow-auto">
          <Table>
            <THead><TR>{columns.slice(0, 10).map((col) => <TH key={col}>{col}</TH>)}</TR></THead>
            <TBody>
              {dataset.preview.length ? dataset.preview.slice(0, 15).map((row, i) => <TR key={i}>{columns.slice(0, 10).map((col) => <TD key={col}>{String(row[col] ?? '—')}</TD>)}</TR>) : (
                <TR><TD className="text-muted-foreground">Upload a dataset to preview rows.</TD></TR>
              )}
            </TBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
