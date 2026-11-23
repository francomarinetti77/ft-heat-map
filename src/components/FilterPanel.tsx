import type { ReactNode } from 'react';
import type { Filters } from '../store/filters';
import type { HeatBand, SinkType } from '../types';
import { sinks, activeSources } from '../lib/data';
import { titleCase } from '../lib/format';
import { BAND_COLOR } from './ui';

const SINK_TYPES: SinkType[] = [
  'municipal_pool',
  'sports_centre',
  'hospital',
  'care_home',
  'school',
  'university',
  'hotel',
  'laundry',
  'greenhouse',
  'district_network_node',
  'residential_block',
  'office',
  'industrial',
];
const BANDS: HeatBand[] = ['hot', 'warm', 'lukewarm', 'cold'];
const OWNERSHIP = ['municipal', 'private', 'mixed'];

interface Props {
  filters: Filters;
  toggle: <T>(key: keyof Filters, value: T) => void;
  setOnlyWithPipeline: (v: boolean) => void;
  reset: () => void;
  activeCount: number;
  selectedSourceId: string | null;
  onSelectSource: (id: string | null) => void;
  showRings: boolean;
  setShowRings: (v: boolean) => void;
  showNetworks: boolean;
  setShowNetworks: (v: boolean) => void;
  showConnectors: boolean;
  setShowConnectors: (v: boolean) => void;
}

export default function FilterPanel(props: Props) {
  const districts = [...new Set(sinks.map((s) => s.district))].sort();

  return (
    <div className="flex h-full w-72 flex-col overflow-y-auto border-r border-black/10 bg-surface">
      <div className="space-y-4 p-4">
        {/* Source selector */}
        <Section title="Heat source">
          <select
            value={props.selectedSourceId ?? ''}
            onChange={(e) => props.onSelectSource(e.target.value || null)}
            className="w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All sources (best match per sink)</option>
            {activeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] leading-snug text-muted">
            Select a source to draw connectors and radius rings, and to score sinks
            against that one crematorium.
          </p>
        </Section>

        {/* Map overlays */}
        <Section title="Map overlays">
          <Check
            label="Radius rings (0.5/1/2/5 km)"
            checked={props.showRings}
            onChange={props.setShowRings}
            disabled={!props.selectedSourceId}
          />
          <Check
            label="Connector lines to sinks"
            checked={props.showConnectors}
            onChange={props.setShowConnectors}
            disabled={!props.selectedSourceId}
          />
          <Check
            label="District network footprints"
            checked={props.showNetworks}
            onChange={props.setShowNetworks}
          />
        </Section>

        {/* Band filter */}
        <Section title="Heat band">
          <div className="flex flex-wrap gap-1.5">
            {BANDS.map((b) => {
              const on = props.filters.bands.has(b);
              return (
                <button
                  key={b}
                  onClick={() => props.toggle('bands', b)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    on ? 'text-white' : 'text-ink/70 ring-1 ring-black/10'
                  }`}
                  style={on ? { backgroundColor: BAND_COLOR[b] } : undefined}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Sink type */}
        <Section title="Sink type">
          <div className="flex flex-wrap gap-1.5">
            {SINK_TYPES.map((t) => {
              const on = props.filters.sinkTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => props.toggle('sinkTypes', t)}
                  className={`rounded px-2 py-1 text-[11px] transition ${
                    on ? 'bg-ink text-white' : 'bg-black/5 text-ink/70 hover:bg-black/10'
                  }`}
                >
                  {titleCase(t)}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Ownership */}
        <Section title="Ownership">
          <div className="flex flex-wrap gap-1.5">
            {OWNERSHIP.map((o) => {
              const on = props.filters.ownership.has(o);
              return (
                <button
                  key={o}
                  onClick={() => props.toggle('ownership', o)}
                  className={`rounded px-2 py-1 text-[11px] capitalize transition ${
                    on ? 'bg-ink text-white' : 'bg-black/5 text-ink/70 hover:bg-black/10'
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </Section>

        {/* District */}
        <Section title="District">
          <div className="flex flex-wrap gap-1.5">
            {districts.map((d) => {
              const on = props.filters.districts.has(d);
              return (
                <button
                  key={d}
                  onClick={() => props.toggle('districts', d)}
                  className={`rounded px-2 py-1 text-[11px] transition ${
                    on ? 'bg-ink text-white' : 'bg-black/5 text-ink/70 hover:bg-black/10'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Pipeline">
          <Check
            label="Only sinks already in pipeline"
            checked={props.filters.onlyWithPipeline}
            onChange={props.setOnlyWithPipeline}
          />
        </Section>

        {props.activeCount > 0 && (
          <button
            onClick={props.reset}
            className="w-full rounded border border-black/15 py-1.5 text-sm text-ink/80 hover:bg-black/5"
          >
            Clear {props.activeCount} filter{props.activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2 py-0.5 text-sm ${
        disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer text-ink/80'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-accent"
      />
      {label}
    </label>
  );
}
