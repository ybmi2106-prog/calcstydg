import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FlaskConical, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { BoxPlotChart, CorrelationHeatmap, HistogramChart, LinePreview, ScatterPreview } from '@/components/charts/AnalyticsCharts';
import { api } from '@/services/api';
import { useActiveDataset, useAppStore } from '@/store/useAppStore';
import { exportCompletedAnalysis, makeSafeFilename } from '@/utils/exporters';
import { computeBasicStats } from '@/utils/dataProfiling';

export type WorkbenchConfig = {
  title: string;
  subtitle: string;
  endpoint: string;
  category: string;
  methods: string[];
  parameters?: { label: string; key: string; type?: 'number' | 'text' | 'select'; options?: string[]; defaultValue?: string | number }[];
  chart?: 'histogram' | 'scatter' | 'line' | 'heatmap' | 'box';
  outputs: string[];
};

const defaultParams = [
  { label: 'Alpha level', key: 'alpha', type: 'number' as const, defaultValue: 0.05 },
  { label: 'Alternative', key: 'alternative', type: 'select' as const, options: ['two-sided', 'less', 'greater'], defaultValue: 'two-sided' }
];

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return String(value);
}

function initialParams(parameterConfig: WorkbenchConfig['parameters']) {
  return Object.fromEntries((parameterConfig ?? defaultParams).map((p) => [p.key, p.defaultValue ?? '']));
}

function isColumnParameter(key: string) {
  const lower = key.toLowerCase();
  return lower.includes('column') || lower.includes('factor') || lower.includes('block');
}

