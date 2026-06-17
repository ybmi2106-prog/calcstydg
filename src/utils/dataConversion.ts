import type { DatasetRow } from '@/types';

export type ConversionReport = {
  column: string;
  createdColumn: string;
  strategy: string;
  details: string;
  mapping?: Record<string, number>;
};

function isMissing(value: unknown) {
  return value === null || value === undefined || String(value).trim() === '' || ['na', 'nan', 'null', 'undefined'].includes(String(value).trim().toLowerCase());
}

function safeColumnName(base: string, suffix: string, existing: Set<string>) {
  const cleaned = `${base}_${suffix}`.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  let candidate = cleaned || `column_${suffix}`;
  let i = 2;
  while (existing.has(candidate)) {
    candidate = `${cleaned}_${i}`;
    i += 1;
  }
  existing.add(candidate);
  return candidate;
}

function parseNumericLike(value: unknown): number | null {
  if (isMissing(value)) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;

  let text = String(value).trim();
  const lower = text.toLowerCase();
  if (['yes', 'y', 'true', 'pass', 'passed', 'male', 'm'].includes(lower)) return 1;
  if (['no', 'n', 'false', 'fail', 'failed', 'female', 'f'].includes(lower)) return 0;

  const negativeByParentheses = /^\(.*\)$/.test(text);
  text = text.replace(/[₹€£$,%]/g, '').replace(/,/g, '').replace(/\s+/g, '');
  text = text.replace(/^\((.*)\)$/, '$1');
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return negativeByParentheses ? -number : number;
}

function parseDateLike(value: unknown): number | null {
  if (isMissing(value)) return null;
  const time = Date.parse(String(value));
  if (!Number.isFinite(time)) return null;
  return Math.round(time / 86400000);
}

function uniqueNonMissing(values: unknown[]) {
  return [...new Set(values.filter((value) => !isMissing(value)).map((value) => String(value).trim()))];
}

export function createAnalyticsReadyRows(rows: DatasetRow[]) {
  if (!rows.length) return { rows: [] as DatasetRow[], report: [] as ConversionReport[] };

  const columns = Object.keys(rows[0]);
  const existing = new Set(columns);
  const report: ConversionReport[] = [];
  const columnPlans = columns.map((column) => {
    const values = rows.map((row) => row[column]);
    const filled = values.filter((value) => !isMissing(value));
    if (!filled.length) return null;

    const numericParsed = filled.map(parseNumericLike).filter((value): value is number => value !== null);
    const numericRatio = numericParsed.length / filled.length;
    const unique = uniqueNonMissing(values);

    if (numericRatio >= 0.8 && !filled.every((value) => typeof value === 'number')) {
      const createdColumn = safeColumnName(column, 'num', existing);
      report.push({
        column,
        createdColumn,
        strategy: 'Numeric cleanup',
        details: 'Removed symbols such as currency, commas, and percentages, then converted values to numbers.'
      });
      return { column, createdColumn, convert: parseNumericLike };
    }

    const boolValues = new Set(filled.map((value) => String(value).trim().toLowerCase()));
    const isBoolean = [...boolValues].every((value) => ['true', 'false', 'yes', 'no', 'y', 'n', '0', '1', 'pass', 'fail', 'passed', 'failed'].includes(value));
    if (isBoolean) {
      const createdColumn = safeColumnName(column, 'flag', existing);
      report.push({
        column,
        createdColumn,
        strategy: 'Boolean encoding',
        details: 'Converted yes/no, true/false, pass/fail style values into 1 and 0.'
      });
      return { column, createdColumn, convert: parseNumericLike };
    }

    const dateParsed = filled.map(parseDateLike).filter((value): value is number => value !== null);
    const dateRatio = dateParsed.length / filled.length;
    if (dateRatio >= 0.85) {
      const createdColumn = safeColumnName(column, 'days', existing);
      report.push({
        column,
        createdColumn,
        strategy: 'Date encoding',
        details: 'Converted dates into day numbers so they can be used in charts and regression.'
      });
      return { column, createdColumn, convert: parseDateLike };
    }

    if (unique.length >= 2 && unique.length <= Math.min(30, Math.max(8, Math.ceil(filled.length * 0.45)))) {
      const createdColumn = safeColumnName(column, 'code', existing);
      const mapping = Object.fromEntries(unique.sort((a, b) => a.localeCompare(b)).map((label, index) => [label, index + 1]));
      report.push({
        column,
        createdColumn,
        strategy: 'Category encoding',
        details: 'Created a numeric code for each category while keeping the original column unchanged.',
        mapping
      });
      return { column, createdColumn, convert: (value: unknown) => (isMissing(value) ? null : mapping[String(value).trim()] ?? null) };
    }

    if (filled.some((value) => typeof value === 'string')) {
      const createdColumn = safeColumnName(column, 'length', existing);
      report.push({
        column,
        createdColumn,
        strategy: 'Text length feature',
        details: 'Created a simple text-length feature for long text variables.'
      });
      return { column, createdColumn, convert: (value: unknown) => (isMissing(value) ? null : String(value).length) };
    }

    return null;
  }).filter(Boolean) as { column: string; createdColumn: string; convert: (value: unknown) => number | null }[];

  const convertedRows = rows.map((row) => {
    const next: DatasetRow = { ...row };
    columnPlans.forEach((plan) => {
      next[plan.createdColumn] = plan.convert(row[plan.column]);
    });
    return next;
  });

  return { rows: convertedRows, report };
}
