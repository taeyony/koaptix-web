"use client";

import { useCallback, useState } from "react";
import type { HomeIndexChartPayload } from "../../../lib/koaptix/queries";
import type { PublishedMapSummary } from "../../../lib/koaptix/mapPresentation";
import { CapitalMapV2 } from "./CapitalMapV2";
import { HomeV2IndexPanel } from "./HomeV2IndexPanel";

/** Share the existing map response with the index summary; no second data request. */
export function HomeV2MarketOverview({ index, universeCode, universeLabel, universeUnavailable }: {
  index: HomeIndexChartPayload; universeCode: string; universeLabel: string; universeUnavailable: boolean;
}) {
  const [state, setState] = useState<{ summary: PublishedMapSummary | null; status: "loading" | "ready" | "error" }>({ summary: null, status: "loading" });
  const receiveSummary = useCallback((summary: PublishedMapSummary | null) => {
    setState({ summary, status: summary ? "ready" : "error" });
  }, []);
  return <>
    <CapitalMapV2 universeCode={universeCode} universeLabel={universeLabel} universeUnavailable={universeUnavailable} onSummary={receiveSummary} />
    <HomeV2IndexPanel index={index} summary={state.summary} summaryStatus={universeUnavailable ? "unavailable" : state.status} />
  </>;
}
