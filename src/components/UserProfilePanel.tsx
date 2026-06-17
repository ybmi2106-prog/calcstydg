import { ClipboardList, Save } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';

export function UserProfilePanel() {
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const isReady = Boolean(userProfile.name.trim());

  return (
    <Panel
      title="Report details"
      description="Enter the details that should appear inside downloaded test reports."
      action={<Badge variant={isReady ? 'success' : 'warning'}>{isReady ? 'Saved for reports' : 'Name recommended'}</Badge>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Name
          <Input
            value={userProfile.name}
            onChange={(event) => updateUserProfile({ name: event.target.value })}
            placeholder="Your name"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Email / ID
          <Input
            value={userProfile.email}
            onChange={(event) => updateUserProfile({ email: event.target.value })}
            placeholder="Optional"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Course / class
          <Input
            value={userProfile.course}
            onChange={(event) => updateUserProfile({ course: event.target.value })}
            placeholder="Optional"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Report purpose
          <Input
            value={userProfile.purpose}
            onChange={(event) => updateUserProfile({ purpose: event.target.value })}
            placeholder="Project / assignment"
          />
        </label>
      </div>
      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:bg-teal-950/60 dark:text-teal-100">
        <ClipboardList className="h-4 w-4" />
        These details are stored only in this browser and are added to PDF, HTML, JSON, and CSV test-result exports.
        <Save className="ml-auto h-4 w-4" />
      </p>
    </Panel>
  );
}
