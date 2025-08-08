# Lumera Hub — Monorepo Scaffold (Web‑first with Wallet; Mobile later)

This guide creates a clean monorepo with Next.js 15 for web (with Cosmos‑Kit wallet on web now), Expo SDK 53 for mobile (added later), and a Tauri 2 desktop shell. It uses Turborepo + pnpm, Tamagui for a shared UI system, and a pragmatic desktop strategy (dev points at Next dev server, prod ships a static export subset).

---

## 1 — Final Technology‑Stack Blueprint

| Layer         | Tech & Version                                                       | Why this choice                                                                  |
| :------------ | :------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| Core UI       | React 19                                                             | Current stable; strong concurrency features                                      |
| Web           | Next.js 15 (App Router)                                              | RSC/streaming for the web; smooth deploy to Vercel                               |
| Mobile        | Expo SDK 53 (React Native 0.79)                                      | Stable today; great DX + EAS builds                                              |
| Desktop       | Tauri 2 (separate app)                                               | Lightweight shell; dev points to Next dev server; prod uses static export subset |
| Navigation    | Platform‑native stacks (Web: App Router; Mobile: React Navigation 7) | Simpler now; revisit Solito only if dual‑routing becomes painful                 |
| UI System     | Tamagui 1.x                                                          | Shared design system in packages/ui                                              |
| State & Cache | TanStack Query 5 + Zustand 5                                         | Async cache + minimal client state                                               |
| Wallet/Web3   | Cosmos Kit (web first)                                               | Multi‑wallet support on web now; add mobile wallet later                         |
| Monorepo      | Turborepo 2 + pnpm 9                                                 | Fast task graph; immutable store                                                 |
| Testing       | Playwright (web), Detox (mobile), Jest                               | E2E parity                                                                       |
| CI/CD         | GitHub Actions + Vercel (web) + EAS (mobile)                         | Clean pipelines                                                                  |
| Lint/Format   | ESLint 9 (flat) + Prettier 3                                         | Modern setup across workspaces                                                   |

Notes:

- Desktop + RSC/Server Actions: desktop production uses a static export subset (no server actions). Dev is fine (points to http://localhost:3000).
- Mobile will be added later; nothing here blocks that.

---

## 2 — One‑Time macOS (Intel) Prerequisites

```bash
# Xcode CLI tools (compilers & simulators)
xcode-select --install

# Node.js 20 LTS via nvm
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
nvm install 24 && nvm use 24

# pnpm 9
npm i -g pnpm@9

# Optional but recommended
brew install watchman
sudo gem install cocoapods

# Rust toolchain (for Tauri or native crates)
curl https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env
rustup target add x86_64-apple-darwin
```

---

## 3 — Create the Monorepo Skeleton

```bash
# Create Turborepo workspace with pnpm
pnpm dlx create-turbo@latest lumera-hub --package-manager pnpm
cd lumera-hub

# Pin Node 24 in this repo
echo "24" > .nvmrc

# Clean example apps/packages
rm -rf apps/* packages/*

# Create empty workspaces
mkdir -p apps packages

# In root package.json and in each app/package, add:
# "engines": { "node": ">=24 <25" }
```

---

## 4 — Generate Applications

### 4.1 Web: Next.js 15 (TypeScript, Tailwind, App Router)

```bash
pnpm dlx create-next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"

# Remove Turbopack flag from dev (Tamagui/RNW play nicer with webpack in dev)
cd apps/web
pnpm pkg set scripts.dev="next dev"
cd ../..
```

### 4.2 Mobile (later): Expo SDK 53 (blank TS)

Skip for now if you like. If you want to scaffold now:

```bash
pnpm dlx create-expo-app@latest apps/mobile --template expo-template-blank-typescript

cd apps/mobile
# React Navigation 7 & RN deps via expo install for compatible versions
pnpm dlx expo install @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context react-native-gesture-handler \
  react-native-reanimated

# Add a dev script Expo expects
pnpm pkg set scripts.dev="expo start"
cd ../..
```

### 4.3 Desktop: Tauri 2 app

```bash
mkdir -p apps/desktop
cd apps/desktop

# Install Tauri CLI locally and init
pnpm init
pnpm add -D @tauri-apps/cli
pnpm tauri init --ci \
  --app-name "lumera-hub" \
  --window-title "Lumera Hub" \
  --dev-url "http://localhost:3000" \
  --frontend-dist "./dist"   # production: we'll copy Next static export here

cd ../..
```

---

## 5 — Workspace Plumbing (pnpm, TS, ESLint, Prettier)

### 5.1 pnpm-workspace.yaml (root)

```yaml
packages:
  - apps/*
  - packages/*
```

### 5.2 TypeScript base config (tsconfig.base.json at root)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": false,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["apps/web/src/*"]
    }
  }
}
```

### 5.3 ESLint 9 flat config (eslint.config.js at root)

```js
import next from "eslint-config-next";
export default [
  { ignores: ["**/dist/**", "**/.next/**"] },
  ...next
];
```

### 5.4 Prettier (prettier.config.cjs)

```js
module.exports = { semi: false, singleQuote: true }
```

---

## 6 — Create Shared Packages

```bash
mkdir -p packages/ui packages/core

