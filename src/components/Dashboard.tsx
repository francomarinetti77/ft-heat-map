import { useMemo, type ReactNode } from 'react';
import {
  matches,
  totalAddressableRecoverableMWh,
  getMatch,
} from '../lib/data';
import { useOpportunities } from '../store/opportunities';
import { fmtMWh, fmtTonnes, titleCase } from '../lib/format';
import { Stat, BAND_COLOR, IndicativeTag } from './ui';
import type { HeatBand, Stage, LostReason } from '../types';

const LIVE_STAGES: Stage[] = ['live'];

export default function Dashboard() {
  const { opportunities } = useOpportunities();

  const stats = useMemo(() => {
    // Addressable potential across all in-range matches (best per sink to avoid
    // double-counting a sink against multiple sources).
    const bestPerSink = new Map<string, number>();
    for (const m of matches) {
      const cur = bestPerSink.get(m.sinkId) ?? 0;
      if (m.deliverableHeatMWhPerYear > cur) {
        bestPerSink.set(m.sinkId, m.deliverableHeatMWhPerYear);
      }
    }
    const potentialDeliverableMWh = [...bestPerSink.values()].reduce((a, b) => a + b, 0);

    // Contracted = opportunities that are live.
    let contractedMWh = 0;
    let contractedCo2 = 0;
    let potentialCo2 = 0;
    for (const v of bestPerSink.values()) potentialCo2 += v * 0.2;

    for (const o of opportunities) {
      if (LIVE_STAGES.includes(o.stage)) {
        const m = getMatch(o.matchId);
        if (m) {
          contractedMWh += m.deliverableHeatMWhPerYear;
          contractedCo2 += m.co2AvoidedTonnesPerYear;
        }
      }
    }

    // Opportunity counts by band and by stage.
    const byBand: Record<HeatBand, number> = { hot: 0, warm: 0, lukewarm: 0, cold: 0 };
    const byStage: Record<string, number> = {};
    const lostReasons: Record<string, number> = {};
    for (const o of opportunities) {
      byStage[o.stage] = (byStage[o.stage] ?? 0) + 1;
      const m = getMatch(o.matchId);
      if (m) byBand[m.heatBand] += 1;
      if (o.stage === 'lost' && o.lostReason) {
        lostReasons[o.lostReason] = (lostReasons[o.lostReason] ?? 0) + 1;
      }
    }

    return {
      potentialDeliverableMWh,
      contractedMWh,
      contractedCo2,
      potentialCo2,
      byBand,
      byStage,
      lostReasons,
    };
  }, [opportunities]);

  const maxLost = Math.max(1, ...Object.values(stats.lostReasons));

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Barcelona — heat recovery dashboard</h1>
          <IndicativeTag />
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Addressable recoverable heat"
            value={fmtMWh(totalAddressableRecoverableMWh)}
            sub="active sources, per year"
            accent
          />
          <Stat
            label="Deliverable to sinks in range"
            value={fmtMWh(stats.potentialDeliverableMWh)}
            sub="best match per sink, after losses"
          />
          <Stat
            label="Heat contracted"
            value={fmtMWh(stats.contractedMWh)}
            sub="opportunities at 'live'"
          />
          <Stat
            label="CO₂ avoided — potential"
            value={`${fmtTonnes(stats.potentialCo2)}/yr`}
            sub={`contracted: ${fmtTonnes(stats.contractedCo2)}/yr`}
          />
        </div>

        {/* Opportunity by band + stage */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Panel title="Opportunities by heat band">
            <div className="space-y-2">
              {(['hot', 'warm', 'lukewarm', 'cold'] as HeatBand[]).map((b) => (
                <Bar
                  key={b}
                  label={titleCase(b)}
                  value={stats.byBand[b]}
                  max={Math.max(1, ...Object.values(stats.byBand))}
                  color={BAND_COLOR[b]}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Opportunities by stage">
            <div className="space-y-2">
              {Object.entries(stats.byStage).length === 0 && (
                <p className="text-sm text-muted">No opportunities yet.</p>
              )}
              {Object.entries(stats.byStage).map(([stage, n]) => (
                <Bar
                  key={stage}
                  label={titleCase(stage)}
                  value={n}
                  max={Math.max(1, ...Object.values(stats.byStage))}
                  color="#3B2314"
                />
              ))}
            </div>
          </Panel>
        </div>

        {/* Lost reasons */}
        <Panel title="Why opportunities are lost">
          {Object.keys(stats.lostReasons).length === 0 ? (
            <p className="text-sm text-muted">
              No lost opportunities recorded yet. When deals die, their reason is
              captured here — community opposition is the one to watch.
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.lostReasons)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, n]) => (
                  <Bar
                    key={reason}
                    label={titleCase(reason as LostReason)}
                    value={n}
                    max={maxLost}
                    color={reason === 'community_opposition' ? '#E0452F' : '#8A8A92'}
                  />
                ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/5 bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-36 shrink-0 truncate text-ink/80">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded bg-black/5">
        <div
          className="h-full rounded"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 text-right font-semibold tabular-nums">{value}</span>
    </div>
  );
}
