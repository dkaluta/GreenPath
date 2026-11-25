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

- The way to sign in is a **passkey** (WebAuthn), through Supabase Auth's
  passkey support. No password.
- Signing up asks for an email, a link (or code) sent to it, then a passkey.
  Signing in is the email and then the passkey. An account can have a passkey on
  each device. The email is used **only** for those links and codes: to sign up
  and to recover the account (a lost passkey, a new device). It is never shown,
  never stored outside Supabase Auth, and never returned by the API.
- The starter kit's email-and-password and Google sign-in are removed.
- How it is built and set up: [3. Passkey sign-in](03-passkeys.markdown).

### Turn-by-turn navigation is mobile only

- Live turn-by-turn navigation, and everything under `/navigate` (screens 4 to
  7), runs only on **mobile web** and in the future **React Native** app.
- On a desktop browser, those routes show a "continue on your phone" screen
  instead. The check is `canNavigateHere()` in `client/lib/device.ts`, and the
  route guard is `<RequireMobile />`.
- Planning (home, choosing a route) and the collection work everywhere.

### Three languages, right to left first

The app speaks **Hebrew** (the default), **Arabic** and **English**. Right to
left is the normal case here, not an afterthought, and Arabic must work as well
as Hebrew.

- Every word on the GreenPath screens lives in `client/lib/i18n/strings.ts`.
  Hebrew is the source; Arabic and English must have the same keys, or
  `npm run typecheck` fails. Read them with `t`:
  `import { t } from "@/lib/i18n"`, then `t.nav.map`.
- The language is picked once per page load in `client/lib/config.ts`: the
  person's saved choice, else their browser's languages, else Hebrew. `LANG` and
  `DIRECTION` follow from it, and `<html lang dir>` is set to match.
- The language choice in the app menu saves the choice and reloads, so text,
  direction, dates and the calendar all change together.
- CSS uses logical properties only: `margin-inline-start`, `inset-inline-end`,
  `text-align: start`, never `left` or `right`. This is the rule in
  `client/styles/global.css`.
- Icons that point a way, such as back arrows, chevrons and turn arrows, flip in
  RTL. Icons that show a real-world direction, such as a compass or a map turn,
  do not.
- Numbers, distances and times use `Intl` with the current `LANG`, never
  hand-built strings.
- Text from users, such as reports, can be in any script: use `dir="auto"`.
  Usernames are English words, so show them with `dir="ltr"`.
- **Noto Sans Hebrew** and **Noto Sans Arabic** are both loaded.
- Check every screen in all three languages. The starter kit's own pages
  (sign-in, events, demos) are still in English only.

### Phone and desktop layouts

- **Phone** (the wireframes): the map fills the screen. Floating pill controls
  sit on top, and everything else is a bottom sheet.
- **Desktop**: laid out like Google Maps. A narrow rail on the start side (menu,
  collection, recents), a floating search-and-results panel next to it, filter
  chips along the top (shade, parks, water fountains, benches), and the map
  controls (my location, zoom, layers) in the bottom corner. "Start" is the
  right side in Hebrew and Arabic and the left in English, so the whole layout
  mirrors.
