"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import southKoreaMap from "@svg-maps/south-korea";

import { HomeV2SectionHeading } from "./HomeV2SectionHeading";
import { getRankingUniverseRegistry, getUniverseLabel } from "../../../lib/koaptix/universes";
import { getDistrictRankingHref } from "../../../lib/koaptix/districtRankingHref";
import { resolveSidoFromUniverseCode } from "../../../lib/koaptix/districtIdentity";
import { groupMapProvinces, summarizePublishedMap, type PublishedMapSummary } from "../../../lib/koaptix/mapPresentation";

type MapItem = {
  name: string;
  query: string;
  totalMarketCap: number;
  averageDelta: number;
  count: number;
  boardCount: number;
  isBoardBacked: boolean;
  primaryComplexId: string | null;
  primaryComplexName: string | null;
  primaryRank: number | null;
  peakComplexMarketCap: number;
  peakComplexName: string | null;
};
const emptyDistricts: MapItem[] = [];

type SouthKoreaMapLocation = {
  id: string;
  name: string;
  path: string;
};

const southKoreaMapLocations = southKoreaMap.locations as SouthKoreaMapLocation[];
const mapUniverses: Record<string, string> = {
  seoul: "SEOUL_ALL", busan: "BUSAN_ALL", daegu: "DAEGU_ALL", incheon: "INCHEON_ALL",
  gwangju: "GWANGJU_ALL", daejeon: "DAEJEON_ALL", ulsan: "ULSAN_ALL", sejong: "SEJONG_ALL",
  gyeonggi: "GYEONGGI_ALL", gangwon: "GANGWON_ALL", "north-chungcheong": "CHUNGBUK_ALL",
  "south-chungcheong": "CHUNGNAM_ALL", "north-jeolla": "JEONBUK_ALL", "south-jeolla": "JEONNAM_ALL",
  "north-gyeongsang": "GYEONGBUK_ALL", "south-gyeongsang": "GYEONGNAM_ALL", jeju: "JEJU_ALL",
};

type MapPayload = {
  ok?: boolean;
  requestedUniverseCode?: string;
  renderedUniverseCode?: string;
  renderedLimit?: number;
  aggregationBasis?: string;
  sourceRowsUsed?: number;
  unclassifiedCount?: number;
  resultCount?: number;
  snapshot_date?: string | null;
  reason?: string | null;
  items?: MapItem[];
};

type MapState =
  | { status: "loading"; payload: null; message: null }
  | { status: "ready"; payload: MapPayload; message: null }
  | { status: "error"; payload: null; message: string };

const numberFormat = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

function totalLabel(value: number): string {
  return Number.isFinite(value) && value > 0
    ? `${numberFormat.format(value / 1_000_000_000_000)}조`
    : "—";
}

