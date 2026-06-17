import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DatasetRow } from '@/types';
import { numericValues } from '@/utils/statistics';

type ChartProps = {
  rows?: DatasetRow[];
  xColumn?: string;
  yColumn?: string;
  groupColumn?: string;
  title?: string;
};


const chartBg = 'var(--chart-bg)';
const chartText = 'var(--chart-text)';
const chartMuted = 'var(--chart-muted)';
const chartGrid = 'var(--chart-grid)';
const chartPrimary = 'var(--chart-primary)';
const chartPrimarySoft = 'var(--chart-primary-soft)';
const chartSecondary = 'var(--chart-secondary)';
const chartAccent = 'var(--chart-accent)';
const chartAccentSoft = 'var(--chart-accent-soft)';
const chartMedian = 'var(--chart-median)';

const axisTick = { fill: chartMuted, fontSize: 12 };
const axisLine = { stroke: chartGrid };
const tooltipStyle = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-border)',
  borderRadius: '12px',
  color: chartText
};

function numberFrom(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function allColumns(rows: DatasetRow[]) {
  return rows[0] ? Object.keys(rows[0]) : [];
}

function firstNumericColumn(rows: DatasetRow[]) {
  const columns = allColumns(rows);
  return columns.find((column) => rows.some((row) => numberFrom(row[column]) !== null)) ?? columns[0] ?? '';
}

function firstOtherNumericColumn(rows: DatasetRow[], except: string) {
  const columns = allColumns(rows);
  return columns.find((column) => column !== except && rows.some((row) => numberFrom(row[column]) !== null)) ?? except;
}

function firstCategoryColumn(rows: DatasetRow[], except?: string) {
  const columns = allColumns(rows).filter((column) => column !== except);
  return columns.find((column) => numericValues(rows, column).length < rows.length * 0.6) ?? columns[0] ?? '';
}

function EmptyChart({ title, message = 'Upload or select a dataset column to plot this chart.' }: { title: string; message?: string }) {
  return (
    <Card className="glass-card h-full">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid h-72 place-items-center text-center text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

function histogramBins(values: number[], binCount = 12) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min || 1) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    bin: `${Number((min + index * width).toFixed(1))}–${Number((min + (index + 1) * width).toFixed(1))}`,
    frequency: 0
  }));
  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) / width)));
    bins[index].frequency += 1;
  });
  return bins;
}

function categoricalCounts(rows: DatasetRow[], column: string) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value = row[column];
    const label = value === null || value === undefined || value === '' ? 'Missing' : String(value);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function pairData(rows: DatasetRow[], xColumn: string, yColumn: string) {
  return rows
    .map((row, index) => ({ index: index + 1, x: numberFrom(row[xColumn]), y: numberFrom(row[yColumn]) }))
    .filter((row): row is { index: number; x: number; y: number } => row.x !== null && row.y !== null)
    .slice(0, 500);
}

function lineData(rows: DatasetRow[], xColumn: string, yColumn: string) {
  return rows
    .map((row, index) => ({ index: index + 1, xLabel: String(row[xColumn] ?? index + 1), y: numberFrom(row[yColumn]) }))
    .filter((row): row is { index: number; xLabel: string; y: number } => row.y !== null)
    .slice(0, 350);
}

function quantile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function boxPlotData(rows: DatasetRow[], valueColumn: string, groupColumn?: string) {
  const groups = new Map<string, number[]>();
  rows.forEach((row) => {
    const value = numberFrom(row[valueColumn]);
    if (value === null) return;
    const group = groupColumn ? String(row[groupColumn] ?? 'Group') : valueColumn;
    groups.set(group, [...(groups.get(group) ?? []), value]);
  });
  return [...groups.entries()].slice(0, 8).map(([group, values]) => ({
    group,
    values,
    min: Math.min(...values),
    q1: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q3: quantile(values, 0.75),
    max: Math.max(...values)
  }));
}

