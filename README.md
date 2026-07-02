# rendez-vous

<!-- Badges -->

[![Last Commit](https://img.shields.io/github/last-commit/shin-sforzando/rendez-vous)](https://github.com/shin-sforzando/rendez-vous/graphs/commit-activity)
[![CI](https://github.com/shin-sforzando/rendez-vous/actions/workflows/ci.yml/badge.svg)](https://github.com/shin-sforzando/rendez-vous/actions/workflows/ci.yml)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

<!-- Synopsis -->

A web app that finds the optimal meeting spot for groups by calculating both centroid and geometric median to minimize total travel distance.

<!-- TOC -->

- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Initial Setup](#initial-setup)
  - [Environment Variables](#environment-variables)
  - [Pre-commit Hooks](#pre-commit-hooks)
  - [Development Commands](#development-commands)
- [Deployment](#deployment)
- [Station Data Generation](#station-data-generation)
  - [Setup](#setup)
  - [Usage](#usage)
- [Misc](#misc)
  - [License](#license)
    - [Third-party data](#third-party-data)

## Development Setup

### Prerequisites

- [mise](https://mise.jdx.dev) — manages runtime versions declared in `mise.toml` (currently Node.js 24)
- [direnv](https://direnv.net/) (optional, adds `node_modules/.bin` to `PATH` via `.envrc`)

### Initial Setup

1. Clone the repository, install runtimes via mise, then install npm dependencies:

   ```bash
   git clone https://github.com/shin-sforzando/rendez-vous.git
   cd rendez-vous
   mise install   # installs Node.js (and any future tools) declared in mise.toml
   npm install
   ```

   The app needs no environment variables to run, so setup is complete after `npm install`.

2. (Optional) Enable direnv for the `PATH` convenience in `.envrc`:

   ```bash
   direnv allow
   ```

### Environment Variables

The application requires **no runtime environment variables**. Station data is served as a static
asset (`public/stations.json`), so there is no backend or API key to configure — a fresh checkout
runs with `npm install && npm run dev`.

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. The following checks run automatically before each commit, in order:

1. **Biome**: Linting + formatting (`biome check --write`); any auto-fixes on staged files are re-staged
2. **TypeScript**: Type checking (`tsc --noEmit`)
3. **Vitest**: Test execution
4. **Build**: Production build verification (`vite build`)

If any check fails, the commit will be blocked. Fix the issues and try again.

### Development Commands

```bash
# Start development server
npm run dev

# Run tests (watch mode)
npm test

# Run tests once (CI mode)
npm run test:run

# Check test coverage
npm run test:coverage

# Type check
npm run typecheck

# Lint and format
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is deployed on [Cloudflare Pages](https://pages.cloudflare.com/). Pushes to the `main` branch trigger automatic builds and deployments.

- **Production URL**: <https://rendez-vous.pages.dev>
- **Build command**: `npm run build`
- **Output directory**: `dist`

No environment variables are required. Station data is served as a static asset (`public/stations.json`) bundled at build time, so there is no backend to configure.

## Station Data Generation

Station search and nearest-station lookup run entirely in the browser against a static dataset
(`public/stations.json`) generated from
[National Land Numerical Information (国土数値情報)](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html).
The dataset is governed by its own terms of use — see [Third-party data](#third-party-data) for details.

`public/stations.json` is committed to the repository, so a normal checkout can build and run without
this step. Regenerate it only when updating to a newer station dataset.

### Setup

1. Download the GeoJSON data from the link above (`N02-25_GML.zip`)
2. Extract the ZIP and place it under `data/`:

   ```plain
   data/
     N02-25_GML/
       UTF-8/
         N02-25_Station.geojson
   ```

### Usage

```bash
# Dry run (parse and report counts without writing the file)
npm run generate:stations -- data/N02-25_GML/UTF-8/N02-25_Station.geojson --dry-run

# Generate public/stations.json
npm run generate:stations -- data/N02-25_GML/UTF-8/N02-25_Station.geojson
```

After regenerating, commit the updated `public/stations.json`.

## Misc

This repository is [Commitizen](https://commitizen.github.io/cz-cli/) friendly, following [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow).

### License

This project's source code is licensed under the [MIT License](LICENSE).

#### Third-party data

Railway station data is derived from [National Land Numerical Information (国土数値情報)](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html) provided by the Ministry of Land, Infrastructure, Transport and Tourism (MLIT) of Japan, and its use is governed by the [国土数値情報 利用約款](https://nlftp.mlit.go.jp/ksj/other/agreement.html).
Attribution is required by that agreement; the original source is credited above.