create_pkg () {
  PKG=$1
  mkdir -p packages/$PKG && cd packages/$PKG
  pnpm init
  pnpm pkg set name=@lumera-hub/$PKG
  pnpm pkg set version=0.1.0
  pnpm pkg set type=module
  pnpm pkg set main=./src/index.ts
  pnpm pkg set module=./src/index.ts
  pnpm pkg set types=./src/index.ts
  mkdir -p src
  echo "export {};" > src/index.ts
  cd - > /dev/null
}
create_pkg ui
create_pkg core

# Tamagui and peers as direct deps of ui (required with pnpm)
pnpm add -F @lumera-hub/ui tamagui @tamagui/core @tamagui/config react-native

# RNW for web app
pnpm add -F web react-native-web

# Optional state/query in core
pnpm add -F @lumera-hub/core @tanstack/react-query zustand
```

---

## 7 — Tamagui (root ⇆ web ⇆ mobile)

### 7.1 Install compiler/plugins at root

```bash
pnpm add -w @tamagui/next-plugin @tamagui/metro-plugin @tamagui/babel-plugin react-native-svg
pnpm add -F web tamagui @tamagui/core @tamagui/config react-native
pnpm add -w tamagui @tamagui/core @tamagui/config
pnpm install
```

### 7.2 Root Tamagui config (tamagui.config.ts at repo root)

```ts
import { createTamagui, createTokens } from 'tamagui'
import * as V4 from '@tamagui/config/v4'

// Handle different export styles across releases
const preset =
  // named export `config`
  (V4 as any).config ??
  // default export
  (V4 as any).default ??
  // some builds export the object itself
  V4

// keep preset tokens/themes/fonts/shorthands; only extend what you need
const extraTokens = createTokens({
  color: {
    brand: '#7e5bef',
    background: '#0d1117',
  },
})

const config = createTamagui({
  ...preset,
  // merge tokens instead of replacing; keep preset token families intact
  tokens: {
    ...(preset as any).tokens,
    ...extraTokens,
  },
  defaultTheme: 'dark',
})

export type AppConfig = typeof config
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
export default config
```

### 7.3 Shared Provider in @lumera-hub/ui

```tsx
// packages/ui/src/Provider.tsx
import React from 'react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'

export const AppProvider = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config} defaultTheme="dark">
    {children}
  </TamaguiProvider>
)
```

### 7.4 Next.js (web) configuration

- CommonJS next.config.js (plays nicely with Tamagui plugin)  
- Transpile RN/RNW/Tamagui and the ui package  
- Optional static export flag for desktop packaging

```js
// apps/web/next.config.js
const { withTamagui } = require('@tamagui/next-plugin')

const isDesktopExport = process.env.NEXT_OUTPUT === 'export'

module.exports = withTamagui({
  config: '../../tamagui.config.ts',
  components: ['tamagui', '@lumera-hub/ui'],
  appDir: true,
})({
  reactStrictMode: true,
  transpilePackages: [
    'tamagui',
    '@tamagui',
    'react-native',
    'react-native-web',
    '@lumera-hub/ui'
  ],
  ...(isDesktopExport ? { output: 'export' } : {}),
})
```

- Babel for web

```js
// apps/web/babel.config.js
module.exports = {
  presets: ['next/babel'],
  plugins: ['@tamagui/babel-plugin'],
}
```

- SSR style injection to avoid unstyled flash

```tsx
// apps/web/src/app/layout.tsx
import './globals.css'
import React from 'react'
import { AppProvider } from '@lumera-hub/ui'
import { useServerInsertedHTML } from 'next/navigation'
import { getStyleElement } from 'tamagui'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useServerInsertedHTML(() => <>{getStyleElement({})}</>)
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
```

- Shared screen example

```tsx
// packages/ui/src/screens/HomeScreen.tsx
import { YStack, H1, Paragraph } from 'tamagui'

