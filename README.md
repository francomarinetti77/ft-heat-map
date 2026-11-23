# FT Heat Map — Barcelona

A web application that joins **heat supply** (crematoria) to **heat demand** (buildings and
networks that need heat) across Barcelona, scores every plausible source↔sink pairing with a
**Heat Score**, and manages the resulting opportunities through a deal pipeline.

Facultatieve Technologies (FT) already has the supply data — connected cremators stream chamber
temperature, gas consumption and a cremation counter to the **FT Connect** cloud. What FT has
never had is the *demand* data. This product is the join.

The pun in "Heat Score" is deliberate: it blends **thermal viability** with **sales-lead
warmth**. A *hot* pair is both physically recoverable and politically plausible. The social /
political axis is a first-class part of the score, not a footnote — because community acceptance,
not engineering, is what usually kills these projects.

---

## Running it

No API keys, no accounts, no paid services. Node 18+.

```bash
npm install
npm run dev      # start the dev server (Vite)
npm test         # run the scoring unit tests (Vitest)
npm run build    # typecheck + production build
```

Open the URL Vite prints (default http://localhost:5173).

> **Map tiles and fonts** load from OpenStreetMap and Google Fonts over the network at runtime
> — no token is required. The Leaflet CSS is bundled from the npm package *and* linked from a CDN
> as a fallback.

---

## What's in the box

| Screen | What it does |
|---|---|
| **Map** | Barcelona basemap. Crematoria as flame markers; sinks as circles coloured by heat band and sized by annual demand. Select a source to draw connector lines and radius rings (0.5/1/2/5 km). Toggle district-network footprints. Filter by sink type, band, district, ownership, pipeline. |
| **Match detail** | Slide-over with the full score breakdown (one bar per component), indicative economics, blockers, and a *"What would have to be true"* checklist. *Add to pipeline* button. |
| **Opportunities** | Kanban by stage, drag between columns. A card moved to *Lost* must record a reason. |
| **Dashboard** | Addressable recoverable heat, heat contracted, CO₂ avoided (actual and potential), opportunities by band and stage, and a bar chart of **why deals are lost**. |
| **Data quality** | Which records are measured vs estimated, so the product never pretends an estimate is a fact. |

---

## The Heat Score

Implemented as a pure, deterministic, unit-tested module in
[`src/lib/scoring.ts`](src/lib/scoring.ts) (tests in
[`src/lib/scoring.test.ts`](src/lib/scoring.test.ts)). Every physical and economic constant and
every weight lives in [`src/config/assumptions.ts`](src/config/assumptions.ts) so they can be
argued about and changed in front of an audience.

```
technicalFit       = 0.40·proximity + 0.27·demandFit + 0.20·profileFit + 0.13·infrastructure
socialPoliticalFit = governance × sensitivityMultiplier
heatScore          = min( cap(sensitivity), 0.60·technicalFit + 0.40·socialPoliticalFit )
```

Both `technicalFit` and `socialPoliticalFit` are shown separately in the UI, never just the
blended number — a pair that is 95 technical / 30 social is a completely different conversation
from one that is 60/60.

### The social cap, and why it matters

A `high`-sensitivity sink (schools, nurseries, children's/maternity hospitals, care homes, food
production) is multiplied by 0.7 and **capped at 60**. Such a pair can therefore *never* show as
`hot`, no matter how good the engineering is. This is intentional. The Redditch (UK) precedent —
a crematorium heating a leisure centre — worked, but only after significant public debate. The
cap encodes that lesson directly into the ranking, and the Match-detail panel explains it in
plain language.

### Bands

| Band | Range | Label |
|---|---|---|
| hot | 75–100 | Approach now |
| warm | 55–74 | Qualify |
| lukewarm | 35–54 | Watch |
| cold | 0–34 | Park |

---

## Data lineage — where the real data would come from

The hackathon brief is about *data products*, so the lineage matters as much as the UI. In this
prototype everything is seeded by hand or mocked; the table below is what a production deployment
would wire up.

| Layer | Real source | Status in this prototype |
|---|---|---|
| Cremation volumes, operating hours, flue temps | **FT Connect** telemetry (FT's proprietary advantage) | **Mocked.** No source is actually connected; all volumes are estimates, flagged as such. |
| Crematoria locations | Cementiris de Barcelona (`cementiris.ajuntament.barcelona.cat`) | Manually seeded and verified (see below). |
| Municipal facilities (pools, schools) | Open Data BCN (`opendata-ajuntament.barcelona.cat`) | Manually seeded; endpoint documented here. |
| Building footprints / floor area | Cadastro / ICGC | Would drive demand estimation; here demand is hand-estimated. |
| District-heating footprints | Districlima, Ecoenergies | Approximated polygons (hand-drawn, not official GIS). |
| Geocoding & routing | OpenStreetMap / Nominatim / OSRM | Routed distance is approximated from straight-line distance by a 1.35 urban detour factor; a real deployment would call OSRM. |

### Heat-source verification (as of Nov 2026)

The crematorium list was treated as **provisional** and cross-checked against the City's own
sources:

- **Crematori de Montjuïc** — *confirmed active*. Barcelona's funeral-services page lists
  Montjuïc as the municipal cremation centre. Location confirmed; cremator count and annual
  volume are estimates (`dataConfidence: medium`).
- **Crematori de Collserola** — *closed in 2019*. Its three furnaces (opened 1989) were shut down
  for being obsolete and failing environmental rules in the Collserola natural park. Included as
  a **decommissioned** record that carries zero recoverable heat and is excluded from addressable
  totals — and it flags that re-permitting there is politically loaded.
- **Mémora (Les Corts)** and **Áltima (Sant Boi)** — real private metropolitan operators, seeded
  with honest `low` confidence; whether these specific sites run cremators on-premises, their
  counts and volumes are unverified estimates.

All heat-sink demand figures are estimates (`estimated_from_floor_area`) with `dataConfidence`
set honestly. **No estimate is ever presented as a measurement** — the Data-quality screen exists
precisely to keep that promise.

---

## Project structure

```
src/
  components/      MapView, FilterPanel, MatchDetail, PipelineBoard, Dashboard, DataQuality, ui
  lib/
    scoring.ts     the Heat Score — pure functions
    scoring.test.ts  Vitest unit tests for the scoring module
    economics.ts   capex / payback / CO₂ (indicative)
    geo.ts         haversine + routed-distance approximation
    matching.ts    builds Match records from sources × sinks
    data.ts        loads seed JSON, builds the match set
    storage.ts     localStorage persistence (try/catch — throws in private mode)
    seedOpportunities.ts
    format.ts
  config/
    assumptions.ts every tunable constant, each with a source comment
  data/
    sources.json   heat sources (crematoria)
    sinks.json     heat sinks (offtakers)
    networks.json  district-network footprints
  store/
    opportunities.tsx  pipeline state (React context + localStorage)
    filters.ts         map/list filter state
  types/           the domain model
```

---

## Technical notes

- **Vite + React + TypeScript + Tailwind.** No server, no database.
- **Leaflet + OpenStreetMap** tiles (no token).
- Pipeline state persists to `localStorage`, wrapped in `try/catch` so it survives private
  browsing (it falls back to in-memory seed data).
- Barcelona is the pilot. The data model and scoring are city-agnostic, but no multi-city UI is
  built yet.

### A note on indicative economics

Capex, payback, savings and CO₂ are labelled **"Indicative — for prioritisation, not for
investment decisions"** everywhere they appear. They exist to rank opportunities, not to sign
cheques.