function scale(value: number, min: number, max: number, start = 120, end = 760) {
  if (!Number.isFinite(value) || max === min) return (start + end) / 2;
  return start + ((value - min) / (max - min)) * (end - start);
}

function pearson(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((acc, value, index) => acc + (value - mx) * (ys[index] - my), 0);
  const sx = Math.sqrt(xs.reduce((acc, value) => acc + (value - mx) ** 2, 0));
  const sy = Math.sqrt(ys.reduce((acc, value) => acc + (value - my) ** 2, 0));
  return num / ((sx * sy) || 1);
}

function inverseNormal(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function qqData(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.map((value, index) => ({ theoretical: inverseNormal((index + 0.5) / sorted.length), sample: value }));
}

function kdeData(values: number[]) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sd = Math.sqrt(values.reduce((acc, value) => acc + (value - values.reduce((a, b) => a + b, 0) / values.length) ** 2, 0) / Math.max(values.length - 1, 1)) || 1;
  const bandwidth = 1.06 * sd * Math.pow(values.length, -1 / 5) || 1;
  return Array.from({ length: 60 }, (_, index) => {
    const x = min + ((max - min || 1) * index) / 59;
    const density = values.reduce((acc, value) => acc + Math.exp(-0.5 * ((x - value) / bandwidth) ** 2), 0) / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
    return { x: Number(x.toFixed(2)), density: Number(density.toFixed(5)) };
  });
}

function numericLabels(rows: DatasetRow[]) {
  return allColumns(rows).filter((column) => numericValues(rows, column).length >= 2).slice(0, 6);
}

function labelText(text: string, max = 16) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function valueColor(value: number) {
  if (value >= 0) return `rgba(59, 130, 246, ${0.18 + Math.abs(value) * 0.68})`;
  return `rgba(244, 114, 182, ${0.18 + Math.abs(value) * 0.68})`;
}

export function HistogramChart({ rows = [], xColumn, title }: ChartProps) {
  const column = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstNumericColumn(rows);
  const data = histogramBins(numericValues(rows, column));
  if (!data.length) return <EmptyChart title={title ?? 'Histogram'} />;
  return (
    <Card className="glass-card h-full">
      <CardHeader><CardTitle>{title ?? `Histogram: ${column}`}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" opacity={0.65} />
            <XAxis dataKey="bin" hide tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <YAxis tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: chartText }} />
            <Bar dataKey="frequency" fill={chartPrimary} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function BarCountChart({ rows = [], xColumn, title }: ChartProps) {
  const column = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstCategoryColumn(rows);
  const data = categoricalCounts(rows, column);
  if (!data.length) return <EmptyChart title={title ?? 'Bar chart'} />;
  return (
    <Card className="glass-card h-full">
      <CardHeader><CardTitle>{title ?? `Bar chart: ${column}`}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" opacity={0.65} />
            <XAxis type="number" tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <YAxis dataKey="category" type="category" width={116} tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: chartText }} />
            <Bar dataKey="count" fill={chartPrimary} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ScatterPreview({ rows = [], xColumn, yColumn, title }: ChartProps) {
  const x = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstNumericColumn(rows);
  const y = yColumn && rows[0]?.[yColumn] !== undefined ? yColumn : firstOtherNumericColumn(rows, x);
  const data = pairData(rows, x, y);
  if (!data.length) return <EmptyChart title={title ?? 'Scatter plot'} />;
  return (
    <Card className="glass-card h-full">
      <CardHeader><CardTitle>{title ?? `${x} vs ${y}`}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 18, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" opacity={0.65} />
            <XAxis type="number" dataKey="x" name={x} tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <YAxis type="number" dataKey="y" name={y} tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: chartGrid }} contentStyle={tooltipStyle} labelStyle={{ color: chartText }} />
            <Scatter data={data} fill={chartSecondary} opacity={0.78} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LinePreview({ rows = [], xColumn, yColumn, title }: ChartProps) {
  const y = yColumn && rows[0]?.[yColumn] !== undefined ? yColumn : firstNumericColumn(rows);
  const x = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : 'index';
  const data = lineData(rows, x, y);
  if (!data.length) return <EmptyChart title={title ?? 'Line chart'} />;
  return (
    <Card className="glass-card h-full">
      <CardHeader><CardTitle>{title ?? `Line chart: ${y}`}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 18, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" opacity={0.65} />
            <XAxis dataKey="index" tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <YAxis tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: chartText }} />
            <Line type="monotone" dataKey="y" stroke={chartPrimary} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function KDEChart({ rows = [], xColumn, title }: ChartProps) {
  const column = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstNumericColumn(rows);
  const data = kdeData(numericValues(rows, column));
  if (!data.length) return <EmptyChart title={title ?? 'KDE plot'} />;
  return (
    <Card className="glass-card h-full">
      <CardHeader><CardTitle>{title ?? `KDE plot: ${column}`}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 18, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" opacity={0.65} />
            <XAxis dataKey="x" tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <YAxis tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: chartText }} />
            <Line type="monotone" dataKey="density" stroke={chartAccent} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function QQPlotChart({ rows = [], xColumn, title }: ChartProps) {
  const column = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstNumericColumn(rows);
  const data = qqData(numericValues(rows, column));
  if (!data.length) return <EmptyChart title={title ?? 'QQ plot'} />;
  return (
    <Card className="glass-card h-full">
      <CardHeader><CardTitle>{title ?? `QQ plot: ${column}`}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 18, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" opacity={0.65} />
            <XAxis type="number" dataKey="theoretical" name="Theoretical quantile" tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <YAxis type="number" dataKey="sample" name={column} tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: chartGrid }} contentStyle={tooltipStyle} labelStyle={{ color: chartText }} />
            <Scatter data={data} fill={chartAccent} opacity={0.78} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