export const HomeScreen = () => (
  <YStack f={1} ai="center" jc="center" space>
    <H1>Welcome to Lumera Hub</H1>
    <Paragraph>This screen is shared between Web & Mobile.</Paragraph>
  </YStack>
)
```

```tsx
// apps/web/src/app/page.tsx
'use client'
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'
export default function Page() {
  return <HomeScreen />
}
```

```tsx
//packages/ui/src/index.ts
export { AppProvider } from './Provider'
export { HomeScreen } from './screens/HomeScreen'
export { YStack, H1, Paragraph } from 'tamagui'
```
### 7.5 Expo (mobile) configuration (when you add mobile)

- Metro

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withTamagui } = require('@tamagui/metro-plugin')

const config = getDefaultConfig(__dirname)

module.exports = withTamagui(config, {
  config: '../../tamagui.config.ts',
  components: ['tamagui', '@lumera-hub/ui'],
})
```

- Babel (include reanimated last)

```js
// apps/mobile/babel.config.js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['@tamagui/babel-plugin', 'react-native-reanimated/plugin'],
}
```

- App entry

```tsx
// apps/mobile/App.tsx
import 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AppProvider } from '@lumera-hub/ui'
import { HomeScreen } from '@lumera-hub/ui/src/screens/HomeScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  )
}
```

---

## 8 — Web Wallet Integration (Cosmos Kit on Next.js)

Add a web‑only wallet provider now; mobile wallet can be added later without changing web.

### 8.1 Install (web app)

```bash
pnpm add -F web @cosmos-kit/react chain-registry \
  @cosmos-kit/keplr @cosmos-kit/leap @cosmos-kit/cosmostation \
  @interchain-ui/react
```

### 8.2 Web wallet provider

```tsx
// apps/web/src/app/providers/wallet-provider.tsx
'use client'

import React from 'react'
import { ChainProvider } from '@cosmos-kit/react'
import { chains, assets } from 'chain-registry'
import { wallets as keplrWallets } from '@cosmos-kit/keplr'
import { wallets as leapWallets } from '@cosmos-kit/leap'
import { wallets as cosmostationWallets } from '@cosmos-kit/cosmostation'
import { ThemeProvider, OverlaysManager } from '@interchain-ui/react'
import '@interchain-ui/react/styles'

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ChainProvider
        chains={chains}
        assetLists={assets}
        wallets={[...keplrWallets, ...leapWallets, ...cosmostationWallets]}
      >
        {children}
        <OverlaysManager />
      </ChainProvider>
    </ThemeProvider>
  )
}
```

### 8.3 Wrap the web layout

```tsx
// apps/web/src/app/layout.tsx
import './globals.css'
import React from 'react'
import { AppProvider } from '@lumera-hub/ui'
import { useServerInsertedHTML } from 'next/navigation'
import { getStyleElement } from 'tamagui'
import { WebWalletProviders } from './providers/wallet-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useServerInsertedHTML(() => <>{getStyleElement({})}</>)
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <WebWalletProviders>{children}</WebWalletProviders>
        </AppProvider>
      </body>
    </html>
  )
}
```

### 8.4 Quick test button (optional)

```tsx
// apps/web/src/components/ConnectWallet.tsx
'use client'
import { useChain } from '@cosmos-kit/react'

export function ConnectWallet() {
  const { openView, disconnect, address } = useChain('cosmoshub')
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => openView()}>Connect Wallet</button>
      {address && (
        <>
          <span>{address}</span>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      )}
    </div>
  )
}
```

Use it in a page or client component:

```tsx
'use client'
import { ConnectWallet } from '@/components/ConnectWallet'
export default function Page() { return <ConnectWallet /> }
```

---

## 9 — Desktop (Tauri 2) workflow

- Dev: Tauri points to Next dev server at http://localhost:3000 (already set by init).
- Prod: Build a static export of the web app (subset; no server actions), copy to apps/desktop/dist, then run Tauri build.

No extra config changes required for dev. See scripts below for prod build.

---

## 10 — Root Scripts and Turbo Pipeline

### 10.1 Root package.json

