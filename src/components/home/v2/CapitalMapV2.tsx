"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import southKoreaMap from "@svg-maps/south-korea";

import { HomeV2SectionHeading } from "./HomeV2SectionHeading";
import { getRankingUniverseRegistry, getUniverseLabel } from "../../../lib/koaptix/universes";
import { parseDistrictIdentity, resolveSidoFromUniverseCode } from "../RankingBoardClient";

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

export function CapitalMapV2({ universeCode, universeLabel, universeUnavailable }: { universeCode: string; universeLabel: string; universeUnavailable: boolean }) {
  const enabledUniverses = getRankingUniverseRegistry();
  const selectedSido = resolveSidoFromUniverseCode(universeCode);
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
    const timeout = window.setTimeout(() => controller.abort(), 5_000);

    void fetch(`/api/map?universe_code=${encodeURIComponent(universeCode)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as MapPayload;
        if (
          !response.ok ||
          payload.ok !== true ||
          payload.requestedUniverseCode !== universeCode ||
          payload.renderedUniverseCode !== universeCode ||
          !Array.isArray(payload.items)
        ) {
          throw new Error(
            "선택한 지역의 공개 분포를 불러오지 못했습니다.",
          );
        }
        if (active) {
          setState({ status: "ready", payload, message: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
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
  }, [retryKey, universeCode, universeUnavailable]);

  const regions =
    state.status === "ready" ? (state.payload.items ?? []).slice(0, 7) : [];
  const maxTotal = Math.max(1, ...regions.map((item) => item.totalMarketCap));
  function regionHref(region: MapItem): string | null {
    const sidoLabel = selectedSido ? getUniverseLabel(selectedSido).replace(/\s+전체$/, "") : null;
    const regionName = sidoLabel && !parseDistrictIdentity(region.name)?.sido ? `${sidoLabel} ${region.name}` : region.name;
    const district = parseDistrictIdentity(regionName);
    if (!district?.sido) return null;
    const candidates = getRankingUniverseRegistry().filter((item) =>
      item.scope === "SIGUNGU" &&
      parseDistrictIdentity(item.label)?.sigungu === district.sigungu &&
      resolveSidoFromUniverseCode(item.code) === district.sido,
    );
    if (candidates.length === 1) {
      return `/ranking?universe=${encodeURIComponent(candidates[0].code)}`;
    }
    if (region.isBoardBacked && resolveSidoFromUniverseCode(universeCode) === district.sido) {
      return `/ranking?${new URLSearchParams({ universe: universeCode, district: regionName })}`;
    }
    const macro = enabledUniverses.find((item) => item.scope === "MACRO" && resolveSidoFromUniverseCode(item.code) === district.sido);
    if (macro) return `/ranking?${new URLSearchParams({ universe: macro.code, district: regionName })}`;
    return null;
  }

  return (
    <section
      id="capital-map"
      tabIndex={-1}
      className="ko-capital-map order-2 min-h-[260px] border-b border-[var(--ko-border)] py-8 lg:order-2 lg:border-b-0 lg:pr-8"
    >
      <HomeV2SectionHeading
        title="Capital Map"
        note={`${universeLabel} · 공개 표본 분포`}
      />
      <div className="ko-capital-map-content mt-6">
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
              const selected = Boolean(selectedSido && resolveSidoFromUniverseCode(code) === selectedSido);
              const path = <path
                key={location.id}
                d={location.path}
                className="ko-map-region"
                fill={selected ? "var(--ko-accent-soft)" : "var(--ko-map-surface)"}
                stroke="var(--ko-accent)"
                strokeWidth="1.1"
                opacity={enabled ? 1 : 0.45}
                vectorEffect="non-scaling-stroke"
              ><title>{`${label}${enabled ? " 지역 분포 보기" : " · 공개 랭킹 공표 준비 중"}`}</title></path>;
              return enabled ? <a key={location.id} href={`/?universe=${encodeURIComponent(code)}#capital-map`}
                className="ko-map-region-link" aria-label={`${label} 지역 분포 보기`} aria-current={selected ? "true" : undefined}>{path}</a>
                : <g key={location.id} aria-label={`${label} · 공개 랭킹 공표 준비 중`}>{path}</g>;
            })}
          </svg>
          <figcaption className="text-center text-caption tracking-label text-muted">
            <p>{universeLabel} · 지역 분포 개요</p>
            <p className="mt-1">
              지도: <a className="ko-text-link" href="https://mapsvg.com/maps/south-korea">MapSVG</a>
              {" · "}<a className="ko-text-link" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
              {" · 색상·표시 조정"}
            </p>
          </figcaption>
          <p className="text-center text-control font-semibold text-accent">지역을 눌러 공개 랭킹 보기 ↗</p>
          <p className="text-center text-caption text-muted">윤곽에 커서를 올리면 지역명이 표시됩니다. 공표 준비 중인 지역은 옅게 표시합니다.</p>
        </figure>

        <div className="ko-capital-map-regions space-y-3.5">
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
                {href ? <Link href={href} className="min-w-0 font-medium text-ink hover:text-accent">{label}</Link> : <span className="min-w-0 font-medium text-muted">{label} · 참고</span>}
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
        </div>
      </div>
      {state.status === "ready" ? (
        <p className="mt-5 text-caption leading-copy text-muted">
          공개 랭킹 표본 {state.payload.renderedLimit ?? "—"}개를 묶은 분포입니다. 지역 전체 총액이 아닙니다.
          {state.payload.snapshot_date
            ? ` · ${state.payload.snapshot_date} 기준`
            : ""}
        </p>
      ) : null}
    </section>
  );
}
