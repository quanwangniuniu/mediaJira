import type { ArtifactLink } from '@/types/meeting';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArtifactsSectionProps {
  artifactsCount: number;
  orderedArtifacts: ArtifactLink[];
  addingArtifact: boolean;
  linker: React.ReactNode;
  rows: React.ReactNode;
  onFocusAdd?: () => void;
}

export function ArtifactsSection({
  artifactsCount,
  orderedArtifacts,
  addingArtifact,
  linker,
  rows,
  onFocusAdd,
}: ArtifactsSectionProps) {
  return (
    <section className="py-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">
          Artifacts ({artifactsCount})
        </h3>
        <Button type="button" size="sm" variant="ghost" disabled={addingArtifact} onClick={onFocusAdd} className="text-slate-600">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {linker}

      <div className="mt-4 grid gap-2">
        {orderedArtifacts.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            No artifacts linked yet. Add one above.
          </div>
        ) : (
          rows
        )}
      </div>
    </section>
  );
}
