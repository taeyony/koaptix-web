import { NextRequest, NextResponse } from "next/server";
import { getKoaptixHomePayload } from "../../../lib/koaptix/home";

export const dynamic = "force-dynamic";

function parseRequiredBoundedInt(
  rawValue: string | null,
  fallback: number,
  min: number,
  max: number,
  label: string,
): number {
  if (rawValue === null) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new BadRequestError(`${label} must be between ${min} and ${max}`);
  }
  return parsed;
}

class BadRequestError extends Error {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const topN = parseRequiredBoundedInt(searchParams.get("topN"), 50, 1, 50, "topN");
    const chartPoints = parseRequiredBoundedInt(searchParams.get("chartPoints"), 12, 3, 36, "chartPoints");

    const data = await getKoaptixHomePayload({ topN, chartPoints });

    return NextResponse.json(
      { ok: true, data },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BAD_REQUEST",
            message: error.message,
          },
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to load KOAPTIX home payload";

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
      },
      { status: 500 },
    );
  }
}
