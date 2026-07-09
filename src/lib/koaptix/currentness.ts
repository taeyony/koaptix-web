export const KOAPTIX_CURRENTNESS_MARKER = "production-currentness-v1";
export const KOAPTIX_CURRENTNESS_ROUTE = "api-currentness-v1";
export const KOAPTIX_CURRENTNESS_UNAVAILABLE = "unavailable";

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
