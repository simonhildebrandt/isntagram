# isntagram
Indie image hosting, on Cloudflare Workers. See `CLAUDE.md` for the spec and development notes.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # add LOGIN_WITH_LINK_SECRET
export LWL_KEY=...               # Login-With.Link app key, used by the frontend build
npm run db:migrate
npm run dev:frontend             # terminal 1
npm run dev:worker               # terminal 2 → http://localhost:8787
```
