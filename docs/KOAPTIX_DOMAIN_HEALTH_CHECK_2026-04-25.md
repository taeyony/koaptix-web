# KOAPTIX Domain Health Check - 2026-04-25

## Purpose

This is a diagnostics-only health check for `koaptix.com`.

- No product code was changed.
- No registry entries were changed.
- No harness scripts, API routes, SQL, source-of-truth files, or package files were changed.
- No Vercel settings, DNS records, or deployment settings were changed.
- No batch-32 readiness review was created.
- SGG expansion remains paused at the enabled-80 baseline.

## Baseline State

- HEAD before check: `cc8ff69 docs(koaptix): add enabled-80 operational quality review`
- Branch: `checkpoint/2026-04-13-nationwide-baseline-candidate`
- Enabled-80 quality review: complete
- Expansion state: paused
- Latest reported gate state: `npm run build` PASS, `npm run audit:sgg` PASS, `npm run gate:sgg` PASS, `[SGG_RELEASE_GATE_PASS]` yes

## Local Repo Config Review

Repo-local deployment/domain config is minimal.

| Item | Finding |
| --- | --- |
| `package.json` | Present. Defines local/build/smoke/audit/gate scripts only; no domain or Vercel project mapping. |
| `vercel.json` | Not present. |
| `next.config.js` | Not present. |
| `next.config.mjs` | Not present. |
| `next.config.ts` | Present. Only configures TypeScript `tsconfigPath` by production mode. |
| `.vercel/project.json` | Not present in the working tree. |
| `koaptix.com` repo references | Present only in docs as an operational review target, not in executable config. |
| Vercel project/domain references | No repo-local Vercel project or custom-domain assignment found. |

Interpretation:

- Domain assignment appears dashboard-managed or managed outside this repository.
- The known `metadataBase` build warning is related to app metadata/domain configuration, but it is not sufficient to explain domain inaccessibility or API timeouts.
- No repo-local config directly proves or changes `koaptix.com` ownership, routing, SSL, or production deployment assignment.

## DNS Results

### `nslookup koaptix.com`

```text
Server:  bns2.hananet.net
Address:  219.250.36.130

Name:    koaptix.com
Address:  216.198.79.1
```

### `nslookup www.koaptix.com`

```text
Server:  bns2.hananet.net
Address:  219.250.36.130

Name:    2446f4703d8cf96d.vercel-dns-017.com
Addresses:  64.29.17.1
          216.198.79.1
Aliases:  www.koaptix.com
```

### `Resolve-DnsName koaptix.com`

```text
koaptix.com A 216.198.79.1 TTL 600
```

### `Resolve-DnsName www.koaptix.com`

```text
www.koaptix.com CNAME 2446f4703d8cf96d.vercel-dns-017.com TTL 600
2446f4703d8cf96d.vercel-dns-017.com A 64.29.17.1 TTL 300
2446f4703d8cf96d.vercel-dns-017.com A 216.198.79.1 TTL 300
```

DNS interpretation:

- Apex `koaptix.com` resolves to Vercel infrastructure (`216.198.79.1`).
- `www.koaptix.com` resolves through a Vercel DNS CNAME and Vercel infrastructure addresses.
- DNS resolution is working from this network.
- This does not look like a no-DNS / NXDOMAIN failure.

## HTTP And HTTPS Results

| Check | Result | Observation |
| --- | --- | --- |
| `curl.exe -I https://koaptix.com` | `307 Temporary Redirect` | Redirects to `https://www.koaptix.com/`; served by Vercel; no SSL error observed. |
| `curl.exe -I https://www.koaptix.com` | `200 OK` | Served by Vercel / Next.js, but took about `42s` from this environment and returned `X-Vercel-Cache: MISS`. |
| `curl.exe -I http://koaptix.com` | `308 Permanent Redirect` | Redirects to `https://koaptix.com/`; served by Vercel. |
| `curl.exe -I http://www.koaptix.com` | `308 Permanent Redirect` | Redirects to `https://www.koaptix.com/`; served by Vercel. |
| `curl.exe -I -L https://koaptix.com` | `307` then `200 OK` | Full redirect chain reaches the `www` production app, but also takes about `42s`. |
| `curl.exe -I -L http://koaptix.com` | `308`, then `307`, then `200 OK` | HTTP apex redirects to HTTPS apex, then HTTPS `www`; final response is Vercel / Next.js after about `42s`. |

HTTP / SSL interpretation:

- SSL/certificate failure was not observed.
- `DEPLOYMENT_NOT_FOUND` was not observed.
- A Vercel `404` or immediate app `500` was not observed on the homepage.
- The homepage is reachable from this environment, but the response is slow enough to be operationally unhealthy.

