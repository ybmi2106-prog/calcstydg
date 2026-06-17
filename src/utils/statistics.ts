import type { ColumnSummary, DatasetRow } from '@/types';
import { computeBasicStats } from '@/utils/dataProfiling';

type Params = Record<string, unknown>;

type RunInput = {
  endpoint: string;
  method: string;
  rows: DatasetRow[];
  targetColumn: string;
  params?: Params;
  columnSummary?: ColumnSummary[];
};

const EPS = 1e-12;

function round(value: unknown, digits = 4) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
}

function formatP(p: number) {
  if (!Number.isFinite(p)) return null;
  return Number(Math.max(0, Math.min(1, p)).toFixed(5));
}

function isMissing(value: unknown) {
  return value === null || value === undefined || value === '' || String(value).trim().toLowerCase() === 'na' || String(value).trim().toLowerCase() === 'nan';
}

function numericValue(value: unknown) {
  if (isMissing(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function numericValues(rows: DatasetRow[], column: string) {
  return rows.map((row) => numericValue(row[column])).filter((n): n is number => n !== null);
}

function pairedValues(rows: DatasetRow[], xColumn: string, yColumn: string) {
  return rows
    .map((row) => ({ x: numericValue(row[xColumn]), y: numericValue(row[yColumn]) }))
    .filter((row): row is { x: number; y: number } => row.x !== null && row.y !== null);
}

function uniqueColumns(rows: DatasetRow[]) {
  return rows[0] ? Object.keys(rows[0]) : [];
}

function inferColumnType(rows: DatasetRow[], column: string): ColumnSummary['type'] {
  const filled = rows.map((row) => row[column]).filter((value) => !isMissing(value));
  if (!filled.length) return 'empty';
  if (filled.every((value) => numericValue(value) !== null)) return 'numeric';
  const uniqueRatio = new Set(filled.map(String)).size / filled.length;
  return uniqueRatio < 0.5 ? 'categorical' : 'text';
}

function numericColumns(rows: DatasetRow[], columnSummary?: ColumnSummary[]) {
  const fromSummary = columnSummary?.filter((col) => col.type === 'numeric').map((col) => col.name) ?? [];
  if (fromSummary.length) return fromSummary;
  return uniqueColumns(rows).filter((col) => inferColumnType(rows, col) === 'numeric');
}

function categoricalColumns(rows: DatasetRow[], columnSummary?: ColumnSummary[]) {
  const fromSummary = columnSummary?.filter((col) => col.type !== 'numeric' && col.type !== 'empty').map((col) => col.name) ?? [];
  if (fromSummary.length) return fromSummary;
  return uniqueColumns(rows).filter((col) => inferColumnType(rows, col) !== 'numeric');
}

function chooseColumn(rows: DatasetRow[], preferred: unknown, fallback: string, columnSummary?: ColumnSummary[]) {
  const cols = uniqueColumns(rows);
  const selected = String(preferred ?? '');
  if (selected && cols.includes(selected)) return selected;
  if (fallback && cols.includes(fallback)) return fallback;
  return cols[0] ?? '';
}

function chooseNumericColumn(rows: DatasetRow[], preferred: unknown, exclude: string[] = [], columnSummary?: ColumnSummary[]) {
  const selected = String(preferred ?? '');
  const nums = numericColumns(rows, columnSummary).filter((col) => !exclude.includes(col));
  if (selected && nums.includes(selected)) return selected;
  return nums[0] ?? numericColumns(rows, columnSummary)[0] ?? '';
}

function chooseGroupColumn(rows: DatasetRow[], preferred: unknown, targetColumn: string, columnSummary?: ColumnSummary[]) {
  const selected = String(preferred ?? '');
  const cats = categoricalColumns(rows, columnSummary).filter((col) => col !== targetColumn);
  if (selected && uniqueColumns(rows).includes(selected)) return selected;
  return cats[0] ?? uniqueColumns(rows).find((col) => col !== targetColumn) ?? '';
}

function groupNumericValues(rows: DatasetRow[], valueColumn: string, groupColumn: string) {
  const groups = new Map<string, number[]>();
  rows.forEach((row) => {
    const value = numericValue(row[valueColumn]);
    const group = row[groupColumn];
    if (value === null || isMissing(group)) return;
    const key = String(group);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  });
  return [...groups.entries()].filter(([, values]) => values.length > 0);
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
}

function sampleVariance(values: number[]) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((acc, value) => acc + (value - m) ** 2, 0) / (values.length - 1);
}

function standardDeviation(values: number[]) {
  return Math.sqrt(sampleVariance(values));
}

function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return sign * y;
}

function normalCDF(x: number) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function twoSidedNormalP(z: number) {
  return formatP(2 * (1 - normalCDF(Math.abs(z)))) ?? 1;
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

function logGamma(z: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  let x = 0.99999999999980993;
  const y = z - 1;
  for (let i = 0; i < coefficients.length; i += 1) x += coefficients[i] / (y + i + 1);
  const t = y + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(x);
}

function gammaP(a: number, x: number) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 100; n += 1) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  return 1 - gammaQ(a, x);
}

