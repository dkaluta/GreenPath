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
 │ per city in shared/cities.ts:                                        │
 │   server/data/<city>-graph.json   nodes, edges, shade                │
 │   server/data/<city>-trees.json   trees for /api/trees               │
 │   server/data/cities.json         every city's boundary and sizes    │
 │   supabase/seed-trees/<city>.sql  the trees, for the table           │
 └──────────────────────────────────────────────────────────────────────┘
                     │ committed, credited (ODbL, CC BY)
                     ▼
 Workers: POST /api/routes ─► A* on the in-memory graph of the point's city
          GET /api/trees   ─► a grid index over that city's bundled trees
          GET /api/cities  ─► the supported cities (server/routes/cities.ts)
```

Downloads are cached in `scripts/pilot/.cache/` (git-ignored). The national tree
CSV has to be there first:

```bash
curl -o scripts/pilot/.cache/trees.csv https://s3.eu-west-2.wasabisys.com/opentreebase-public/processed/trees/trees.csv
```

```bash
npm run pilot:build                 # every city
npm run pilot:build -- netanya      # one city
```

Later runs are offline and take seconds. A first run is slow because of the
street download: OSM streets come from the public Overpass servers in tiles of
0.02° (about 2 km), and in November 2026 those servers failed most requests, so
each tile took a few minutes of retries. Ramat Gan took 1.6 hours, Jerusalem
2.7. Each tile is cached as it arrives, so a stopped build picks up where it
was. (A faster way, if it is ever needed: cut the cities from Geofabrik's Israel
extract, 122 MB, with a PBF reader as a dev dependency.)

The build keeps only the streets within 300 m of the city's OSM boundary and the
trees within 150 m of it. `--bbox-only` keeps everything in the city's box
instead, which is how Givatayim was first built (so the old file is
reproducible); clipped, Givatayim has 9,911 trees instead of 15,335.

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

**Reading CHMv2.** There is one Cloud-Optimised GeoTIFF per zoom-10 Web Mercator
tile, named by its quadkey (Givatayim is in `1221122233` and `1221122232`):
32768 × 32768 pixels of about 1.2 m, 8-bit heights in metres. The script uses
`geotiff` (a dev dependency, never shipped to the browser or Workers) to read
only the window over the pilot area with HTTP range requests, checks each tile's
origin against its quadkey so the pixels line up, and caches the window in
`scripts/pilot/.cache/chm/`.

### The router

- Each city's graph is bundled into the Worker as its own chunk, imported and
  parsed the first time a request needs that city, then kept for the instance. A
  point belongs to the city it is in, or to a city whose streets reach it (300 m
  past the boundary). The sizes and timings per city are in
  [Cities and the Worker's limits](#cities-and-the-workers-limits).
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
- Points snap to the nearest graph node of their city within 300 m. A point
  outside every bundled city is an `outside_pilot_area` error (422), which the
  screens show, naming the cities that work.
- Answers are kept in memory per Worker instance (200 of them, keyed by the
  request rounded to about 10 m). The CPU per request fits the free plan's 10
  ms; if it ever stops fitting, the ways out are the paid plan, fewer variants,
  or the Cache API.

### Trees API

- `GET /api/trees?bbox=minLng,minLat,maxLng,maxLat` (at most 0.02° a side, about
  2 km) returns up to 2,000 trees, from the bundled `<city>-trees.json` of every
  city the box touches, with a one-hour cache header. No database is needed.
- The same trees go in a `trees` table
  (`supabase/migrations/20261125130000_trees.sql`), so reports and verifications
  can refer to a tree by its יע"ד id. The build writes them as
  `supabase/seed-trees/<city>.sql`; those files are large (65 MB for six
  cities), so they are git-ignored and loaded by hand, for example
  `psql "$DATABASE_URL" -f supabase/seed-trees/givatayim.sql`.

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
- Tel Aviv-Yafo and Jerusalem in the deployed app (see below).
- Turn-by-turn instructions (the navigation screen is another piece of work).
- Drawing routes on the real map. The route screen draws a simple SVG sketch
  (`client/features/routes/RouteSketch.tsx`) until the shared map component
  lands.

## Cities and the Worker's limits

Measured 26 November 2026, on a laptop with Node 24 (a Worker is slower; treat
the times as a lower bound). "Load" is importing, parsing and indexing a city's
files, which happens once per Worker instance per city. Route times are over 40
random routes of 1 to 3 km, and free walks of 30 minutes.

| City          | Nodes   | Trees   | Graph + trees, gzipped | Load     | Memory | Route, median / max | Free walk, median / max |
| ------------- | ------- | ------- | ---------------------- | -------- | ------ | ------------------- | ----------------------- |
| Givatayim     | 7,013   | 9,911   | 82 + 125 KB            | 30 ms    | 8 MB   | 1.1 / 2.8 ms        | 1.4 / 4.4 ms            |
| Ramat Gan     | 23,182  | 27,204  | 277 + 352 KB           | 75 ms    | 23 MB  | 1.6 / 4.5 ms        | 2.3 / 5.3 ms            |
| Akko          | 12,480  | 38,891  | 143 + 405 KB           | 82 ms    | 29 MB  | 2.6 / 4.9 ms        | 3.3 / 6.8 ms            |
| Netanya       | 22,716  | 34,170  | 269 + 442 KB           | 82 ms    | 28 MB  | 1.2 / 4.0 ms        | 2.6 / 16.5 ms           |
| Tel Aviv-Yafo | 67,870  | 127,403 | 828 + 1,713 KB         | 353 ms   | 107 MB | 3.2 / 5.8 ms        | 4.6 / 10.0 ms           |
| Jerusalem     | 158,109 | 361,834 | 1,877 + 4,761 KB       | 1,073 ms | 290 MB | 5.2 / 32.2 ms       | 13.0 / 42.0 ms          |

Shade overall: Givatayim 22%, Ramat Gan 18%, Tel Aviv-Yafo 17%, Akko 13%,
Jerusalem 10%, Netanya 8%. A few random pairs in each city (2 or 3 of 40) have
no route, because the graph has small islands, such as a closed courtyard.

A Worker can be at most **3 MB gzipped on the free plan** (10 MB on the paid
one), gets **128 MB of memory**, and **10 ms of CPU** a request on the free
plan. So:

- **Four cities are bundled**: Givatayim, Ramat Gan, Akko and Netanya. The whole
  Worker is 2.43 MB gzipped, which leaves room for about one more small city.
- **Tel Aviv-Yafo and Jerusalem are built but not bundled.** With them the
  Worker is 11.9 MB gzipped, over both plans' limits, and their parsed data
  needs 107 MB and 290 MB of memory. They stay in `shared/cities.ts` (so
  `npm run pilot:build` makes them) with `bundled: false`, which keeps them out
  of the app's location check and the server's city list; their files are left
  out of `FILES` in `server/lib/routing/cities.ts` and are git-ignored.
- **The first request for a city pays for loading it**: 30 to 80 ms of CPU for
  the bundled cities, over the free plan's 10 ms. Cloudflare lets an occasional
  request go over; if the first requests start failing, the paid plan (30 s) is
  the easy way out.

### What to do for the big cities

In order, each step needed only when the one before stops being enough:

1. **Smaller files.** The JSON is the bulk of the size, the load time and the
   memory. Writing the graph and trees as packed binary arrays (coordinates as
   32-bit integers, shade as a byte) and reading them straight into typed arrays
   would cut each to a fraction, with no parse step. Trees for the map need only
   a position and a size; species can come from the database.
2. **Data out of the bundle.** Put each city's files in R2 (or KV), read on
   first use. That lifts the 3 MB limit, but not the memory or the load time.
3. **Tiles instead of cities.** Cut the graph into tiles of a few kilometres,
   and load only the tiles a route passes through (a 3 km walk touches two or
   three). This is what makes Jerusalem fit in 128 MB.
4. **A routing server.** Past that, a self-hosted GraphHopper or Valhalla with
   the same shade values as a custom weight, on a small always-on machine.

Steps 1 and 2 together are probably enough for Tel Aviv-Yafo. Jerusalem needs
step 3 as well.

## Decisions (approved 25 November 2026)

1. **The architecture**: a precomputed Givatayim graph and our own router on
   Workers, instead of a routing server or a hosted API.
2. **The 1.6 GB יע"ד CSV** is downloaded once into the git-ignored cache; only
   the pilot rows are committed.
3. **CHMv2 is used** in the build script, read with the `geotiff` dev
   dependency.
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
