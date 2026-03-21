// src/app/api/rankings/route.ts 파일 새로 생성!
import { getLatestRankBoard } from "../../../lib/koaptix/queries";
import { mapLatestRankBoardRows } from "../../../lib/koaptix/mappers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const rows = await getLatestRankBoard(limit, offset);
    return Response.json({ data: mapLatestRankBoardRows(rows) }, { status: 200 });
  } catch (error) {
    return Response.json({ error: "랭킹 데이터를 더 불러오지 못했습니다." }, { status: 500 });
  }
}