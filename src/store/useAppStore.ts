import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AnalysisRecord, DatasetProfile, UserProfile } from '@/types';
import { createDemoDatasetProfile, DEMO_DATASET_NAME } from '@/utils/demoDataset';
import { clearDatasetsFromIndexedDb, getDatasetsFromIndexedDb, saveDatasetToIndexedDb } from '@/utils/indexedDb';

const emptyDataset: DatasetProfile = {
  id: 'empty-dataset',
  name: 'No dataset uploaded',
  type: 'None',
  size: 0,
  rows: 0,
  columns: 0,
  missingValues: 0,
  duplicateRows: 0,
  preview: [],
  columnSummary: [],
  createdAt: new Date().toISOString()
};

const STORAGE_KEY = 'calcsty-data-garage-workspace-v3';

type Theme = 'light' | 'dark';

type AppState = {
  theme: Theme;
  datasets: DatasetProfile[];
  activeDatasetId?: string;
  analyses: AnalysisRecord[];
  chartsCreated: number;
  systemStatus: 'Operational' | 'Degraded' | 'Offline';
  datasetStorageStatus: 'Ready' | 'Loading' | 'Error';
  datasetStorageMessage?: string;
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  toggleTheme: () => void;
  hydrateDatasets: () => Promise<void>;
  loadDemoDataset: () => Promise<void>;
  addDataset: (dataset: DatasetProfile) => void;
  setActiveDataset: (id: string) => void;
  addAnalysis: (analysis: Omit<AnalysisRecord, 'id' | 'date'>) => void;
  incrementCharts: () => void;
  resetWorkspace: () => void;
};

const initialWorkspace = {
  theme: 'light' as Theme,
  datasets: [] as DatasetProfile[],
  activeDatasetId: undefined,
  analyses: [] as AnalysisRecord[],
  chartsCreated: 0,
  systemStatus: 'Operational' as const,
  datasetStorageStatus: 'Ready' as const,
  datasetStorageMessage: undefined,
  userProfile: {
    name: '',
    email: '',
    course: '',
    purpose: 'Statistical analysis report'
  } as UserProfile
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialWorkspace,
      updateUserProfile: (profile) => set((state) => ({ userProfile: { ...state.userProfile, ...profile } })),
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', next === 'dark');
        set({ theme: next });
      },
      hydrateDatasets: async () => {
        set({ datasetStorageStatus: 'Loading', datasetStorageMessage: 'Loading saved dataset from browser database...' });
        try {
          const savedDatasets = await getDatasetsFromIndexedDb();
          const currentActiveId = get().activeDatasetId;
          const activeDatasetId = savedDatasets.some((dataset) => dataset.id === currentActiveId)
            ? currentActiveId
            : savedDatasets[0]?.id;

          if (savedDatasets.length) {
            set({
              datasets: savedDatasets,
              activeDatasetId,
              datasetStorageStatus: 'Ready',
              datasetStorageMessage: 'Dataset loaded from IndexedDB.'
            });
            return;
          }

          await get().loadDemoDataset();
        } catch (error) {
          set({
            datasetStorageStatus: 'Error',
            datasetStorageMessage: error instanceof Error ? error.message : 'Unable to load saved dataset.'
          });
        }
      },
      loadDemoDataset: async () => {
        set({ datasetStorageStatus: 'Loading', datasetStorageMessage: `Loading built-in demo dataset: ${DEMO_DATASET_NAME}...` });
        try {
          const demoDataset = await createDemoDatasetProfile();
          set((state) => {
            const withoutDuplicateName = state.datasets.filter((item) => item.name !== demoDataset.name);
            return {
              datasets: [demoDataset, ...withoutDuplicateName],
              activeDatasetId: demoDataset.id,
              datasetStorageStatus: 'Ready',
              datasetStorageMessage: 'SquadLists football demo dataset loaded and saved in IndexedDB.'
            };
          });
          await saveDatasetToIndexedDb(demoDataset);
        } catch (error) {
          set({
            datasetStorageStatus: 'Error',
            datasetStorageMessage: error instanceof Error ? error.message : 'Unable to load the demo dataset.'
          });
          throw error;
        }
      },
      addDataset: (dataset) => {
        set((state) => {
          const withoutDuplicateName = state.datasets.filter((item) => item.name !== dataset.name);
          return {
            datasets: [dataset, ...withoutDuplicateName],
            activeDatasetId: dataset.id,
            datasetStorageStatus: 'Ready',
            datasetStorageMessage: 'Saving dataset in IndexedDB...'
          };
        });

        saveDatasetToIndexedDb(dataset)
          .then(() => {
            set({ datasetStorageStatus: 'Ready', datasetStorageMessage: 'Dataset saved until you clear the workspace.' });
          })
          .catch((error) => {
            set({
              datasetStorageStatus: 'Error',
              datasetStorageMessage: error instanceof Error
                ? `Dataset is active for this session, but could not be saved permanently: ${error.message}`
                : 'Dataset is active for this session, but could not be saved permanently.'
            });
          });
      },
      setActiveDataset: (id) => set({ activeDatasetId: id }),
      addAnalysis: (analysis) =>
        set((state) => ({
          analyses: [
            {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              ...analysis
            },
            ...state.analyses
          ]
        })),
      incrementCharts: () => set((state) => ({ chartsCreated: state.chartsCreated + 1 })),
      resetWorkspace: () => {
        localStorage.removeItem(STORAGE_KEY);
        void clearDatasetsFromIndexedDb();
        set({ ...initialWorkspace, datasetStorageMessage: 'Workspace cleared.' });
      }
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        activeDatasetId: state.activeDatasetId,
        analyses: state.analyses,
        chartsCreated: state.chartsCreated,
        systemStatus: state.systemStatus,
        userProfile: state.userProfile
      }),
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<AppState> | undefined;
        return {
          ...currentState,
          ...saved,
          datasets: [],
          activeDatasetId: saved?.activeDatasetId,
          analyses: saved?.analyses ?? [],
          chartsCreated: saved?.chartsCreated ?? 0,
          systemStatus: saved?.systemStatus ?? 'Operational',
          userProfile: saved?.userProfile ?? initialWorkspace.userProfile,
          datasetStorageStatus: 'Ready',
          datasetStorageMessage: 'Dataset data is stored separately in IndexedDB.'
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      }
    }
  )
);

export function useActiveDataset() {
  return useAppStore((state) => state.datasets.find((dataset) => dataset.id === state.activeDatasetId) ?? state.datasets[0] ?? emptyDataset);
}
