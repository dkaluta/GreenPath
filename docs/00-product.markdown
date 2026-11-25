# 0. The product: המסלול הירוק (GreenPath)

A Hebrew, right-to-left app for walking in the shade of street trees. It is
built with הסדנא לידע ציבורי (the Public Knowledge Workshop), on top of their
**יער עירוני דיגיטלי** (Digital Urban Forest, יע"ד), a database of Israel's
street trees.

Sources:

- Pitch deck (Figma Slides): https://www.figma.com/slides/V67IqKiTX9WX28lc28SRoL
- Design file (Figma): https://www.figma.com/design/0o5WXuCJZgpvKmoM8FypEF
  - page `השראות`: mood boards
  - page `שפה גרפית` (`100:411`): the tree illustrations
  - page `wireframes` (`100:21`): the nine screens and the base components

## The problem

1. Walking down a street with no shade is hard during the long Israeli summer.
2. The street-tree database is incomplete, and few people help map it.

## Who it is for

- People who walk and are hot for ten months of the year
- People who walk for fun or exercise
- Curious people, and people who want to help the database

## Values

נגישות (accessibility), בריאות וכושר (health and fitness), איכות הסביבה (the
environment).

## What we are building

1. **ניווט ליעד דרך הצל**: navigate to a destination along the shadiest route.
2. **הליכה חופשית עם משימות**: a free walk of a chosen length, with tasks along
   the way.
3. **אוסף עצים אישי**: a personal collection of the trees you have verified.

Not in scope: cycling or driving directions, public transport, and voice
guidance while driving.

## Screens and flow

The order comes from the information-architecture slide. Each screen has a route
in `client/App.tsx` and a page in `client/pages/`.

| #   | Screen       | Hebrew       | Route               | Figma node |
| --- | ------------ | ------------ | ------------------- | ---------- |
| 1   | Home (map)   | בית          | `/`                 | `100:36`   |
| 2   | Free walk    | הליכה חופשית | `/walk`             | `100:74`   |
| 3   | Choose route | בחירת מסלול  | `/route`            | `100:112`  |
| 4   | Navigation   | ניווט        | `/navigate`         | `100:141`  |
| 4a  | Report       | דיווח        | `/navigate/report`  | `100:181`  |
| 5   | Stop here    | עצרו כאן     | `/navigate/stop`    | `100:223`  |
| 6   | Photograph   | צילום        | `/navigate/capture` | `100:255`  |
| 7   | Match        | התאמה        | `/navigate/match`   | `100:275`  |
| 8   | Summary      | סיכום        | `/summary`          | `100:297`  |
| 9   | Collection   | אוסף ופרופיל | `/collection`       | `100:321`  |

```
בית ─► ליעד ─────────────► בחירת מסלול ─► ניווט ─► סיכום ─► אוסף ופרופיל
  └──► הליכה חופשית ─► הגדרת הליכה ──────────┘  │
                                                ├─► דיווח (any time while navigating)
                                                └─► עצרו כאן ─► צילום ─► התאמה ─► back to ניווט
```

## Product rules

These are decisions, not suggestions. Code that breaks one is a bug.

### Usernames are pseudonymous

- A person is shown by a **username** that is generated for them: three random
  English words separated by spaces, like `gentle shady olive`. People do not
  type their own, so a real name can never end up as one. The rules and the
  generator are in `shared/schemas/profile.ts`.
- Never show, return or log a real name or an email address in the UI, in an API
  response about another user, or in anything public such as the tree collection
  or verification credits.
- The `profiles` table (`supabase/migrations/`) holds the username. Nothing else
  about the person is stored in it.

### Sign-in uses passkeys

- The main way to sign in is a **passkey** (WebAuthn): no password and no email
  needed to start.
- The starter kit's email-and-password and Google sign-in are still wired up as
  scaffolding. They come out once passkeys work.
- Not built yet. See "Open decisions" below.

### Turn-by-turn navigation is mobile only

- Live turn-by-turn navigation, and everything under `/navigate` (screens 4 to
  7), runs only on **mobile web** and in the future **React Native** app.
- On a desktop browser, those routes show a "continue on your phone" screen
  instead. The check is `canNavigateHere()` in `client/lib/device.ts`, and the
  route guard is `<RequireMobile />`.
- Planning (home, choosing a route) and the collection work everywhere.

### Right-to-left languages are first class

Hebrew is the default language, and Arabic must work just as well. Right to left
is the normal case here, not an afterthought.

- `client/lib/config.ts` sets `LANG` and `DIRECTION` (`he`/`rtl` now). The
  `<html lang dir>` in `client/index.html` must match.
- CSS uses logical properties only: `margin-inline-start`, `inset-inline-end`,
  `text-align: start`, never `left` or `right`. This is the rule in
  `client/styles/global.css`.
- Icons that point a way, such as back arrows, chevrons and turn arrows, flip in
  RTL. Icons that show a real-world direction, such as a compass or a map turn,
  do not.
- Numbers, distances and times use `Intl` with the current `LANG`, never
  hand-built strings.
- Text from users (usernames, reports) can be in any script. Use `dir="auto"` on
  it, and keep Hebrew, Arabic and Latin letters valid in usernames.
- Both **Noto Sans Hebrew** and **Noto Sans Arabic** are loaded.
- Check every screen in both directions with the switch on `/components`.

### Maps look like Apple Maps, in our colours

The map is calm and readable like Apple Maps, in a light and a dark version,
re-coloured with our palette:

| Map layer     | Light                    | Dark                 |
| ------------- | ------------------------ | -------------------- |
| Land          | warm off-white `#F3F0E8` | brown-grey `#2E3A3A` |
| Parks, trees  | `--color-leaf` `#80AF80` | deep green `#2F5A45` |
| Water         | `--color-sky` `#D9E7FF`  | `#24406B`            |
| Streets       | white                    | `#4A5A5E`            |
| Shaded street | leaf green, thick        | leaf green, thick    |
| Labels        | `--color-text` brown     | `#F5F5F5`            |
| Your location | `--color-accent` dot     | same                 |

The values are the `--map-*` tokens in `client/styles/tokens.css`. The map style
(once a map library is chosen) reads them, so the map and the UI stay in the
same palette. Points of interest stay few: trees, parks, water fountains and
benches come before shops.

## Graphic language

| Token          | Hex       | Use                                     |
| -------------- | --------- | --------------------------------------- |
| `--color-bg`   | `#F5F5F5` | the page                                |
| `--color-text` | `#584533` | text, icons, primary buttons (brown)    |
| `--color-leaf` | `#80AF80` | brand green, shaded streets, the header |
| `--color-sky`  | `#D9E7FF` | water, light highlights                 |
| `--color-sun`  | `#F1F58D` | the yellow blob behind headings, sun    |

Type is **Noto Sans Hebrew** (the wireframes use it) with **Noto Sans Arabic**
for Arabic, regular and bold. Buttons and controls are pill-shaped
(`--radius-pill`), and floating map controls use a soft shadow
(`--shadow-float`).

## Technology (from the deck)

- **Data**: Meta's CHMv2 canopy-height map, יער עירוני דיגיטלי, and the ShadeMap
  API for computing and showing shadows.
- **Navigation**: a shade-aware routing algorithm on OpenStreetMap data.
- **Tree photos**: users are asked to photograph trees, with as little friction
  as possible.

Limits for the first version: a web app (a React Native app may follow), partial
data, a pilot in one tree-rich city such as Givatayim, and the incentive
mechanism is still being designed.

## Open decisions

- **Passkey implementation.** Supabase Auth, a WebAuthn library on the Hono
  server (for example `@simplewebauthn/server`, which runs on Workers), or a
  hosted provider. Adding a library needs approval first; see the README.
- **Map library and tiles** for the home and navigation screens. A vector map
  (for example MapLibre GL with OpenStreetMap tiles) is what makes the custom
  Apple Maps-like style possible; raster tiles cannot be re-coloured.
- **Routing engine**: our own on OSM, or a hosted one with a shade cost.