function densityGrid(rows: DatasetRow[], xColumn: string, yColumn: string, bins = 8) {
  const pairs = pairData(rows, xColumn, yColumn);
  if (!pairs.length) return { cells: [] as { xBin: number; yBin: number; count: number }[], maxCount: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
  const xMin = Math.min(...pairs.map((p) => p.x));
  const xMax = Math.max(...pairs.map((p) => p.x));
  const yMin = Math.min(...pairs.map((p) => p.y));
  const yMax = Math.max(...pairs.map((p) => p.y));
  const grid = Array.from({ length: bins }, (_, yBin) => Array.from({ length: bins }, (_, xBin) => ({ xBin, yBin, count: 0 })));
  pairs.forEach((point) => {
    const xBin = Math.min(bins - 1, Math.max(0, Math.floor(((point.x - xMin) / ((xMax - xMin) || 1)) * bins)));
    const yBin = Math.min(bins - 1, Math.max(0, Math.floor(((point.y - yMin) / ((yMax - yMin) || 1)) * bins)));
    grid[yBin][xBin].count += 1;
  });
  const cells = grid.flat();
  return { cells, maxCount: Math.max(...cells.map((cell) => cell.count), 1), xMin, xMax, yMin, yMax };
}

function densityColor(count: number, maxCount: number) {
  const opacity = count ? 0.18 + (count / Math.max(maxCount, 1)) * 0.72 : 0.06;
  return `rgba(180, 83, 9, ${opacity})`;
}

export function DensityHeatmap({ rows = [], xColumn, yColumn, title }: ChartProps) {
  const x = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstNumericColumn(rows);
  const y = yColumn && rows[0]?.[yColumn] !== undefined ? yColumn : firstOtherNumericColumn(rows, x);
  const grid = densityGrid(rows, x, y, 8);
  if (!grid.cells.length) return <EmptyChart title={title ?? 'Heatmap'} message="Select two numeric columns to build a density heatmap." />;

  const size = 820;
  const left = 94;
  const top = 68;
  const cell = 60;
  const bins = 8;
  const width = left + bins * cell + 94;
  const height = top + bins * cell + 86;

  return (
    <Card className="glass-card">
      <CardHeader><CardTitle>{title ?? `Heatmap: ${x} vs ${y}`}</CardTitle></CardHeader>
      <CardContent className="overflow-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg h-80 w-full min-w-[620px] rounded-2xl" role="img">
          <rect x="0" y="0" width={width} height={height} rx="22" fill={chartBg} />
          <text x="28" y="38" fill={chartText} fontSize="21" fontWeight="700">Density heatmap</text>
          <text x={left + bins * cell / 2} y={height - 24} textAnchor="middle" fill={chartMuted} fontSize="13">{x}</text>
          <text x="24" y={top + bins * cell / 2} transform={`rotate(-90 24 ${top + bins * cell / 2})`} textAnchor="middle" fill={chartMuted} fontSize="13">{y}</text>
          {grid.cells.map((cellItem) => {
            const xPos = left + cellItem.xBin * cell;
            const yPos = top + (bins - 1 - cellItem.yBin) * cell;
            return (
              <g key={`${cellItem.xBin}-${cellItem.yBin}`}>
                <rect x={xPos} y={yPos} width={cell - 5} height={cell - 5} rx="12" fill={densityColor(cellItem.count, grid.maxCount)} stroke={chartGrid} strokeWidth="1" />
                <text x={xPos + cell / 2 - 2} y={yPos + cell / 2 + 5} textAnchor="middle" fill={chartText} fontSize="13" fontWeight="700">{cellItem.count || ''}</text>
              </g>
            );
          })}
          <text x={left} y={height - 48} fill={chartMuted} fontSize="12">{grid.xMin.toFixed(1)}</text>
          <text x={left + bins * cell - 5} y={height - 48} textAnchor="end" fill={chartMuted} fontSize="12">{grid.xMax.toFixed(1)}</text>
          <text x={left - 12} y={top + bins * cell - 10} textAnchor="end" fill={chartMuted} fontSize="12">{grid.yMin.toFixed(1)}</text>
          <text x={left - 12} y={top + 12} textAnchor="end" fill={chartMuted} fontSize="12">{grid.yMax.toFixed(1)}</text>
          <text x={left + bins * cell + 24} y={top + 18} fill={chartMuted} fontSize="12">Darker cells</text>
          <text x={left + bins * cell + 24} y={top + 36} fill={chartMuted} fontSize="12">= more rows</text>
        </svg>
      </CardContent>
    </Card>
  );
}

export function CorrelationHeatmap({ rows = [], title = 'Correlation matrix' }: ChartProps) {
  const labels = numericLabels(rows);
  if (!labels.length) return <EmptyChart title={title} />;
  const size = 860;
  const left = 155;
  const top = 90;
  const cell = Math.min(92, (size - left - 50) / labels.length);
  const height = top + cell * labels.length + 80;
  return (
    <Card className="glass-card">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="overflow-auto">
        <svg viewBox={`0 0 ${size} ${height}`} className="chart-svg h-80 w-full min-w-[620px] rounded-2xl" role="img">
          <rect x="0" y="0" width={size} height={height} rx="22" fill={chartBg} />
          <text x="28" y="44" fill={chartText} fontSize="22" fontWeight="700">Correlation heatmap</text>
          {labels.map((label, index) => (
            <text key={`top-${label}`} x={left + index * cell + cell / 2} y={top - 18} textAnchor="middle" fill={chartMuted} fontSize="12">{labelText(label, 12)}</text>
          ))}
          {labels.map((rowLabel, rowIndex) => (
            <g key={rowLabel}>
              <text x={left - 12} y={top + rowIndex * cell + cell / 2 + 4} textAnchor="end" fill={chartMuted} fontSize="12">{labelText(rowLabel, 18)}</text>
              {labels.map((colLabel, colIndex) => {
                const pairs = rows
                  .map((r) => ({ a: numberFrom(r[rowLabel]), b: numberFrom(r[colLabel]) }))
                  .filter((pair): pair is { a: number; b: number } => pair.a !== null && pair.b !== null);
                const value = rowIndex === colIndex ? 1 : Number(pearson(pairs.map((pair) => pair.a), pairs.map((pair) => pair.b)).toFixed(2));
                return (
                  <g key={`${rowLabel}-${colLabel}`}>
                    <rect x={left + colIndex * cell} y={top + rowIndex * cell} width={cell - 5} height={cell - 5} rx="14" fill={valueColor(value)} />
                    <text x={left + colIndex * cell + cell / 2 - 2} y={top + rowIndex * cell + cell / 2 + 4} textAnchor="middle" fill={chartMedian} fontSize="13" fontWeight="700">{value}</text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}

export function BoxPlotChart({ rows = [], xColumn, groupColumn, title }: ChartProps) {
  const valueColumn = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstNumericColumn(rows);
  const group = groupColumn && rows[0]?.[groupColumn] !== undefined ? groupColumn : firstCategoryColumn(rows, valueColumn);
  const data = boxPlotData(rows, valueColumn, group).slice(0, 8);
  if (!data.length) return <EmptyChart title={title ?? 'Box plot'} />;

  const allValues = data.flatMap((row) => [row.min, row.max]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const width = Math.max(760, 160 + data.length * 112);
  const height = 430;
  const plotLeft = 82;
  const plotTop = 78;
  const plotBottom = 330;
  const plotRight = width - 56;
  const slot = (plotRight - plotLeft) / Math.max(data.length, 1);
  const boxWidth = Math.min(54, slot * 0.48);
  const yScale = (value: number) => {
    if (!Number.isFinite(value) || max === min) return (plotTop + plotBottom) / 2;
    return plotBottom - ((value - min) / (max - min)) * (plotBottom - plotTop);
  };

  return (
    <Card className="glass-card">
      <CardHeader><CardTitle>{title ?? `Box plot: ${valueColumn}`}</CardTitle></CardHeader>
      <CardContent className="overflow-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg h-80 w-full min-w-[680px] rounded-2xl" role="img">
          <rect x="0" y="0" width={width} height={height} rx="22" fill={chartBg} />
          <text x="34" y="44" fill={chartText} fontSize="22" fontWeight="700">Vertical box plot: {valueColumn} by {group}</text>

          <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={chartGrid} strokeWidth="2" />
          <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={chartGrid} strokeWidth="2" />
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const value = min + (max - min) * tick;
            const y = yScale(value);
            return (
              <g key={tick}>
                <line x1={plotLeft - 6} x2={plotRight} y1={y} y2={y} stroke={chartGrid} strokeWidth="1" opacity="0.55" />
                <text x={plotLeft - 12} y={y + 4} textAnchor="end" fill={chartMuted} fontSize="12">{value.toFixed(1)}</text>
              </g>
            );
          })}

          {data.map((row, index) => {
            const cx = plotLeft + slot * index + slot / 2;
            const yMin = yScale(row.min);
            const yQ1 = yScale(row.q1);
            const yMedian = yScale(row.median);
            const yQ3 = yScale(row.q3);
            const yMax = yScale(row.max);
            const boxTop = Math.min(yQ1, yQ3);
            const boxHeight = Math.max(6, Math.abs(yQ1 - yQ3));
            return (
              <g key={row.group}>
                <line x1={cx} y1={yMax} x2={cx} y2={yMin} stroke={chartGrid} strokeWidth="3" strokeLinecap="round" />
                <line x1={cx - boxWidth / 3} x2={cx + boxWidth / 3} y1={yMax} y2={yMax} stroke={chartGrid} strokeWidth="3" strokeLinecap="round" />
                <line x1={cx - boxWidth / 3} x2={cx + boxWidth / 3} y1={yMin} y2={yMin} stroke={chartGrid} strokeWidth="3" strokeLinecap="round" />
                <rect x={cx - boxWidth / 2} y={boxTop} width={boxWidth} height={boxHeight} rx="8" fill={chartPrimarySoft} stroke={chartPrimary} strokeWidth="2" />
                <line x1={cx - boxWidth / 2 - 4} x2={cx + boxWidth / 2 + 4} y1={yMedian} y2={yMedian} stroke={chartMedian} strokeWidth="4" strokeLinecap="round" />
                <circle cx={cx} cy={yMedian} r="4" fill={chartMedian} />
                <text x={cx} y={plotBottom + 26} textAnchor="middle" fill={chartMuted} fontSize="12" fontWeight="600">{labelText(row.group, 12)}</text>
                <text x={cx} y={plotTop - 12} textAnchor="middle" fill={chartMuted} fontSize="11">med {row.median.toFixed(1)}</text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

export function ViolinPlotChart({ rows = [], xColumn, groupColumn, title }: ChartProps) {
  const valueColumn = xColumn && rows[0]?.[xColumn] !== undefined ? xColumn : firstNumericColumn(rows);
  const group = groupColumn && rows[0]?.[groupColumn] !== undefined ? groupColumn : firstCategoryColumn(rows, valueColumn);
  const data = boxPlotData(rows, valueColumn, group).slice(0, 5);
  if (!data.length) return <EmptyChart title={title ?? 'Violin plot'} />;
  const allValues = data.flatMap((row) => row.values);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const height = 420;
  const slot = 720 / Math.max(data.length, 1);
  return (
    <Card className="glass-card">
      <CardHeader><CardTitle>{title ?? `Violin plot: ${valueColumn}`}</CardTitle></CardHeader>
      <CardContent className="overflow-auto">
        <svg viewBox="0 0 880 420" className="chart-svg h-80 w-full min-w-[680px] rounded-2xl" role="img">
          <rect width="880" height="420" rx="22" fill={chartBg} />
          <text x="34" y="44" fill={chartText} fontSize="22" fontWeight="700">Distribution shape by {group}</text>
          {data.map((row, index) => {
            const cx = 110 + index * slot + slot / 2;
            const bins = histogramBins(row.values, 16);
            const maxBin = Math.max(...bins.map((bin) => bin.frequency), 1);
            const right = bins.map((bin, binIndex) => {
              const y = 340 - (binIndex / Math.max(bins.length - 1, 1)) * 250;
              const width = (bin.frequency / maxBin) * Math.min(46, slot / 3);
              return `${cx + width},${y}`;
            }).join(' ');
            const left = bins.slice().reverse().map((bin, revIndex) => {
              const binIndex = bins.length - 1 - revIndex;
              const y = 340 - (binIndex / Math.max(bins.length - 1, 1)) * 250;
              const width = (bin.frequency / maxBin) * Math.min(46, slot / 3);
              return `${cx - width},${y}`;
            }).join(' ');
            const medianY = 340 - ((row.median - min) / ((max - min) || 1)) * 250;
            return (
              <g key={row.group}>
                <polygon points={`${right} ${left}`} fill={chartAccentSoft} stroke={chartSecondary} strokeWidth="2" opacity="0.9" />
                <line x1={cx - 40} x2={cx + 40} y1={medianY} y2={medianY} stroke="#0f172a" strokeWidth="3" />
                <text x={cx} y="380" textAnchor="middle" fill={chartMuted} fontSize="12">{labelText(row.group, 12)}</text>
              </g>
            );
          })}
          <text x="34" y="382" fill={chartMuted} fontSize="12">{min.toFixed(1)} to {max.toFixed(1)}</text>
        </svg>
      </CardContent>
    </Card>
  );
}