- Desktop is for exploring and planning; turn-by-turn stays on phones.
- **Every screen lives in that frame.** The home screen builds it itself; every
  other screen is a `<MapScreen>` (`client/features/map/MapScreen.tsx`), which
  puts it over the map:
  - **Desktop:** the same rail (menu, map, collection) and the screen in the
    floating panel next to it, as Google Maps shows directions and place
    details, with a back button and the title at its top and the location and
    zoom buttons in the bottom end corner. Walk setup, route choice, summary,
    collection, sign-in, "not found" and "continue on your phone" all open this
    way.
  - **Phone:** round back and menu buttons float over the full-screen map, and
    the screen is a bottom sheet (walk setup, route choice, navigation, "not
    found"), as in the wireframes. The screens the wireframes draw as a full
    page (summary, match, collection, sign-in) are a full page with the same
    back and menu buttons on top. The report and stop sheets rise over the map
    too, and the camera stays a full-screen dark viewfinder.
  - Route choice draws the routes on the map: the chosen one in its shaded
    (green) and sunny stretches, the others faded; tapping one chooses it.
    Navigation draws the chosen route the same way.
- The rail, the app menu and the round map buttons are in
  `client/features/map/chrome.tsx`. The app menu (the rail's menu button on
  desktop, the profile button on phones) holds the pseudonymous username, the
  collection, adding a passkey, the theme, the language and signing in or out.
- The starter kit's own pages (`/design`, `/events`, `/demos`, `/components`)
  keep a header and footer (`client/pages/Layout.tsx`), restyled as a floating
  bar with the same app menu.

### Light and dark

- The app has a light and a dark theme, for the UI and the map together. The
  setting is in the app menu: **System** (the default: follow the computer),
  **Light** or **Dark**. It is kept on the device in `localStorage`
  (`greenpath.theme`); nothing is sent anywhere.
- `client/lib/theme.ts` turns the setting into `<html data-theme="light">` or
  `"dark"` (and keeps it up to date when the computer switches, under System). A
  small script in `client/index.html` does the same before the app loads, so a
  dark page never flashes white.
- `client/styles/tokens.css` holds every dark value under
  `:root[data-theme="dark"]`: the UI colours (derived from the brand palette,
  with text at WCAG AA contrast or better) and the `--map-*` tokens. The map
  subscribes to the theme and rebuilds its style from the tokens, so choosing
  Light gives a fully light app on a dark-mode computer, and the other way
  round.
- The camera screen is always dark, whatever the theme.

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
| Your location | `--color-accent` dot     | `--color-sun` dot    |

The values are the `--map-*` tokens in `client/styles/tokens.css`. The map style
(`client/features/map/style.ts`) reads them while the app runs and rebuilds
itself when the app's theme switches between light and dark (see Light and dark
above), so the map and the UI stay in the same palette. Labels are in the app's
language where OpenStreetMap has the name in it (`name:he`, `name:ar`,
`name:en`), else the local name. Points of interest stay few: trees, parks,
water fountains and benches come before shops.

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
  **Decided and built**: our own small router on Workers over a precomputed
  street graph of the pilot city (Givatayim), each street piece scored for shade
  from יער עירוני דיגיטלי trees and CHMv2 canopy heights. ShadeMap is left for
  later, as a map layer. See [6. Shade routing](06-shade-routing.markdown).
- **Tree photos**: users are asked to photograph trees, with as little friction
  as possible.

Limits for the first version: a web app (a React Native app may follow), partial
data, a pilot in one tree-rich city such as Givatayim, and the incentive
mechanism is still being designed.

## Open decisions

- None right now.

## Decided

- **Passkey implementation** (November 2026): Supabase Auth passkeys
  (experimental in supabase-js), with an emailed link or code to sign up and to
  recover. See [3. Passkey sign-in](03-passkeys.markdown).
- **Map library and tiles** (November 2026): **MapLibre GL JS** (`maplibre-gl`,
  BSD licence) with OpenStreetMap vector tiles from **OpenFreeMap**
  (`tiles.openfreemap.org`, free, no key, OpenMapTiles schema with Hebrew,
  Arabic and English names and glyphs). The style is built in code from the
  `--map-*` tokens, so it is fully custom. Hebrew and Arabic labels use
  MapLibre's right-to-left text plugin, loaded from unpkg the first time one is
  drawn. The map component is `client/features/map/` (`<MapView />`); its
  overlay API for routes and markers is described in its `index.ts`.
- **Routing engine** (November 2026): our own small router on Workers over a
  precomputed street graph of the pilot city, scored for shade. See Technology
  above and [6. Shade routing](06-shade-routing.markdown).