```json
{
  "name": "lumera-hub",
  "private": true,
  "packageManager": "pnpm@9",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "web": "turbo run dev --filter=web",
    "mobile": "turbo run dev --filter=mobile",
    "desktop": "turbo run dev --filter=desktop",
    "build:web": "turbo run build --filter=web",
    "build:mobile": "turbo run build --filter=mobile",
    "build:desktop": "pnpm run build:desktop",
    "build:desktop:export": "cd apps/web && NEXT_OUTPUT=export pnpm build && rm -rf ../desktop/dist && mkdir -p ../desktop/dist && cp -R ./out/* ../desktop/dist",
    "build:desktop:tauri": "cd apps/desktop && pnpm tauri build",
    "build:desktop": "pnpm run build:desktop:export && pnpm run build:desktop:tauri",
    "lint": "eslint ."
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

### 10.2 Turbo pipeline (turbo.json)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "out/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {}
  }
}
```

Ensure per‑app scripts:

- apps/web/package.json has ```"dev": "next dev", "build": "next build"```
- apps/mobile/package.json (when added) has ```"dev": "expo start"``` and optionally ```"build": "expo export"```

---

## 11 — Install & Run

```bash
pnpm install

# Dev — web
pnpm --filter web dev
# Visit http://localhost:3000

# Optional: Desktop dev (with web dev running)
pnpm --filter desktop tauri dev

# Later, mobile dev
pnpm --filter mobile dev
```

---

## 12 — Deployment

```bash
# Web → Vercel
cd apps/web && npx vercel --prod

# Desktop (static export subset)
pnpm run build:desktop   # runs export -> copies to apps/desktop/dist -> tauri build

# Mobile (later) → EAS
cd apps/mobile
npx expo login           # if needed
npx eas build --platform ios   # or android
```

---

## 13 — Continuous Integration (Node Matrix)

```yaml
# .github/workflows/ci-node.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [24]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
          cache-dependency-path: '**/pnpm-lock.yaml'
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run build --if-present
      - run: pnpm test --if-present
```

---

## 14 — Six‑Month Navigation Review

Revisit unifying routing (e.g., Solito) only if:

1) Maintaining Next routes + React Navigation slows delivery,
2) You need deep‑link parity,
3) QA reports “route mismatch” bugs frequently.

---

## FAQ (concise)

- Is wallet integration included now?
  - Yes, for the web app via Cosmos Kit (+ Interchain UI). Mobile wallet can be added later without touching the web flow.

- Why static export for desktop production?
  - Tauri ships static assets; server actions/dynamic server features from App Router aren’t available offline. Dev can point to the running Next server; prod uses a static subset.

- Why import Tamagui config from the repo root inside the ui package?
  - It centralizes tokens/themes. With pnpm workspaces, the relative import is fine; just ensure transpilation includes the ui package.

---

## Small File Tree (orientation)

```bash
lumera-hub/
  apps/
    web/
      next.config.js
      src/
        app/
          layout.tsx
          page.tsx
          providers/
            wallet-provider.tsx
        components/
          ConnectWallet.tsx
    mobile/                # optional now; add later
      App.tsx
      metro.config.js
      babel.config.js
    desktop/
      src-tauri/
      dist/                # filled by build:desktop:export
  packages/
    ui/
      src/
        Provider.tsx
        screens/
          HomeScreen.tsx
    core/
      src/
        index.ts
  tamagui.config.ts
  tsconfig.base.json
  eslint.config.js
  prettier.config.cjs
  turbo.json
  package.json
  pnpm-workspace.yaml
```


# Interchain Kit migration (web) — minimal diff and commands

Note: The exact wallet adapter package names for Interchain Kit can vary by release. Below we show the core, safe steps (provider + hooks) and include commented import lines for common adapters. Before installing adapters, search npm for the adapter names that match your target wallets (e.g., Keplr, Leap) and install those.

---

## 1) Commands (run at repo root)

```bash
# Remove Cosmos Kit (web)
pnpm remove -F web @cosmos-kit/react @cosmos-kit/keplr @cosmos-kit/leap @cosmos-kit/cosmostation

# Add Interchain Kit core + UI + registry (web)
pnpm add -F web @interchain-kit/react @interchain-ui/react chain-registry

# Wallet adapters (choose the ones you need; verify exact package names on npm first)
# Examples — uncomment after confirming the package names exist:
# pnpm add -F web @interchain-kit/keplr-extension @interchain-kit/leap-extension
```

---

