# AGENTS.md

המסלול הירוק (GreenPath): a Hebrew, right-to-left web app for walking in the
shade of street trees. Read [docs/00-product.markdown](docs/00-product.markdown)
first: it has the screens, the Figma links and the product rules (pseudonymous
usernames, passkey sign-in, turn-by-turn on phones only, first-class RTL for
Hebrew and Arabic, the map style).

Built on the Product Jam starter: a React client, a Hono server on Cloudflare
Workers, and Supabase for the database and login.

## Folders

- `client/` - the React app, which runs in the browser.
  - `components/` - the shared UI components
  - `features/<name>/` - the hooks and forms for one kind of data
  - `pages/<section>/` - the screens, one folder per URL section (`/events/*` is
    in `pages/events/`), routed in `App.tsx`. Pages use `export default`.
  - `pages/Layout.tsx` - the header and footer around every page
  - `lib/`, `styles/`
- `server/` - the Hono app, which runs on Cloudflare Workers.
  - `routes/` - the API, registered in `server/index.ts`
  - `middleware/`, `lib/`
- `shared/` - TypeScript imported by both the client and the server.
- `supabase/` - database migrations and seed data.
- `docs/` - the guides, numbered in reading order.

Markdown files use the `.markdown` extension. Only files whose name a tool
expects keep `.md`: `README.md`, `AGENTS.md`, `CLAUDE.md`.

The server runs on Cloudflare Workers, not Node: there is no file system, and
packages with native modules don't work.

## Commands

```bash
npm run dev         # http://localhost:3000, client and server together
npm run build       # into dist/
npm run preview     # build, then serve it
npm run typecheck   # tsc -b
npm run lint        # eslint
npm run format      # prettier --write
npm test            # vitest
```
