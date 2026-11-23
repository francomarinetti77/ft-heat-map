import type { ReactNode } from 'react';
import type { Match } from '../types';
import { getSource, getSink } from '../lib/data';
import { useOpportunities } from '../store/opportunities';
import {
  fmtMWh,
  fmtEur,
  fmtYears,
  fmtTonnes,
  fmtDistance,
  titleCase,
} from '../lib/format';
import {
  BandPill,
  ScoreBar,
  ConfidenceDot,
  IndicativeTag,
  BAND_COLOR,
} from './ui';
import { effectiveSensitivity } from '../lib/scoring';

export default function MatchDetail({
  match,
  onClose,
}: {
  match: Match;
  onClose: () => void;
}) {
  const source = getSource(match.sourceId);
  const sink = getSink(match.sinkId);
  const { addFromMatch, hasOpportunityForMatch } = useOpportunities();

  if (!source || !sink) return null;

  const inPipeline = hasOpportunityForMatch(match.id);
  const sensitivity = effectiveSensitivity(sink.type, sink.publicSensitivity);
  const measured = source.ftConnectStatus === 'connected';

  return (
    <div className="absolute inset-y-0 right-0 z-[1000] flex w-[400px] max-w-full flex-col border-l border-black/10 bg-surface shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-black/10 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BandPill band={match.heatBand} score={match.heatScore} />
          </div>
          <h2 className="mt-1.5 truncate text-base font-semibold">{sink.name}</h2>
          <p className="truncate text-xs text-muted">
            {source.name} → {sink.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 rounded p-1 text-muted hover:bg-black/5 hover:text-ink"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {/* Headline split */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-black/5 bg-white p-3">
            <div className="text-xs uppercase tracking-wide text-muted">Technical fit</div>
            <div className="mt-0.5 text-2xl font-semibold tabular-nums">
              {Math.round(match.technicalFit)}
            </div>
          </div>
          <div className="rounded-lg border border-black/5 bg-white p-3">
            <div className="text-xs uppercase tracking-wide text-muted">
              Social / political fit
            </div>
            <div className="mt-0.5 text-2xl font-semibold tabular-nums">
              {Math.round(match.socialPoliticalFit)}
            </div>
          </div>
        </div>

        {/* Social cap explainer */}
        {sensitivity !== 'low' && (
          <div
            className="rounded-lg border p-3 text-xs leading-snug"
            style={{ borderColor: BAND_COLOR[match.heatBand], background: '#fff' }}
          >
            <strong>Public sensitivity: {sensitivity}.</strong>{' '}
            {sensitivity === 'high'
              ? 'This pairing is capped at 60 — it can never show as "hot" no matter how good the engineering is. Community acceptance is the binding constraint, and that is the single most important lesson of this analysis.'
              : 'A 0.9 multiplier and a cap of 90 are applied, reflecting the public process this pairing would need.'}
          </div>
        )}

        {/* Component breakdown */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Score breakdown
          </h3>
          <ScoreBar label="Proximity" weight="w 0.30" value={match.proximityScore} />
          <ScoreBar label="Demand fit" weight="w 0.20" value={match.demandFitScore} />
          <ScoreBar label="Profile fit" weight="w 0.15" value={match.profileFitScore} />
          <ScoreBar
            label="Infrastructure"
            weight="w 0.15"
            value={match.infrastructureScore}
          />
          <ScoreBar
            label="Governance"
            weight="w 0.20"
            value={match.governanceScore}
            color="#6b7280"
          />
          <div className="mt-1 flex items-center justify-between border-t border-black/5 pt-2 text-xs text-muted">
            <span>Distance (routed)</span>
            <span className="tabular-nums text-ink">
              {fmtDistance(match.routedDistanceM)}{' '}
              <span className="text-muted">
                (straight {fmtDistance(match.straightLineDistanceM)})
              </span>
            </span>
          </div>
        </section>

        {/* Economics */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Indicative economics
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Econ label="Deliverable heat" value={`${fmtMWh(match.deliverableHeatMWhPerYear)}/yr`} />
            <Econ label="Est. capex" value={fmtEur(match.estimatedCapexEur)} />
            <Econ label="Annual savings" value={`${fmtEur(match.annualSavingsEur)}/yr`} />
            <Econ label="Simple payback" value={fmtYears(match.simplePaybackYears)} />
            <Econ
              label="CO₂ avoided"
              value={`${fmtTonnes(match.co2AvoidedTonnesPerYear)}/yr`}
            />
            <Econ
              label="Heat basis"
              value={measured ? 'Measured-derived' : 'Estimated'}
              warn={!measured}
            />
          </div>
          <div className="mt-2">
            <IndicativeTag />
          </div>
        </section>

        {/* Blockers */}
        {match.blockers.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Blockers
            </h3>
            <ul className="space-y-1">
              {match.blockers.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink/90">
                  <span className="text-band-hot">●</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* What would have to be true */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            What would have to be true
          </h3>
          <ul className="space-y-1.5">
            {match.whatWouldHaveToBeTrue.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink/90">
                <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded border border-black/25" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Record meta */}
        <section className="space-y-2 rounded-lg border border-black/5 bg-white p-3 text-xs">
          <MetaRow label="Source">
            {source.name} · {titleCase(source.ownershipType)} ·{' '}
            <ConfidenceDot level={source.dataConfidence} />
          </MetaRow>
          <MetaRow label="FT Connect">
            {titleCase(source.ftConnectStatus)}
            {source.isFTEquipment ? ' · FT equipment' : ' · non-FT equipment'}
          </MetaRow>
          <MetaRow label="Sink">
            {titleCase(sink.type)} · {titleCase(sink.ownershipType)} ·{' '}
            <ConfidenceDot level={sink.dataConfidence} />
          </MetaRow>
          <MetaRow label="Demand">
            {fmtMWh(sink.annualHeatDemandMWh)}/yr · {titleCase(sink.demandProfile)} ·{' '}
            {sink.requiredSupplyTempC}°C
          </MetaRow>
        </section>
      </div>

      {/* Footer action */}
      <div className="border-t border-black/10 p-4">
        <button
          disabled={inPipeline}
          onClick={() => addFromMatch(match.id)}
          className={`w-full rounded py-2 text-sm font-semibold transition ${
            inPipeline
              ? 'cursor-default bg-black/10 text-muted'
              : 'bg-accent text-white hover:brightness-95'
          }`}
        >
          {inPipeline ? 'Already in pipeline' : 'Add to pipeline'}
        </button>
      </div>
    </div>
  );
}

function Econ({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded border border-black/5 bg-white p-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`font-semibold tabular-nums ${warn ? 'text-band-hot' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-1 text-right text-ink/90">{children}</span>
    </div>
  );
}
