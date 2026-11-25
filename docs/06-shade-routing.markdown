# 6. Shade routing and tree data

How GreenPath finds shaded walking routes, where the tree and shade data come
from, and why it is built this way. Status: **approved and built**
(November 2026) for the Givatayim pilot.

## What the feature needs

- `POST /api/routes`: two to four walking routes, shadiest first, either **to a
  destination** or as a **free walk** of a chosen length (steps, distance or
  time) that starts and ends where you are.
- `GET /api/trees?bbox=`: the street trees in the map view.
- It all runs on Cloudflare Workers: no file system, no native packages, about
  10ms of CPU per request on the free plan (the paid plan allows far more).
  Anything heavy has to be precomputed or done somewhere else.
- The pilot is one city. **Givatayim** (about 3.2 km², a few hundred streets) is
  the proposed one.

## The data sources today (checked November 2026)

### יער עירוני דיגיטלי (Digital Urban Forest, יע"ד)

- Run by הסדנא לידע ציבורי together with דרך צל. The viewer is at
  https://app.digital-forest.org.il/. The open data is in the CKAN catalogue
  **Open Tree Base**: https://opentreebase.datacity.org.il/.
- The dataset to use is `trees_processed` ("עצים - מעובד"), one national file:
  - CSV:
    `https://s3.eu-west-2.wasabisys.com/opentreebase-public/processed/trees/trees.csv`
    (**1.6 GB**, last modified 1 April 2025)
  - GeoJSON: `.../processed/trees/trees.geojson`
- **Licence: ODbL** (Open Database Licence). We must credit the source, and a
  database we derive from it (our tree table and shade scores) has to be offered
  under ODbL as well. OpenStreetMap is ODbL too, so this fits.
- There is **no API with filters**: no bbox query, no per-city files, no tiles
  (the CKAN datastore is off). We download the file once and keep only the pilot
  city.
- Useful columns (from the CSV header): `location-x`/`location-y` (WGS84
  longitude and latitude), `meta-tree-id` (an Open Location Code, under 1 m),
  `attributes-species-clean-he`/`-en`, `attributes-genus`, `attributes-height`,
  `attributes-canopy-diameter`, `attributes-canopy-area`,
  `attributes-bark-diameter`, `muni_code`, `muni_name`, `road_name`,
  `meta-source`, `meta-date`.
- The rows come from two kinds of source: municipal tree surveys (with species,
  height and canopy size), and trees detected from the national canopy map (MAPI
  canopies, filtered to 4 to 200 m², turned into a point). Cities without a
  survey still have the canopy-detected trees, without species. Whether
  Givatayim has a municipal survey in the file can only be told by reading the
  file; that is the first step of the build.
- There is also `canopies_processed`, the canopy polygons as GeoJSON (ODbL).

### CHMv2 (Meta and WRI canopy height maps, version 2)

