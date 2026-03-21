import { getComplexDetailById } from "../../../lib/koaptix/queries";
import { mapComplexDetailRow } from "../../../lib/koaptix/mappers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const complexId = searchParams.get("complexId");

  if (!complexId) {
    return Response.json(
      { error: "complexId is required" },
      { status: 400 }
    );
  }

  try {
    const row = await getComplexDetailById(complexId);

    if (!row) {
      return Response.json(
        { error: "해당 단지 상세 정보가 없다." },
        { status: 404 }
      );
    }

    return Response.json(
      { data: mapComplexDetailRow(row) },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "상세 정보를 불러오지 못했다.",
      },
      { status: 500 }
    );
  }
}