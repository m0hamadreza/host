# Host App — Module Federation Host

A React Native **host** application that consumes remote modules at runtime via
[Module Federation](https://module-federation.io/) (Metro implementation:
[`@module-federation/metro`](https://www.npmjs.com/package/@module-federation/metro)).

This app is the shell that boots on the device. It renders its own UI **and**
lazily loads the `App` component exposed by the [`mini`](../mini) remote over
HTTP — so `mini` can be updated and redeployed without rebuilding or
resubmitting this host.

- **Role:** Host (consumer)
- **Consumes:** `mini` remote (`mini/app` → `mini/App.tsx`)
- **React Native:** 0.86.0 · **React:** 19.2.3 · **Node:** ≥ 22.11.0

---

## How it fits together

```
┌──────────────────────────┐         HTTP (mf-manifest.json          ┌─────────────────────────┐
│  HOST (this app)          │◀────────  + remoteEntry.bundle) ────────│  MINI (remote)          │
│                           │                                         │                         │
│  App.tsx                  │                                         │  exposes ./app          │
│   └─ React.lazy(          │                                         │   → App.tsx             │
│        () => import(      │                                         │                         │
│          'mini/app'))     │                                         │  served from a URL      │
│                           │                                         │  (dev server or CDN)    │
│  provides react +         │                                         │  borrows host's         │
│  react-native as EAGER    │                                         │  react / react-native   │
│  shared singletons        │                                         │  singletons             │
└──────────────────────────┘                                         └─────────────────────────┘
```

Key wiring in this project:

| File | What it does |
|------|--------------|
| [`metro.config.js`](metro.config.js) | Declares `name: 'host'`, the `remotes` map (where to fetch `mini`), and `shared` deps (`react`, `react-native` as eager singletons). |
| [`index.js`](index.js) | Registers the app with `withAsyncStartup(() => require('./App'))` so startup waits for the federation runtime to initialize shared deps before rendering. |
| [`App.tsx`](App.tsx) | `const MiniApp = React.lazy(() => import('mini/app'))` — loads the remote, wrapped in `<Suspense>` with a loading fallback. |

> ⚠️ **Do not add an `exposes` key to this host.** The plugin treats any present
> (even empty) `exposes` object as truthy and reclassifies the app as a remote
> (`isHost = !exposes`), which breaks the dev-server URL resolution at runtime.
> This is documented inline in [`metro.config.js`](metro.config.js).

---

## Prerequisites

- Node ≥ 22.11.0
- Android Studio / Xcode set up per the
  [RN environment guide](https://reactnative.dev/docs/set-up-your-environment)
- Dependencies installed: `npm install` (and `bundle install && cd ios && pod install` for iOS)

---

## Development

The host needs the `mini` remote to be reachable. Pick **one** of the two remote
sources below, then start the host.

### 1. Start the remote (`mini`)

**Option A — live dev server (recommended for active development):**
```bash
cd ../mini
npm run start:remote      # MF_REMOTE=1 react-native start --port 8082
```

**Option B — serve a prebuilt static remote bundle:**
```bash
cd ../mini
npm run bundle:android    # or bundle:ios — produces dist/<platform>/
npx serve dist/android -l 8082
```

Either way the host expects the remote's manifest at the URL configured in
[`metro.config.js`](metro.config.js) `remotes` (default points at a LAN
IP/`localhost` on port `8082`).

### 2. Start the host

```bash
npm start                 # start Metro for the host
npm run android           # build + launch on Android (separate terminal)
npm run ios               # build + launch on iOS
```

On launch the host renders "Host App" and then streams in the `mini` remote
inside a `<Suspense>` boundary.

> The `remotes` URL in `metro.config.js` must be reachable **from the
> device/emulator**, not just your Mac. Use your machine's LAN IP (e.g.
> `192.168.x.x`) rather than `localhost` when running on a physical device.

---

## Bundling (offline / manual)

These produce the host's own JS bundle for embedding in the native binary. The
`bundle-mf-host` command comes from `@module-federation/metro-plugin-rnc-cli`.

```bash
npm run bundle:ios        # → build/ios/main.jsbundle           (+ assets)
npm run bundle:android    # → build/android/index.android.bundle (+ assets)
```

Both scripts use `--dev false` (minified production bundle) and set
`--bundle-output` / `--assets-dest` explicitly — **required**, because
`bundle-mf-host` has no default output path (unlike stock `react-native bundle`).

The host bundle contains this app's code plus the **eager** `react` /
`react-native` singletons. It does **not** contain `mini` — that is fetched at
runtime.

> For a normal release build you usually don't run these by hand; Gradle/Xcode
> invoke the bundler automatically (see below).

---

## Production build (Android)

A Module Federation release differs from a stock RN release in three places:

**1. Point the host at a real remote URL** (baked into the bundle at build time).
In [`metro.config.js`](metro.config.js), set `remotes` to where `mini` is hosted:
```js
remotes: { mini: 'mini@https://cdn.example.com/mini/android/mf-manifest.json' }
```
Upload `mini/dist/android/` to that URL first.

**2. Tell Gradle to use the MF bundler.** In
[`android/app/build.gradle`](android/app/build.gradle), inside the `react { }`
block:
```gradle
bundleCommand = "bundle-mf-host"
```
Without this, Gradle runs the plain `bundle` command and federation isn't wired up.

**3. Build the artifact:**
```bash
cd android
./gradlew assembleRelease    # → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease      # → app/build/outputs/bundle/release/app-release.aab (Play Store)
```

### Cleartext HTTP for LAN testing

Android release builds set `usesCleartextTraffic=false`, so a release APK will
**refuse** to fetch a remote served over plain `http://`. For local LAN testing,
[`res/xml/network_security_config.xml`](android/app/src/main/res/xml/network_security_config.xml)
whitelists cleartext to a single dev IP, referenced from
[`AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml). **Remove this
and serve the remote over HTTPS for real production.**

### Signing ⚠️

[`android/app/build.gradle`](android/app/build.gradle) currently signs `release`
with the **debug** keystore. Play Store will reject that — generate your own
keystore per [Signed APK guide](https://reactnative.dev/docs/signed-apk-android)
before shipping.

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the host Metro dev server |
| `npm run android` | Build & launch on Android |
| `npm run ios` | Build & launch on iOS |
| `npm run bundle:ios` | Offline production host bundle for iOS |
| `npm run bundle:android` | Offline production host bundle for Android |
| `npm run lint` | ESLint |
| `npm test` | Jest |

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `property is not writable` in `fetchThenEvalJs.ts` | The remote bundle was built in **dev** mode and served statically into an initialized host. Rebuild `mini` with `--dev false` (its `bundle:*` scripts already do this). |
| `Cannot determine dev server URL for host remote` | An `exposes` key was added to this host's `metro.config.js`. Remove it — a pure host must have no `exposes`. |
| Host loads but `mini` never appears / network error | Remote URL in `remotes` is unreachable from the device. Use LAN IP not `localhost`; confirm the dev server / `npx serve` is running on port `8082`. |
| Release APK can't fetch remote (works in debug) | Cleartext blocked in release. Serve the remote over HTTPS, or whitelist the IP in `network_security_config.xml`. |
| Remote manifest shows `"exposes": []` | `mini` was bundled without `MF_REMOTE=1`. Use `mini`'s `bundle:*` scripts, which set it. |

---

## Learn more

- [Module Federation docs](https://module-federation.io/)
- [`@module-federation/metro`](https://www.npmjs.com/package/@module-federation/metro)
- [React Native docs](https://reactnative.dev)
