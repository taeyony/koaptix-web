import { createElement } from "react";
import { ImageResponse } from "next/og";
import { ComparisonShareImage } from "../../../components/home/ComparisonShareImage";
import { parseComparisonIds, isComparisonDate } from "../../../lib/koaptix/complexShare";
import { getPublicPageComparison } from "../../../lib/koaptix/publicPageData";
import { resolveUniverseRequest } from "../../../lib/koaptix/universes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = parseComparisonIds(params.get("compare"));
  const scope = resolveUniverseRequest(params.get("universe"), { capability: "ranking" });
  const date = params.get("comparisonDate");
  let facts = null;
  if (ids.length === 2 && !scope.universeUnavailable && isComparisonDate(date)) {
    facts = await getPublicPageComparison(ids[0], ids[1], scope.requestedUniverseCode);
    // An image requested for a previous publication cannot relabel new data.
    if (facts && (facts.publication.snapshot_date !== date || facts.publication.publication_event_id !== params.get("publication"))) facts = null;
  }
  return new ImageResponse(createElement(ComparisonShareImage, { facts }), {
    width: 1200, height: 630, headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
