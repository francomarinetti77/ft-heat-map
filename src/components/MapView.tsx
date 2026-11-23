import { useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Marker,
  Polyline,
  Polygon,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';
import { sources, sinks, matches, networks } from '../lib/data';
import {
  useFilters,
  sinkPassesStaticFilters,
  useBestMatchPerSink,
} from '../store/filters';
import { useOpportunities } from '../store/opportunities';
import FilterPanel from './FilterPanel';
import MatchDetail from './MatchDetail';
import { BAND_COLOR } from './ui';
import { fmtMWh, titleCase } from '../lib/format';
import type { Match, HeatBand } from '../types';

// Barcelona centre.
const CENTER: [number, number] = [41.385, 2.17];
const RING_RADII = [500, 1000, 2000, 5000];

// A flame divIcon for sources (no external image asset needed).
function flameIcon(active: boolean): L.DivIcon {
  const color = active ? '#E0452F' : '#8FA3B0';
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%);">
      <svg width="26" height="30" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0c6 6 8 9 8 15a8 8 0 0 1-16 0c0-3 1-5 3-7 0 3 2 4 3 4-1-4 2-6 2-12z" fill="${color}" stroke="#3B2314" stroke-width="1"/>
      </svg></div>`,
    iconSize: [26, 30],
    iconAnchor: [13, 30],
  });
}

// Marker radius from annual demand (sqrt scale so area ~ demand).
function demandRadius(demandMWh: number): number {
  return Math.max(5, Math.min(22, Math.sqrt(demandMWh) / 4));
}

export default function MapView() {
  const { filters, toggle, setOnlyWithPipeline, reset, activeCount } = useFilters();
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showRings, setShowRings] = useState(true);
  const [showNetworks, setShowNetworks] = useState(false);
  const [showConnectors, setShowConnectors] = useState(true);

  const { opportunities } = useOpportunities();
  const pipelineSinkIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of opportunities) {
      const m = matches.find((x) => x.id === o.matchId);
      if (m) ids.add(m.sinkId);
    }
    return ids;
  }, [opportunities]);

  const bestMatchPerSink = useBestMatchPerSink(matches, selectedSourceId);

  const selectedSource = selectedSourceId
    ? sources.find((s) => s.id === selectedSourceId) ?? null
    : null;

  // Visible sinks after all filters.
  const visibleSinks = useMemo(() => {
    return sinks.filter((sink) => {
      if (!sinkPassesStaticFilters(sink, filters)) return false;
      if (filters.onlyWithPipeline && !pipelineSinkIds.has(sink.id)) return false;
      const best = bestMatchPerSink.get(sink.id);
      if (filters.bands.size) {
        const band = best ? best.heatBand : 'cold';
        if (!filters.bands.has(band)) return false;
      }
      // When a source is selected, only show sinks it actually matches (in range).
      if (selectedSourceId && !best) return false;
      return true;
    });
  }, [filters, pipelineSinkIds, bestMatchPerSink, selectedSourceId]);

  const connectorLines = useMemo(() => {
    if (!showConnectors || !selectedSource) return [];
    return visibleSinks
      .map((sink) => {
        const best = bestMatchPerSink.get(sink.id);
        if (!best) return null;
        return {
          id: best.id,
          positions: [
            [selectedSource.lat, selectedSource.lng],
            [sink.lat, sink.lng],
          ] as [number, number][],
          color: BAND_COLOR[best.heatBand],
          score: best.heatScore,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [showConnectors, selectedSource, visibleSinks, bestMatchPerSink]);

  function openSink(sinkId: string) {
    const best = bestMatchPerSink.get(sinkId);
    if (best) setSelectedMatch(best);
  }

  return (
    <div className="relative flex h-full">
      <FilterPanel
        filters={filters}
        toggle={toggle}
        setOnlyWithPipeline={setOnlyWithPipeline}
        reset={reset}
        activeCount={activeCount}
        selectedSourceId={selectedSourceId}
        onSelectSource={(id) => {
          setSelectedSourceId(id);
          setSelectedMatch(null);
        }}
        showRings={showRings}
        setShowRings={setShowRings}
        showNetworks={showNetworks}
        setShowNetworks={setShowNetworks}
        showConnectors={showConnectors}
        setShowConnectors={setShowConnectors}
      />

      <div className="relative min-w-0 flex-1">
        <MapContainer center={CENTER} zoom={12} className="h-full w-full" preferCanvas>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Network footprints */}
          {showNetworks &&
            networks.map((net) => (
              <Polygon
                key={net.id}
                positions={net.footprint}
                pathOptions={{
                  color: net.color,
                  weight: 1.5,
                  fillColor: net.color,
                  fillOpacity: 0.12,
                }}
              >
                <Tooltip sticky>{net.name}</Tooltip>
              </Polygon>
            ))}

          {/* Radius rings around selected source */}
          {showRings &&
            selectedSource &&
            RING_RADII.map((r) => (
              <Circle
                key={r}
                center={[selectedSource.lat, selectedSource.lng]}
                radius={r}
                pathOptions={{
                  color: '#3B2314',
                  weight: 1,
                  opacity: 0.35,
                  fill: false,
                  dashArray: '4 4',
                }}
              />
            ))}

          {/* Connector lines */}
          {connectorLines.map((line) => (
            <Polyline
              key={line.id}
              positions={line.positions}
              pathOptions={{
                color: line.color,
                weight: 1 + (line.score / 100) * 3,
                opacity: 0.7,
              }}
            />
          ))}

          {/* Sink markers */}
          {visibleSinks.map((sink) => {
            const best = bestMatchPerSink.get(sink.id);
            const band = best ? best.heatBand : 'cold';
            const inPipeline = pipelineSinkIds.has(sink.id);
            return (
              <CircleMarker
                key={sink.id}
                center={[sink.lat, sink.lng]}
                radius={demandRadius(sink.annualHeatDemandMWh)}
                pathOptions={{
                  color: inPipeline ? '#3B2314' : BAND_COLOR[band],
                  weight: inPipeline ? 2.5 : 1,
                  fillColor: BAND_COLOR[band],
                  fillOpacity: 0.65,
                }}
                eventHandlers={{ click: () => openSink(sink.id) }}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="text-xs">
                    <div className="font-semibold">{sink.name}</div>
                    <div className="text-muted">
                      {titleCase(sink.type)} · {fmtMWh(sink.annualHeatDemandMWh)}/yr
                    </div>
                    {best && (
                      <div className="mt-0.5">
                        Heat score <strong>{Math.round(best.heatScore)}</strong> ({band})
                      </div>
                    )}
                    {!best && selectedSource && (
                      <div className="text-muted">Out of range of selected source</div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* Source markers (flames) — drawn last so they sit on top */}
          {sources.map((src) => {
            const active = src.recoverableHeatMWhPerYear > 0;
            return (
              <Marker
                key={src.id}
                position={[src.lat, src.lng]}
                icon={flameIcon(active)}
                eventHandlers={{
                  click: () => {
                    setSelectedSourceId(src.id);
                    setSelectedMatch(null);
                  },
                }}
                zIndexOffset={1000}
              >
                <Tooltip direction="top" offset={[0, -28]}>
                  <div className="text-xs">
                    <div className="font-semibold">{src.name}</div>
                    <div className="text-muted">
                      {active
                        ? `${fmtMWh(src.recoverableHeatMWhPerYear)}/yr recoverable`
                        : 'Decommissioned — no recoverable heat'}
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <MapLegend
          selectedSourceName={selectedSource?.name ?? null}
          visibleCount={visibleSinks.length}
        />

        {/* Match detail slide-over */}
        {selectedMatch && (
          <MatchDetail match={selectedMatch} onClose={() => setSelectedMatch(null)} />
        )}
      </div>
    </div>
  );
}

function MapLegend({
  selectedSourceName,
  visibleCount,
}: {
  selectedSourceName: string | null;
  visibleCount: number;
}) {
  const bands: { band: HeatBand; label: string }[] = [
    { band: 'hot', label: 'Hot · approach now' },
    { band: 'warm', label: 'Warm · qualify' },
    { band: 'lukewarm', label: 'Lukewarm · watch' },
    { band: 'cold', label: 'Cold · park' },
  ];
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-lg border border-black/10 bg-surface/95 p-3 text-xs shadow">
      <div className="mb-1.5 font-semibold">
        {selectedSourceName ? (
          <>Scored against: {selectedSourceName}</>
        ) : (
          <>Best match per sink (all sources)</>
        )}
      </div>
      <div className="mb-2 text-muted">{visibleCount} sinks shown</div>
      <div className="space-y-1">
        {bands.map((b) => (
          <div key={b.band} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: BAND_COLOR[b.band] }}
            />
            <span>{b.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-transparent" />
          <span>In pipeline</span>
        </div>
        <div className="pt-1 text-muted">Marker size ∝ annual demand</div>
      </div>
    </div>
  );
}
