# isntagram
Indie image hosting, on Cloudflare Workers. See `CLAUDE.md` for the spec and development notes.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # add LOGIN_WITH_LINK_SECRET
npm run db:migrate
npm run dev:frontend             # terminal 1
npm run dev:worker               # terminal 2 → http://localhost:8787
```

## Deployment

### Domain (once)

1. Register `isntagram.au` with an .au registrar.
2. In Cloudflare, **Add a domain** → `isntagram.au` → Free plan. Delete any scanned DNS records for `@` and `www`: the deploy creates the apex record and fails if one exists.
3. At the registrar, switch the nameservers to the two Cloudflare provides, then wait for the zone to show **Active**.
4. Under **SSL/TLS → Edge Certificates**, check Universal SSL covers `isntagram.au` and `*.isntagram.au`, and turn on **Always Use HTTPS**.
5. Add DNS records:

   | Type | Name     | Content                  | Proxy   | Why |
   |------|----------|--------------------------|---------|-----|
   | AAAA | `*`      | `100::`                  | Proxied | Sends `{handle}.isntagram.au` and `www` to the Worker route |
   | TXT  | `@`      | `v=spf1 -all`            | —       | The domain sends no email |
   | TXT  | `_dmarc` | `v=DMARC1; p=reject;`    | —       | Receivers reject mail claiming to be from it |

6. In Login-With.Link, set the Isntagram app's redirect to `https://isntagram.au/login`.

### Cloudflare resources (once)

```sh
npx wrangler login
npx wrangler d1 create isntagram                 # put the database_id it prints into wrangler.toml
npx wrangler r2 bucket create isntagram-originals
npx wrangler secret put LOGIN_WITH_LINK_SECRET
```

### Each deploy

```sh
npx wrangler d1 migrations apply isntagram --remote   # when there are new migrations
npm run deploy                                        # builds the frontend, deploys, attaches isntagram.au and *.isntagram.au/*
```

Check it:

```sh
curl -I https://isntagram.au                          # 200, the app
curl -I https://www.isntagram.au                      # 301 → isntagram.au
curl -I https://<handle>.isntagram.au/nope.jpg        # 404 from the Worker
```
