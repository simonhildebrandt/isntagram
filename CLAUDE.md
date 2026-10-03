# Isntagram

Isntagram is an image hosting site - it's a simple web app that allows uploading zip files and individual images, lists them as folders, and allows the addition of set scaled sizes for individual images, or whole folders. It should be responsive (for management via mobile) and be clean and modern. The intention is to be able to share links to images stored in the system, so they can appear in other web contexts.

# Tech stack

Like Rage2 and 1Gb (adjacent projects), this project uses Cloudflare Workers, Drizzle, Login-With.Link, React Router and Chakra UI, with R2 for image storage and D1 for the database. The layout follows 1Gb: `worker/` and `frontend/`, with esbuild for frontend assets and Drizzle migrations in `worker/migrations`. Login-With.Link is set up the same way as in 1Gb.

Unlike 1Gb, whose frontend is on Vercel, a single Worker serves everything: the frontend's static files (from `frontend/public`, falling back to `index.html` for client-side routes), `/api/*` on `isntagram.au`, and image requests on `{handle}.isntagram.au`. `run_worker_first` is on, so the Worker decides by host before any static file is served.

Originals are stored in the R2 bucket `isntagram-originals` (binding `BUCKET`) under random keys (`originals/{uuid}`), so storage never depends on handles or paths. Uploads are sent as the raw request body and streamed into R2. The Worker checks the file's first bytes to confirm it's one of the accepted image types and ignores the type the browser claims. The client reads image dimensions with `createImageBitmap` and sends them with the upload.

Production routes are passed to `wrangler deploy` (see `worker/package.json`), not set in `wrangler.toml`. If they're in the config, `wrangler dev` rewrites every request's host to `isntagram.au`, and local subdomains stop working.

# Development

- `npm run dev:frontend` (esbuild watch) and `npm run dev:worker` (`wrangler dev`) in two terminals; the app is at `http://localhost:8787` and image subdomains at `http://{handle}.localhost:8787`.
- Copy `.dev.vars.example` to `.dev.vars` and fill in `LOGIN_WITH_LINK_SECRET`. Restart `wrangler dev` after changing `.dev.vars`; it isn't reloaded while running. The frontend build reads `LWL_KEY` from the environment (`.envrc`, as in 1Gb).
- `npm run db:generate` after changing `worker/src/db/schema.ts`, then `npm run db:migrate` to apply locally.
- `npm run typecheck` checks both packages.
- In the app, image previews add `?v={updatedAt}` to the URL (the Worker ignores query strings) so a replaced file isn't hidden by the browser cache.
- `wrangler dev` runs the Images binding locally (Miniflare bundles sharp), so resizing works offline.
- To test the API without a real sign-in, sign a JWT with the `.dev.vars` secret: `{ email }` claim, HS256.

# Workflow

- **Build order:** work in slices, each one deployable and testable before starting the next:
  1. Project setup and sign-in (Login-With.Link, choosing a handle, invite-only check)
  2. Folders, uploads (images and zips) and serving originals on `{handle}.isntagram.au`
  3. Size presets, scaled links and edge caching
  4. Sponsorship: invites, allowances, removing sponsored users
- **Wrangler:** don't run `wrangler` commands that touch the Cloudflare account (creating D1 databases or R2 buckets, applying remote migrations, setting secrets, deploying). Give Simon the exact commands to run. Local commands like `wrangler dev` and local migrations are fine.

# Uploads and folders

Folders are flat (one level, images only). Uploading a zip creates a new folder named after the archive; single images are uploaded into a folder the user picks or creates. Zips are unpacked in the browser (fflate) and each image is uploaded individually, avoiding Worker request size and memory limits. Accepted formats are JPG, PNG, WebP, GIF and AVIF, up to 50 MB each. Other files are skipped, and any directory structure inside a zip is flattened.

An image can be replaced (new file, same URLs, including the original extension), moved to another folder, or deleted. Renaming a folder changes the path used for images uploaded afterwards; existing images keep their paths. Uploads run one at a time in a background queue (`UploadProvider`) that keeps going while you move around the app. Deleting a folder deletes its images, after a confirmation warning that their links will stop working. Search (in the top bar) matches image and folder names only.

# Sizes

Only originals are stored in R2 and only originals count against a user's storage quota. Scaled sizes are generated on the fly with the Cloudflare Images binding (`env.IMAGES`), reading the original from R2, and cached at the edge. Animated GIF originals keep their animation, but scaled sizes may not.

Sizes are named presets that each user manages on the Sizes screen. A preset has:

- a name (`thumb`, `medium`, `og`)
- dimensions: a width only, or width × height
- a fit: "fit inside" or "crop to fill"
- an output format: keep the original, WebP or JPEG