function gammaQ(a: number, x: number) {
  if (x <= 0) return 1;
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 100; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function chiSquareSurvival(x: number, df: number) {
  if (!Number.isFinite(x) || df <= 0) return 1;
  return formatP(gammaQ(df / 2, x / 2)) ?? 1;
}

function betaContinuedFraction(a: number, b: number, x: number) {
  const maxIterations = 100;
  const fpmin = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betaContinuedFraction(a, b, x)) / a;
  return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

function fSurvival(f: number, df1: number, df2: number) {
  if (!Number.isFinite(f) || df1 <= 0 || df2 <= 0) return 1;
  const x = (df1 * f) / (df1 * f + df2);
  return formatP(1 - regularizedBeta(x, df1 / 2, df2 / 2)) ?? 1;
}

function twoSidedTP(t: number, df: number) {
  if (!Number.isFinite(t) || df <= 0) return 1;
  const x = df / (df + t * t);
  return formatP(regularizedBeta(x, df / 2, 0.5)) ?? 1;
}

function ranks(values: number[]) {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = Array(values.length).fill(0) as number[];
  for (let i = 0; i < indexed.length;) {
    let j = i + 1;
    while (j < indexed.length && indexed[j].value === indexed[i].value) j += 1;
    const rank = (i + 1 + j) / 2;
    for (let k = i; k < j; k += 1) result[indexed[k].index] = rank;
    i = j;
  }
  return result;
}

function pearsonCorrelation(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const mx = mean(xs);
  const my = mean(ys);
  const numerator = xs.reduce((acc, value, index) => acc + (value - mx) * (ys[index] - my), 0);
  const sx = Math.sqrt(xs.reduce((acc, value) => acc + (value - mx) ** 2, 0));
  const sy = Math.sqrt(ys.reduce((acc, value) => acc + (value - my) ** 2, 0));
  return numerator / ((sx * sy) || EPS);
}

function kendallTau(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const sign = Math.sign((x[i] - x[j]) * (y[i] - y[j]));
      if (sign > 0) concordant += 1;
      if (sign < 0) discordant += 1;
    }
  }
  const total = (n * (n - 1)) / 2;
  return total ? (concordant - discordant) / total : 0;
}

function correlationResult(method: string, pairs: { x: number; y: number }[], xColumn: string, yColumn: string) {
  const xs = pairs.map((p) => p.x);
  const ys = pairs.map((p) => p.y);
  const n = xs.length;
  let r = 0;
  if (method.includes('Spearman')) r = pearsonCorrelation(ranks(xs), ranks(ys));
  else if (method.includes('Kendall')) r = kendallTau(xs, ys);
  else r = pearsonCorrelation(xs, ys);
  const t = r * Math.sqrt(Math.max(n - 2, 1) / Math.max(1 - r * r, EPS));
  const pValue = twoSidedTP(t, n - 2);
  const alpha = 0.05;
  return {
    n,
    xColumn,
    yColumn,
    statistic: round(r),
    correlation: round(r),
    pValue,
    confidenceInterval: fisherCI(r, n),
    interpretation: pValue < alpha
      ? `${method} found a statistically noticeable relationship between ${xColumn} and ${yColumn}.`
      : `${method} did not find strong evidence of a relationship between ${xColumn} and ${yColumn}.`
  };
}

function fisherCI(r: number, n: number) {
  if (n < 4 || Math.abs(r) >= 1) return ['Not enough data', 'Not enough data'];
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const se = 1 / Math.sqrt(n - 3);
  return [round(Math.tanh(z - 1.96 * se)), round(Math.tanh(z + 1.96 * se))];
}

function descriptive(values: number[]) {
  const stats = computeBasicStats(values) ?? {};
  return Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, round(value)]));
}

