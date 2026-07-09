import { NextResponse } from "next/server";

import { getKoaptixCurrentness } from "../../../lib/koaptix/currentness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(getKoaptixCurrentness(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
