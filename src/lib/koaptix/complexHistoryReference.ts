import "server-only";

import { createHash } from "node:crypto";

import referenceData from "./data/complex-history-reference-20261015.json";

export type ComplexHistoryReferenceAnchor = {
  snapshotDate: string;
  marketCapKrw: number | null;
  generationId: string;
  publicationVersion: number;
};

export type ComplexHistoryReferenceRow = {
  snapshot_date: string;
  complex_id: number;
  market_cap_krw: number | null;
  rank_all: null;
  sourceKey: string;
};

export type ComplexHistoryReferenceUnavailableReason =
  | "INVALID_COMPLEX_ID"
  | "INVALID_REFERENCE_DATA"
  | "NO_REFERENCE_HISTORY"
  | "PUBLIC_ANCHOR_UNAVAILABLE"
  | "PUBLICATION_CHANGED"
  | "PUBLIC_ANCHOR_CHANGED";

export type ComplexHistoryReferenceMetadata = {
  available: boolean;
  reason?: ComplexHistoryReferenceUnavailableReason;
  sourceKey: string;
  availableFrom: string | null;
  availableTo: string | null;
};

export type ComplexHistoryReferenceSource = {
  sourceKey: string;
  sourceObservedAt: string;
  sourceNote: string;
  expectedPointCount: number;
  snapshotDate: string;
  generationId: string;
  publicationVersion: number;
};

export type ComplexHistoryReferenceSelection = {
  rowsById: Record<string, ComplexHistoryReferenceRow[]>;
  metadataById: Record<string, ComplexHistoryReferenceMetadata>;
  source: ComplexHistoryReferenceSource;
};

const SOURCE_KEY = "current-canonical-reconstruction:9d256207f4d07950be7dcbca1215a6ab7d155c9ab4240847b59a87b44293f0bd";
const GENERATION_ID = "733d03e6-e029-449b-a748-26c4b032df05";
const SOURCE_NOTE = "현재 확인된 세대수와 가용 거래를 기준으로 재계산한 참고 이력이며, 당시 공표값이나 전국의 완전한 과거 이력이 아닙니다.";
const source: ComplexHistoryReferenceSource = {
  sourceKey: SOURCE_KEY,
  sourceObservedAt: "2026-10-16T06:49:27.606134+00:00",
  sourceNote: SOURCE_NOTE,
  expectedPointCount: 33,
  snapshotDate: "2026-08-31",
  generationId: GENERATION_ID,
  publicationVersion: 2,
};

function isExactId(id: string): boolean {
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
}

// Validate the packaged candidate once. It is intentionally independent from
// public rank history: every request also needs a matching *current* anchor.
function isValidPackage(): boolean {
  const digest = createHash("sha256").update(JSON.stringify(referenceData)).digest("hex").toUpperCase();
  if (digest !== "DF66CDAB5732FB5F51E3EF1AF116F1458F3ABD4FB2AB1FBFAF24595CB0289B5B" ||
      referenceData.schemaVersion !== 1 ||
      referenceData.status !== "LOCAL_REFERENCE_CANDIDATE_NOT_DEPLOYMENT_APPROVAL" ||
      Object.entries(source).some(([key, value]) => referenceData.source[key as keyof typeof source] !== value) ||
      referenceData.provenance.historicalPublication !== false ||
      referenceData.provenance.nationalHistoricalCompletenessProven !== false ||
      referenceData.counts.complexes !== 3158 || referenceData.counts.positivePoints !== 54131) return false;

  const expectedDates = ["2024-01-01"];
  for (let year = 2024; year <= 2026; year++) {
    for (let month = 1; month <= (year === 2026 ? 8 : 12); month++) {
      expectedDates.push(new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10));
    }
  }
  if (referenceData.dates.length !== source.expectedPointCount ||
      referenceData.dates.some((date, index) => date !== expectedDates[index])) return false;
  const entries = Object.entries(referenceData.series);
  let positivePoints = 0;
  if (entries.length !== referenceData.counts.complexes) return false;
  for (const [id, values] of entries) {
    if (!isExactId(id) || values.length !== source.expectedPointCount || values.at(-1) === null) return false;
    for (const value of values) {
      if (value === null) continue;
      if (!Number.isSafeInteger(value) || value <= 0) return false;
      positivePoints++;
    }
  }
  return positivePoints === referenceData.counts.positivePoints;
}

const packageValid = isValidPackage();
const series: Readonly<Record<string, readonly (number | null)[]>> = referenceData.series;

/** Select exact IDs without combining reference values and published history. */
export function selectComplexHistoryReference(
  complexIds: readonly (string | number)[],
  anchors: Readonly<Record<string, ComplexHistoryReferenceAnchor | undefined>>,
): ComplexHistoryReferenceSelection {
  const rowsById: Record<string, ComplexHistoryReferenceRow[]> = Object.create(null);
  const metadataById: Record<string, ComplexHistoryReferenceMetadata> = Object.create(null);
  for (const requested of complexIds) {
    const id = String(requested);
    const values = Object.hasOwn(series, id) ? series[id] : undefined;
    const anchor = Object.hasOwn(anchors, id) ? anchors[id] : undefined;
    let reason: ComplexHistoryReferenceUnavailableReason | undefined;
    if (!isExactId(id)) reason = "INVALID_COMPLEX_ID";
    else if (!packageValid) reason = "INVALID_REFERENCE_DATA";
    else if (!values) reason = "NO_REFERENCE_HISTORY";
    else if (!anchor) reason = "PUBLIC_ANCHOR_UNAVAILABLE";
    else if (anchor.generationId !== source.generationId || anchor.publicationVersion !== source.publicationVersion) reason = "PUBLICATION_CHANGED";
    else if (anchor.snapshotDate !== source.snapshotDate ||
             !Number.isSafeInteger(anchor.marketCapKrw) ||
             anchor.marketCapKrw !== values.at(-1)) reason = "PUBLIC_ANCHOR_CHANGED";

    if (reason || !values) {
      rowsById[id] = [];
      metadataById[id] = { available: false, reason, sourceKey: source.sourceKey, availableFrom: null, availableTo: null };
      continue;
    }
    rowsById[id] = referenceData.dates.map((date, index) => ({
      snapshot_date: date,
      complex_id: Number(id),
      market_cap_krw: values[index],
      rank_all: null,
      sourceKey: source.sourceKey,
    }));
    const first = values.findIndex((value) => value !== null);
    metadataById[id] = {
      available: true,
      sourceKey: source.sourceKey,
      availableFrom: referenceData.dates[first],
      availableTo: source.snapshotDate,
    };
  }
  return { rowsById, metadataById, source: { ...source } };
}
