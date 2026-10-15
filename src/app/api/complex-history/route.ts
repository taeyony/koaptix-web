import { mapComplexChartHistoryMap } from "../../../lib/koaptix/mappers";
import { COMPLEX_CHART_HISTORY_ROW_LIMIT, getComplexChartHistories, getComplexHistoryPublicAnchors } from "../../../lib/koaptix/queries";
import type { ComplexChartMode } from "../../../lib/koaptix/types";
import { KOAPTIX_OFFICIAL_BASE_DATE } from "../../../types/koaptix";
import { isLocalHistoryReview, readLocalHistoryRecovery } from "../../../lib/koaptix/complexHistoryRecovery";
import { selectComplexHistoryReference } from "../../../lib/koaptix/complexHistoryReference";

function parseComplexIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const complexIds = parseComplexIds(searchParams.get("complexId"));
  const requestedMode = searchParams.get("mode");
  const mode: ComplexChartMode =
    requestedMode === "monthly" || requestedMode === "yearly" || requestedMode === "ma7"
      ? requestedMode
      : "weekly";
  const daysParam = Number(searchParams.get("days") ?? "180");
  const days = Number.isFinite(daysParam) ? daysParam : 180;
  const sinceBase = searchParams.get("range") === "since-base";
  const referenceRequested = searchParams.get("source") === "reference" && sinceBase && mode !== "ma7";

  if (complexIds.length === 0) {
    return Response.json(
      { error: "complexId is required" },
      { status: 400, ...(referenceRequested ? { headers: { "Cache-Control": "no-store" } } : {}) }
    );
  }
  if (referenceRequested && (complexIds.length > 10 || complexIds.some((id) => !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))))) {
    return Response.json({ error: "Reference history requires 1 to 10 valid complex IDs" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const recovery = isLocalHistoryReview(request.url) ? await readLocalHistoryRecovery(complexIds) : null;
    const reference = !recovery && referenceRequested
      ? selectComplexHistoryReference(complexIds, await getComplexHistoryPublicAnchors(complexIds))
      : null;
    const publishedIds = reference
      ? complexIds.filter((id) => !reference.metadataById[id]?.available)
      : complexIds;
    const publishedRows = !recovery && publishedIds.length
      ? await getComplexChartHistories(publishedIds, { days, ...(sinceBase ? { sinceBase: true } : {}) })
      : {};
    // One basis per complex: never join retrospective recalculations to older
    // publication vintages. A rejected reference explicitly falls back below.
    const rowsById = recovery?.rowsById ?? { ...reference?.rowsById, ...publishedRows };
    const mappedById = mapComplexChartHistoryMap(rowsById, {
      mode,
      maxPoints: sinceBase ? COMPLEX_CHART_HISTORY_ROW_LIMIT : mode === "ma7" ? 60 : 26,
    });

    const series = complexIds.map((complexId) => {
      const points = mappedById[complexId] ?? [];
      if (!sinceBase) return { complexId, points };
      const dates = (rowsById[complexId] ?? [])
        .filter((row) => Number.isFinite(Number(row.market_cap_krw)) && Number(row.market_cap_krw) > 0)
        .map((row) => row.snapshot_date)
        .sort();
      return {
        complexId,
        points,
        range: {
          requestedStartDate: KOAPTIX_OFFICIAL_BASE_DATE,
          availableFrom: dates[0] ?? null,
          availableTo: dates[dates.length - 1] ?? null,
          ...(recovery ? {
            basis: "restored-local-review",
            localOnly: true,
            sourceObservedAt: recovery.sourceObservedAt,
            sourceNote: recovery.sourceNote,
            expectedPointCount: recovery.expectedPointCount,
            excludedPointCount: recovery.expectedPointCount - dates.length,
            reviewBlockedReasons: recovery.reasonsById[complexId] ?? [],
          } : reference?.metadataById[complexId]?.available ? {
            basis: "reference",
            sourceObservedAt: reference.source.sourceObservedAt,
            sourceNote: reference.source.sourceNote,
            expectedPointCount: reference.source.expectedPointCount,
            excludedPointCount: reference.source.expectedPointCount - dates.length,
          } : reference ? { basis: "published", referenceUnavailable: true } : {}),
        },
      };
    });

    return Response.json(
      {
        data: {
          mode,
          series,
        },
      },
      { status: 200, ...(referenceRequested ? { headers: { "Cache-Control": "no-store" } } : {}) }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "히스토리 차트를 불러오지 못했다.",
      },
      { status: 500, ...(referenceRequested ? { headers: { "Cache-Control": "no-store" } } : {}) }
    );
  }
}