- A global canopy-height raster at about 1.2 m, from satellite imagery.
- **Licence: CC BY 4.0** (on the AWS Open Data Registry,
  https://registry.opendata.aws/dataforgood-fb-forestsv2/). Credit Meta and WRI.
- Delivered as Cloud-Optimised GeoTIFFs on AWS S3 (no key needed). A repackaging
  with an index is on Source Coop (https://source.coop/tge-labs/meta-chm-v2).
  Givatayim fits in one or two tiles; we read only the window we need.
- What it adds: it sees trees the street-tree data misses (private gardens,
  courtyards that shade the pavement, parks) and gives a height, which tells a
  shady tree from a bush.
- Reading GeoTIFF needs a decoder, so this is done in the offline script, not on
  Workers.

### ShadeMap

- https://shademap.app/about/. A **browser-side JavaScript library**
  (`mapbox-gl-shadow-simulator` for MapLibre/Mapbox, `leaflet-shadow-simulator`)
  that simulates the shadows of **buildings and terrain** for a time of day. It
  does not model trees.
- Pricing is per "external map load": Learn (personal projects), Ship (1,000
  loads a month) and Scale (unlimited). It is **free on localhost**; a key for a
  real domain comes by email after a form. The prices were not on the page as
  text, and the commercial terms are not published: ask them.
- It is not a server API, so it cannot score streets on Workers. It is a good
  fit later as a **map layer** (the map-shell session's map) that shows building
  shadows at the current hour.

### OpenStreetMap

- The walkable street network:
  `highway=footway|path|pedestrian|living_street|residential|...`, sidewalks,
  crossings. Fetched for the pilot area with the public Overpass API (no key).
  ODbL: show "© OpenStreetMap contributors".
- Buildings are in OSM too (with `building:levels` for height), which lets us
  add building shade later without ShadeMap.

## The routing engine options

| Option                                                            | Shade cost?                                                         | Runs where                                            | Cost and effort                                                | Verdict                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- |
| **OSRM** self-hosted                                              | Only by baking it into a Lua profile and rebuilding                 | A server or container, not Workers                    | A VM ($5-20/month), rebuild on every data change               | No: rigid, and alternatives are poor on foot |
| **Valhalla** self-hosted                                          | Needs C++ changes for a new costing                                 | A server                                              | A VM, more work                                                | No                                           |
| **GraphHopper** self-hosted                                       | Yes: a custom model can weigh a custom edge value (as in Nantes)    | A Java server with ~1-2 GB RAM                        | A VM, Java, a custom import step                               | Later, if we outgrow one city                |
| **GraphHopper Directions API** (hosted)                           | Partly: a `custom_model` can lower priority inside polygons we send | Their cloud                                           | Free tier is non-commercial, ~500 requests/day; paid from ~€69 | No: polygons of shade per request are clumsy |
| **Stadia / other hosted Valhalla**                                | No shade costing                                                    | Their cloud                                           | Pay per request                                                | No                                           |
| **Our own small router on a precomputed graph** (pilot city only) | Yes: shade is just part of the edge weight                          | **On Workers**, the graph bundled with the code or KV | No servers, no keys, no runtime library                        | **Recommended**                              |

## The architecture

```
 offline, run by hand: npm run pilot:build  (scripts/pilot/build.ts, Node)
 ┌──────────────────────────────────────────────────────────────────────┐
 │ Overpass (OSM ways) ───┐                                             │
 │ יע"ד trees.csv ────────┼─► every street piece ─► shade score 0 to 1  │
 │ CHMv2 (HTTP ranges) ───┘   between OSM nodes                         │
 │                                                                      │
 │ outputs: server/data/givatayim-graph.json   nodes, edges, shade      │
 │          server/data/givatayim-trees.json   trees for /api/trees     │
 │          supabase/seed-trees.sql            the same, for the table  │
 └──────────────────────────────────────────────────────────────────────┘
                     │ committed, credited (ODbL, CC BY)
                     ▼
 Workers: POST /api/routes ─► A* on the in-memory graph (server/lib/routing/)
          GET /api/trees   ─► a grid index over the bundled trees
```

Downloads are cached in `scripts/pilot/.cache/` (git-ignored). The national tree
CSV has to be there first:

```bash
curl -o scripts/pilot/.cache/trees.csv https://s3.eu-west-2.wasabisys.com/opentreebase-public/processed/trees/trees.csv
```

```bash
npm run pilot:build
```

A first run takes about a minute and a quarter; later runs are offline.

### Shade score per street piece

Each piece of street between two OSM nodes is sampled every 2 m. On a road, the
samples are on the pavements, 4 m to either side of the centre line; on a
footpath, on the line itself. A sample is shaded when either:

- it is inside the crown of a tree from יער עירוני דיגיטלי: a circle of the
  tree's canopy area (or canopy diameter), else 2.5 m, at most 10 m, or
- CHMv2 says the canopy there is at least 3 m tall.

`shade` = shaded samples / all samples. It is a static, "trees only" score: it
ignores the sun's position and building shadows for now. Both can come later:
building shadows from OSM building heights for a few hours of the day
(precomputed per hour), or ShadeMap on the map.

**CHMv2 without a library.** The CHMv2 GeoTIFFs turned out to be simple: one
file per zoom-10 Web Mercator tile (named by its quadkey; Givatayim is in
`1221122233` and `1221122232`), 32768 × 32768 pixels of about 1.2 m, 8-bit
heights in metres, 512 px tiles, Deflate, no predictor. The script reads the
TIFF index and the 42 tiles it needs with HTTP range requests and inflates them
with `node:zlib`, so the approved `geotiff` dependency was not needed (and the
npm registry was unreachable from the build machine anyway).

### The router

- The graph for Givatayim and about 300 m around it: **9,666 nodes, 11,173
  street pieces, 257 km**, 20% shaded overall. It is 284 KB of JSON (117 KB
  gzipped), bundled into the Worker and parsed once per instance (~4 ms).
- Edge weight: `length × (1 + β × (1 − shade)) × penalty`. β = 0 is the shortest
  route; higher β trades distance for shade. A*, guided by the straight-line
  distance, is exact because no street costs less than its length.
- **To a destination**: run with β = 0, 1, 3 and 8, drop near-duplicates (over
  85% shared length). When that leaves one route, make its streets 1.6× dearer
  and look again. Routes are sorted by shade share, shadiest first, and labelled
  shadiest, balanced or fastest. About **2 ms** a request.
- **Free walk**: turn the target into metres (steps × 0.75 m, minutes × 80
  m/min). Six triangles, one per direction: out to a corner, across to a second
  corner 60° on, and home, with walked streets made 4× dearer so the way back is
  different. A triangle off by more than 20% is resized once. Up to three loops
  are returned, shadiest first. **3 to 7 ms** a request.
- Each route has a GeoJSON LineString, distance, time (at 1.33 m/s), shade share
  (length-weighted), shade per piece of the line, and the number of trees within
  15 m.
- Points snap to the nearest graph node within 300 m. Anything further is an
  `outside_pilot_area` error (422), which the screens show.
- Answers are kept in memory per Worker instance (200 of them, keyed by the
  request rounded to about 10 m). The CPU per request fits the free plan's 10
  ms; if it ever stops fitting, the ways out are the paid plan, fewer variants,
  or the Cache API.

### Trees API

- `GET /api/trees?bbox=minLng,minLat,maxLng,maxLat` (at most 0.02° a side, about
  2 km) returns up to 2,000 trees, from the bundled `givatayim-trees.json`
  (15,335 trees in and just around Givatayim, 202 KB gzipped), with a one-hour
  cache header. No database is needed.
- The same trees go in a `trees` table
  (`supabase/migrations/20261125120000_trees.sql`, filled by running
  `supabase/seed-trees.sql`), so reports and verifications can refer to a tree
  by its יע"ד id.

### What the data showed

- **Givatayim has no municipal tree survey** in the national file. Its 7,061
  trees all come from the national canopy map (detected from the air, with a
  canopy area but no species). Species come only from the Tel Aviv survey rows
  at the city's edge. That makes the app's tree verification more valuable here,
  not less.
- **CHMv2 and the canopy map disagree a lot on small street trees.** Only 16% of
  canopy-map tree points have CHMv2 canopy of 3 m or more right under them (46%
  within 3 pixels). The alignment was checked: shifting the raster makes the
  agreement worse. So the score takes the union of the two: each catches trees
  the other misses.

### What stays out of the first version

- Time-of-day and building shadows, and ShadeMap on the map.
- Cities other than the pilot. The same script works for another city (change
  `CITY` and `AREA`); the bundle size sets how far it can go before moving the
  graph to KV or R2, or to a self-hosted GraphHopper with the same shade values.
- Turn-by-turn instructions (the navigation screen is another piece of work).
- Drawing routes on the real map. The route screen draws a simple SVG sketch
  (`client/features/routes/RouteSketch.tsx`) until the shared map component
  lands.

## Decisions (approved 25 November 2026)

1. **The architecture**: a precomputed Givatayim graph and our own router on
   Workers, instead of a routing server or a hosted API.
2. **The 1.6 GB יע"ד CSV** is downloaded once into the git-ignored cache; only
   the pilot rows are committed.
3. **CHMv2 is used** in the build script. The `geotiff` dev dependency was
   approved but turned out to be unnecessary (see above).
4. **No keys and no paid services.** ShadeMap is left for later; it would need a
   paid key for the real domain.
5. **A `trees` table migration** in Supabase.
6. **Credits**: "© OpenStreetMap contributors, יער עירוני דיגיטלי (ODbL), CHMv2
   © Meta and WRI (CC BY 4.0)" on the route screen and in the data files.

## Sources

- Open Tree Base, trees_processed:
  https://opentreebase.datacity.org.il/dataset/trees_processed
- Digital Urban Forest on דרך צל:
  https://tzel.org.il/knowledge/יער-עירוני-דיגיטלי/
- CHMv2 on AWS: https://registry.opendata.aws/dataforgood-fb-forestsv2/
- CHMv2 announcement:
  https://ai.meta.com/blog/world-resources-institute-dino-canopy-height-maps-v2/
- ShadeMap: https://shademap.app/about/
- GraphHopper custom models:
  https://docs.graphhopper.com/openapi/custom-profiles
- Shade routing with GraphHopper in Nantes:
  https://www.openstreetmap.org/user/zorun/diary/406587
- CoolWalks (shaded routing research): https://arxiv.org/abs/2405.01225
