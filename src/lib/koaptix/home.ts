import { getSupabaseAdminClient } from "../supabase/admin";
import {
  KOAPTIX_OFFICIAL_BASE_DATE,
  KOAPTIX_OFFICIAL_INDEX_BASELINE_MODE,
  KOAPTIX_OFFICIAL_INDEX_SOURCE_MODE,
  KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
  KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
  KOAPTIX_PUBLIC_INDEX_SOURCE_MODE,
  KOAPTIX_PUBLIC_SERVICE_BASE_DATE,
  KOAPTIX_PUBLIC_SERVICE_BASE_VALUE,
  type KoaptixHomeApiData,
  type KoaptixHomePayloadViewRow,
  type KoaptixIndexChartPoint,
} from "../../types/koaptix";

export class OfficialIndexPublicExposureBlockedError extends Error {
  constructor(message = "KOAPTIX official index genesis is not public-exposed") {
    super(message);
    this.name = "OfficialIndexPublicExposureBlockedError";
  }
}

export interface HomePayloadOptions {
  topN?: number;
  chartPoints?: number;
}

const KOAPTIX_KOREA_INDEX_CODE = "KOAPTIX_KOREA";
const KOAPTIX_KOREA_UNIVERSE_CODE = "KOREA_ALL";
const KOAPTIX_HOME_PUBLIC_SERVICE_VIEW =
  "v_koaptix_home_public_service_payload_published";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeDate(value: string | null | undefined): string | null {
  return value?.slice?.(0, 10) ?? null;
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isOfficialGenesisMetadata(
  baseDate: string | null,
  sourceMode?: string | null,
  baselineMode?: string | null,
): boolean {
  return (
    baseDate === KOAPTIX_OFFICIAL_BASE_DATE ||
    sourceMode === KOAPTIX_OFFICIAL_INDEX_SOURCE_MODE ||
    baselineMode === KOAPTIX_OFFICIAL_INDEX_BASELINE_MODE
  );
}

function isPublicServiceCompatibleMetadata(
  baseDate: string | null,
  sourceMode?: string | null,
  baselineMode?: string | null,
): boolean {
  if (isOfficialGenesisMetadata(baseDate, sourceMode, baselineMode)) return false;
  if (baseDate && baseDate !== KOAPTIX_PUBLIC_SERVICE_BASE_DATE) return false;
  if (sourceMode && sourceMode !== KOAPTIX_PUBLIC_INDEX_SOURCE_MODE) return false;
  if (baselineMode && baselineMode !== KOAPTIX_PUBLIC_INDEX_BASELINE_MODE) return false;
  return true;
}

function assertPublicServiceMetadata(
  baseDate: string | null,
  sourceMode?: string | null,
  baselineMode?: string | null,
) {
  if (isOfficialGenesisMetadata(baseDate, sourceMode, baselineMode)) {
    throw new OfficialIndexPublicExposureBlockedError();
  }

  if (baseDate && baseDate !== KOAPTIX_PUBLIC_SERVICE_BASE_DATE) {
    throw new OfficialIndexPublicExposureBlockedError(
      `KOAPTIX public home payload baseline ${baseDate} is not approved for public service`,
    );
  }

  if (sourceMode && sourceMode !== KOAPTIX_PUBLIC_INDEX_SOURCE_MODE) {
    throw new OfficialIndexPublicExposureBlockedError(
      `KOAPTIX public home payload source mode ${sourceMode} is not approved for public service`,
    );
  }

  if (baselineMode && baselineMode !== KOAPTIX_PUBLIC_INDEX_BASELINE_MODE) {
    throw new OfficialIndexPublicExposureBlockedError(
      `KOAPTIX public home payload baseline mode ${baselineMode} is not approved for public service`,
    );
  }
}

function rowContainsOfficialGenesisMetadata(row: KoaptixHomePayloadViewRow): boolean {
  if (
    isOfficialGenesisMetadata(
      normalizeDate(row.index_card?.base_date),
      row.index_card?.index_source_mode,
      row.index_card?.baseline_mode,
    ) ||
    isOfficialGenesisMetadata(normalizeDate(row.base_date))
  ) {
    return true;
  }

  return (row.index_chart ?? []).some((point) =>
    isOfficialGenesisMetadata(
      normalizeDate(point.base_date),
      point.index_source_mode,
      point.baseline_mode,
    ),
  );
}

function getSafePublicChartPoints(row: KoaptixHomePayloadViewRow): KoaptixIndexChartPoint[] {
  return (row.index_chart ?? []).filter((point) => {
    const pointBaseDate = normalizeDate(point.base_date) ?? KOAPTIX_PUBLIC_SERVICE_BASE_DATE;
    return (
      Boolean(point.snapshot_date) &&
      toFiniteNumber(point.index_value) !== null &&
      isPublicServiceCompatibleMetadata(
        pointBaseDate,
        point.index_source_mode,
        point.baseline_mode,
      )
    );
  });
}

function getPublicBaseDate(
  row: KoaptixHomePayloadViewRow,
  safeChartPoints: KoaptixIndexChartPoint[],
): string {
  const candidates = [
    normalizeDate(row.index_card?.base_date),
    normalizeDate(row.base_date),
    ...safeChartPoints.map((point) => normalizeDate(point.base_date)),
  ].filter((value): value is string => Boolean(value));

  for (const baseDate of candidates) {
    assertPublicServiceMetadata(baseDate);
  }

  return candidates[0] ?? KOAPTIX_PUBLIC_SERVICE_BASE_DATE;
}

function getPublicBaseValue(
  row: KoaptixHomePayloadViewRow,
  safeChartPoints: KoaptixIndexChartPoint[],
): number {
  return (
    toFiniteNumber(row.index_card?.base_value) ??
    safeChartPoints
      .map((point) => toFiniteNumber(point.base_value))
      .find((value): value is number => value !== null) ??
    KOAPTIX_PUBLIC_SERVICE_BASE_VALUE
  );
}

function requireHomeRankIdentity(row: KoaptixHomePayloadViewRow) {
  const rankSnapshotDate = normalizeDate(row.rank_snapshot_date);
  const parsedSnapshotDate = rankSnapshotDate
    ? new Date(`${rankSnapshotDate}T00:00:00Z`)
    : null;
  if (
    !rankSnapshotDate ||
    rankSnapshotDate !== row.rank_snapshot_date ||
    !parsedSnapshotDate ||
    Number.isNaN(parsedSnapshotDate.getTime()) ||
    parsedSnapshotDate.toISOString().slice(0, 10) !== rankSnapshotDate
  ) {
    throw new Error("KOAPTIX home rank_snapshot_date must be YYYY-MM-DD");
  }

  const generationId = row.rank_generation_id?.toLowerCase();
  const eventId = row.rank_publication_event_id?.toLowerCase();
  if (!UUID_PATTERN.test(generationId ?? "")) {
    throw new Error("KOAPTIX home rank_generation_id is invalid");
  }
  if (!UUID_PATTERN.test(eventId ?? "")) {
    throw new Error("KOAPTIX home rank_publication_event_id is invalid");
  }

  const publicationVersion = toFiniteNumber(row.rank_publication_version);
  if (
    publicationVersion === null ||
    !Number.isSafeInteger(publicationVersion) ||
    publicationVersion <= 0
  ) {
    throw new Error("KOAPTIX home rank_publication_version is invalid");
  }

  if (
    typeof row.rank_published_at !== "string" ||
    Number.isNaN(Date.parse(row.rank_published_at))
  ) {
    throw new Error("KOAPTIX home rank_published_at is invalid");
  }

  return {
    rank_snapshot_date: rankSnapshotDate,
    rank_generation_id: generationId!,
    rank_publication_version: publicationVersion,
    rank_publication_event_id: eventId!,
    rank_published_at: row.rank_published_at,
  };
}

function buildPublicHomePayload(
  row: KoaptixHomePayloadViewRow,
  topN: number,
  chartPoints: number,
): KoaptixHomeApiData | null {
  const rankIdentity = requireHomeRankIdentity(row);
  const cardBaseDate = normalizeDate(row.index_card?.base_date);
  const rowBaseDate = normalizeDate(row.base_date);

  if (
    !isPublicServiceCompatibleMetadata(
      cardBaseDate,
      row.index_card?.index_source_mode,
      row.index_card?.baseline_mode,
    ) ||
    !isPublicServiceCompatibleMetadata(rowBaseDate) ||
    toFiniteNumber(row.index_card?.index_value) === null
  ) {
    return null;
  }

  const safeChartPoints = getSafePublicChartPoints(row);
  const baseDate = getPublicBaseDate(row, safeChartPoints);
  const baseValue = getPublicBaseValue(row, safeChartPoints);
  const indexCard = {
    ...row.index_card,
    base_date: baseDate,
    base_value: baseValue,
    index_source_mode: KOAPTIX_PUBLIC_INDEX_SOURCE_MODE,
    baseline_mode: KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
    public_exposure_status: KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
  };
  const chart = safeChartPoints
    .map((point) => {
      const pointBaseDate = normalizeDate(point.base_date) ?? baseDate;
      assertPublicServiceMetadata(
        pointBaseDate,
        point.index_source_mode,
        point.baseline_mode,
      );

      return {
        ...point,
        base_date: pointBaseDate,
        base_value: toFiniteNumber(point.base_value) ?? baseValue,
        index_source_mode: KOAPTIX_PUBLIC_INDEX_SOURCE_MODE,
        baseline_mode: KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
        public_exposure_status: KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
      };
    })
    .slice(-chartPoints);

  return {
    ...rankIdentity,
    indexCard,
    chart,
    baseDate,
    baseValue,
    indexSourceMode: KOAPTIX_PUBLIC_INDEX_SOURCE_MODE,
    baselineMode: KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
    publicExposureStatus: KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
    officialGenesisPublicExposureBlocked: rowContainsOfficialGenesisMetadata(row),
    topRanks: (row.top50 ?? []).slice(0, topN),
    topN,
    chartPoints,
    top50Count: row.top50_count,
    totalRankedComplexes: row.total_ranked_complexes,
    fetchedAt: new Date().toISOString(),
  };
}

async function loadPublicHomePayloadFromView(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  topN: number,
  chartPoints: number,
): Promise<KoaptixHomeApiData> {
  const { data, error } = await supabase
    .from(KOAPTIX_HOME_PUBLIC_SERVICE_VIEW)
    .select("*")
    .eq("index_code", KOAPTIX_KOREA_INDEX_CODE)
    .eq("universe_code", KOAPTIX_KOREA_UNIVERSE_CODE)
    .eq("base_date", KOAPTIX_PUBLIC_SERVICE_BASE_DATE)
    .single();

  if (error) {
    throw new Error(
      `Failed to load ${KOAPTIX_HOME_PUBLIC_SERVICE_VIEW}: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `${KOAPTIX_HOME_PUBLIC_SERVICE_VIEW} returned no published row`,
    );
  }

  const payload = buildPublicHomePayload(
    data as unknown as KoaptixHomePayloadViewRow,
    topN,
    chartPoints,
  );
  if (!payload) {
    throw new OfficialIndexPublicExposureBlockedError();
  }

  return payload;
}

export async function getKoaptixHomePayload(
  options: HomePayloadOptions = {},
): Promise<KoaptixHomeApiData> {
  const topN = clampInt(options.topN, 1, 50, 50);
  const chartPoints = clampInt(options.chartPoints, 3, 36, 12);

  const supabase = getSupabaseAdminClient();

  return loadPublicHomePayloadFromView(
    supabase,
    topN,
    chartPoints,
  );
}
