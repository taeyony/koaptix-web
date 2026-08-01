import type {
  KoaptixPublicationIdentity,
  KoaptixPublicationSurfaceCode,
  KoaptixUniverseServicePublicationIdentity,
} from "./types";

export const KOAPTIX_CURRENTNESS_MARKER = "production-currentness-v2";
export const KOAPTIX_CURRENTNESS_ROUTE = "api-currentness-v2";
export const KOAPTIX_CURRENTNESS_UNAVAILABLE = "unavailable";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_PATTERN = /^[0-9A-F]{64}$/;

type UnknownRecord = Record<string, unknown>;

export type KoaptixPublicationSelectionIdentity =
  KoaptixUniverseServicePublicationIdentity & {
    snapshot_date: string;
    universe_code: string;
  };

export type KoaptixPublicationCurrentnessRow = KoaptixPublicationIdentity & {
  universe_code: string;
  snapshot_date: string;
  source_previous_snapshot_date: string | null;
  row_count: number;
  plan_run_id: string;
  execution_run_id: string;
  source_authority_kind: string;
  source_authority_key: string;
  source_date_vector_sha256: string | null;
  full_row_digest_sha256: string;
  component_manifest_sha256: string;
  combined_surface_manifest_sha256: string;
};

type SafeEnvironment = "production" | "preview" | "development" | "unknown";

function sanitizeCommitSha(value: string | undefined) {
  if (!value || !/^[0-9a-f]{7,40}$/i.test(value)) {
    return KOAPTIX_CURRENTNESS_UNAVAILABLE;
  }

  return value.slice(0, 12).toLowerCase();
}

function sanitizeGitRef(value: string | undefined) {
  if (!value || value.length > 80 || !/^[A-Za-z0-9._/-]+$/.test(value)) {
    return KOAPTIX_CURRENTNESS_UNAVAILABLE;
  }

  return value;
}

function sanitizeEnvironment(
  vercelEnv: string | undefined,
  nodeEnv: string | undefined,
): SafeEnvironment {
  if (
    vercelEnv === "production" ||
    vercelEnv === "preview" ||
    vercelEnv === "development"
  ) {
    return vercelEnv;
  }

  return nodeEnv === "development" ? "development" : "unknown";
}

function asRecord(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function requireNonblankString(
  value: unknown,
  label: string,
  maxLength = 512,
): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${label} must be nonblank and bounded`);
  }
  return normalized;
}

function requireUuid(value: unknown, label: string): string {
  const normalized = requireNonblankString(value, label, 36).toLowerCase();
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${label} must be a canonical UUID`);
  }
  return normalized;
}

function requirePositiveInteger(value: unknown, label: string): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
  return numeric;
}

function requireNonnegativeInteger(value: unknown, label: string): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new Error(`${label} must be a nonnegative safe integer`);
  }
  return numeric;
}

function requireDate(value: unknown, label: string): string {
  const normalized = requireNonblankString(value, label, 10);
  if (!DATE_PATTERN.test(normalized)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error(`${label} must be a real calendar date`);
  }
  return normalized;
}

function optionalDate(value: unknown, label: string): string | null {
  return value === null || value === undefined ? null : requireDate(value, label);
}

function requireTimestamp(value: unknown, label: string): string {
  const normalized = requireNonblankString(value, label, 64);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
  return normalized;
}

function requireSha256(value: unknown, label: string): string {
  const normalized = requireNonblankString(value, label, 64).toUpperCase();
  if (!SHA256_PATTERN.test(normalized)) {
    throw new Error(`${label} must be an uppercase SHA-256 digest`);
  }
  return normalized;
}

function optionalSha256(value: unknown, label: string): string | null {
  return value === null || value === undefined ? null : requireSha256(value, label);
}

function requireSurfaceCode(value: unknown): KoaptixPublicationSurfaceCode {
  if (value !== "GLOBAL_LATEST" && value !== "UNIVERSE_SERVICE") {
    throw new Error("surface_code must be GLOBAL_LATEST or UNIVERSE_SERVICE");
  }
  return value;
}

export function requirePublicationIdentity(
  value: unknown,
  expectedSurface?: KoaptixPublicationSurfaceCode,
): KoaptixPublicationIdentity {
  const row = asRecord(value, "publication row");
  const surfaceCode = requireSurfaceCode(row.surface_code);
  if (expectedSurface && surfaceCode !== expectedSurface) {
    throw new Error(
      `surface_code ${surfaceCode} does not match ${expectedSurface}`,
    );
  }

  return {
    generation_id: requireUuid(row.generation_id, "generation_id"),
    publication_version: requirePositiveInteger(
      row.publication_version,
      "publication_version",
    ),
    publication_event_id: requireUuid(
      row.publication_event_id,
      "publication_event_id",
    ),
    published_at: requireTimestamp(row.published_at, "published_at"),
    surface_code: surfaceCode,
  };
}