## 2) Provider swap (Cosmos Kit → Interchain Kit)

File: apps/web/src/app/providers/wallet-provider.tsx

```diff
--- a/apps/web/src/app/providers/wallet-provider.tsx
+++ b/apps/web/src/app/providers/wallet-provider.tsx
@@
-'use client'
-
-import React from 'react'
-import { ChainProvider } from '@cosmos-kit/react'
-import { chains, assets } from 'chain-registry'
-import { wallets as keplrWallets } from '@cosmos-kit/keplr'
-import { wallets as leapWallets } from '@cosmos-kit/leap'
-import { wallets as cosmostationWallets } from '@cosmos-kit/cosmostation'
-import { ThemeProvider, OverlaysManager } from '@interchain-ui/react'
-import '@interchain-ui/react/styles'
-
-export function WebWalletProviders({ children }: { children: React.ReactNode }) {
-  return (
-    <ThemeProvider>
-      <ChainProvider
-        chains={chains}
-        assetLists={assets}
-        wallets={[...keplrWallets, ...leapWallets, ...cosmostationWallets]}
-      >
-        {children}
-        <OverlaysManager />
-      </ChainProvider>
-    </ThemeProvider>
-  )
-}
+'use client'
+
+import React from 'react'
+import { ChainProvider } from '@interchain-kit/react'
+import { ThemeProvider, OverlaysManager } from '@interchain-ui/react'
+import '@interchain-ui/react/styles'
+
+// Prefer tree-shaken imports (adjust to your target set, e.g., 'mainnet', 'testnet')
+import { chains, assetLists } from 'chain-registry/mainnet'
+
+// Wallet adapters (install and import the ones you need; verify package names on npm)
+// Example (Keplr, Leap) — uncomment after you add the packages:
+// import { keplrWallet } from '@interchain-kit/keplr-extension'
+// import { leapWallet } from '@interchain-kit/leap-extension'
+
+export function WebWalletProviders({ children }: { children: React.ReactNode }) {
+  return (
+    <ThemeProvider>
+      <ChainProvider
+        chains={chains}
+        assetLists={assetLists}
+        // Provide the wallet list you installed above. Example:
+        // wallets={[keplrWallet, leapWallet]}
+        wallets={[]}
+        // Optional: signer/endpoint options if you need to customize RPCs
+        signerOptions={{}}
+        endpointOptions={{}}
+      >
+        {children}
+        <OverlaysManager />
+      </ChainProvider>
+    </ThemeProvider>
+  )
+}
```

Tip
- Start by enabling a single wallet (e.g., Keplr). Once it works, add more wallets and chains, then replace wallets={[]} with your list.

---

## 3) Hook import swap (ConnectWallet)

File: apps/web/src/components/ConnectWallet.tsx

```diff
--- a/apps/web/src/components/ConnectWallet.tsx
+++ b/apps/web/src/components/ConnectWallet.tsx
@@
-'use client'
-import { useChain } from '@cosmos-kit/react'
+'use client'
+import { useChain } from '@interchain-kit/react'
 
 export function ConnectWallet() {
   const { openView, disconnect, address } = useChain('cosmoshub')
   return (
     <div style={{ display: 'flex', gap: 8 }}>
       <button onClick={() => openView()}>Connect Wallet</button>
       {address && (
         <>
           <span>{address}</span>
           <button onClick={() => disconnect()}>Disconnect</button>
         </>
       )}
     </div>
   )
 }
```

---

## 4) Optional: narrow the chain-registry

For smaller bundles, import only the chains/assets you actually support, or build a curated list:

```ts
// apps/web/src/app/providers/wallet-provider.tsx (snippet)
import { chains as allChains, assetLists as allAssets } from 'chain-registry/mainnet'

const supportedChainIds = new Set(['cosmoshub', 'osmosis']) // example
const chains = allChains.filter((c) => supportedChainIds.has(c.chain_id))
const assetLists = allAssets.filter((a) => supportedChainIds.has(a.chain_id))
```

---

## 5) Sanity checklist

- You removed all @cosmos-kit/* packages from the web app.
- You added @interchain-kit/react and @interchain-ui/react.
- You verified and installed the specific Interchain Kit wallet adapter packages you need (e.g., keplr extension).
- Provider compiles and shows a modal; Connect/Disconnect works on a known chain (cosmoshub) in a client component.

If you share the exact wallets you plan to support, I can fill in the precise adapter package names and update the wallets array for you.