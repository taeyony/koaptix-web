import { mapComplexChartHistoryRows } from "../../../lib/koaptix/mappers";
import { getComplexChartHistory } from "../../../lib/koaptix/queries";
import type { ComplexChartMode } from "../../../lib/koaptix/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const complexId = searchParams.get("complexId");
  const mode = (searchParams.get("mode") as ComplexChartMode | null) ?? "weekly";
  const daysParam = Number(searchParams.get("days") ?? "180");
  const days = Number.isFinite(daysParam) ? daysParam : 180;

  if (!complexId) {
    return Response.json(
      { error: "complexId is required" },
      { status: 400 }
    );
  }

  try {
    const rows = await getComplexChartHistory(complexId, { days });
    const data = mapComplexChartHistoryRows(rows, {
      mode: mode === "ma7" ? "ma7" : "weekly",
      maxPoints: mode === "ma7" ? 60 : 26,
    });

    return Response.json({ data }, { status: 200 });
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