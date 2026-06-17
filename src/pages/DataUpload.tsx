import { ChangeEvent, DragEvent, useMemo, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, DatabaseZap, FileSpreadsheet, RefreshCw, UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/services/api';
import { useActiveDataset, useAppStore } from '@/store/useAppStore';
import type { DatasetRow } from '@/types';
import { createAnalyticsReadyRows, type ConversionReport } from '@/utils/dataConversion';

const accepted = ['csv', 'xlsx', 'json', 'tsv', 'txt'];

function normalizeRows(rows: unknown[]): DatasetRow[] {
  return rows.filter(Boolean).map((row, i) => {
    if (typeof row === 'object' && row !== null && !Array.isArray(row)) return row as DatasetRow;
    return { index: i + 1, value: String(row) };
  });
}

async function parseFile(file: File): Promise<DatasetRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return normalizeRows(XLSX.utils.sheet_to_json(sheet, { defval: null }));
  }
  const text = await file.text();
  if (ext === 'json') return normalizeRows(JSON.parse(text));
  const delimiter = ext === 'tsv' ? '\t' : ext === 'txt' ? undefined : ',';
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, delimiter });
  return normalizeRows(result.data);
}

export default function DataUpload() {
  const addDataset = useAppStore((state) => state.addDataset);
  const loadDemoDataset = useAppStore((state) => state.loadDemoDataset);
  const activeDataset = useActiveDataset();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [conversionReport, setConversionReport] = useState<ConversionReport[]>([]);
  const [conversionMessage, setConversionMessage] = useState('');
  const displayRows = rows.length ? rows : activeDataset.preview;
  const displaySize = file?.size ?? activeDataset.size;
  const displayName = file?.name ?? activeDataset.name;
  const hasDataset = displayRows.length > 0;
  const columns = useMemo(() => (displayRows[0] ? Object.keys(displayRows[0]) : []), [displayRows]);
  const missingValues = useMemo(() => displayRows.reduce((total, row) => total + Object.values(row).filter((v) => v === null || v === '' || v === undefined).length, 0), [displayRows]);

  async function handleFile(nextFile?: File) {
    if (!nextFile) return;
    const ext = nextFile.name.split('.').pop()?.toLowerCase() ?? '';
    if (!accepted.includes(ext)) {
      setError(`Unsupported file type .${ext}. Please upload CSV, XLSX, JSON, TSV, or TXT.`);
      return;
    }
    setError('');
    setConversionReport([]);
    setConversionMessage('');
    setFile(nextFile);
    setLoading(true);
    try {
      const parsed = await parseFile(nextFile);
      setRows(parsed);
      const response = await api.uploadDataset({ name: nextFile.name, type: ext.toUpperCase(), size: nextFile.size, rows: parsed });
      addDataset(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse the selected file.');
    } finally {
      setLoading(false);
    }
  }


  async function loadAttachedDemo() {
    setDemoLoading(true);
    setError('');
    setConversionReport([]);
    setConversionMessage('');
    try {
      await loadDemoDataset();
      setRows([]);
      setFile(null);
      setConversionMessage('SquadLists football demo dataset is now active and ready for charts and tests.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the demo dataset.');
    } finally {
      setDemoLoading(false);
    }
  }

  async function convertForAnalytics() {
    if (!hasDataset) {
      setConversionMessage('Upload a dataset first, then convert it.');
      return;
    }
    const converted = createAnalyticsReadyRows(displayRows);
    if (!converted.report.length) {
      setConversionMessage('No unusable columns needed conversion. Your current dataset is already analytics-ready.');
      setConversionReport([]);
      return;
    }
    const baseName = displayName.replace(/\.[^.]+$/, '');
    const response = await api.uploadDataset({
      name: `${baseName}-analytics-ready.csv`,
      type: 'CSV',
      size: JSON.stringify(converted.rows).length,
      rows: converted.rows
    });
    addDataset(response.data);
    setRows(converted.rows);
    setConversionReport(converted.report);
    setConversionMessage(`Created ${converted.report.length} numeric helper column${converted.report.length > 1 ? 's' : ''}. This converted copy is now the active dataset.`);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void handleFile(event.dataTransfer.files[0]);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Upload</h2>
          <p className="mt-2 text-muted-foreground">The SquadLists football demo dataset is available for quick review. You can also upload your own dataset, and the active data stays saved in this browser until you replace it or clear site data.</p>
        </div>
      </div>

      <motion.div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card flex min-h-72 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-teal-200 p-8 text-center transition hover:border-primary/70 dark:border-teal-800"
      >
        <UploadCloud className="h-14 w-14 text-primary" />
        <h3 className="mt-4 text-xl font-semibold">Drop your dataset here</h3>
        <p className="mt-2 text-sm text-muted-foreground">Supported: CSV, XLSX, JSON, TSV, TXT · The selected dataset stays available across all test pages</p>
        <input id="dataset-file-input" className="sr-only" type="file" accept=".csv,.xlsx,.json,.tsv,.txt" onChange={onInput} disabled={loading} />
        <label
          htmlFor="dataset-file-input"
          className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus-within:ring-2 focus-within:ring-ring"
        >
          {loading ? 'Reading file...' : 'Choose file'}
        </label>
        <p className="mt-2 text-xs text-muted-foreground">If the picker does not open, drag and drop the file into this box.</p>
        <Button type="button" variant="secondary" className="mt-4" onClick={loadAttachedDemo} disabled={loading || demoLoading}>
          <DatabaseZap className="h-4 w-4" /> {demoLoading ? 'Loading demo...' : 'Load SquadLists demo dataset'}
        </Button>
      </motion.div>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" /> {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Panel title="Active file"><p className="truncate text-lg font-bold" title={displayName}>{displayName}</p><p className="mt-1 text-sm text-muted-foreground">{displaySize ? `${(displaySize / 1024).toFixed(1)} KB` : 'Upload needed'}</p></Panel>
        <Panel title="Rows"><p className="text-2xl font-bold">{displayRows.length || '—'}</p></Panel>
        <Panel title="Columns"><p className="text-2xl font-bold">{columns.length || '—'}</p></Panel>
        <Panel title="Missing values"><p className="text-2xl font-bold">{hasDataset ? missingValues : '—'}</p></Panel>
      </section>

      <Panel title="Make data analytics-ready" description="Creates a converted copy with numeric helper columns for unusable variables">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Use this when columns contain currency symbols, percentages, yes/no values, dates, or categories that tests cannot read as numbers. Calcsty keeps your original columns and adds extra numeric columns such as <strong className="text-foreground">column_code</strong>, <strong className="text-foreground">column_num</strong>, or <strong className="text-foreground">column_days</strong>.
          </div>
          <Button onClick={convertForAnalytics} disabled={!hasDataset}><RefreshCw className="h-4 w-4" /> Convert to numeric copy</Button>
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

      <Panel title="Validation" description="File type and missing value checks">
        <div className="flex flex-wrap gap-3">
          <Badge variant={hasDataset ? 'success' : 'outline'}>{hasDataset ? 'Dataset saved for this session' : 'Waiting for upload'}</Badge>
          <Badge variant={!hasDataset ? 'outline' : missingValues === 0 ? 'success' : 'warning'}>{!hasDataset ? 'No dataset yet' : missingValues === 0 ? 'No missing values detected' : `${missingValues} missing values detected`}</Badge>
          <Badge variant={displayRows.length ? 'success' : 'outline'}>{loading ? 'Parsing...' : displayRows.length ? 'Preview ready' : 'Waiting for data'}</Badge>
        </div>
      </Panel>

      <Panel title="Preview" description="First rows from uploaded dataset" action={displayRows.length ? <CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-300" /> : <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />}>
        <div className="overflow-auto">
          <Table>
            <THead><TR>{columns.slice(0, 8).map((col) => <TH key={col}>{col}</TH>)}</TR></THead>
            <TBody>
              {displayRows.length ? displayRows.slice(0, 10).map((row, i) => <TR key={i}>{columns.slice(0, 8).map((col) => <TD key={col}>{String(row[col] ?? '—')}</TD>)}</TR>) : (
                <TR><TD className="text-muted-foreground">Upload a dataset to see a preview.</TD></TR>
              )}
            </TBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
