# המסלול הירוק · المسار الأخضر · GreenPath

Walk in the shade. GreenPath finds the shadiest walking route to where you are
going, or takes you on a shaded walk of the length you choose. On the way it
asks you to check the street trees you pass, which helps complete Israel's
public street-tree database.

It is built with [הסדנא לידע ציבורי](https://www.hasadna.org.il) (the Public
Knowledge Workshop), on top of their **יער עירוני דיגיטלי** (Digital Urban
Forest) database of street trees.

**Start with [the product doc](docs/00-product.markdown)**: the problem, the
screens, the Figma links and the rules every change has to follow.

## What it does

- **Navigate through the shade**: pick a destination and get routes ranked by
  how much of the way is shaded.
- **Free walks with tasks**: choose how far to walk, in steps, distance or time,
  and stop along the way to photograph and check trees.
- **A personal tree collection**: every tree type you check is added to your
  collection.

## Ground rules

These come from the product doc and apply to every change:

- **Hebrew, Arabic and English.** Hebrew is the default. Right to left comes
  first, and every word on screen lives in `client/lib/i18n/strings.ts`.
- **Pseudonymous.** People appear as three random English words, like
  `gentle shady olive`. Never show a real name or an email.
- **Passkeys** are the way to sign in (still to be built).
- **Turn-by-turn navigation is phone only**: mobile web now, React Native later.
  Desktop is for exploring and planning, laid out like Google Maps.
- **The map looks like Apple Maps, in our colours**, light and dark.

## Getting started

You need [Node.js](https://nodejs.org) 24 or newer.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Then open **http://localhost:3000**. Sign-in needs real Supabase values in
`.env`; see [Supabase setup](docs/02-supabase-setup.markdown). Everything else
works without them.

To try another language, use the switcher in the header. To see the phone-only
screens on a computer, turn on the device toolbar in your browser's developer
tools and pick a phone.

## How the code is organised

| Folder      | Where it runs         | What it holds                                      |
| ----------- | --------------------- | -------------------------------------------------- |
| `client/`   | In the browser        | React screens, components, styles and translations |
| `server/`   | On Cloudflare Workers | The Hono API. The only thing that talks to the DB  |
| `shared/`   | Both                  | Zod schemas both sides agree on                    |
| `supabase/` | Supabase              | Database migrations and seed data                  |
| `docs/`     | -                     | The guides, numbered in reading order              |

The browser never reads the database directly. It asks the server, at a URL
starting with `/api/`. The server runs on Cloudflare Workers, not Node: there is
no file system, packages with native modules don't work, and each request gets
about 10ms of CPU.

Some places to know:

- `client/lib/i18n/`: the languages and every word on screen
- `client/lib/device.ts`: the phone-only rule for navigation
- `client/styles/tokens.css`: the palette, type, shapes and map colours
- `shared/schemas/profile.ts`: the username rule and generator

Ask before adding a framework or a big library, such as Tailwind, an ORM, a
state or form library, CSS-in-JS or an i18n framework. The project already has a
way to do each of these.

## Commands

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Runs the app at http://localhost:3000, with reload   |
| `npm run build`     | Builds the app into `dist/`                          |
| `npm run preview`   | Builds, then serves the build. Use before pushing    |
| `npm run deploy`    | Builds and deploys to Cloudflare                     |
| `npm run typecheck` | Checks types, including that every language is whole |
| `npm run lint`      | Looks for likely bugs and rule violations            |
| `npm run format`    | Formats every file with Prettier                     |
| `npm test`          | Runs the tests                                       |

## Component gallery and demos

With the app running, **http://localhost:3000/components** shows every component
in each variant, with a right-to-left/left-to-right switch, and
**http://localhost:3000/demos** has small examples to copy from. Hide both
before launch with `VITE_SHOW_DEMOS=false`; see
[Hide the demo pages](docs/04-deploy.markdown#hide-the-demo-pages).

## Documentation

0. [The product](docs/00-product.markdown): what GreenPath is, its screens and
   its rules
1. [Quickstart](docs/01-quickstart.markdown): get it running on your machine
2. [Supabase setup](docs/02-supabase-setup.markdown): the database and login
3. [Google sign-in](docs/03-google-sign-in.markdown): "Sign in with Google"
4. [Deploy](docs/04-deploy.markdown): put it on the internet
5. [Adding a feature](docs/05-adding-a-feature.markdown): the pattern to copy

## Design

- Pitch deck: https://www.figma.com/slides/V67IqKiTX9WX28lc28SRoL
- Design file and wireframes:
  https://www.figma.com/design/0o5WXuCJZgpvKmoM8FypEF

Built on the Product Jam starter kit.