## Public Runtime API Probe

Additional read-only probes were run against the public domain to distinguish domain routing from app runtime health.

| Check | Result | Body / signal |
| --- | --- | --- |
| `curl.exe -I "https://www.koaptix.com/api/rankings?universe_code=KOREA_ALL&limit=1"` | `504 Gateway Timeout` | Vercel matched `/api/rankings`, `X-Koaptix-Cache: miss`. |
| `curl.exe "https://www.koaptix.com/api/rankings?universe_code=KOREA_ALL&limit=1"` | HTTP request completed | `{"ok":false,"universeCode":"KOREA_ALL","count":0,"items":[],"message":"RANKINGS_TIMEOUT"}` |
| `curl.exe -I "https://www.koaptix.com/api/map?universe_code=KOREA_ALL&limit=1"` | `504 Gateway Timeout` | Vercel matched `/api/map`, `X-Koaptix-Map-Cache: miss`. |
| `curl.exe "https://www.koaptix.com/api/map?universe_code=KOREA_ALL&limit=1"` | HTTP request completed | `{"ok":false,"universeCode":"KOREA_ALL","count":0,"items":[],"message":"MAP_TIMEOUT"}` |

Runtime interpretation:

- Public domain routing reaches the deployed Next.js app.
- Public API routes execute far enough to return KOAPTIX timeout payloads.
- This points away from pure DNS, SSL, or custom-domain assignment failure.
- The stronger signal is a production app/runtime/data-access timeout issue.

## Vercel Checks

| Check | Result |
| --- | --- |
| `vercel --version` | Vercel CLI is not installed in this environment. |
| `vercel ls` | Not run because CLI is unavailable. |
| `vercel domains ls` | Not run because CLI is unavailable. |
| `vercel inspect` | Not run because CLI is unavailable and no `.vercel/project.json` exists. |
| Production `.vercel.app` URL discovery | No repo-local project link or production URL was discoverable. |

Dashboard verification required:

- Yes. Vercel dashboard access is required to verify project/domain assignment, production deployment state, function logs, runtime env vars, and domain SSL status.

## Diagnosis

`APP_RUNTIME_ISSUE_LIKELY`

Rationale:

- DNS resolves for both apex and `www`.
- HTTPS works and no certificate error was observed.
- Vercel serves redirects and the `www` homepage returns `200 OK`.
- The public app is very slow from this environment, with homepage HEAD/redirect-chain checks taking about `42s`.
- Public API routes return timeout behavior: `RANKINGS_TIMEOUT`, `MAP_TIMEOUT`, and `504 Gateway Timeout` headers.
- No CLI/dashboard evidence is available from this environment to confirm deployment logs, env vars, or backend connectivity.

Secondary possibility:

- `PRODUCTION_DEPLOYMENT_ISSUE_LIKELY` remains possible if the current Vercel production deployment has missing/incorrect environment variables, cold-start limits, region/runtime constraints, or Supabase connectivity problems. Dashboard logs are needed to separate app runtime code path latency from deployment/environment configuration.

## Recommended Next Action

Use the Vercel Dashboard for the project currently serving `koaptix.com`:

1. Check Vercel Project -> Settings -> Domains.
   Confirm `koaptix.com` and `www.koaptix.com` are assigned to the intended project, verified, and SSL is valid.

2. Check Vercel Project -> Deployments.
   Confirm the current production deployment is the intended commit and is healthy.

3. Check Vercel Function / Runtime logs for `/api/rankings` and `/api/map`.
   Look for Supabase connection latency, missing env vars, query timeout, function timeout, or cold-start symptoms matching `RANKINGS_TIMEOUT` and `MAP_TIMEOUT`.

4. Verify production environment variables.
   Confirm the production deployment has the expected public Supabase URL / anon key and any other required non-secret runtime variables. Do not expose secrets in docs or logs.

5. Verify registrar/DNS only if dashboard reports a domain warning.
   From this network, DNS already points to Vercel infrastructure, so registrar/nameserver work is lower priority unless Vercel reports a mismatch.

6. After any dashboard or env fix, re-run public domain probes:
   `https://www.koaptix.com/`, `/api/rankings?universe_code=KOREA_ALL&limit=1`, and `/api/map?universe_code=KOREA_ALL&limit=1`.

## Final Verdict

HOLD - domain routing and SSL appear functional from this environment, but production app/API runtime health is not acceptable. Dashboard/deployment verification is needed before marking `koaptix.com` healthy.