function normality(method: string, values: number[], targetColumn: string, params: Params) {
  const alpha = Number(params.alpha ?? 0.05);
  const stats = computeBasicStats(values);
  if (!stats || values.length < 3) return { n: values.length, statistic: null, pValue: null, interpretation: 'Not enough numeric values for a normality check.' };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const m = stats.mean;
  const sd = stats.standardDeviation || EPS;
  const jb = (n / 6) * (stats.skewness ** 2 + ((stats.kurtosis ** 2) / 4));

  if (method.includes('Kolmogorov')) {
    let d = 0;
    sorted.forEach((value, index) => {
      const theoretical = normalCDF((value - m) / sd);
      d = Math.max(d, Math.abs((index + 1) / n - theoretical), Math.abs(index / n - theoretical));
    });
    const pValue = formatP(Math.min(1, 2 * Math.exp(-2 * n * d * d))) ?? 1;
    return { n, statistic: round(d), pValue, mean: round(m), standardDeviation: round(sd), interpretation: pValue < alpha ? `${targetColumn} departs from a normal distribution.` : `${targetColumn} looks reasonably close to a normal distribution.` };
  }

  if (method.includes('Anderson')) {
    const adjusted = sorted.reduce((acc, value, index) => {
      const f1 = Math.max(EPS, Math.min(1 - EPS, normalCDF((value - m) / sd)));
      const f2 = Math.max(EPS, Math.min(1 - EPS, normalCDF((sorted[n - 1 - index] - m) / sd)));
      return acc + (2 * index + 1) * (Math.log(f1) + Math.log(1 - f2));
    }, 0);
    const a2 = -n - adjusted / n;
    const pValue = formatP(Math.exp(-Math.max(a2, 0))) ?? 1;
    return { n, statistic: round(a2), pValue, mean: round(m), standardDeviation: round(sd), interpretation: pValue < alpha ? `${targetColumn} shows non-normal tail behaviour.` : `${targetColumn} does not show severe non-normality by this diagnostic.` };
  }

  if (method.includes('QQ')) {
    const theoretical = sorted.map((_, i) => inverseNormal((i + 0.5) / n));
    const qqCorrelation = pearsonCorrelation(theoretical, sorted);
    return { n, statistic: round(qqCorrelation), pValue: null, mean: round(m), standardDeviation: round(sd), interpretation: `QQ plot correlation is ${round(qqCorrelation)}. Values closer to 1 indicate a straighter QQ plot.` };
  }

  const pValue = chiSquareSurvival(jb, 2);
  const wApprox = Math.max(0, Math.min(1, 1 - Math.min(0.99, Math.abs(stats.skewness) / 5 + Math.abs(stats.kurtosis) / 10)));
  return { n, statistic: round(wApprox), pValue, mean: round(m), standardDeviation: round(sd), skewness: round(stats.skewness), kurtosis: round(stats.kurtosis), interpretation: pValue < alpha ? `${targetColumn} is unlikely to be normally distributed.` : `${targetColumn} is compatible with normality for this sample.` };
}

function oneSampleT(values: number[], testValue: number, alpha: number) {
  const n = values.length;
  const m = mean(values);
  const sd = standardDeviation(values);
  const se = sd / Math.sqrt(Math.max(n, 1));
  const t = (m - testValue) / (se || EPS);
  const pValue = twoSidedTP(t, n - 1);
  return {
    n,
    mean: round(m),
    testValue: round(testValue),
    statistic: round(t),
    degreesOfFreedom: n - 1,
    pValue,
    effectSize: round((m - testValue) / (sd || EPS)),
    confidenceInterval: [round(m - 1.96 * se), round(m + 1.96 * se)],
    interpretation: pValue < alpha ? `The mean is significantly different from ${testValue}.` : `The mean is not significantly different from ${testValue}.`
  };
}

function independentT(groups: [string, number[]][], alpha: number) {
  const [g1, g2] = groups;
  if (!g1 || !g2) return { statistic: null, pValue: null, interpretation: 'Independent t-test needs at least two groups.' };
  const [name1, a] = g1;
  const [name2, b] = g2;
  const m1 = mean(a);
  const m2 = mean(b);
  const v1 = sampleVariance(a);
  const v2 = sampleVariance(b);
  const se = Math.sqrt(v1 / a.length + v2 / b.length);
  const t = (m1 - m2) / (se || EPS);
  const df = ((v1 / a.length + v2 / b.length) ** 2) / (((v1 / a.length) ** 2) / Math.max(a.length - 1, 1) + ((v2 / b.length) ** 2) / Math.max(b.length - 1, 1));
  const pooled = Math.sqrt(((a.length - 1) * v1 + (b.length - 1) * v2) / Math.max(a.length + b.length - 2, 1));
  const pValue = twoSidedTP(t, df);
  return { groupA: name1, groupB: name2, nA: a.length, nB: b.length, meanA: round(m1), meanB: round(m2), statistic: round(t), degreesOfFreedom: round(df), pValue, effectSize: round((m1 - m2) / (pooled || EPS)), confidenceInterval: [round((m1 - m2) - 1.96 * se), round((m1 - m2) + 1.96 * se)], interpretation: pValue < alpha ? `${name1} and ${name2} differ significantly.` : `${name1} and ${name2} do not differ significantly.` };
}

function pairedT(pairs: { x: number; y: number }[], alpha: number) {
  const differences = pairs.map((pair) => pair.x - pair.y);
  const result = oneSampleT(differences, 0, alpha);
  return { ...result, pairedRows: pairs.length, interpretation: Number(result.pValue) < alpha ? 'The paired difference is statistically significant.' : 'The paired difference is not statistically significant.' };
}


function normalPFromAlternative(z: number, alternative: string) {
  if (alternative === 'less') return formatP(normalCDF(z)) ?? 1;
  if (alternative === 'greater') return formatP(1 - normalCDF(z)) ?? 1;
  return twoSidedNormalP(z);
}

