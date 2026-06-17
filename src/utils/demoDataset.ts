import Papa from 'papaparse';
import type { DatasetProfile, DatasetRow } from '@/types';
import { profileDataset } from '@/utils/dataProfiling';

export const DEMO_DATASET_NAME = 'SquadLists.csv';
export const DEMO_DATASET_URL = '/sample-data/SquadLists.csv';

function normalizeRows(rows: unknown[]): DatasetRow[] {
  return rows.filter(Boolean).map((row, index) => {
    if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
      return row as DatasetRow;
    }
    return { index: index + 1, value: String(row) };
  });
}

export async function createDemoDatasetProfile(): Promise<DatasetProfile> {
  const response = await fetch(DEMO_DATASET_URL);

  if (!response.ok) {
    throw new Error('Unable to load the built-in SquadLists football demo dataset.');
  }

  const csvText = await response.text();
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });

  if (parsed.errors.length && !parsed.data.length) {
    throw new Error(parsed.errors[0]?.message ?? 'The demo dataset could not be parsed.');
  }

  return profileDataset({
    name: DEMO_DATASET_NAME,
    type: 'CSV',
    size: new Blob([csvText]).size,
    rows: normalizeRows(parsed.data)
  });
}
