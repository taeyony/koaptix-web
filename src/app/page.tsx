/**
 * Home V2 reuses the published board/map/search delivery paths and keeps
 * the index fallback scoped to the selected service universe.
 */

import { HomeV2Terminal } from "../components/home/v2/HomeV2Terminal";
import {
  getUniverseLabel,
  resolveUniverseRequest,
} from "../lib/koaptix/universes";
import {
  KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
  KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
  KOAPTIX_PUBLIC_INDEX_SOURCE_MODE,
  KOAPTIX_PUBLIC_SERVICE_BASE_DATE,
  KOAPTIX_PUBLIC_SERVICE_BASE_VALUE,
} from "../types/koaptix";
import {
  getHomeKpi,
  getIndexChartPayload,
  toNullableNumber,
  type HomeIndexChartPayload,
} from "../lib/koaptix/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let lastGoodHomeKpi: Awaited<ReturnType<typeof getHomeKpi>> = null;
const lastGoodIndexChartPayloadByUniverse = new Map<string, HomeIndexChartPayload>();

type SearchParamValue = string | string[] | undefined;
type SearchParamsShape = Record<string, SearchParamValue>;

function pickSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function resolveSearchParams(
  input: Promise<SearchParamsShape> | undefined,
): Promise<SearchParamsShape | undefined> {
  return input ? await input : undefined;
}

function withTimeoutFallback<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      resolve(fallback);
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function buildEmptyIndexChartPayload(
  universeCode: string,
  renderedUniverseLabel = getUniverseLabel(universeCode),
): HomeIndexChartPayload {
  return {
    requestedUniverseCode: universeCode,
    renderedUniverseCode: universeCode,
    renderedUniverseLabel,
    isFallbackToKorea: false,
    indexCode: null,
    indexName: null,
    baseDate: KOAPTIX_PUBLIC_SERVICE_BASE_DATE,
    baseValue: KOAPTIX_PUBLIC_SERVICE_BASE_VALUE,
    indexSourceMode: KOAPTIX_PUBLIC_INDEX_SOURCE_MODE,
    baselineMode: KOAPTIX_PUBLIC_INDEX_BASELINE_MODE,
    publicExposureStatus: KOAPTIX_PUBLIC_EXPOSURE_BLOCKED,
    officialGenesisPublicExposureBlocked: false,
    mixedBaselineGuard: "passed",
    latestSnapshotDate: null,
    indexValue: null,
    change1m: null,
    changePct1m: null,
    totalMarketCapKrw: null,
    componentComplexCount: null,
    movement1m: null,
    rows: [],
  };
}

function buildSafeChartFallback(
  universeCode: string,
  cache: Map<string, HomeIndexChartPayload>,
  renderedUniverseLabel = getUniverseLabel(universeCode),
): HomeIndexChartPayload {
  const exact = cache.get(universeCode) ?? null;

  const exactUsable =
    exact &&
    exact.requestedUniverseCode === universeCode &&
    exact.renderedUniverseCode === universeCode;

  if (exactUsable) {
    return exact;
  }

  return buildEmptyIndexChartPayload(universeCode, renderedUniverseLabel);
}

function getUniverseResolutionLabel(
  resolution: ReturnType<typeof resolveUniverseRequest>,
) {
  return resolution.registryItem?.label ?? resolution.requestedUniverseCode;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);

  const rawUniverseParam = pickSingleParam(resolvedSearchParams?.universe);
  const universeResolution = resolveUniverseRequest(rawUniverseParam, {
    capability: "home",
  });
  const universeCode = universeResolution.requestedUniverseCode;
  const universeUnavailable = universeResolution.universeUnavailable;
  const universeLabel = getUniverseResolutionLabel(universeResolution);

  // Keep chart fallback scoped to the requested universe so a stale national
  // payload does not appear as the selected region.
  const chartFallback = buildSafeChartFallback(
    universeCode,
    lastGoodIndexChartPayloadByUniverse,
    universeLabel,
  );

  const [rawKpi, indexChartPayload] = await Promise.all([
    withTimeoutFallback(
      getHomeKpi()
        .then((data) => {
          if (data) {
            lastGoodHomeKpi = data;
          }
          return data;
        })
        .catch((error) => {
          console.warn("[HOME] getHomeKpi failed:", error);
          return lastGoodHomeKpi;
        }),
      2500,
      lastGoodHomeKpi,
    ),
    universeUnavailable
      ? Promise.resolve(chartFallback)
      : withTimeoutFallback(
          getIndexChartPayload(universeCode, 24)
            .then((payload) => {
              // Cache only exact-scope payloads for the same requested universe.
              if (
                payload.rows.length > 0 &&
                payload.requestedUniverseCode === universeCode &&
                payload.renderedUniverseCode === universeCode
              ) {
                lastGoodIndexChartPayloadByUniverse.set(universeCode, {
                  ...payload,
                  requestedUniverseCode: universeCode,
                  renderedUniverseCode: universeCode,
                  isFallbackToKorea: false,
                });
              }
              return payload;
            })
            .catch((error) => {
              console.warn("[HOME] getIndexChartPayload failed:", error);
              return chartFallback;
            }),
          4500,
          chartFallback,
        ),
  ]);

  const kpiDate = typeof rawKpi?.snapshot_date === "string"
    ? rawKpi.snapshot_date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null
    : null;

  return (
    <HomeV2Terminal
      index={indexChartPayload}
      totalMarketCapLabel={rawKpi?.total_market_cap_krw_string ?? null}
      currentnessDate={kpiDate}
      aggregateComplexCount={toNullableNumber(rawKpi?.listed_complex_count)}
      dataAvailable={indexChartPayload.rows.length > 0 || Boolean(rawKpi)}
      universeCode={universeCode}
      universeLabel={universeLabel}
      universeUnavailable={universeUnavailable}
    />
  );
}
