import * as esbuild from "esbuild";
import { rmSync } from "node:fs";

const watch = process.argv.includes("--watch");

// Login-With.Link app keys are public (they're in every sign-in URL), so both are committed.
// Watch builds are local development; one-off builds (including `npm run deploy`) are production.
const LWL_KEYS = {
  development: "75227d44-0e1e-4be5-8457-fdf2f1620bec",
  production: "403fce4f-7554-43da-8142-1d78bf3635e7",
};
const lwlKey = watch ? LWL_KEYS.development : LWL_KEYS.production;

// Chunk names are content-hashed, so clear out old ones rather than let them pile up and get deployed.
rmSync("public/dist", { recursive: true, force: true });

const ctx = await esbuild.context({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  outdir: "public/dist",
  format: "esm",
  splitting: true,
  jsx: "automatic",
  sourcemap: true,
  define: {
    "process.env.NODE_ENV": watch ? '"development"' : '"production"',
    "import.meta.env.LWL_KEY": JSON.stringify(lwlKey),
  },
  loader: { ".tsx": "tsx", ".ts": "ts" },
});

if (watch) {
  await ctx.watch();
  console.log("Watching for changes…");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
