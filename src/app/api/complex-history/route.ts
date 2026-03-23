import { mapComplexChartHistoryMap } from "../../../lib/koaptix/mappers";
import { getComplexChartHistories } from "../../../lib/koaptix/queries";
import type { ComplexChartMode } from "../../../lib/koaptix/types";

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
  const mode = (searchParams.get("mode") as ComplexChartMode | null) ?? "weekly";
  const daysParam = Number(searchParams.get("days") ?? "180");
  const days = Number.isFinite(daysParam) ? daysParam : 180;

  if (complexIds.length === 0) {
    return Response.json(
      { error: "complexId is required" },
      { status: 400 }
    );
  }

  try {
    const rowsById = await getComplexChartHistories(complexIds, { days });
    const mappedById = mapComplexChartHistoryMap(rowsById, {
      mode: mode === "ma7" ? "ma7" : "weekly",
      maxPoints: mode === "ma7" ? 60 : 26,
    });

    const series = complexIds.map((complexId) => ({
      complexId,
      points: mappedById[complexId] ?? [],
    }));

    return Response.json(
      {
        data: {
          mode: mode === "ma7" ? "ma7" : "weekly",
          series,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "히스토리 차트를 불러오지 못했다.",
      },
      { status: 500 }
    );
  }
}