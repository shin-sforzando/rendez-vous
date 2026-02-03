# rendez-vous

A web app that finds the optimal meeting spot for groups by calculating both centroid and geometric median to minimize total travel distance.

- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Initial Setup](#initial-setup)
  - [Environment Variables](#environment-variables)
    - [For New Developers](#for-new-developers)
    - [Updating Secrets](#updating-secrets)
  - [Pre-commit Hooks](#pre-commit-hooks)
  - [Development Commands](#development-commands)
- [Station Data Import](#station-data-import)
  - [Setup](#setup)
  - [Usage](#usage)

## Development Setup

### Prerequisites

- Node.js 24+
- npm
- [git-secret](https://git-secret.io/) (for managing sensitive files)
- [direnv](https://direnv.net/) (optional, for automatic environment variable loading)

### Initial Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/shin-sforzando/rendez-vous.git
   cd rendez-vous
   npm install
   ```

2. Set up environment variables with git-secret:

   ```bash
   # Decrypt secret files (requires GPG key access)
   git secret reveal
   ```

   This will create `.env.local` with the necessary environment variables.

3. (Optional) Enable direnv for automatic environment loading:

   ```bash
   direnv allow
   ```

### Environment Variables

The following environment variables are required in `.env.local`:

| Variable | Description |
| -------- | ----------- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_...`, for station data import only) |

This project uses **git-secret** to manage sensitive information.

#### For New Developers

If this is your first time setting up the project:

1. Ask the repository owner to add your GPG key:

   ```bash
   # Repository owner runs this:
   git secret tell your-email@example.com
   ```

2. Decrypt the secrets:

   ```bash
   git secret reveal
   ```

3. Edit `.env.local` if needed with actual values

#### Updating Secrets

When you modify `.env.local`:

1. The pre-commit hook will automatically encrypt it
2. Or manually encrypt:

   ```bash
   git secret hide
   ```

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. The following checks run automatically before each commit:

1. **git-secret encryption**: Automatically encrypts modified secret files
2. **Biome**: Code quality checks (linting + formatting)
3. **TypeScript**: Type checking
4. **Vitest**: Test execution

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

## Station Data Import

Import railway station data from [National Land Numerical Information (国土数値情報)](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html) into Supabase.

### Setup

1. Download the GeoJSON data from the link above (`N02-24_GML.zip`)
2. Extract the ZIP and place it under `data/`:

   ```plain
   data/
     N02-24_GML/
       UTF-8/
         N02-24_Station.geojson
   ```

3. Ensure `SUPABASE_SECRET_KEY` is set in `.env.local` (create a secret key in Supabase Dashboard -> Settings -> API)

### Usage

```bash
# Dry run (parse and validate without inserting)
npm run import:stations -- data/N02-24_GML/UTF-8/N02-24_Station.geojson --dry-run

# Import into Supabase
npm run import:stations -- data/N02-24_GML/UTF-8/N02-24_Station.geojson
```

The script is idempotent: re-running it will skip stations that already exist in the database.