function oneSampleZ(values: number[], testValue: number, populationStd: number, alpha: number, alternative = 'two-sided') {
  const n = values.length;
  if (n < 2) return { testName: 'One Sample Z-Test', n, statistic: null, pValue: null, interpretation: 'Z-test needs at least two numeric values.' };
  const m = mean(values);
  const sigma = Math.abs(populationStd) || standardDeviation(values) || EPS;
  const se = sigma / Math.sqrt(n);
  const z = (m - testValue) / (se || EPS);
  const pValue = normalPFromAlternative(z, alternative);
  return {
    testName: 'One Sample Z-Test',
    n,
    mean: round(m),
    testValue: round(testValue),
    populationStd: round(sigma),
    statistic: round(z),
    degreesOfFreedom: 'Not used for Z-test',
    pValue,
    effectSize: round((m - testValue) / (sigma || EPS)),
    confidenceInterval: [round(m - 1.96 * se), round(m + 1.96 * se)],
    interpretation: pValue < alpha ? `The sample mean is significantly different from ${testValue} by Z-test.` : `The sample mean is not significantly different from ${testValue} by Z-test.`
  };
}

function twoSampleZ(groups: [string, number[]][], populationStd: number, alpha: number, alternative = 'two-sided') {
  const [g1, g2] = groups;
  if (!g1 || !g2) return { testName: 'Two Sample Z-Test', statistic: null, pValue: null, interpretation: 'Two sample Z-test needs exactly two groups.' };
  const [name1, a] = g1;
  const [name2, b] = g2;
  if (a.length < 2 || b.length < 2) return { testName: 'Two Sample Z-Test', groupA: name1, groupB: name2, statistic: null, pValue: null, interpretation: 'Each group needs at least two values.' };
  const m1 = mean(a);
  const m2 = mean(b);
  const sigma = Math.abs(populationStd) || Math.sqrt((sampleVariance(a) + sampleVariance(b)) / 2) || EPS;
  const se = Math.sqrt((sigma ** 2) / a.length + (sigma ** 2) / b.length) || EPS;
  const z = (m1 - m2) / se;
  const pValue = normalPFromAlternative(z, alternative);
  return {
    testName: 'Two Sample Z-Test',
    groupA: name1,
    groupB: name2,
    nA: a.length,
    nB: b.length,
    meanA: round(m1),
    meanB: round(m2),
    populationStd: round(sigma),
    statistic: round(z),
    degreesOfFreedom: 'Not used for Z-test',
    pValue,
    effectSize: round((m1 - m2) / (sigma || EPS)),
    confidenceInterval: [round((m1 - m2) - 1.96 * se), round((m1 - m2) + 1.96 * se)],
    interpretation: pValue < alpha ? `${name1} and ${name2} differ significantly by Z-test.` : `${name1} and ${name2} do not differ significantly by Z-test.`
  };
}

function categoryCounts(rows: DatasetRow[], column: string) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value = row[column];
    if (isMissing(value)) return;
    const key = String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function parseExpectedCounts(text: unknown, length: number, total: number) {
  const raw = String(text ?? '').trim();
  if (!raw) return Array(length).fill(total / Math.max(length, 1)) as number[];
  const values = raw.split(',').map((part) => Number(part.trim())).filter(Number.isFinite);
  if (values.length !== length || values.some((value) => value <= 0)) return Array(length).fill(total / Math.max(length, 1)) as number[];
  const expectedTotal = values.reduce((a, b) => a + b, 0) || EPS;
  return values.map((value) => (value / expectedTotal) * total);
}

function chiSquareGoodness(rows: DatasetRow[], categoryColumn: string, params: Params, alpha: number) {
  const counts = categoryCounts(rows, categoryColumn);
  if (counts.length < 2) return { testName: 'Chi-Square Goodness of Fit', column: categoryColumn, statistic: null, pValue: null, interpretation: 'Goodness-of-fit test needs at least two categories.' };
  const observed = counts.map(([, count]) => count);
  const labels = counts.map(([label]) => label);
  const total = observed.reduce((a, b) => a + b, 0);
  const expected = parseExpectedCounts(params.expectedCounts, observed.length, total);
  const chi = observed.reduce((acc, value, index) => acc + ((value - expected[index]) ** 2) / Math.max(expected[index], EPS), 0);
  const df = observed.length - 1;
  const pValue = chiSquareSurvival(chi, df);
  return {
    testName: 'Chi-Square Goodness of Fit',
    column: categoryColumn,
    n: total,
    categories: labels,
    observed,
    expected: expected.map((value) => round(value)),
    statistic: round(chi),
    degreesOfFreedom: df,
    pValue,
    effectSize: round(Math.sqrt(chi / Math.max(total, EPS))),
    interpretation: pValue < alpha ? `${categoryColumn} does not follow the expected distribution.` : `${categoryColumn} is close to the expected distribution.`
  };
}

