import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import Dashboard from '@/pages/Dashboard';
import VisualizationCenter from '@/pages/VisualizationCenter';
import AnalysisHistory from '@/pages/AnalysisHistory';
import NotFound from '@/pages/NotFound';
import { AnalysisWorkbench } from '@/components/analysis/AnalysisWorkbench';
import { moduleConfigs } from '@/pages/moduleConfigs';
import { useAppStore } from '@/store/useAppStore';

function Module({ name }: { name: keyof typeof moduleConfigs }) {
  return <AnalysisWorkbench config={moduleConfigs[name]} />;
}

export default function App() {
  const hydrateDatasets = useAppStore((state) => state.hydrateDatasets);

  useEffect(() => {
    void hydrateDatasets();
  }, [hydrateDatasets]);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Navigate to="/" replace />} />
        <Route path="dataset" element={<Navigate to="/" replace />} />
        <Route path="visualizations" element={<VisualizationCenter />} />
        <Route path="history" element={<AnalysisHistory />} />

        <Route path="statistics/descriptive" element={<Module name="descriptive" />} />
        <Route path="statistics/normality" element={<Module name="normality" />} />
        <Route path="statistics/core-tests" element={<Module name="coretests" />} />
        <Route path="statistics/hypothesis" element={<Module name="hypothesis" />} />
        <Route path="statistics/non-parametric" element={<Module name="nonparametric" />} />
        <Route path="statistics/anova" element={<Module name="anova" />} />
        <Route path="statistics/correlation" element={<Module name="correlation" />} />
        <Route path="statistics/regression" element={<Module name="regression" />} />

        <Route path="statistics" element={<Navigate to="/statistics/descriptive" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