export function requireUniformUniverseServicePublication(
  rows: readonly unknown[],
  expectedUniverseCode?: string,
): KoaptixPublicationSelectionIdentity {
  if (rows.length === 0) {
    throw new Error("identity-bearing UNIVERSE_SERVICE query returned no rows");
  }

  let selected: KoaptixPublicationSelectionIdentity | null = null;
  for (const value of rows) {
    const row = asRecord(value, "UNIVERSE_SERVICE row");
    const identity = requirePublicationIdentity(row, "UNIVERSE_SERVICE");
    const universeCode = requireNonblankString(
      row.universe_code,
      "universe_code",
      128,
    );
    const snapshotDate = requireDate(row.snapshot_date, "snapshot_date");

    if (expectedUniverseCode && universeCode !== expectedUniverseCode) {
      throw new Error(
        `universe_code ${universeCode} does not match ${expectedUniverseCode}`,
      );
    }

    const candidate: KoaptixPublicationSelectionIdentity = {
      ...identity,
      surface_code: "UNIVERSE_SERVICE",
      snapshot_date: snapshotDate,
      universe_code: universeCode,
    };

    if (!selected) {
      selected = candidate;
      continue;
    }

    for (const key of [
      "generation_id",
      "publication_version",
      "publication_event_id",
      "published_at",
      "surface_code",
      "snapshot_date",
      "universe_code",
    ] as const) {
      if (selected[key] !== candidate[key]) {
        throw new Error(`mixed publication identity at ${key}`);
      }
    }
  }

  return selected!;
}

export function sanitizePublicationCurrentnessRows(
  values: readonly unknown[],
): KoaptixPublicationCurrentnessRow[] {
  if (values.length === 0) {
    throw new Error("publication currentness returned no rows");
  }

  const seen = new Set<string>();
  const surfaces = new Set<KoaptixPublicationSurfaceCode>();
  let sharedIdentity: KoaptixPublicationIdentity | null = null;

  const rows = values.map((value) => {
    const row = asRecord(value, "publication currentness row");
    const identity = requirePublicationIdentity(row);
    const universeCode = requireNonblankString(
      row.universe_code,
      "universe_code",
      128,
    );
    const key = `${identity.surface_code}:${universeCode}`;
    if (seen.has(key)) {
      throw new Error(`duplicate publication currentness row ${key}`);
    }
    seen.add(key);
    surfaces.add(identity.surface_code);

    if (!sharedIdentity) {
      sharedIdentity = identity;
    } else {
      for (const identityKey of [
        "generation_id",
        "publication_version",
        "publication_event_id",
        "published_at",
      ] as const) {
        if (sharedIdentity[identityKey] !== identity[identityKey]) {
          throw new Error(`mixed currentness identity at ${identityKey}`);
        }
      }
    }

    return {
      ...identity,
      universe_code: universeCode,
      snapshot_date: requireDate(row.snapshot_date, "snapshot_date"),
      source_previous_snapshot_date: optionalDate(
        row.source_previous_snapshot_date,
        "source_previous_snapshot_date",
      ),
      row_count: requireNonnegativeInteger(row.row_count, "row_count"),
      plan_run_id: requireNonblankString(row.plan_run_id, "plan_run_id"),
      execution_run_id: requireNonblankString(
        row.execution_run_id,
        "execution_run_id",
      ),
      source_authority_kind: requireNonblankString(
        row.source_authority_kind,
        "source_authority_kind",
      ),
      source_authority_key: requireNonblankString(
        row.source_authority_key,
        "source_authority_key",
      ),
      source_date_vector_sha256: optionalSha256(
        row.source_date_vector_sha256,
        "source_date_vector_sha256",
      ),
      full_row_digest_sha256: requireSha256(
        row.full_row_digest_sha256,
        "full_row_digest_sha256",
      ),
      component_manifest_sha256: requireSha256(
        row.component_manifest_sha256,
        "component_manifest_sha256",
      ),
      combined_surface_manifest_sha256: requireSha256(
        row.combined_surface_manifest_sha256,
        "combined_surface_manifest_sha256",
      ),
    };
  });

  if (
    !surfaces.has("GLOBAL_LATEST") ||
    !surfaces.has("UNIVERSE_SERVICE") ||
    surfaces.size !== 2
  ) {
    throw new Error(
      "publication currentness must contain exactly GLOBAL_LATEST and UNIVERSE_SERVICE",
    );
  }

  return rows.sort(
    (left, right) =>
      left.surface_code.localeCompare(right.surface_code) ||
      left.universe_code.localeCompare(right.universe_code),
  );
}

export function getKoaptixCurrentness() {
  const commit = sanitizeCommitSha(process.env.VERCEL_GIT_COMMIT_SHA);
  const ref = sanitizeGitRef(process.env.VERCEL_GIT_COMMIT_REF);
  const environment = sanitizeEnvironment(
    process.env.VERCEL_ENV,
    process.env.NODE_ENV,
  );

  return {
    service: "KOAPTIX",
    marker: KOAPTIX_CURRENTNESS_MARKER,
    commit,
    ref,
    environment,
    runtime: "nodejs",
    route: KOAPTIX_CURRENTNESS_ROUTE,
    source: "server-route",
    cachePolicy: "no-store",
  } as const;
}

export function getKoaptixCurrentnessHeaders() {
  const currentness = getKoaptixCurrentness();

  return {
    "X-KOAPTIX-Currentness": currentness.marker,
    "X-KOAPTIX-Commit": currentness.commit,
    "X-KOAPTIX-Env": currentness.environment,
  };
}

export const getKoaptixDeploymentHeaders = getKoaptixCurrentnessHeaders;