function chiSquareIndependence(rows: DatasetRow[], firstColumn: string, secondColumn: string, alpha: number) {
  const rowLabels = [...new Set(rows.map((row) => row[firstColumn]).filter((value) => !isMissing(value)).map(String))];
  const colLabels = [...new Set(rows.map((row) => row[secondColumn]).filter((value) => !isMissing(value)).map(String))];
  if (rowLabels.length < 2 || colLabels.length < 2) return { testName: 'Chi-Square Independence', columnA: firstColumn, columnB: secondColumn, statistic: null, pValue: null, interpretation: 'Independence test needs two categorical columns with at least two categories each.' };
  const table = rowLabels.map((r) => colLabels.map((c) => rows.filter((row) => String(row[firstColumn]) === r && String(row[secondColumn]) === c).length));
  const rowTotals = table.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = colLabels.map((_, colIndex) => table.reduce((acc, row) => acc + row[colIndex], 0));
  const total = rowTotals.reduce((a, b) => a + b, 0);
  let chi = 0;
  table.forEach((row, r) => row.forEach((observed, c) => {
    const expected = (rowTotals[r] * colTotals[c]) / Math.max(total, EPS);
    chi += ((observed - expected) ** 2) / Math.max(expected, EPS);
  }));
  const df = (rowLabels.length - 1) * (colLabels.length - 1);
  const pValue = chiSquareSurvival(chi, df);
  const minDim = Math.min(rowLabels.length - 1, colLabels.length - 1) || 1;
  return {
    testName: 'Chi-Square Independence',
    columnA: firstColumn,
    columnB: secondColumn,
    n: total,
    rowCategories: rowLabels,
    columnCategories: colLabels,
    contingencyTable: table,
    statistic: round(chi),
    degreesOfFreedom: df,
    pValue,
    effectSize: round(Math.sqrt(chi / Math.max(total * minDim, EPS))),
    interpretation: pValue < alpha ? `${firstColumn} and ${secondColumn} appear to be associated.` : `${firstColumn} and ${secondColumn} do not show strong evidence of association.`
  };
}

function coreTests(method: string, rows: DatasetRow[], targetColumn: string, params: Params, columnSummary?: ColumnSummary[]) {
  const alpha = Number(params.alpha ?? 0.05);
  const alternative = String(params.alternative ?? 'two-sided');
  const group = chooseGroupColumn(rows, params.groupColumn ?? params.factor1, targetColumn, columnSummary);
  const second = chooseNumericColumn(rows, params.secondColumn, [targetColumn], columnSummary);
  const category = chooseColumn(rows, params.categoryColumn, chooseGroupColumn(rows, params.categoryColumn, targetColumn, columnSummary), columnSummary);
  const values = numericValues(rows, targetColumn);

  if (method.includes('One Sample T')) return { testName: 'One Sample T-Test', ...oneSampleT(values, Number(params.testValue ?? 0), alpha) };
  if (method.includes('Independent T')) return { testName: 'Independent T-Test', groupColumn: group, ...independentT(groupNumericValues(rows, targetColumn, group).slice(0, 2), alpha) };
  if (method.includes('Paired T')) return { testName: 'Paired T-Test', secondColumn: second, ...pairedT(pairedValues(rows, targetColumn, second), alpha) };
  if (method.includes('One Sample Z')) return oneSampleZ(values, Number(params.testValue ?? 0), Number(params.populationStd ?? 1), alpha, alternative);
  if (method.includes('Two Sample Z')) return { groupColumn: group, ...twoSampleZ(groupNumericValues(rows, targetColumn, group).slice(0, 2), Number(params.populationStd ?? 1), alpha, alternative) };
  if (method.includes('Goodness')) return chiSquareGoodness(rows, category, params, alpha);
  if (method.includes('Independence')) return chiSquareIndependence(rows, category, group, alpha);
  return { testName: 'One Way ANOVA', factor1: group, ...oneWayAnova(groupNumericValues(rows, targetColumn, group), alpha) };
}

function hypothesis(method: string, rows: DatasetRow[], targetColumn: string, params: Params, columnSummary?: ColumnSummary[]) {
  const alpha = Number(params.alpha ?? 0.05);
  const values = numericValues(rows, targetColumn);
  if (method.includes('One Sample')) return oneSampleT(values, Number(params.testValue ?? 0), alpha);
  if (method.includes('Paired')) {
    const second = chooseNumericColumn(rows, params.secondColumn, [targetColumn], columnSummary);
    return { secondColumn: second, ...pairedT(pairedValues(rows, targetColumn, second), alpha) };
  }
  const group = chooseGroupColumn(rows, params.groupColumn, targetColumn, columnSummary);
  return { groupColumn: group, ...independentT(groupNumericValues(rows, targetColumn, group).slice(0, 2), alpha) };
}