A preset's name and format can't be changed after it's created, because both appear in every link to it (the format sets the extension); dimensions and fit can. Presets are applied to folders or to single images. An image's sizes are its folder's presets plus any applied to the image itself, and folder presets also apply to images uploaded later. A setting chooses the default presets for new folders. New users start with `thumb` and `medium`. The Worker only serves presets that have been applied to an image, so arbitrary sizes can't be requested and each one billed as a transform. Images are never upscaled (Cloudflare's `scale-down` and `crop` fits). The app's grids and folder covers use an internal `_grid` size (480 wide WebP), served for every image; user preset names can't start with `_`.

# Sharing

Images are public to anyone with the link and there is no listing or browsing for anonymous visitors. The app runs at `isntagram.au`, and each user's images are served from their own subdomain:

- `{handle}.isntagram.au/{folder}/{file}.{ext}` returns the original
- `{handle}.isntagram.au/{folder}/{file}@{preset}.{ext}` returns a scaled size (404 unless that preset is applied to the image)

This is a Worker route on `*.isntagram.au/*` (Workers Custom Domains don't support wildcards) plus a proxied wildcard DNS record. Cloudflare's free Universal SSL covers `isntagram.au` and `*.isntagram.au`. The Worker takes the handle from the `Host` header. Serving images from a different origin than the app also keeps uploaded content away from the app's login session.

A handle is chosen at sign-up and can't be changed. It must be a valid DNS label: lowercase a–z, 0–9 and `-`, up to 63 characters, not starting or ending with `-`. Handles that clash with infrastructure (`www`, `app`, `api`, `admin`, `mail`, `static`, and similar) are reserved. A handle is never reused, even after its user is removed. In local dev, use `{handle}.localhost:8787`.

An image's full URL (handle and path) is assigned at upload and stored on the image, and it never changes, even if the image is moved, its folder is renamed, or it changes owner. Links are embedded elsewhere, so they must keep working. Filename clashes within a folder get a numeric suffix (`beach-2.jpg`).

Every image request goes through the Worker, which looks the image up in D1 and checks the preset is applied. Deleting an image, or removing a size, makes those URLs 404 immediately. Resized images are kept in the edge cache (Cache API) under a key that includes the image's and the preset's `updated_at`, so replacing a file or editing a preset never serves a stale copy, and no cache purging is needed. Browsers may keep a copy for up to an hour (`max-age=3600`). Resized responses carry an ETag built from the same version, so a browser revalidating gets a 304 without a resize.

# Sponsorship

A seed user has a fixed amount of storage space and can sponsor other people with a share of it. This is recursive: anyone can allocate part of their space to someone else. The seed user's email and quota are configured with env vars (`SEED_USER_EMAIL`, `SEED_QUOTA_BYTES`, initially simonhildebrandt@gmail.com and 1GB).

- **Carve-out:** an allocation is subtracted from the sponsor's quota as soon as it is made, including for pending invites. A user's available space is their quota minus their own usage minus what they've allocated to others, so the total can never be oversubscribed.
- **Invites:** a sponsor enters an email and an allowance. This creates the user's row straight away (`activated_at` stays null until they first sign in), and the People screen gives the sponsor the sign-in link to send them. Isntagram doesn't send email itself: Login-With.Link emails the sign-in link when they use it. Each user has exactly one sponsor.
- **Invite-only:** only the seed user and invited people can sign in; an unknown email gets a "you need an invite" message. Everyone, including the seed user, chooses a handle on first sign-in.
- **Changing an allowance:** it can't be reduced below what the sponsee has committed (their usage plus their own allocations).
- **Removing a sponsored user:** the sponsor chooses either to move that user's images into their own library (links keep working, and the images count against the sponsor's space) or to delete them (links stop working). The removed user is signed out and their allowance returns to the sponsor. Anyone the removed user was sponsoring becomes sponsored directly by the remover.
  - Moved folders keep their names, with the removed user's handle added if the sponsor already has a folder of that name. Moved images keep their URLs, which still use the removed user's handle.
  - Their sizes move with them. Where the sponsor already has a size of the same name, theirs is merged into the sponsor's; those links keep working only if the formats match, since the format sets the extension.
  - The removed user's row is kept with `removed_at` set and a quota of 0, so their handle is never reused and their moved images' links still resolve. They can be invited again later (by anyone), keeping their handle.

# Design

Mockups are in `design/`; open `design/Isntagram Screens.dc.html` in a browser. `design/Isntagram App.dc.html` contains every screen: folders, folder, image, upload, sizes, people (with the remove dialog) and settings, each in desktop and mobile versions.

We're using layout **1b**: a top nav with centred content on desktop, and a header plus a tab strip on mobile.

Where the mockups disagree with this file, this file wins. In particular, the mockups show stored scaled sizes ("Scaled sizes 0.81 GB", "sizes generated"), but sizes are generated on the fly and don't count against storage. The mockups also use `img.isntagram.app` and show an editable "Public link domain" setting. Links actually go to `{handle}.isntagram.au`, which isn't configurable for now, so Settings shows the user's link domain read-only.

Source: https://claude.ai/design/p/d67f4ef1-6313-4c42-a9bf-78c6243ed84b?file=Isntagram+Screens.dc.html