export function CapitalMapV2({ universeCode, universeLabel, universeUnavailable, onSummary }: { universeCode: string; universeLabel: string; universeUnavailable: boolean; onSummary?: (summary: PublishedMapSummary | null) => void }) {
  const enabledUniverses = getRankingUniverseRegistry();
  const selectedSido = resolveSidoFromUniverseCode(universeCode);
  const [provinceChoice, setProvinceChoice] = useState<{ scope: string; name: string } | null>(null);
  const [previewProvince, setPreviewProvince] = useState<string | null>(null);
  const [showAllProvinces, setShowAllProvinces] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<MapState>({
    status: "loading",
    payload: null,
    message: null,
  });

  useEffect(() => {
    if (universeUnavailable) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    void fetch(`/api/map?universe_code=${encodeURIComponent(universeCode)}&aggregation=top1000`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as MapPayload;
        if (
          !response.ok ||
          payload.ok !== true ||
          payload.requestedUniverseCode !== universeCode ||
          payload.renderedUniverseCode !== universeCode ||
          !Array.isArray(payload.items) || payload.aggregationBasis !== "PUBLISHED_TOP1000" ||
          payload.items.reduce((sum, item) => sum + item.count, 0) !== payload.sourceRowsUsed
        ) {
          throw new Error(
            "선택한 지역의 공개 분포를 불러오지 못했습니다.",
          );
        }
        if (active) {
          onSummary?.(summarizePublishedMap(payload, universeCode));
          setState({ status: "ready", payload, message: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          onSummary?.(null);
          setState({
            status: "error",
            payload: null,
            message:
              error instanceof Error && error.name === "AbortError"
                ? "지역 분포 응답이 지연되고 있습니다. 다시 시도해 주세요."
                : "선택한 지역의 공개 분포를 불러오지 못했습니다.",
          });
        }
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [retryKey, universeCode, universeUnavailable, onSummary]);

  const districts = state.status === "ready" ? state.payload.items ?? emptyDistricts : emptyDistricts;
  const provinces = useMemo(() => groupMapProvinces(districts)
    .sort((a, b) => b.totalMarketCap - a.totalMarketCap || a.name.localeCompare(b.name, "ko")), [districts]);
  const selectedProvince = provinceChoice?.scope === universeCode ? provinceChoice.name : null;
  const activeProvince = previewProvince ?? selectedProvince;
  const provinceView = universeCode === "KOREA_ALL" && !activeProvince;
  const activeGroup = provinces.find(province => province.name === activeProvince);
  const rows = provinceView ? provinces : activeProvince ? activeGroup?.members ?? [] : districts;
  const regions = rows.slice(0, provinceView && showAllProvinces ? rows.length : 7);
  const maxTotal = Math.max(1, ...regions.map((item) => item.totalMarketCap));
  function regionHref(region: { name: string }): string | null {
    return getDistrictRankingHref(region.name, universeCode);
  }
  function chooseProvince(name: string | null) {
    setProvinceChoice(name ? { scope: universeCode, name } : null);
    setPreviewProvince(null);
    setShowAllProvinces(false);
  }

  return (
    <section
      id="capital-map"
      tabIndex={-1}
      className="ko-capital-map order-2 min-h-[260px] border-b border-[var(--ko-border)] py-8 lg:order-2 lg:border-b-0 lg:pr-8"
    >
      <HomeV2SectionHeading
        title="지역별 시가총액"
        note={`${universeLabel} · 공개 단지의 지역별 합계`}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-0 items-center gap-2 text-control text-muted">
          시도 선택
          <select aria-label="지도에서 살펴볼 시도" value={selectedProvince ?? ""}
            onChange={event => chooseProvince(event.target.value || null)}
            disabled={state.status !== "ready" || universeUnavailable}
            className="min-h-10 min-w-0 rounded-lg border border-[var(--ko-border)] bg-surface px-3 font-semibold text-ink">
            <option value="">{universeCode === "KOREA_ALL" ? "전국 시도 순위" : `${universeLabel} 시군구 순위`}</option>
            {provinces.map(province => <option key={province.name} value={province.name}>{province.name} · {province.count}개</option>)}
          </select>
        </label>
        {selectedProvince ? <button type="button" className="ko-text-link min-h-10 text-control font-semibold" onClick={() => chooseProvince(null)}>전체 목록으로</button> : null}
      </div>
      <div className="ko-capital-map-content mt-4">
        <figure className="ko-capital-map-figure text-ink">
          <svg
            role="group"
            aria-labelledby="capital-map-title"
            viewBox={southKoreaMap.viewBox}
            className="ko-capital-map-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <title id="capital-map-title">대한민국 17개 시도 지도</title>
            {/* Map geometry: MapSVG, CC BY 4.0, via @svg-maps/south-korea. */}
            {southKoreaMapLocations.map((location) => {
              const code = mapUniverses[location.id];
              const enabled = enabledUniverses.some((item) => item.code === code);
              const label = getUniverseLabel(code);
              const name = label.replace(/ 전체$/, "");
              const province = provinces.find(item => item.name === name);
              const available = enabled && province !== undefined && !universeUnavailable;
              const selected = activeProvince ? activeProvince === name : Boolean(selectedSido && resolveSidoFromUniverseCode(code) === selectedSido);
              const unavailableLabel = state.status === "loading" && !universeUnavailable ? "공개 자료 확인 중" : state.status === "error" || universeUnavailable ? "공개 자료 확인 불가" : "현재 표본에 포함된 단지 없음";
              const path = <path
                key={location.id}
                d={location.path}
                className="ko-map-region"
                fill={selected ? "var(--ko-accent-soft)" : "var(--ko-map-surface)"}
                stroke="var(--ko-accent)"
                strokeWidth="1.1"
                opacity={available ? 1 : 0.45}
                vectorEffect="non-scaling-stroke"
              ><title>{available ? `${name} · ${totalLabel(province.totalMarketCap)} · ${province.count}개 · 시군구 순위 보기` : `${label} · ${unavailableLabel}`}</title></path>;
              return available ? <g key={location.id} role="button" tabIndex={0}
                className="ko-map-region-link" data-active={selected} aria-label={`${name} 시군구 순위 보기`} aria-pressed={selectedProvince === name} aria-controls="capital-map-regions"
                onMouseEnter={() => setPreviewProvince(name)} onMouseLeave={() => setPreviewProvince(null)}
                onFocus={() => setPreviewProvince(name)} onBlur={() => setPreviewProvince(null)}
                onClick={() => chooseProvince(name)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseProvince(name); } }}>{path}</g>
                : <g key={location.id} aria-label={`${label} · ${unavailableLabel}`}>{path}</g>;
            })}
          </svg>
          <figcaption className="sr-only">{universeLabel} 공개 표본의 시도별 분포. 지역을 선택하면 같은 표본 안의 시군구 순위를 볼 수 있어요.</figcaption>
        </figure>

        <div id="capital-map-regions" className="ko-capital-map-regions space-y-3.5" aria-label={provinceView ? "시도별 시가총액 순위" : `${activeProvince ?? universeLabel} 시군구별 시가총액 순위`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-control font-semibold text-ink">{provinceView ? "시도별 순위" : `${activeProvince ?? universeLabel} 시군구 순위`}</h3>
            {activeGroup ? <span className="text-caption tabular-nums text-muted">{totalLabel(activeGroup.totalMarketCap)} · {activeGroup.count}개</span> : null}
          </div>
          {universeUnavailable ? <p className="py-6 text-xs text-muted">이 지역의 공개 분포는 아직 제공되지 않습니다.</p> : null}
          {state.status === "loading" && !universeUnavailable
            ? Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 animate-pulse bg-[var(--ko-selected-neutral)]" />
                  <div className="h-px bg-[var(--ko-selected-neutral)]" />
                </div>
              ))
            : null}
          {state.status === "error" ? (
            <div className="border-y border-dashed border-[var(--ko-border)] py-6 text-xs text-muted">
              <p>{state.message}</p>
              <button
                type="button"
                onClick={() => {
                  setState({ status: "loading", payload: null, message: null });
                  setRetryKey((value) => value + 1);
                }}
                className="mt-3 border-b border-accent pb-1 font-semibold text-accent"
              >
                다시 시도
              </button>
            </div>
          ) : null}
          {state.status === "ready" && !regions.length ? (
            <p className="border-y border-dashed border-[var(--ko-border)] py-8 text-sm text-muted">
              현재 공개된 지역 집계가 없습니다.
            </p>
          ) : null}
          {regions.map((region, index) => {
            const href = regionHref(region);
            const label = `${String(index + 1).padStart(2, "0")} ${region.name}`;
            return (
            <div key={`${region.name}:${region.query}`}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                {provinceView ? <button type="button" aria-controls="capital-map-regions" onClick={() => chooseProvince(region.name)} className="min-h-10 min-w-0 text-left font-semibold text-ink hover:text-accent">{label} <span aria-hidden="true">›</span></button>
                  : href ? <Link href={href} className="inline-flex min-h-10 min-w-0 items-center font-medium text-ink hover:text-accent">{label} ↗</Link> : <span className="min-w-0 font-medium text-muted">{label} · 참고</span>}
                <span className="shrink-0 font-mono tabular-nums text-muted">
                  {totalLabel(region.totalMarketCap)} · {region.count}개
                </span>
              </div>
              <div className="h-px bg-[var(--ko-selected-neutral)]">
                <div
                  className="h-px bg-accent"
                  style={{
                    width: `${Math.max(
                      7,
                      (region.totalMarketCap / maxTotal) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
            );
          })}
          {provinceView && provinces.length > 7 ? <button type="button" aria-expanded={showAllProvinces} onClick={() => setShowAllProvinces(value => !value)} className="ko-text-link min-h-10 text-control font-semibold">{showAllProvinces ? "상위 7개 시도만 보기" : `${provinces.length}개 시도 모두 보기`}</button> : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--ko-border)] pt-4 text-caption text-muted">
        <span>지도나 목록에서 지역을 선택해 보세요.</span>
        <Link href={`/map?universe=${encodeURIComponent(universeCode)}`} prefetch={false} className="ko-text-link inline-flex min-h-10 items-center font-semibold">카카오 네온맵에서 자세히 보기 ↗</Link>
        <details data-testid="map-attribution">
          <summary className="cursor-pointer underline decoration-dotted underline-offset-4">지도 출처</summary>
          <p className="mt-2">도형 제작: <a className="ko-text-link" href="https://mapsvg.com/maps/south-korea">MapSVG</a>{" · "}<a className="ko-text-link" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>{" · 색상과 표시 방식 변경"}</p>
        </details>
      </div>
      {state.status === "ready" ? (
        <p className="mt-5 text-caption leading-copy text-muted">
          공개 TOP{state.payload.sourceRowsUsed ?? "—"} 기준 · {activeProvince ? `${activeProvince}도 같은 공개 표본 안에서 살펴봐요. ` : ""}지역 전체 아파트의 합계는 아니에요.
          {state.payload.unclassifiedCount ? ` 지역 확인 중 ${state.payload.unclassifiedCount}개도 집계에 포함했어요.` : ""}
          {state.payload.snapshot_date
            ? ` · ${state.payload.snapshot_date} 기준`
            : ""}
        </p>
      ) : null}
    </section>
  );
}
