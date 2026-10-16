import { getComplexDetailById } from "../../../lib/koaptix/queries";
import { mapComplexDetailRow } from "../../../lib/koaptix/mappers";
import { resolveUniverseRequest } from "../../../lib/koaptix/universes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const complexId = searchParams.get("complexId");
  const scope = resolveUniverseRequest(searchParams.get("universe_code"), { capability: "ranking" });
  const snapshotDate = searchParams.get("snapshot_date");

  if (!complexId || !/^[1-9]\d*$/.test(complexId) || scope.universeUnavailable ||
      (snapshotDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate) ||
        Number.isNaN(Date.parse(snapshotDate)) || new Date(snapshotDate).toISOString().slice(0, 10) !== snapshotDate))) {
    return Response.json(
      { error: "단지 또는 지역·기준일을 확인해 주세요.", code: "INVALID_DETAIL_REQUEST" },
      { status: 400 }
    );
  }

  try {
    const row = await getComplexDetailById(complexId, scope.requestedUniverseCode, snapshotDate);

    if (!row) {
      return Response.json(
        { error: "선택한 지역의 공개 랭킹에서 이 단지를 확인하지 못했어요.", code: "PUBLIC_DETAIL_NOT_FOUND" },
        { status: 404 }
      );
    }

    return Response.json(
      { data: mapComplexDetailRow(row) },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const changed = error instanceof Error && error.message === "DETAIL_PUBLICATION_CHANGED";
    return Response.json(
      {
        error: changed ? "공개 기준일이 바뀌었어요. 랭킹을 새로고침해 주세요." : "기본정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.",
        code: changed ? "DETAIL_PUBLICATION_CHANGED" : "DETAIL_LOOKUP_FAILED",
      },
      { status: changed ? 409 : 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
