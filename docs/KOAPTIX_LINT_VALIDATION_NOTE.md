# KOAPTIX Lint Validation Note

Date: 2026-05-18

`npm run lint` is currently not a safe validation gate for this repository because the script still uses `next lint`, which is not available in the current Next.js 16 toolchain.

The repository also does not currently include an ESLint dependency or an ESLint configuration file (`eslint.config.*` or `.eslintrc.*`). Because of that, this pass does not replace the script with `eslint .` or add lint dependencies/configuration automatically.

Until a minimal ESLint setup is intentionally added, use `npm run build` as the repository validation gate.