function mannWhitney(groups: [string, number[]][], alpha: number) {
  const [g1, g2] = groups;
  if (!g1 || !g2) return { statistic: null, pValue: null, interpretation: 'Mann-Whitney U needs two groups.' };
  const combined = [...g1[1].map((value) => ({ value, group: 1 })), ...g2[1].map((value) => ({ value, group: 2 }))];
  const ranked = ranks(combined.map((item) => item.value));
  const r1 = ranked.reduce((acc, rank, index) => acc + (combined[index].group === 1 ? rank : 0), 0);
  const n1 = g1[1].length;
  const n2 = g2[1].length;
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12) || EPS;
  const z = (u - mu) / sigma;
  const pValue = twoSidedNormalP(z);
  return { groupA: g1[0], groupB: g2[0], nA: n1, nB: n2, statistic: round(u), rankStatistic: round(u), zStatistic: round(z), pValue, effectSize: round(Math.abs(z) / Math.sqrt(n1 + n2)), interpretation: pValue < alpha ? 'The rank distributions differ significantly between the two groups.' : 'The rank distributions do not differ significantly between the two groups.' };
}

function kruskalWallis(groups: [string, number[]][], alpha: number) {
  if (groups.length < 2) return { statistic: null, pValue: null, interpretation: 'Kruskal-Wallis needs two or more groups.' };
  const combined = groups.flatMap(([group, values]) => values.map((value) => ({ group, value })));
  const ranked = ranks(combined.map((item) => item.value));
  const n = combined.length;
  let h = 0;
  groups.forEach(([group, values]) => {
    const rankSum = combined.reduce((acc, item, index) => acc + (item.group === group ? ranked[index] : 0), 0);
    h += (rankSum ** 2) / values.length;
  });
  h = (12 / (n * (n + 1))) * h - 3 * (n + 1);
  const df = groups.length - 1;
  const pValue = chiSquareSurvival(h, df);
  return { groups: groups.map(([name, values]) => `${name} (n=${values.length})`), statistic: round(h), rankStatistic: round(h), degreesOfFreedom: df, pValue, effectSize: round((h - groups.length + 1) / Math.max(n - groups.length, 1)), interpretation: pValue < alpha ? 'At least one group has a different rank distribution.' : 'No strong evidence of rank differences across groups.' };
}

function wilcoxonSignedRank(pairs: { x: number; y: number }[], alpha: number) {
  const diffs = pairs.map((pair) => pair.x - pair.y).filter((d) => d !== 0);
  if (!diffs.length) return { statistic: null, pValue: null, interpretation: 'Wilcoxon signed rank needs non-zero paired differences.' };
  const absRanks = ranks(diffs.map(Math.abs));
  const wPlus = absRanks.reduce((acc, rank, index) => acc + (diffs[index] > 0 ? rank : 0), 0);
  const wMinus = absRanks.reduce((acc, rank, index) => acc + (diffs[index] < 0 ? rank : 0), 0);
  const w = Math.min(wPlus, wMinus);
  const n = diffs.length;
  const mu = (n * (n + 1)) / 4;
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24) || EPS;
  const z = (w - mu) / sigma;
  const pValue = twoSidedNormalP(z);
  return { pairedRows: pairs.length, statistic: round(w), rankStatistic: round(w), zStatistic: round(z), pValue, effectSize: round(Math.abs(z) / Math.sqrt(n)), interpretation: pValue < alpha ? 'The median paired difference is significantly different from zero.' : 'The median paired difference is not significantly different from zero.' };
}

function friedman(rows: DatasetRow[], params: Params, targetColumn: string, alpha: number, columnSummary?: ColumnSummary[]) {
  const columnsText = String(params.measureColumns ?? params.predictors ?? '').trim();
  const chosen = columnsText ? columnsText.split(',').map((c) => c.trim()).filter(Boolean) : [];
  const candidates = (chosen.length ? chosen : numericColumns(rows, columnSummary)).filter((col) => col !== 'id');
  const cols = candidates.length >= 3 ? candidates : [targetColumn, chooseNumericColumn(rows, params.secondColumn, [targetColumn], columnSummary)].filter(Boolean);
  const completeRows = rows.map((row) => cols.map((col) => numericValue(row[col]))).filter((values): values is number[] => values.every((value) => value !== null));
  const n = completeRows.length;
  const k = cols.length;
  if (n < 2 || k < 2) return { statistic: null, pValue: null, interpretation: 'Friedman test needs repeated numeric measurements across at least two columns.' };
  const rankSums = Array(k).fill(0) as number[];
  completeRows.forEach((values) => {
    const rowRanks = ranks(values);
    rowRanks.forEach((rank, index) => { rankSums[index] += rank; });
  });
  const q = (12 / (n * k * (k + 1))) * rankSums.reduce((acc, r) => acc + r ** 2, 0) - 3 * n * (k + 1);
  const df = k - 1;
  const pValue = chiSquareSurvival(q, df);
  return { measureColumns: cols, completeBlocks: n, statistic: round(q), rankStatistic: round(q), degreesOfFreedom: df, pValue, effectSize: round(q / (n * (k - 1))), interpretation: pValue < alpha ? 'At least one repeated condition differs by rank.' : 'No strong rank difference across repeated conditions.' };
}

