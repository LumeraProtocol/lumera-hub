import { fileURLToPath } from "node:url";

const discardExternalSourceMapReferences = fileURLToPath(
  new URL("./postcss-discard-external-source-maps.cjs", import.meta.url),
);

const config = {
  // Some dependency CSS bundles publish a sourceMappingURL comment that Next
  // carries into its combined stylesheet without copying the adjacent map.
  // Strip those stale references so browsers do not request a nonexistent
  // `/_next/static/css/app/*.css.map` asset.
  plugins: [discardExternalSourceMapReferences, "@tailwindcss/postcss"],
};

export default config;
