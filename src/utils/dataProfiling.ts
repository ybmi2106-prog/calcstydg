import type { ColumnSummary, DatasetProfile, DatasetRow } from '@/types';

function isMissing(value: unknown) {
  return value === null || value === undefined || value === '' || String(value).toLowerCase() === 'na' || String(value).toLowerCase() === 'nan';
}

function inferType(values: unknown[]): ColumnSummary['type'] {
  const filled = values.filter((v) => !isMissing(v));
  if (!filled.length) return 'empty';
  const numeric = filled.every((v) => !Number.isNaN(Number(v)) && String(v).trim() !== '');
  if (numeric) return 'numeric';
  const boolean = filled.every((v) => ['true', 'false', '0', '1', 'yes', 'no'].includes(String(v).toLowerCase()));
  if (boolean) return 'boolean';
  const date = filled.every((v) => !Number.isNaN(Date.parse(String(v))));
  if (date) return 'date';
  const uniqueRatio = new Set(filled.map(String)).size / filled.length;
  return uniqueRatio < 0.35 ? 'categorical' : 'text';
}

export function summarizeColumns(rows: DatasetRow[]): ColumnSummary[] {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  return columns.map((name) => {
    const values = rows.map((row) => row[name]);
    const missing = values.filter(isMissing).length;
    const unique = new Set(values.filter((v) => !isMissing(v)).map(String)).size;
    const type = inferType(values);
    const nums = values.map(Number).filter((v) => !Number.isNaN(v));
    const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
    return {
      name,
      type,
      missing,
      unique,
      mean: mean !== undefined ? Number(mean.toFixed(3)) : undefined,
      min: nums.length ? Math.min(...nums) : undefined,
      max: nums.length ? Math.max(...nums) : undefined
    };
  });
}

export function profileDataset(input: { name: string; type: string; size: number; rows: DatasetRow[] }): DatasetProfile {
  const rowSignatures = input.rows.map((row) => JSON.stringify(row));
  const duplicateRows = rowSignatures.length - new Set(rowSignatures).size;
  const columnSummary = summarizeColumns(input.rows);
  const missingValues = columnSummary.reduce((total, col) => total + col.missing, 0);
  return {
    id: crypto.randomUUID(),
    name: input.name,
    type: input.type,
    size: input.size,
    rows: input.rows.length,
    columns: columnSummary.length,
    missingValues,
    duplicateRows,
    preview: input.rows,
    columnSummary,
    createdAt: new Date().toISOString()
  };
}

export function computeBasicStats(values: number[]) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const median = nums.length % 2 ? nums[Math.floor(nums.length / 2)] : (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2;
  const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / Math.max(nums.length - 1, 1);
  const sd = Math.sqrt(variance);
  const q = (p: number) => nums[Math.floor((nums.length - 1) * p)];
  const skewness = nums.reduce((acc, n) => acc + ((n - mean) / (sd || 1)) ** 3, 0) / nums.length;
  const kurtosis = nums.reduce((acc, n) => acc + ((n - mean) / (sd || 1)) ** 4, 0) / nums.length - 3;
  const counts = new Map<number, number>();
  nums.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return {
    n: nums.length,
    mean,
    median,
    mode,
    variance,
    standardDeviation: sd,
    min: nums[0],
    max: nums[nums.length - 1],
    q1: q(0.25),
    q3: q(0.75),
    skewness,
    kurtosis
  };
}
