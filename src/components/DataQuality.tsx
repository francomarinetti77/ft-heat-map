import { useMemo, type ReactNode } from 'react';
import { sources, sinks } from '../lib/data';
import { fmtMWh, titleCase } from '../lib/format';
import { ConfidenceDot } from './ui';
import type { DataConfidence } from '../types';

// Treat FT Connect connected sources as "measured-derived"; everything else is
// an estimate. This panel exists so the credibility of the product rests on not
// pretending estimates are facts (§5.5, §10).

export default function DataQuality() {
  const summary = useMemo(() => {
    const srcMeasured = sources.filter((s) => s.ftConnectStatus === 'connected').length;
    const srcEstimated = sources.length - srcMeasured;
    const conf = (level: DataConfidence) =>
      sources.filter((s) => s.dataConfidence === level).length +
      sinks.filter((s) => s.dataConfidence === level).length;
    return {
      srcMeasured,
      srcEstimated,
      high: conf('high'),
      medium: conf('medium'),
      low: conf('low'),
      total: sources.length + sinks.length,
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Data quality</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            The credibility of this product rests on not pretending estimates are facts.
            In this prototype, FT Connect telemetry is mocked, so no source is truly
            "connected" — every recoverable-heat figure and every demand figure below is
            an estimate, flagged honestly. A production system would replace the flagged
            rows with measured data.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card label="Records total" value={summary.total} />
          <Card label="Measured-derived sources" value={summary.srcMeasured} />
          <Card label="High confidence" value={summary.high} tone="#4F9D69" />
          <Card label="Low confidence" value={summary.low} tone="#C96A4B" />
        </div>

        {/* Sources table */}
        <Table title="Heat sources">
          <thead>
            <Tr head>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Recoverable</Th>
              <Th>Volume basis</Th>
              <Th>Confidence</Th>
            </Tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[11px] text-muted">{s.operator}</div>
                </Td>
                <Td>{titleCase(s.ftConnectStatus)}</Td>
                <Td className="tabular-nums">
                  {s.recoverableHeatMWhPerYear > 0
                    ? `${fmtMWh(s.recoverableHeatMWhPerYear)}/yr`
                    : '—'}
                </Td>
                <Td>
                  <Basis measured={s.annualCremationsSource === 'ft_connect'}>
                    {titleCase(s.annualCremationsSource)}
                  </Basis>
                </Td>
                <Td>
                  <ConfidenceDot level={s.dataConfidence} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>

        {/* Sinks table */}
        <Table title="Heat sinks (demand)">
          <thead>
            <Tr head>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Demand</Th>
              <Th>Demand basis</Th>
              <Th>Sensitivity</Th>
              <Th>Confidence</Th>
            </Tr>
          </thead>
          <tbody>
            {sinks.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[11px] text-muted">{s.district}</div>
                </Td>
                <Td>{titleCase(s.type)}</Td>
                <Td className="tabular-nums">{fmtMWh(s.annualHeatDemandMWh)}/yr</Td>
                <Td>
                  <Basis measured={s.demandSource === 'reported'}>
                    {titleCase(s.demandSource)}
                  </Basis>
                </Td>
                <Td className="capitalize">{s.publicSensitivity}</Td>
                <Td>
                  <ConfidenceDot level={s.dataConfidence} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

function Basis({ measured, children }: { measured: boolean; children: ReactNode }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] ${
        measured ? 'bg-[#4F9D69]/15 text-[#2f6b46]' : 'bg-[#C96A4B]/15 text-[#8a3f28]'
      }`}
    >
      {measured ? '' : 'est · '}
      {children}
    </span>
  );
}

function Card({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-black/5 bg-surface p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function Table({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/5 bg-surface">
      <h2 className="border-b border-black/5 px-4 py-2.5 text-sm font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

function Tr({ children, head }: { children: ReactNode; head?: boolean }) {
  return (
    <tr className={head ? '' : 'border-t border-black/5'}>{children}</tr>
  );
}
function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </th>
  );
}
function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 align-top ${className}`}>{children}</td>;
}
