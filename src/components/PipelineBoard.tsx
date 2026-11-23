import { useMemo, useState } from 'react';
import type { Stage, LostReason, Opportunity } from '../types';
import { useOpportunities, STAGE_PROBABILITY } from '../store/opportunities';
import { getMatch, getSource, getSink } from '../lib/data';
import { fmtEur, titleCase, daysSince } from '../lib/format';
import { BandPill } from './ui';

const STAGES: Stage[] = [
  'identified',
  'contacted',
  'feasibility',
  'term_sheet',
  'permitting',
  'construction',
  'live',
];
const EXTRA: Stage[] = ['parked', 'lost'];

const LOST_REASONS: LostReason[] = [
  'community_opposition',
  'cost',
  'no_municipal_appetite',
  'technical_infeasible',
  'competitor',
  'timing',
  'other',
];

export default function PipelineBoard() {
  const { opportunities, moveStage, resetToSeed } = useOpportunities();
  const [dragId, setDragId] = useState<string | null>(null);
  const [lostPrompt, setLostPrompt] = useState<{ id: string } | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<Stage, Opportunity[]>();
    for (const s of [...STAGES, ...EXTRA]) map.set(s, []);
    for (const o of opportunities) map.get(o.stage)?.push(o);
    return map;
  }, [opportunities]);

  function handleDrop(stage: Stage) {
    if (!dragId) return;
    if (stage === 'lost') {
      setLostPrompt({ id: dragId });
    } else {
      moveStage(dragId, stage);
    }
    setDragId(null);
  }

  const columns = [...STAGES, ...EXTRA];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-black/10 bg-surface px-5 py-2.5">
        <div className="text-sm text-muted">
          {opportunities.length} opportunities · drag cards between stages
        </div>
        <button
          onClick={resetToSeed}
          className="rounded border border-black/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-black/5"
        >
          Reset to demo data
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max gap-3 p-4">
          {columns.map((stage) => {
            const items = byStage.get(stage) ?? [];
            const value = items.reduce((s, o) => s + o.estimatedContractValueEur, 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage)}
                className="flex w-64 shrink-0 flex-col rounded-lg bg-surface/70"
              >
                <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
                  <span className="text-sm font-semibold capitalize">
                    {titleCase(stage)}
                  </span>
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <div className="px-3 py-1 text-[11px] text-muted">
                  {value > 0 ? `${fmtEur(value)} · ` : ''}p̄ {STAGE_PROBABILITY[stage]}%
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                  {items.map((o) => (
                    <OppCard
                      key={o.id}
                      opp={o}
                      onDragStart={() => setDragId(o.id)}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="rounded border border-dashed border-black/10 py-4 text-center text-[11px] text-muted">
                      drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {lostPrompt && (
        <LostReasonModal
          onCancel={() => setLostPrompt(null)}
          onConfirm={(reason) => {
            moveStage(lostPrompt.id, 'lost', reason);
            setLostPrompt(null);
          }}
        />
      )}
    </div>
  );
}

function OppCard({ opp, onDragStart }: { opp: Opportunity; onDragStart: () => void }) {
  const match = getMatch(opp.matchId);
  const source = match ? getSource(match.sourceId) : undefined;
  const sink = match ? getSink(match.sinkId) : undefined;
  const idle = daysSince(opp.lastActivityDate);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-lg border border-black/10 bg-white p-2.5 text-xs shadow-sm active:cursor-grabbing"
    >
      <div className="mb-1 flex items-center justify-between">
        {match && <BandPill band={match.heatBand} score={match.heatScore} />}
        <span className="text-muted">{opp.probabilityPct}%</span>
      </div>
      <div className="font-semibold leading-snug">{sink?.name ?? 'Unknown sink'}</div>
      <div className="truncate text-muted">{source?.name ?? 'Unknown source'}</div>

      <div className="mt-1.5 flex items-center justify-between">
        <span className="font-medium tabular-nums">
          {fmtEur(opp.estimatedContractValueEur)}
        </span>
        <span className="text-muted">{opp.owner}</span>
      </div>

      <div className="mt-1.5 border-t border-black/5 pt-1.5">
        <div className="text-muted">Next: {opp.nextAction}</div>
        <div className={`mt-0.5 ${idle > 14 ? 'text-band-hot' : 'text-muted'}`}>
          {idle === 0 ? 'active today' : `${idle}d since last activity`}
        </div>
      </div>

      {opp.stage === 'lost' && opp.lostReason && (
        <div className="mt-1.5 rounded bg-band-hot/10 px-1.5 py-0.5 text-[10px] font-medium text-band-hot">
          Lost: {titleCase(opp.lostReason)}
        </div>
      )}
    </div>
  );
}

function LostReasonModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (reason: LostReason) => void;
}) {
  const [reason, setReason] = useState<LostReason>('community_opposition');
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-5 shadow-xl">
        <h3 className="text-base font-semibold">Why was this lost?</h3>
        <p className="mt-1 text-xs text-muted">
          Recording why opportunities die — especially community opposition — is one of
          the most valuable things this product produces over time.
        </p>
        <div className="mt-3 space-y-1.5">
          {LOST_REASONS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="lost"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-accent"
              />
              {titleCase(r)}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border border-black/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="rounded bg-ink px-3 py-1.5 text-sm font-semibold text-white"
          >
            Mark as lost
          </button>
        </div>
      </div>
    </div>
  );
}
