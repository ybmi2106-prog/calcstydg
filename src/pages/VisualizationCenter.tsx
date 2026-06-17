import { useEffect, useRef, useState } from 'react';
import { Download, Palette, PlusCircle } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TabList } from '@/components/ui/tabs';
import {
  BarCountChart,
  BoxPlotChart,
  CorrelationHeatmap,
  DensityHeatmap,
  HistogramChart,
  KDEChart,
  LinePreview,
  QQPlotChart,
  ScatterPreview,
  ViolinPlotChart
} from '@/components/charts/AnalyticsCharts';
import { useActiveDataset, useAppStore } from '@/store/useAppStore';
import { exportChartJPG, exportChartPNG, makeSafeFilename } from '@/utils/exporters';

const charts = ['Histogram', 'Bar Chart', 'Scatter Plot', 'Line Chart', 'Box Plot', 'Violin Plot', 'Heatmap', 'Correlation Matrix', 'QQ Plot', 'KDE Plot'];

export default function VisualizationCenter() {
  const dataset = useActiveDataset();
  const incrementCharts = useAppStore((state) => state.incrementCharts);
  const numericColumns = dataset.columnSummary.filter((col) => col.type === 'numeric');
  const categoryColumns = dataset.columnSummary.filter((col) => col.type !== 'numeric' && col.type !== 'empty');
  const [chart, setChart] = useState(charts[0]);
  const [x, setX] = useState(categoryColumns[0]?.name ?? numericColumns[0]?.name ?? dataset.columnSummary[0]?.name ?? '');
  const [y, setY] = useState(numericColumns[0]?.name ?? dataset.columnSummary[1]?.name ?? '');
  const [theme, setTheme] = useState('Deep Teal');
  const [message, setMessage] = useState('Upload data, create a chart, then download the plotted graph as PNG/JPG.');
  const [chartReady, setChartReady] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const hasDataset = dataset.preview.length > 0;

  useEffect(() => {
    const nums = dataset.columnSummary.filter((col) => col.type === 'numeric');
    const cats = dataset.columnSummary.filter((col) => col.type !== 'numeric' && col.type !== 'empty');
    setX(cats[0]?.name ?? nums[0]?.name ?? dataset.columnSummary[0]?.name ?? '');
    setY(nums[0]?.name ?? dataset.columnSummary[1]?.name ?? '');
    setMessage(hasDataset ? `Loaded ${dataset.name}. Select columns and create a chart.` : 'Upload a dataset first.');
    setChartReady(false);
  }, [dataset.id, dataset.name, dataset.columnSummary, hasDataset]);

  const safeBaseName = makeSafeFilename(`${dataset.name}-${chart}-${x}-${y}`);

  const chartDescription = !hasDataset
    ? 'Upload a dataset first. Calcsty will then describe what the selected chart says about your data.'
    : chart === 'Histogram'
      ? `This histogram shows how values in ${y || x} are distributed across ${dataset.name}. Taller bars mean more rows fall inside that value range.`
      : chart === 'Bar Chart'
        ? `This bar chart counts the categories in ${x} from ${dataset.name}. It helps you identify the most and least frequent groups.`
        : chart === 'Scatter Plot'
          ? `This scatter plot compares ${x} and ${y} row by row from ${dataset.name}. A visible upward or downward pattern suggests a relationship between the variables.`
          : chart === 'Line Chart'
            ? `This line chart plots ${y} across the order or labels of ${x} in ${dataset.name}. It is useful for spotting trends, rises, drops, and unusual movements.`
            : chart === 'Box Plot'
              ? `This vertical box plot compares the spread of ${y || x} across groups in ${x}. The middle line shows the median and the box shows the central 50% of values.`
              : chart === 'Violin Plot'
                ? `This violin plot shows the distribution shape of ${y || x} across ${x}. Wider areas mean more rows are concentrated around that value.`
                : chart === 'Heatmap'
                  ? `This heatmap shows the density of rows between ${x} and ${y}. Darker cells mean more observations fall in that two-variable range.`
                  : chart === 'Correlation Matrix'
                    ? `This correlation matrix compares numeric columns in ${dataset.name}. Values close to 1 or -1 indicate stronger relationships, while values near 0 indicate weaker linear relationships.`
                    : chart === 'QQ Plot'
                      ? `This QQ plot checks whether ${y || x} follows an approximately normal distribution. Points closer to a straight diagonal pattern indicate stronger normality.`
                      : `This KDE plot estimates the smooth distribution of ${y || x} in ${dataset.name}. Peaks show where values are most concentrated.`;

  function createChart() {
    if (!hasDataset) {
      setMessage('Upload a dataset before plotting charts.');
      return;
    }
    incrementCharts();
    setChartReady(true);
    setMessage(`${chart} plotted from ${dataset.name}. ${chartDescription}`);
  }

  async function downloadChartFiles() {
    try {
      await exportChartPNG(`${safeBaseName}.png`, chartRef.current, chart, `${x}${y ? ` / ${y}` : ''} · ${dataset.name}. ${chartDescription}`);
      await exportChartJPG(`${safeBaseName}.jpg`, chartRef.current, chart, `${x}${y ? ` / ${y}` : ''} · ${dataset.name}. ${chartDescription}`);
      setMessage('Downloaded the plotted graph as PNG and JPG.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chart download failed.');
    }
  }

  function ChartPreview() {
    if (chart === 'Scatter Plot') return <ScatterPreview rows={dataset.preview} xColumn={x} yColumn={y} title={chart} />;
    if (chart === 'Line Chart') return <LinePreview rows={dataset.preview} xColumn={x} yColumn={y} title={chart} />;
    if (chart === 'KDE Plot') return <KDEChart rows={dataset.preview} xColumn={y || x} title={chart} />;
    if (chart === 'Bar Chart') return <BarCountChart rows={dataset.preview} xColumn={x} title={chart} />;
    if (chart === 'Box Plot') return <BoxPlotChart rows={dataset.preview} xColumn={y || x} groupColumn={x} title={chart} />;
    if (chart === 'Violin Plot') return <ViolinPlotChart rows={dataset.preview} xColumn={y || x} groupColumn={x} title={chart} />;
    if (chart === 'Heatmap') return <DensityHeatmap rows={dataset.preview} xColumn={x} yColumn={y} title={chart} />;
    if (chart === 'Correlation Matrix') return <CorrelationHeatmap rows={dataset.preview} title={chart} />;
    if (chart === 'QQ Plot') return <QQPlotChart rows={dataset.preview} xColumn={y || x} title={chart} />;
    return <HistogramChart rows={dataset.preview} xColumn={y || x} title={chart} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visualization Center</h2>
          <p className="mt-2 text-muted-foreground">Create charts from your active dataset. Downloads are available only after a chart is plotted.</p>
        </div>
      </div>

      <Panel title="Chart library" description="Only the chart types required for the toolkit are included">
        <TabList tabs={charts} active={chart} onChange={(nextChart) => { setChart(nextChart); setChartReady(false); setMessage('Choose variables and click Create chart.'); }} />
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Panel title="Interactive controls" description="Select variables, visual style, and download after plotting">
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">Group / X column
              <Select value={x} onChange={(e) => { setX(e.target.value); setChartReady(false); }} disabled={!hasDataset}>
                {dataset.columnSummary.map((col) => <option key={col.name}>{col.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">Numeric / Y column
              <Select value={y} onChange={(e) => { setY(e.target.value); setChartReady(false); }} disabled={!hasDataset}>
                {(numericColumns.length ? numericColumns : dataset.columnSummary).map((col) => <option key={col.name}>{col.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">Chart color style
              <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
                {['Deep Teal', 'Teal Glass', 'Cyan Slate', 'White Lagoon'].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </label>
            <Button className="w-full" onClick={createChart} disabled={!hasDataset}><PlusCircle className="h-4 w-4" /> Create chart</Button>
            <Button variant="outline" className="w-full" onClick={downloadChartFiles} disabled={!chartReady}><Download className="h-4 w-4" /> Download plotted graph PNG/JPG</Button>
            <p className="text-xs leading-5 text-muted-foreground">{message}</p>
          </div>
        </Panel>
        <div>
          <div ref={chartRef}>
            {chartReady ? <ChartPreview /> : (
              <Panel title="Chart preview" description="Click Create chart to plot the selected visualization.">
                <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/70">
                  {hasDataset ? 'Waiting for chart creation' : 'Upload a dataset first'}
                </div>
              </Panel>
            )}
          </div>
          <Panel title="Chart description" description="Generated from the selected dataset and variables">
            <p className="text-sm leading-6 text-muted-foreground">{chartDescription}</p>
          </Panel>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Palette className="h-4 w-4" /> Style: {theme} · Dataset: {dataset.name}</div>
        </div>
      </section>
    </div>
  );
}