export function AnalysisWorkbench({ config }: { config: WorkbenchConfig }) {
  const dataset = useActiveDataset();
  const addAnalysis = useAppStore((state) => state.addAnalysis);
  const userProfile = useAppStore((state) => state.userProfile);
  const numericColumns = dataset.columnSummary.filter((col) => col.type === 'numeric');
  const categoricalColumns = dataset.columnSummary.filter((col) => col.type !== 'numeric' && col.type !== 'empty');
  const allColumns = dataset.columnSummary;
  const [method, setMethod] = useState(config.methods[0]);
  const [targetColumn, setTargetColumn] = useState(numericColumns[0]?.name ?? dataset.columnSummary[0]?.name ?? '');
  const [params, setParams] = useState<Record<string, string | number>>(() => initialParams(config.parameters));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [running, setRunning] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const chartRef = useRef<HTMLDivElement | null>(null);

  const parameterConfig = config.parameters ?? defaultParams;
  const hasDataset = dataset.preview.length > 0;

  const secondColumn = String(params.secondColumn ?? params.predictors ?? numericColumns.find((col) => col.name !== targetColumn)?.name ?? '');
  const groupColumn = String(params.groupColumn ?? params.factor1 ?? categoricalColumns[0]?.name ?? allColumns.find((col) => col.name !== targetColumn)?.name ?? '');

  const analysisDescription = useMemo(() => {
    if (!hasDataset) return 'Upload a dataset before running this test. Calcsty will then describe the selected method using your dataset columns.';
    const pieces = [`${method} will run on dataset ${dataset.name}`];
    if (targetColumn) pieces.push(`target column ${targetColumn}`);
    if (groupColumn) pieces.push(`grouping column ${groupColumn}`);
    if (secondColumn && secondColumn !== targetColumn) pieces.push(`comparison column ${secondColumn}`);
    pieces.push(`${dataset.rows} rows and ${dataset.columns} columns are currently available`);
    return `${pieces.join(', ')}. The output table shows the calculated statistic, p-value/effect details when available, and an interpretation based on the selected variables.`;
  }, [hasDataset, method, dataset.name, dataset.rows, dataset.columns, targetColumn, groupColumn, secondColumn]);

  const chartDescription = useMemo(() => {
    const chartName = config.chart ?? 'histogram';
    if (!hasDataset) return `The ${chartName} preview appears after a dataset is uploaded.`;
    return `The ${chartName} preview uses ${targetColumn || 'the selected target column'}${secondColumn && secondColumn !== targetColumn ? ` with ${secondColumn}` : ''}${groupColumn ? ` grouped by ${groupColumn}` : ''} from ${dataset.name}.`;
  }, [config.chart, hasDataset, targetColumn, secondColumn, groupColumn, dataset.name]);

  useEffect(() => {
    setMethod(config.methods[0]);
    setParams(initialParams(config.parameters));
    setResult(null);
    setDownloadMessage('');
  }, [config]);

  useEffect(() => {
    const firstNumeric = dataset.columnSummary.find((col) => col.type === 'numeric')?.name;
    setTargetColumn(firstNumeric ?? dataset.columnSummary[0]?.name ?? '');
    setResult(null);
  }, [dataset.id, dataset.columnSummary]);

  const stats = useMemo(() => {
    const values = dataset.preview.map((row) => Number(row[targetColumn])).filter(Number.isFinite);
    return computeBasicStats(values);
  }, [dataset.preview, targetColumn]);

  async function runAnalysis() {
    if (!hasDataset) {
      setDownloadMessage('Upload a dataset first, then run this analysis.');
      setResult(null);
      return;
    }
    setRunning(true);
    setDownloadMessage('Running analysis on the active dataset...');
    try {
      const response = await api.runModule(config.endpoint, {
        rows: dataset.preview,
        columnSummary: dataset.columnSummary,
        dataset: dataset.name,
        method,
        targetColumn,
        ...params
      });
      const data = (response.data ?? {}) as Record<string, unknown>;
      const completedPayload = buildExportPayload(data);
      setResult(data);
      setDownloadMessage('Analysis completed using the uploaded dataset. Use the download button under the output table to export only the test result and graph.');
      addAnalysis({ name: `${config.title} - ${method}`, dataset: dataset.name, type: config.category, status: 'Completed', result: completedPayload });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed.';
      setResult({ error: message });
      setDownloadMessage(message);
      addAnalysis({ name: `${config.title} - ${method}`, dataset: dataset.name, type: config.category, status: 'Failed', result: { error: message } });
    } finally {
      setRunning(false);
    }
  }

  function Chart() {
    if (config.chart === 'scatter') return <ScatterPreview rows={dataset.preview} xColumn={targetColumn} yColumn={secondColumn} />;
    if (config.chart === 'line') return <LinePreview rows={dataset.preview} xColumn="id" yColumn={targetColumn} />;
    if (config.chart === 'heatmap') return <CorrelationHeatmap rows={dataset.preview} />;
    if (config.chart === 'box') return <BoxPlotChart rows={dataset.preview} xColumn={targetColumn} groupColumn={groupColumn} />;
    return <HistogramChart rows={dataset.preview} xColumn={targetColumn} />;
  }

  function buildExportPayload(data: Record<string, unknown> | null = result) {
    return {
      app: 'Calcsty Data Garage',
      analysisTitle: config.title,
      analysisCategory: config.category,
      method,
      dataset: dataset.name,
      userProfile,
      analysisDescription,
      chartDescription,
      rows: dataset.rows,
      columns: dataset.columns,
      targetColumn,
      parameters: params,
      chartType: config.chart ?? 'histogram',
      generatedAt: new Date().toISOString(),
      result: data,
      descriptivePreview: stats
    } as Record<string, unknown>;
  }

  const exportPayload = buildExportPayload();
  const safeBaseName = makeSafeFilename(`${dataset.name}-${config.title}-${method}`);
  const canDownload = Boolean(result);

  async function downloadAllFiles() {
    if (!result) return;
    setDownloadMessage('Preparing download...');
    try {
      await exportCompletedAnalysis({
        baseName: safeBaseName,
        title: config.title,
        data: exportPayload,
        chartContainer: chartRef.current,
        chartSubtitle: `${method} · ${dataset.name}`
      });
      setDownloadMessage('Downloaded the test result and graph package.');
    } catch (error) {
      setDownloadMessage(error instanceof Error ? error.message : 'Download failed.');
    }
  }

  function renderParameterInput(param: NonNullable<WorkbenchConfig['parameters']>[number]) {
    if (param.type === 'select') {
      return (
        <Select value={String(params[param.key] ?? '')} onChange={(e) => setParams((old) => ({ ...old, [param.key]: e.target.value }))}>
          {(param.options ?? []).map((option) => <option key={option}>{option}</option>)}
        </Select>
      );
    }

    if (isColumnParameter(param.key)) {
      const preferredColumns = param.key.toLowerCase().includes('group') || param.key.toLowerCase().includes('factor')
        ? [...categoricalColumns, ...allColumns.filter((col) => !categoricalColumns.includes(col))]
        : allColumns;
      return (
        <Select value={String(params[param.key] ?? '')} onChange={(e) => setParams((old) => ({ ...old, [param.key]: e.target.value }))}>
          <option value="">Auto select</option>
          {preferredColumns.map((col) => <option key={col.name} value={col.name}>{col.name}</option>)}
        </Select>
      );
    }

    return <Input type={param.type ?? 'text'} value={String(params[param.key] ?? '')} onChange={(e) => setParams((old) => ({ ...old, [param.key]: e.target.value }))} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-medium text-primary">{config.category}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{config.title}</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">{config.subtitle}</p>
        </div>

      </div>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Panel title="Analysis setup" description="Choose method, variables, and parameters">
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">Method
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {config.methods.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">Target numeric column
              <Select value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)}>
                {(numericColumns.length ? numericColumns : dataset.columnSummary).map((col) => <option key={col.name}>{col.name}</option>)}
              </Select>
            </label>
            {parameterConfig.map((param) => (
              <label key={param.key} className="grid gap-2 text-sm font-medium">{param.label}
                {renderParameterInput(param)}
              </label>
            ))}
            <Button className="w-full" onClick={runAnalysis} disabled={running || !targetColumn || !hasDataset}><Play className="h-4 w-4" /> {running ? 'Running...' : 'Run analysis'}</Button>
          </div>
        </Panel>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div ref={chartRef}>
            <Chart />
          </div>
          <p className="mt-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm leading-6 text-teal-950 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-100">
            {chartDescription}
          </p>
        </motion.div>
      </section>

      {downloadMessage ? (
        <p className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{downloadMessage}</p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Outputs" description="Main result table and statistics">
          <Table>
            <THead><TR><TH>Output</TH><TH>Value</TH></TR></THead>
            <TBody>
              {config.outputs.map((output) => (
                <TR key={output}>
                  <TD className="font-medium">{output}</TD>
                  <TD>{result ? formatValue((result as Record<string, unknown>)[output]) : 'Run analysis'}</TD>
                </TR>
              ))}
              {result ? Object.entries(result)
                .filter(([key]) => !['request', ...config.outputs].includes(key))
                .slice(0, 8)
                .map(([key, value]) => <TR key={key}><TD className="font-medium">{key}</TD><TD>{formatValue(value)}</TD></TR>) : null}
              {!result && stats ? Object.entries(stats).slice(0, 6).map(([key, value]) => <TR key={key}><TD className="font-medium">{key}</TD><TD>{formatValue(value)}</TD></TR>) : null}
            </TBody>
          </Table>
          {result ? (
            <Button className="mt-4 w-full" onClick={downloadAllFiles} disabled={!canDownload}>
              <Download className="h-4 w-4" /> Download test result and graph
            </Button>
          ) : null}
        </Panel>

        <Panel title="Interpretation" description="Software-style result narrative">
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p><Badge variant={hasDataset ? 'success' : 'outline'}>Dataset</Badge> {hasDataset ? `${dataset.name} contains ${dataset.rows} rows and ${dataset.columns} columns.` : 'No dataset uploaded yet.'}</p>
            <p><Badge variant="outline">Selected method</Badge> {method} on <strong className="text-foreground">{targetColumn}</strong>.</p>
            <p><Badge variant="outline">Test description</Badge> {analysisDescription}</p>
            <p><FlaskConical className="mr-2 inline h-4 w-4 text-primary" /> {result ? formatValue(result.interpretation ?? 'The analysis has been calculated in the browser using your uploaded dataset.') : hasDataset ? 'Choose the variables, then run the module to calculate real results from the active dataset.' : 'Upload data first before running this test.'}</p>
          </div>
        </Panel>
      </section>
    </div>
  );
}