function nonParametric(method: string, rows: DatasetRow[], targetColumn: string, params: Params, columnSummary?: ColumnSummary[]) {
  const alpha = Number(params.alpha ?? 0.05);
  const group = chooseGroupColumn(rows, params.groupColumn, targetColumn, columnSummary);
  const second = chooseNumericColumn(rows, params.secondColumn, [targetColumn], columnSummary);
  if (method.includes('Mann')) return { groupColumn: group, ...mannWhitney(groupNumericValues(rows, targetColumn, group).slice(0, 2), alpha) };
  if (method.includes('Kruskal')) return { groupColumn: group, ...kruskalWallis(groupNumericValues(rows, targetColumn, group), alpha) };
  if (method.includes('Friedman')) return friedman(rows, params, targetColumn, alpha, columnSummary);
  if (method.includes('Wilcoxon')) return { secondColumn: second, ...wilcoxonSignedRank(pairedValues(rows, targetColumn, second), alpha) };
  return correlationResult('Spearman', pairedValues(rows, targetColumn, second), targetColumn, second);
}

function oneWayAnova(groups: [string, number[]][], alpha = 0.05) {
  if (groups.length < 2) return { statistic: null, pValue: null, interpretation: 'ANOVA needs at least two groups.' };
  const all = groups.flatMap(([, values]) => values);
  const grandMean = mean(all);
  const ssBetween = groups.reduce((acc, [, values]) => acc + values.length * (mean(values) - grandMean) ** 2, 0);
  const ssWithin = groups.reduce((acc, [, values]) => acc + values.reduce((sum, value) => sum + (value - mean(values)) ** 2, 0), 0);
  const dfBetween = groups.length - 1;
  const dfWithin = all.length - groups.length;
  const msBetween = ssBetween / Math.max(dfBetween, 1);
  const msWithin = ssWithin / Math.max(dfWithin, 1);
  const f = msBetween / (msWithin || EPS);
  const pValue = fSurvival(f, dfBetween, dfWithin);
  return { groups: groups.map(([name, values]) => `${name} (n=${values.length})`), statistic: round(f), pValue, degreesOfFreedom: `${dfBetween}, ${dfWithin}`, effectSize: round(ssBetween / Math.max(ssBetween + ssWithin, EPS)), interpretation: pValue < alpha ? 'The group means are significantly different.' : 'The group means are not significantly different.' };
}

function repeatedMeasuresAnova(rows: DatasetRow[], params: Params, targetColumn: string, alpha: number, columnSummary?: ColumnSummary[]) {
  const res = friedman(rows, params, targetColumn, alpha, columnSummary);
  return { ...res, interpretation: `${res.interpretation ?? ''} This browser version uses a repeated-rank approximation when repeated columns are selected.` };
}

function anova(method: string, rows: DatasetRow[], targetColumn: string, params: Params, columnSummary?: ColumnSummary[]) {
  const alpha = Number(params.alpha ?? 0.05);
  if (method.includes('Repeated')) return repeatedMeasuresAnova(rows, params, targetColumn, alpha, columnSummary);
  const factor = chooseGroupColumn(rows, params.factor1 ?? params.groupColumn, targetColumn, columnSummary);
  const result = oneWayAnova(groupNumericValues(rows, targetColumn, factor), alpha);
  return { factor1: factor, note: method.includes('Two Way') ? 'Two-way ANOVA screen: first factor calculated. Add backend for full interaction table.' : undefined, ...result };
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let i = 0; i < n; i += 1) {
    let maxRow = i;
    for (let k = i + 1; k < n; k += 1) if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) maxRow = k;
    [a[i], a[maxRow]] = [a[maxRow], a[i]];
    const pivot = a[i][i] || EPS;
    for (let j = i; j <= n; j += 1) a[i][j] /= pivot;
    for (let k = 0; k < n; k += 1) {
      if (k === i) continue;
      const factor = a[k][i];
      for (let j = i; j <= n; j += 1) a[k][j] -= factor * a[i][j];
    }
  }
  return a.map((row) => row[n]);
}

function ols(y: number[], xRows: number[][]) {
  const n = y.length;
  const p = xRows[0]?.length ?? 0;
  const xtx = Array.from({ length: p }, () => Array(p).fill(0) as number[]);
  const xty = Array(p).fill(0) as number[];
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < p; j += 1) {
      xty[j] += xRows[i][j] * y[i];
      for (let k = 0; k < p; k += 1) xtx[j][k] += xRows[i][j] * xRows[i][k];
    }
  }
  const coefficients = solveLinearSystem(xtx, xty);
  const fitted = xRows.map((row) => row.reduce((acc, value, index) => acc + value * coefficients[index], 0));
  const yMean = mean(y);
  const sst = y.reduce((acc, value) => acc + (value - yMean) ** 2, 0);
  const sse = y.reduce((acc, value, index) => acc + (value - fitted[index]) ** 2, 0);
  const rSquared = 1 - sse / Math.max(sst, EPS);
  return { coefficients, fitted, rSquared, sse };
}

