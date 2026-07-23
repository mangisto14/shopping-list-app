// src/devtools/Environment/EnvironmentSection.tsx
import { useMemo } from 'react';
import { Section, InfoRow } from '../shared/controls';
import { getBuildInfo } from './buildInfo';

export default function EnvironmentSection({
  expanded, onToggle, visible,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean;
}) {
  const buildInfo = useMemo(() => getBuildInfo(), []);

  return (
    <Section title="Environment" expanded={expanded} onToggle={onToggle} visible={visible}>
      <InfoRow label="Environment" value={buildInfo.environment} />
      <InfoRow label="Branch" value={buildInfo.gitBranch} />
      <InfoRow label="Build Version" value={buildInfo.buildVersion} />
      <InfoRow label="Build Date" value={new Date(buildInfo.buildDate).toLocaleString()} />
      <InfoRow label="Supabase Project" value={buildInfo.supabaseProject} />
      <InfoRow label="API Mode" value={buildInfo.apiMode} />
    </Section>
  );
}
