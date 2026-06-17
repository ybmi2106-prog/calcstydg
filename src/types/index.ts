export type DatasetRow = Record<string, string | number | boolean | null>;

export type DatasetProfile = {
  id: string;
  name: string;
  type: string;
  size: number;
  rows: number;
  columns: number;
  missingValues: number;
  duplicateRows: number;
  preview: DatasetRow[];
  columnSummary: ColumnSummary[];
  createdAt: string;
};

export type ColumnSummary = {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'date' | 'text' | 'empty';
  missing: number;
  unique: number;
  mean?: number;
  min?: number;
  max?: number;
};

export type AnalysisStatus = 'Completed' | 'Running' | 'Failed' | 'Queued';

export type AnalysisRecord = {
  id: string;
  name: string;
  dataset: string;
  type: string;
  status: AnalysisStatus;
  date: string;
  result?: Record<string, unknown>;
};

export type ApiResult<T> = {
  endpoint: string;
  status: 'ok';
  data: T;
  generatedAt: string;
};

export type UserProfile = {
  name: string;
  email: string;
  course: string;
  purpose: string;
};

