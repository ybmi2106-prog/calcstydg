import { Download } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAppStore } from '@/store/useAppStore';
import { exportCompletedAnalysis, makeSafeFilename } from '@/utils/exporters';

export default function AnalysisHistory() {
  const analyses = useAppStore((state) => state.analyses);

  async function downloadHistoryResult(analysis: (typeof analyses)[number]) {
    const safeName = makeSafeFilename(`${analysis.name}-${analysis.dataset}`);
    const payload = (analysis.result ?? analysis) as Record<string, unknown>;
    await exportCompletedAnalysis({ baseName: safeName, title: analysis.name, data: payload, chartSubtitle: `${analysis.type} · ${analysis.dataset}` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analysis History</h2>
          <p className="mt-2 text-muted-foreground">Completed analyses are stored with dataset, date, analysis type, status, and individual result exports.</p>
        </div>
      </div>

      <Panel title="Stored analyses" description="Audit-ready job history">
        <div className="overflow-auto">
          <Table>
            <THead><TR><TH>Date</TH><TH>Dataset</TH><TH>Analysis Type</TH><TH>Status</TH><TH>Test Result</TH></TR></THead>
            <TBody>
              {analyses.map((analysis) => (
                <TR key={analysis.id}>
                  <TD>{new Date(analysis.date).toLocaleString()}</TD>
                  <TD className="font-medium">{analysis.dataset}</TD>
                  <TD>{analysis.type}</TD>
                  <TD><Badge variant={analysis.status === 'Completed' ? 'success' : analysis.status === 'Running' ? 'warning' : 'danger'}>{analysis.status}</Badge></TD>
                  <TD>
                    <Button variant="outline" size="sm" onClick={() => void downloadHistoryResult(analysis)}><Download className="h-4 w-4" /> Download result</Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
