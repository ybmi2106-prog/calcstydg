import type { ApiResult, DatasetProfile, DatasetRow } from '@/types';
import { computeBasicStats, profileDataset } from '@/utils/dataProfiling';
import { runRealAnalysis } from '@/utils/statistics';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const analysisEndpoints = [
  '/upload',
  '/dataset',
  '/descriptive',
  '/normality',
  '/core-tests',
  '/hypothesis',
  '/non-parametric',
  '/anova',
  '/correlation',
  '/regression'
] as const;

function wait(ms = 450) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(endpoint: string, data: T): ApiResult<T> {
  return {
    endpoint: `${API_BASE_URL}${endpoint}`,
    status: 'ok',
    data,
    generatedAt: new Date().toISOString()
  };
}

export const api = {
  async uploadDataset(payload: { name: string; type: string; size: number; rows: DatasetRow[] }) {
    await wait();
    return ok<DatasetProfile>('/upload', profileDataset(payload));
  },

  async getDataset(dataset: DatasetProfile) {
    await wait(250);
    return ok('/dataset', dataset);
  },

  async runDescriptive(values: number[]) {
    await wait();
    return ok('/descriptive', computeBasicStats(values));
  },

  async runModule(endpoint: string, payload: Record<string, unknown>) {
    await wait();
    const data = runRealAnalysis({
      endpoint,
      method: String(payload.method ?? ''),
      rows: (payload.rows ?? []) as DatasetRow[],
      targetColumn: String(payload.targetColumn ?? ''),
      params: payload,
      columnSummary: payload.columnSummary as DatasetProfile['columnSummary'] | undefined
    });
    return ok(endpoint, { request: payload, ...data });
  },

  descriptive: (payload: Record<string, unknown>) => api.runModule('/descriptive', payload),
  normality: (payload: Record<string, unknown>) => api.runModule('/normality', payload),
  coreTests: (payload: Record<string, unknown>) => api.runModule('/core-tests', payload),
  hypothesis: (payload: Record<string, unknown>) => api.runModule('/hypothesis', payload),
  nonParametric: (payload: Record<string, unknown>) => api.runModule('/non-parametric', payload),
  anova: (payload: Record<string, unknown>) => api.runModule('/anova', payload),
  correlation: (payload: Record<string, unknown>) => api.runModule('/correlation', payload),
  regression: (payload: Record<string, unknown>) => api.runModule('/regression', payload)
};