function regression(method: string, rows: DatasetRow[], targetColumn: string, params: Params, columnSummary?: ColumnSummary[]) {
  const degree = Math.max(1, Number(params.degree ?? 2));
  const predictorText = String(params.predictors ?? params.secondColumn ?? '').trim();
  const predictors = predictorText
    ? predictorText.split(',').map((col) => col.trim()).filter(Boolean)
    : [chooseNumericColumn(rows, params.secondColumn, [targetColumn], columnSummary)];
  const usablePredictors = predictors.filter((col) => col && uniqueColumns(rows).includes(col) && col !== targetColumn);
  const selectedPredictors = usablePredictors.length ? usablePredictors : [chooseNumericColumn(rows, undefined, [targetColumn], columnSummary)];
  const complete = rows
    .map((row) => ({ y: numericValue(row[targetColumn]), xs: selectedPredictors.map((col) => numericValue(row[col])) }))
    .filter((row): row is { y: number; xs: number[] } => row.y !== null && row.xs.every((value) => value !== null));
  if (complete.length < 3) return { statistic: null, pValue: null, interpretation: 'Regression needs at least three complete numeric rows.' };
  const y = complete.map((row) => row.y);
  const xRows = complete.map((row) => {
    if (method.includes('Polynomial')) {
      const x = row.xs[0];
      return [1, ...Array.from({ length: degree }, (_, i) => x ** (i + 1))];
    }
    return [1, ...row.xs];
  });
  const model = ols(y, xRows);
  const p = xRows[0].length;
  const mse = model.sse / Math.max(complete.length - p, 1);
  const statistic = (model.rSquared / Math.max(p - 1, 1)) / ((1 - model.rSquared) / Math.max(complete.length - p, 1));
  const pValue = fSurvival(statistic, Math.max(p - 1, 1), Math.max(complete.length - p, 1));
  return { n: complete.length, predictors: selectedPredictors, statistic: round(statistic), pValue, rSquared: round(model.rSquared), effectSize: round(model.rSquared / Math.max(1 - model.rSquared, EPS)), coefficients: model.coefficients.map((coef) => round(coef)), intercept: round(model.coefficients[0]), slope: round(model.coefficients[1]), interpretation: pValue < 0.05 ? `The model explains a significant amount of variation in ${targetColumn}.` : `The model does not explain a strong amount of variation in ${targetColumn}.` };
}

function power(method: string, rows: DatasetRow[], targetColumn: string, params: Params, columnSummary?: ColumnSummary[]) {
  const alpha = Number(params.alpha ?? 0.05);
  const targetPower = Number(params.power ?? 0.8);
  let effectSize = Number(params.effectSize ?? 0.5);
  const second = chooseNumericColumn(rows, params.secondColumn, [targetColumn], columnSummary);
  const pairs = pairedValues(rows, targetColumn, second);
  if (method.includes('Effect') && pairs.length > 2) {
    const diffs = pairs.map((pair) => pair.x - pair.y);
    effectSize = Math.abs(mean(diffs) / (standardDeviation(diffs) || EPS));
  }
  const zAlpha = inverseNormal(1 - alpha / 2);
  const zPower = inverseNormal(targetPower);
  const sampleSize = Math.ceil((2 * (zAlpha + zPower) ** 2) / Math.max(effectSize ** 2, EPS));
  const currentN = numericValues(rows, targetColumn).length;
  const achievedZ = Math.sqrt(currentN / 2) * effectSize - zAlpha;
  const achievedPower = normalCDF(achievedZ);
  return { statistic: sampleSize, sampleSize, currentN, effectSize: round(effectSize), alpha, targetPower, achievedPower: round(achievedPower), interpretation: method.includes('Sample') ? `Estimated sample size needed is about ${sampleSize} observations per two-group comparison.` : `Estimated achieved power with the current sample is ${round(achievedPower)}.` };
}

export function runRealAnalysis({ endpoint, method, rows, targetColumn, params = {}, columnSummary }: RunInput) {
  const safeTarget = chooseColumn(rows, targetColumn, chooseNumericColumn(rows, undefined, [], columnSummary), columnSummary);
  const values = numericValues(rows, safeTarget);
  if (!rows.length) return { error: 'No dataset rows are available. Upload a dataset first.' };
  if (!safeTarget) return { error: 'No valid target column was found.' };

  if (endpoint === '/descriptive') return descriptive(values);
  if (endpoint === '/normality') return normality(method, values, safeTarget, params);
  if (endpoint === '/core-tests') return coreTests(method, rows, safeTarget, params, columnSummary);
  if (endpoint === '/hypothesis') return hypothesis(method, rows, safeTarget, params, columnSummary);
  if (endpoint === '/non-parametric') return nonParametric(method, rows, safeTarget, params, columnSummary);
  if (endpoint === '/anova') return anova(method, rows, safeTarget, params, columnSummary);
  if (endpoint === '/correlation') {
    const second = chooseNumericColumn(rows, params.secondColumn, [safeTarget], columnSummary);
    return correlationResult(method, pairedValues(rows, safeTarget, second), safeTarget, second);
  }
  if (endpoint === '/regression') return regression(method, rows, safeTarget, params, columnSummary);

  return { error: `Unknown analysis endpoint: ${endpoint}` };
}
